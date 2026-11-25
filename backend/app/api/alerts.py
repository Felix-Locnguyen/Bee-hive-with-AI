from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.hive import Hive
from app.models.alert import Alert
from app.schemas.alert import AlertCreate, AlertRead, AlertUpdate

from app.api._common import ensure_utc, get_or_404

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


async def _get_or_404(db: AsyncSession, alert_id: int) -> Alert:
    return await get_or_404(db, Alert, alert_id, "alert")


@router.get("/count")
async def alert_count(hive_id: int | None = None, db: AsyncSession = Depends(get_db)):
    """GET /api/alerts/count — {"unread": n, "bad_unread": m} cho badge bellCount()."""
    stmt = select(func.count()).select_from(Alert).where(Alert.is_read.is_(False))
    if hive_id:
        stmt = stmt.where(Alert.hive_id == hive_id)
    unread = await db.scalar(stmt) or 0
    bad_unread = await db.scalar(stmt.where(Alert.severity == "bad")) or 0
    return {"unread": unread, "bad_unread": bad_unread}


@router.get("", response_model=list[AlertRead])
async def list_alerts(
    hive_id: int | None = None,
    severity: str | None = None,
    unread: bool | None = None,
    limit: int = Query(default=50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """GET /api/alerts?hive_id=12&severity=bad&unread=true&limit=20"""
    stmt = select(Alert)
    if hive_id:
        stmt = stmt.where(Alert.hive_id == hive_id)
    if severity:
        stmt = stmt.where(Alert.severity == severity)
    if unread is True:
        stmt = stmt.where(Alert.is_read.is_(False))
    elif unread is False:
        stmt = stmt.where(Alert.is_read.is_(True))
    return (await db.scalars(stmt.order_by(Alert.created_at.desc()).limit(limit))).all()


@router.get("/{alert_id}", response_model=AlertRead)
async def get_alert(alert_id: int, db: AsyncSession = Depends(get_db)):
    return await _get_or_404(db, alert_id)


@router.post("", response_model=AlertRead, status_code=201)
async def create_alert(data: AlertCreate, db: AsyncSession = Depends(get_db)):
    if await db.get(Hive, data.hive_id) is None:
        raise HTTPException(status_code=404, detail="hive_id khong ton tai")
    alert = Alert(**data.model_dump())
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return alert


@router.put("/{alert_id}", response_model=AlertRead)
async def update_alert(alert_id: int, data: AlertUpdate, db: AsyncSession = Depends(get_db)):
    alert = await _get_or_404(db, alert_id)
    fields = data.model_dump(exclude_unset=True)
    if "resolved_at" in fields:
        fields["resolved_at"] = ensure_utc(fields["resolved_at"])
    for key, value in fields.items():
        setattr(alert, key, value)
    await db.commit()
    await db.refresh(alert)
    return alert


@router.delete("/{alert_id}")
async def delete_alert(alert_id: int, db: AsyncSession = Depends(get_db)):
    alert = await _get_or_404(db, alert_id)
    await db.delete(alert)
    await db.commit()
    return {"deleted": alert_id}
