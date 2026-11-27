"""API cau hinh camera (camera_config) — doc/doi cau hinh thuc te, khong can restart."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api._common import get_or_404
from app.database import get_db
from app.models.camera_config import CameraConfig
from app.schemas.camera_config import CameraConfigRead, CameraConfigUpdate

router = APIRouter(prefix="/api/cameras", tags=["Cameras"])


async def _get_or_404(db: AsyncSession, hive_id: int) -> CameraConfig:
    return await get_or_404(db, CameraConfig, hive_id, "camera_config")


@router.get("", response_model=list[CameraConfigRead])
async def list_camera_configs(
    enabled: bool | None = None, db: AsyncSession = Depends(get_db)
):
    """GET /api/cameras?enabled=true — toan bo cau hinh camera."""
    stmt = select(CameraConfig)
    if enabled is not None:
        stmt = stmt.where(CameraConfig.enabled.is_(enabled))
    return (await db.scalars(stmt.order_by(CameraConfig.hive_id))).all()


@router.get("/{hive_id}", response_model=CameraConfigRead)
async def get_camera_config(hive_id: int, db: AsyncSession = Depends(get_db)):
    return await _get_or_404(db, hive_id)


@router.patch("/{hive_id}", response_model=CameraConfigRead)
async def update_camera_config(
    hive_id: int, data: CameraConfigUpdate, db: AsyncSession = Depends(get_db)
):
    """PATCH /api/cameras/12 {"enabled": false} — worker ap dung trong <=15s."""
    cfg = await _get_or_404(db, hive_id)
    fields = data.model_dump(exclude_unset=True)
    if "video_path" in fields and not fields["video_path"].strip():
        raise HTTPException(status_code=422, detail="video_path khong duoc rong")
    for key, value in fields.items():
        setattr(cfg, key, value)
    await db.commit()
    await db.refresh(cfg)
    return cfg
