from datetime import date, datetime
from pydantic import BaseModel, Field


RECORD_PATTERN = "^(Kiểm tra|Kiểm tra tổng quát|Cho ăn|Thu hoạch|Xử lý bệnh|Thay khung cầu|Khác)$"

class HiveRecordCreate(BaseModel):
    checked_at: date | None = None
    record_type: str = Field(default="Kiểm tra", pattern=RECORD_PATTERN)
    note: str = Field(default="", max_length=500)
    inspector: str = Field(default="", max_length=80)

class HiveRecordUpdate(BaseModel):
    checked_at: date | None = None
    record_type: str | None = Field(default=None, pattern=RECORD_PATTERN)
    note: str | None = Field(default="", max_length=500)
    inspector: str | None = Field(default=None, max_length=80)


class HiveRecordRead(BaseModel):
    id: int
    hive_id: int
    checked_at: date | None
    record_type: str
    note: str
    inspector: str
    created_at: datetime

    model_config = {"from_attributes": True}
