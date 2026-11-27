from sqlalchemy import Boolean, Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.hive import Hive  # noqa: F401 — dang ky bang hives de resolve FK


class CameraConfig(Base):
    """Cau hinh camera mo phong (Demo v1) cho 1 thùng ong.

    - video_path: duong dan TUONG DOI doi voi thu muc video (0_DEMO_VIDEO/).
    - demo_timestamps: cac moc giay trong video co "ong bap cay" — chi dung khi DEMO_MODE=true.
    """

    __tablename__ = "camera_config"

    hive_id: Mapped[int] = mapped_column(ForeignKey("hives.id"), primary_key=True)
    video_path: Mapped[str] = mapped_column(String(255))
    scan_interval_sec: Mapped[int] = mapped_column(Integer, default=25)
    confidence_threshold: Mapped[float] = mapped_column(Float, default=0.5)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    demo_timestamps: Mapped[list | None] = mapped_column(JSON, nullable=True)
