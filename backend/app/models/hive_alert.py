from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.hive import Hive  # noqa: F401 — dang ky bang hives de resolve FK


class HiveAlert(Base):
    """Canh bao tu camera AI. Chi luu metadata + duong dan anh (KHONG luu pixel/blob)."""

    __tablename__ = "hive_alert"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    hive_id: Mapped[int] = mapped_column(ForeignKey("hives.id"), index=True)
    alert_type: Mapped[str] = mapped_column(String(40), index=True)
    confidence: Mapped[float] = mapped_column(Float)
    image_path: Mapped[str] = mapped_column(String(300))
    is_acknowledged: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
