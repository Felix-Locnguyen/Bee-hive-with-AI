"""seed camera_config mac dinh — chi chay khi bang con trong (idempotent).

Video duoc phan round-robin cho moi thùng. `demo_timestamps` la cac moc giay
thuc te co "ong bap cay" (quet voi model best.pt, conf >= 0.35):
    DEMO_1.mp4 -> khong co thien dich (thung "sach", dung lam doi chieu)
    DEMO_2.mp4 -> 11 phat hien, conf toi da 0.653
    DEMO_3.mp4 -> 224 phat hien, conf toi da 0.836
"""
from __future__ import annotations

import logging
from pathlib import Path

from sqlalchemy import func, select

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.camera_config import CameraConfig
from app.models.hive import Hive

logger = logging.getLogger(__name__)

DEMO_TIMESTAMP_MAP: dict[str, list[float]] = {
    "DEMO_1.mp4": [],
    "DEMO_2.mp4": [6.33, 12.33, 20.67, 40.67, 48.0],
    "DEMO_3.mp4": [8.83, 21.83, 35.50, 36.33, 40.00, 50.50],
}


def demo_video_files() -> list[str]:
    video_dir = Path(settings.video_dir)
    if not video_dir.exists():
        logger.warning("Thu muc video khong ton tai: %s", video_dir)
        return []
    return sorted(p.name for p in video_dir.glob("*.mp4"))


async def ensure_camera_configs() -> int:
    """Seed camera_config cho moi thùng neu bang dang rong. Tra ve so dong them moi."""
    async with AsyncSessionLocal() as db:
        existing = await db.scalar(select(func.count()).select_from(CameraConfig))
        if existing:
            return 0

        hive_ids = (await db.scalars(select(Hive.id).order_by(Hive.id))).all()
        videos = demo_video_files()
        if not hive_ids or not videos:
            logger.warning(
                "Khong seed duoc camera_config (hive=%d, video=%d)",
                len(hive_ids), len(videos),
            )
            return 0

        for i, hive_id in enumerate(hive_ids):
            video = videos[i % len(videos)]
            db.add(
                CameraConfig(
                    hive_id=hive_id,
                    video_path=video,
                    scan_interval_sec=settings.scan_interval_sec,
                    confidence_threshold=settings.default_confidence_threshold,
                    enabled=True,
                    demo_timestamps=DEMO_TIMESTAMP_MAP.get(video),
                )
            )
        await db.commit()
        logger.info("Da seed %d camera_config (video: %s)", len(hive_ids), ", ".join(videos))
        return len(hive_ids)
