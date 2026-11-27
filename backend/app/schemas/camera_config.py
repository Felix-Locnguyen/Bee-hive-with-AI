from pydantic import BaseModel, Field


class CameraConfigUpdate(BaseModel):
    """PATCH /api/cameras/{hive_id} — chi cho phep cac truong demo can chinh."""

    video_path: str | None = Field(default=None, min_length=1, max_length=255)
    scan_interval_sec: int | None = Field(default=None, ge=5, le=3600)
    confidence_threshold: float | None = Field(default=None, ge=0.0, le=1.0)
    enabled: bool | None = None


class CameraConfigRead(BaseModel):
    hive_id: int
    video_path: str
    scan_interval_sec: int
    confidence_threshold: float
    enabled: bool
    demo_timestamps: list | None = None

    model_config = {"from_attributes": True}
