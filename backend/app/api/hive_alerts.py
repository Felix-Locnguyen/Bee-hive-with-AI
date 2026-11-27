"""API canh bao camera (hive_alert) — chi doc/acknowledge, worker la nguoi ghi."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api._common import get_or_404
from app.camera import storage
from app.database import get_db
from app.models.hive_alert import HiveAlert
from app.schemas.hive_alert import HiveAlertRead, HiveAlertUpdate

router = APIRouter(prefix="/api/hive-alerts", tags=["HiveAlerts"])


def _to_read(alert: HiveAlert) -> HiveAlertRead:
    """model_validate + bo sung image_url (Frontend goi anh qua URL tinh)."""
    read = HiveAlertRead.model_validate(alert)
    read.image_url = storage.image_url(alert.image_path)
    return read


async def _get_or_404(db: AsyncSession, alert_id: int) -> HiveAlert:
    return await get_or_404(db, HiveAlert, alert_id, "hive_alert")


@router.get("/count")
async def hive_alert_count(hive_id: int | None = None, db: AsyncSession = Depends(get_db)):
    """GET /api/hive-alerts/count?hive_id=12 -> {total, unacknowledged}."""
    stmt = select(func.count()).select_from(HiveAlert)
    if hive_id:
        stmt = stmt.where(HiveAlert.hive_id == hive_id)
    total = await db.scalar(stmt) or 0
    unack_stmt = stmt.where(HiveAlert.is_acknowledged.is_(False)) if hive_id else \
        select(func.count()).select_from(HiveAlert).where(HiveAlert.is_acknowledged.is_(False))
    unack = await db.scalar(unack_stmt) or 0
    return {"total": total, "unacknowledged": unack}


@router.get("/latest", response_model=HiveAlertRead | None)
async def latest_hive_alert(hive_id: int, db: AsyncSession = Depends(get_db)):
    """GET /api/hive-alerts/latest?hive_id=12 — anh bang chung moi nhat (null neu chua co)."""
    alert = await db.scalar(
        select(HiveAlert)
        .where(HiveAlert.hive_id == hive_id)
        .order_by(HiveAlert.created_at.desc())
        .limit(1)
    )
    return _to_read(alert) if alert else None


@router.get("", response_model=list[HiveAlertRead])
async def list_hive_alerts(
    hive_id: int | None = None,
    unacknowledged: bool | None = None,
    limit: int = Query(default=50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """GET /api/hive-alerts?hive_id=12&unacknowledged=true&limit=20"""
    stmt = select(HiveAlert)
    if hive_id:
        stmt = stmt.where(HiveAlert.hive_id == hive_id)
    if unacknowledged is True:
        stmt = stmt.where(HiveAlert.is_acknowledged.is_(False))
    elif unacknowledged is False:
        stmt = stmt.where(HiveAlert.is_acknowledged.is_(True))
    rows = (
        await db.scalars(stmt.order_by(HiveAlert.created_at.desc()).limit(limit))
    ).all()
    return [_to_read(r) for r in rows]


@router.get("/{alert_id}", response_model=HiveAlertRead)
async def get_hive_alert(alert_id: int, db: AsyncSession = Depends(get_db)):
    return _to_read(await _get_or_404(db, alert_id))


@router.put("/{alert_id}", response_model=HiveAlertRead)
async def acknowledge_hive_alert(
    alert_id: int, data: HiveAlertUpdate, db: AsyncSession = Depends(get_db)
):
    """PUT /api/hive-alerts/{id} {"is_acknowledged": true} — danh dau da xu ly."""
    alert = await _get_or_404(db, alert_id)
    alert.is_acknowledged = data.is_acknowledged
    alert.acknowledged_at = (
        datetime.now(timezone.utc) if data.is_acknowledged else None
    )
    await db.commit()
    await db.refresh(alert)
    return _to_read(alert)
