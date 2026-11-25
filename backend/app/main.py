from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from app.api import farms, sensors, alerts, users, hives
from app.config import settings
from app.database import check_connection, engine, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
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
