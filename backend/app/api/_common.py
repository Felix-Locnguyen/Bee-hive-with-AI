from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session


def get_or_404(db: Session, model, entity_id: int, entity_name: str):
    entity = db.get(model, entity_id)
    if entity is None:
        raise HTTPException(status_code=404, detail=f"Khong tim thay {entity_name} id = {entity_id}")
    return entity


def ensure_utc(value: datetime | None) -> datetime | None:
    if value is None or value.tzinfo is not None:
        return value
    return value.replace(tzinfo=timezone.utc)
