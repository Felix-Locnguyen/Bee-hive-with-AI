from datetime import date, datetime
from sqlalchemy import Date, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class HiveRecord(Base):
    __tablename__ = "hive_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    hive_id: Mapped[int] = mapped_column(ForeignKey("hives.id"), index=True)
    checked_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    record_type: Mapped[str] = mapped_column(String(40), default="Kiểm tra")
    note: Mapped[str] = mapped_column(String(500), default="")
    inspector: Mapped[str] = mapped_column(String(80), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())