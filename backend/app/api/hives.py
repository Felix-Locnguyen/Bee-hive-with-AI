from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.camera.seed import sync_hive_camera_config
from app.database import get_db
from app.models.farm import Farm
from app.models.hive import Hive
from app.models.hive_record import HiveRecord

from app.schemas.hive import HiveCreate, HiveRead, HiveUpdate
from app.schemas.hive_record import HiveRecordCreate, HiveRecordRead

from app.api._common import get_or_404

router = APIRouter(prefix="/api/hives", tags=["Hives"])


async def _get_or_404(db: AsyncSession, hive_id: int) -> Hive:
    return await get_or_404(db, Hive, hive_id, "hive")


async def _code_taken(db: AsyncSession, code: str, exclude_id: int | None = None) -> bool:
    stmt = select(Hive).where(Hive.code == code)
    if exclude_id is not None:
        stmt = stmt.where(Hive.id != exclude_id)
    return (await db.scalars(stmt)).first() is not None


@router.get("/stats")
async def hive_stats(db:AsyncSession = Depends(get_db)):
    """GET /api/hives/stats — KPI khớp card '128 thùng' trên dashboard."""
    rows = (await db.execute(
        select(Hive.status, func.count()).group_by(Hive.status)
    )).all()

    counts = {status: count for status, count in rows}
    return {
        "total": sum(counts.values()),
        "ok": counts.get("ok", 0),
        "watch": counts.get("watch", 0),
        "bad": counts.get("bad", 0),
    }


@router.get("", response_model=list[HiveRead])
async def list_hives(
    zone: str | None = None,
    status: str | None = None,
    q: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """GET /api/hives?zone=A&status=ok&q=V12 — filter giống hệt filter trên dashboard."""
    stmt = select(Hive)
    if zone:
        stmt = stmt.where(Hive.zone == zone)
    if status:
        stmt = stmt.where(Hive.status == status)
    if q:
        stmt = stmt.where(or_(Hive.code.ilike(f"%{q}%"), Hive.name.ilike(f"%{q}%")))
    return (await db.scalars(stmt.order_by(Hive.id))).all()



@router.get("/{hive_id}", response_model=HiveRead)
async def get_hive(hive_id: int, db: AsyncSession = Depends(get_db)):
    return await _get_or_404(db, hive_id)

@router.post("", response_model=HiveRead, status_code=201)
async def create_hive(data: HiveCreate, db: AsyncSession = Depends(get_db)):
    if await db.get(Farm, data.farm_id) is None:
        raise HTTPException(status_code=404, detail="farm_id khong ton tai")
    if await _code_taken(db, data.code):
        raise HTTPException(status_code=409, detail="Ma so hive da ton tai")
    hive = Hive(**data.model_dump())
    db.add(hive)
    await db.flush()
    if not await sync_hive_camera_config(db, hive):
        raise HTTPException(status_code=503, detail="Không tìm thấy video demo phù hợp với trạng thái thùng.")
    await db.commit()
    await db.refresh(hive)
    return hive


@router.put("/{hive_id}", response_model=HiveRead)
async def update_hive(hive_id: int, data: HiveUpdate, db: AsyncSession = Depends(get_db)):
    hive = await _get_or_404(db, hive_id)
    fields = data.model_dump(exclude_unset=True)
    if "code" in fields and await _code_taken(db, fields["code"], exclude_id=hive_id):
        raise HTTPException(status_code=409, detail="Ma so hive da ton tai")
    for key, value in fields.items():
        setattr(hive,key,value)
    if "status" in fields and not await sync_hive_camera_config(db, hive):
        raise HTTPException(status_code=503, detail="Không tìm thấy video demo phù hợp với trạng thái thùng.")
    await db.commit()
    await db.refresh(hive)
    return hive


@router.delete("/{hive_id}")
async def delete_hive(hive_id: int, db: AsyncSession = Depends(get_db)):
    hive = await _get_or_404(db, hive_id)
    await db.delete(hive)
    await db.commit()
    return {"deleted": hive_id}


@router.get("/{hive_id}/records", response_model=list[HiveRecordRead])
async def list_hive_records(hive_id:int, db: AsyncSession = Depends(get_db)):
    """GET /api/hives/12/records — lich su cham soc, moi nhat nam truoc."""
    await _get_or_404(db, hive_id)
    return (await db.scalars(
        select(HiveRecord)
        .where(HiveRecord.hive_id == hive_id)
        .order_by(HiveRecord.checked_at.desc(), HiveRecord.id.desc())
    )).all()

@router.post("/{hive_id}/records", response_model=HiveRecordRead, status_code=201)
async def create_hive_record(hive_id: int, data: HiveRecordCreate, db: AsyncSession = Depends(get_db)):
    """POST /api/hives/12/records — them 1 ban ghi (201)."""
    await _get_or_404(db, hive_id)
    record = HiveRecord(**data.model_dump(), hive_id=hive_id)
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record
