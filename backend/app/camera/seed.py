"""Keep demo camera videos aligned with each hive's current status."""
from __future__ import annotations

import logging
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.camera_config import CameraConfig
from app.models.hive import Hive

logger = logging.getLogger(__name__)

def demo_video_files() -> list[str]:
    video_dir = Path(settings.video_dir)
    if not video_dir.exists():
        logger.warning("Thu muc video khong ton tai: %s", video_dir)
        return []
    return sorted(p.name for p in video_dir.glob("*.mp4"))


def video_for_hive(hive_id: int, status: str) -> str:
    if status == "bad":
        return "DEMO_3.mp4"
    return "DEMO_1.mp4" if hive_id % 2 else "DEMO_2.mp4"


async def sync_hive_camera_config(
    db: AsyncSession, hive: Hive, available_videos: set[str] | None = None
) -> bool:
    video = video_for_hive(hive.id, hive.status)
    if available_videos is None:
        available_videos = set(demo_video_files())
    if video not in available_videos:
        logger.warning(
            "Khong the gan video %s cho hive %d: video khong ton tai trong %s",
            video, hive.id, settings.video_dir,
        )
        return False

    config = await db.get(CameraConfig, hive.id)
    if config is None:
        db.add(
            CameraConfig(
                hive_id=hive.id,
                video_path=video,
                scan_interval_sec=settings.scan_interval_sec,
                confidence_threshold=settings.default_confidence_threshold,
                enabled=True,
                demo_timestamps=None,
            )
        )
    else:
        config.video_path = video
        config.demo_timestamps = None
    return True


async def ensure_camera_configs() -> int:
    """Keep every hive camera on the demo video assigned to its current status."""
    async with AsyncSessionLocal() as db:
        hives = (await db.scalars(select(Hive).order_by(Hive.id))).all()
        videos = set(demo_video_files())
        if not hives or not videos:
            logger.warning(
                "Khong seed duoc camera_config (hive=%d, video=%d)",
                len(hives), len(videos),
            )
            return 0

        updated = 0
        for hive in hives:
            if await sync_hive_camera_config(db, hive, videos):
                updated += 1
        await db.commit()
        logger.info("Da dong bo camera_config cho %d/%d hive", updated, len(hives))
        return updated
