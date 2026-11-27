import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api import farms, sensors, alerts, users, hives, camera_stream, cameras, hive_alerts
from app.camera.seed import ensure_camera_configs
from app.camera.storage import captures_root, ensure_dirs
from app.camera.worker import worker as camera_worker
from app.config import settings
from app.database import check_connection, engine, init_db
from app.models.camera_config import CameraConfig  # noqa: F401 — dang ky bang cho create_all
from app.models.hive_alert import HiveAlert  # noqa: F401

# Uvicorn chi cau hinh logger cung ten — can cau hinh root de log cua app hien thi
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s %(levelname)-7s [%(name)s] %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    ensure_dirs()
    await ensure_camera_configs()
    await camera_worker.start()
    yield
    await camera_worker.stop()
    await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
    lifespan=lifespan,
)

app.include_router(users.router)
app.include_router(farms.router)
app.include_router(hives.router)
app.include_router(sensors.router)
app.include_router(alerts.router)
app.include_router(camera_stream.router)
app.include_router(cameras.router)
app.include_router(hive_alerts.router)

# Anh canh bao duoc phuc vu static: /storage/captures/{hive_id}/xxx.jpg
ensure_dirs()
app.mount("/storage/captures", StaticFiles(directory=str(captures_root())), name="captures")


@app.get("/", tags=["Health"])
def root():
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
    }


@app.get("/healthz", tags=["Health"])
async def healthz():
    try:
        await check_connection()
    except RuntimeError as exc:
        return JSONResponse(
            status_code=503,
            content={"status": "degraded", "database": str(exc)},
        )
    return {"status": "ok", "database": "up"}
