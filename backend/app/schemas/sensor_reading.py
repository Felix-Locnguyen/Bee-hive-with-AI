from datetime import datetime
from pydantic import BaseModel, Field


class SensorReadingCreate(BaseModel):
    recorded_at: datetime | None = None
    temperature: float = Field(ge=-10, le=60)
    humidity: float = Field(ge=0, le=100)
    sound_level: float | None = Field(default=None, ge=0, le=200)
    battery: int | None = Field(default=None, ge=0, le=100)


class SensorReadingRead(BaseModel):
    id: int
    hive_id: int
    recorded_at: datetime
    temperature: float
    humidity: float
    sound_level: float | None
    battery: int | None

    model_config = {"from_attributes": True}
