from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.farm import Farm
from app.models.hive import Hive
from app.models.hive_record import HiveRecord

from app.schemas.hive import HiveCreate, HiveRead, HiveUpdate
from app.schemas.hive_record import HiveRecordCreate, HiveRecordRead

from app.api._common import get_or_404

router = APIRouter(prefix="/api/hives", tags=["Hives"])


def _get_or_404(db: Session, hive_id: int) -> Hive:
    return get_or_404(db, Hive, hive_id, "hive")


def _code_taken(db: Session, code: str, exclude_id: int | None = None) -> bool:
    stmt = select(Hive).where(Hive.code == code)
    if exclude_id is not None:
        stmt = stmt.where(Hive.id != exclude_id)
    return db.scalars(stmt).first() is not None


@router.get("/stats")
def hive_stats(db:Session = Depends(get_db)):
    """GET /api/hives/stats — KPI khớp card '128 thùng' trên dashboard."""
    rows = db.execute(
        select(Hive.status, func.count()).group_by(Hive.status)
    ).all()

    counts = {status: count for status, count in rows}
    return {
        "total": sum(counts.values()),
        "ok": counts.get("ok", 0),
        "watch": counts.get("watch", 0),
        "bad": counts.get("bad", 0),
    }


@router.get("", response_model=list[HiveRead])
def list_hives(
    zone: str | None = None,
    status: str | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
):
    """GET /api/hives?zone=A&status=ok&q=V12 — filter giống hệt filter trên dashboard."""
    stmt = select(Hive)
    if zone:
        stmt = stmt.where(Hive.zone == zone)
    if status:
        stmt = stmt.where(Hive.status == status)
    if q:
        stmt = stmt.where(or_(Hive.code.ilike(f"%{q}%"), Hive.name.ilike(f"%{q}%")))
    return db.scalars(stmt.order_by(Hive.id)).all()



@router.get("/{hive_id}", response_model=HiveRead)
def get_hive(hive_id: int, db: Session = Depends(get_db)):
    return _get_or_404(db, hive_id)

@router.post("", response_model=HiveRead, status_code=201)
def create_hive(data: HiveCreate, db: Session = Depends(get_db)):
    if db.get(Farm, data.farm_id) is None:
        raise HTTPException(status_code=404, detail="farm_id khong ton tai")
    if _code_taken(db, data.code):
        raise HTTPException(status_code=409, detail="Ma so hive da ton tai")
    hive = Hive(**data.model_dump())
    db.add(hive)
    db.commit()
    db.refresh(hive)
    return hive


@router.put("/{hive_id}", response_model=HiveRead)
def update_hive(hive_id: int, data: HiveUpdate, db: Session = Depends(get_db)):
    hive = _get_or_404(db, hive_id)
    fields = data.model_dump(exclude_unset=True)
    if "code" in fields and _code_taken(db, fields["code"], exclude_id=hive_id):
        raise HTTPException(status_code=409, detail="Ma so hive da ton tai")
    for key, value in fields.items():
        setattr(hive,key,value)
    db.commit()
    db.refresh(hive)
    return hive


@router.delete("/{hive_id}")
def delete_hive(hive_id: int, db: Session = Depends(get_db)):
    hive = _get_or_404(db, hive_id)
    db.delete(hive)
    db.commit()
    return {"deleted": hive_id}


@router.get("/{hive_id}/records", response_model=list[HiveRecordRead])
def list_hive_records(hive_id:int, db: Session = Depends(get_db)):
    """GET /api/hives/12/records — lich su cham soc, moi nhat nam truoc."""
    _get_or_404(db, hive_id)
    return db.scalars(
        select(HiveRecord)
        .where(HiveRecord.hive_id == hive_id)
        .order_by(HiveRecord.checked_at.desc(), HiveRecord.id.desc())
    ).all()

@router.post("/{hive_id}/records", response_model=HiveRecordRead, status_code=201)
def create_hive_record(hive_id: int, data: HiveRecordCreate, db: Session = Depends(get_db)):
    """POST /api/hives/12/records — them 1 ban ghi (201)."""
    _get_or_404(db, hive_id)
    record = HiveRecord(**data.model_dump(), hive_id=hive_id)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record