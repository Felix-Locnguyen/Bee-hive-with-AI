from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.models.hive import Hive
from app.models.sensor_reading import SensorReading
from app.schemas.sensor_reading import SensorReadingCreate, SensorReadingRead

from app.api._common import ensure_utc, get_or_404

router = APIRouter(prefix="/api/hives/{hive_id}/readings", tags=["Sensors"])


async def _get_or_404(db: AsyncSession, hive_id: int) -> Hive:
    return await get_or_404(db, Hive, hive_id, "hive")

@router.get("/latest", response_model=SensorReadingRead)
async def latest_reading(hive_id: int, db: AsyncSession = Depends(get_db)):
    """GET /api/hives/12/readings/latest — du lieu cam bien moi nhat."""
    await _get_or_404(db, hive_id)
    reading = (await db.scalars(
        select(SensorReading)
        .where(SensorReading.hive_id == hive_id)
        .order_by(SensorReading.recorded_at.desc(), SensorReading.id.desc())
    )).first()
    if not reading:
        raise HTTPException(status_code=404, detail="Thung chua co du lieu cam bien")
    return reading


@router.get("/chart", response_model=list[SensorReadingRead])
async def list_readings(
    hive_id: int,
    hours: int = Query(default=24, ge=1, le=720),
    limit: int = Query(default=200, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
):
    """GET /api/hives/12/readings/chart?hours=24&limit=100 — tra ve cu -> moi de ve chart."""
    await _get_or_404(db, hive_id)
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    row = (await db.scalars(
        select(SensorReading)
        .where(SensorReading.hive_id == hive_id, SensorReading.recorded_at >= since)
        .order_by(SensorReading.recorded_at.desc())
        .limit(limit)
    )).all()
    return list(reversed(row))

@router.post("", response_model=SensorReadingRead, status_code = 201)
async def create_reading(hive_id: int,  data: SensorReadingCreate,
                    db: AsyncSession = Depends(get_db)):
    """POST /api/hives/12/readings — thiet bi gui du lieu cam bien len server."""
    await _get_or_404(db, hive_id)
    payload = data.model_dump()
    recorded_at = ensure_utc(payload.get("recorded_at"))
    payload["recorded_at"] = recorded_at or datetime.now(timezone.utc)
    reading = SensorReading(**payload, hive_id=hive_id)
    db.add(reading)
    await db.commit()
    await db.refresh(reading)
    return reading
