from fastapi import FastAPI

from app.api import farms, sensors, alerts, users, hives
from app.config import settings
from app.database import Base, engine


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
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
def healthz():
    return {"status": "ok"}