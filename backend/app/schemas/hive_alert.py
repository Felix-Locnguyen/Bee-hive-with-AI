from datetime import datetime

from pydantic import BaseModel, Field


class HiveAlertRead(BaseModel):
    id: int
    hive_id: int
    alert_type: str
    confidence: float
    image_path: str
    image_url: str = ""
    is_acknowledged: bool
    acknowledged_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class HiveAlertUpdate(BaseModel):
    is_acknowledged: bool = Field(default=True)


class StreamTokenRead(BaseModel):
    token: str
    expires_in: int
    stream_url: str
