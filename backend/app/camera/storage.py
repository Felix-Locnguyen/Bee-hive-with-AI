"""Luu anh canh bao (JPG) + rolling retention.

Nguyen tac:
- Khong luu pixel/blob vao DB — chi luu duong dan TUONG DOI (`captures/{hive_id}/...`).
- Anh da ve bounding box + label + confidence, JPEG quality 82.
- Ten file = timestamp + uuid4 (khong doan duoc).
- Retention: vuot qua MAX_IMAGES_PER_HIVE thi xoa cac anh CU NHAT,
  uu tien cac da acknowledge (giu lai canh bao chua xu ly). Khong nen zip.
"""
from __future__ import annotations

import logging
import time
import uuid
from pathlib import Path

import cv2
import numpy as np
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.hive_alert import HiveAlert

logger = logging.getLogger(__name__)

JPEG_QUALITY = 82          # yeu cau 80-85%
CAPTURE_SUBDIR = "captures"
BOX_COLOR = (60, 76, 220)      # BGR — do cho hop canh bao
TEXT_BG_COLOR = (60, 76, 220)


def captures_root() -> Path:
    return Path(settings.storage_dir) / CAPTURE_SUBDIR


def hive_dir(hive_id: int) -> Path:
    d = captures_root() / str(hive_id)
    d.mkdir(parents=True, exist_ok=True)
    return d


def ensure_dirs() -> None:
    """Tao thu muc storage/captures khi khoi dong (dung cho StaticFiles mount)."""
    captures_root().mkdir(parents=True, exist_ok=True)


def image_url(relative_path: str) -> str:
    """`captures/12/x.jpg` -> `/storage/captures/12/x.jpg` (khop static mount)."""
    return f"/storage/{relative_path.lstrip('/')}"


def draw_detections(frame: np.ndarray, detections) -> np.ndarray:
    """Ve bounding box + label + confidence len frame (tra ve ban sao)."""
    out = frame.copy()
    for det in detections:
        x1, y1, x2, y2 = (int(v) for v in det.xyxy)
        label = f"{det.label.strip()} {det.confidence * 100:.0f}%"
        cv2.rectangle(out, (x1, y1), (x2, y2), BOX_COLOR, 2)

        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
        by1 = max(0, y1 - th - 8)
        cv2.rectangle(out, (x1, by1), (x1 + tw + 6, by1 + th + 8), TEXT_BG_COLOR, -1)
        cv2.putText(
            out, label, (x1 + 3, by1 + th + 2),
            cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2, cv2.LINE_AA,
        )
    return out


def save_capture(hive_id: int, frame: np.ndarray, detections) -> str:
    """Ve bbox + label + confidence, luu thanh JPG, tra ve duong dan TUONG DOI.

    Nang cap: khong ma/ghi duoc file -> raise, worker se bat va log.
    """
    annotated = draw_detections(frame, detections)
    name = f"{time.strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex}.jpg"
    path = hive_dir(hive_id) / name
    ok, buf = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
    if not ok:
        raise OSError(f"Khong ma duoc JPG cho hive {hive_id}")
    path.write_bytes(buf.tobytes())
    return f"{CAPTURE_SUBDIR}/{hive_id}/{name}"


def delete_capture(relative_path: str) -> None:
    """Xoa file anh. Khong xoa duoc thi log — khong bao gio raise."""
    if not relative_path:
        return
    path = Path(settings.storage_dir) / relative_path
    try:
        path.unlink(missing_ok=True)
    except OSError as exc:
        logger.warning("Khong xoa duoc anh %s: %s", relative_path, exc)


def remove_capture(relative_path: str) -> None:
    """Remove a capture owned by this app, raising when the stored path is invalid."""
    root = captures_root().resolve()
    path = (Path(settings.storage_dir) / relative_path).resolve()
    if root not in path.parents:
        raise ValueError("Đường dẫn ảnh không nằm trong thư mục captures.")
    path.unlink()


async def enforce_retention(db: AsyncSession, hive_id: int) -> int:
    """Giu toi da settings.max_images_per_hive anh moi thùng.

    Thu tu xoa: da acknowledge truoc (cu nhat truoc), roi moi den chua acknowledge.
    File + DB row xoa cung luc. Tra ve so dong da xoa.
    """
    limit = settings.max_images_per_hive
    total = await db.scalar(
        select(func.count()).select_from(HiveAlert).where(HiveAlert.hive_id == hive_id)
    ) or 0
    if total <= limit:
        return 0

    overflow = total - limit
    victims = (
        await db.scalars(
            select(HiveAlert)
            .where(HiveAlert.hive_id == hive_id)
            .order_by(HiveAlert.is_acknowledged.desc(), HiveAlert.created_at.asc())
            .limit(overflow)
        )
    ).all()

    for alert in victims:
        delete_capture(alert.image_path)   # file truoc
        await db.delete(alert)             # roi DB row — cung mot buoc xu ly
    await db.commit()
    logger.info("Retention hive %d: xoa %d anh cu (con %d)", hive_id, len(victims), limit)
    return len(victims)
