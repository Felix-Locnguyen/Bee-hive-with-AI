"""Flow A — worker quet camera nen, chay doc lap voi UI.

Thiet ke:
- 1 asyncio task moi thùng + 1 scheduler (15s) quan ly task theo camera_config
  (them/tat/bot thùng, doi interval/video -> ap dung ngay, khong can restart).
- Moi tick co per-hive lock: tick truoc chua xong -> bo qua tick nay.
- Moi tick: mo video -> lay 3-5 khung (demo: lay dung moc giay co thien dich)
  -> inference trong ThreadPoolExecutor -> release VideoCapture NGAY.
- Moi loi (file thieu, doc that bai, model that bai/qua nhan) deu duoc log
  va khong bao gio khoi dong worker.

GIOI HAN DEMO v1 (ghi ro): worker chay trong 1 process cung FastAPI.
Timeout chi dung cho viec DUNG CHO — thread dang chay van chay het va ket qua
bi bo; khong co co che huy thread. Muon scale -> tach thanh service rieng.
"""
from __future__ import annotations

import asyncio
import logging
import random
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.camera import storage
from app.camera.source import CameraError, open_camera
from app.config import settings
from app.database import AsyncSessionLocal
from app.models.camera_config import CameraConfig
from app.models.hive_alert import HiveAlert
from app.services import ai_service

logger = logging.getLogger(__name__)

CONFIG_REFRESH_SEC = 15      # scheduler doi lai camera_config
FIRST_TICK_JITTER_SEC = 5.0  # tranh 128 thùng cung gui 1 luot inference


@dataclass(frozen=True)
class ScanJob:
    """Anh hinh cua CameraConfig — KHONG dua object ORM vao thread."""

    hive_id: int
    video_path: str
    scan_interval_sec: int
    confidence_threshold: float
    demo_timestamps: tuple[float, ...]


@dataclass
class ScanResult:
    hive_id: int
    detection: ai_service.Detection
    frame: object  # np.ndarray khung goc de ve bbox khi luu


def _scan_sync(job: ScanJob) -> ScanResult | None:
    """Chay trong thread: mo video, lay khung, inference, tra ve phat hien manh nhat.

    Chi quan tam lop thien dich (ENEMY_LABEL). Bat loi -> log + None.
    """
    video = Path(settings.video_dir) / job.video_path
    try:
        with open_camera(video) as source:
            if settings.demo_mode and job.demo_timestamps:
                frames = [
                    f for f in (
                        source.read_frame(source.frame_index_at(t))
                        for t in job.demo_timestamps
                    )
                    if f is not None
                ]
            else:
                frames = source.sample_frames(settings.scan_frames, gap_sec=3.0)
    except CameraError as exc:
        logger.warning("hive %d: %s", job.hive_id, exc)
        return None
    except Exception:
        logger.exception("hive %d: loi mo video %s", job.hive_id, job.video_path)
        return None

    if not frames:
        logger.warning("hive %d: khong doc duoc khung hinh tu %s", job.hive_id, job.video_path)
        return None

    best_conf = -1.0
    best_det: ai_service.Detection | None = None
    best_frame = None
    for frame in frames:
        try:
            detections = ai_service.detect(frame, conf=job.confidence_threshold)
        except ai_service.InferenceError as exc:
            logger.error("hive %d: %s", job.hive_id, exc)
            return None  # model loi -> khong tao canh bao gia
        for det in detections:
            if det.label.strip() != ai_service.ENEMY_LABEL:
                continue  # chi "thien dich" moi gay canh bao
            if det.confidence > best_conf:
                best_conf, best_det, best_frame = det.confidence, det, frame

    if best_det is None:
        return None
    return ScanResult(hive_id=job.hive_id, detection=best_det, frame=best_frame)


def _aware(dt: datetime | None) -> datetime | None:
    if dt is None or dt.tzinfo is not None:
        return dt
    return dt.replace(tzinfo=timezone.utc)


class CameraWorker:
    """Quan ly cac loop quet theo thùng. Khoi dong trong lifespan cua FastAPI."""

    def __init__(self) -> None:
        self._executor = ThreadPoolExecutor(
            max_workers=settings.inference_workers, thread_name_prefix="cam-scan"
        )
        self._busy: set[int] = set()
        self._tasks: dict[int, asyncio.Task] = {}
        self._scheduler: asyncio.Task | None = None
        self._stopped = True

    # ---------------------------------------------------------------- lifecycle
    async def start(self) -> None:
        self._stopped = False
        self._scheduler = asyncio.create_task(self._run_scheduler(), name="cam-scheduler")
        logger.info(
            "CameraWorker start (interval=%ss, demo_mode=%s, workers=%d, max_hives=%d)",
            settings.scan_interval_sec, settings.demo_mode,
            settings.inference_workers, settings.max_images_per_hive,
        )

    async def stop(self) -> None:
        self._stopped = True
        if self._scheduler:
            self._scheduler.cancel()
            await asyncio.gather(self._scheduler, return_exceptions=True)
        tasks = list(self._tasks.values())
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        self._tasks.clear()
        self._executor.shutdown(wait=False, cancel_futures=True)
        logger.info("CameraWorker da dung")

    # ---------------------------------------------------------------- scheduler
    async def _run_scheduler(self) -> None:
        while not self._stopped:
            try:
                await self._reconcile()
            except Exception:
                logger.exception("Scheduler loi khi dong bo camera_config")
            await asyncio.sleep(CONFIG_REFRESH_SEC)

    async def _reconcile(self) -> None:
        """Them loop cho thùng moi vua enable, huy loop cua thùng da tat/xoa."""
        async with AsyncSessionLocal() as db:
            enabled = set(
                (await db.scalars(
                    select(CameraConfig.hive_id).where(CameraConfig.enabled.is_(True))
                )).all()
            )

        for hive_id in enabled - set(self._tasks):
            self._tasks[hive_id] = asyncio.create_task(
                self._hive_loop(hive_id), name=f"cam-hive-{hive_id}"
            )
            logger.info("Bat quet cho hive %d", hive_id)

        for hive_id in set(self._tasks) - enabled:
            task = self._tasks.pop(hive_id)
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)
            logger.info("Tat quet cho hive %d", hive_id)

    # ---------------------------------------------------------------- per hive
    async def _load_job(self, hive_id: int) -> ScanJob | None:
        async with AsyncSessionLocal() as db:
            cfg = await db.get(CameraConfig, hive_id)
            if cfg is None or not cfg.enabled:
                return None
            return ScanJob(
                hive_id=cfg.hive_id,
                video_path=cfg.video_path,
                scan_interval_sec=cfg.scan_interval_sec,
                confidence_threshold=cfg.confidence_threshold,
                demo_timestamps=tuple(cfg.demo_timestamps or ()),
            )

    async def _hive_loop(self, hive_id: int) -> None:
        # jitter nho de 128 thùng khong gui inference cung 1 luc
        await asyncio.sleep(random.uniform(0, FIRST_TICK_JITTER_SEC))
        while not self._stopped:
            job = await self._load_job(hive_id)
            if job is None:
                await asyncio.sleep(CONFIG_REFRESH_SEC)
                continue
            await self._scan_once(job)
            await asyncio.sleep(job.scan_interval_sec)

    async def _scan_once(self, job: ScanJob) -> None:
        if job.hive_id in self._busy:
            logger.debug("Bo qua tick: hive %d dang quet tiep", job.hive_id)
            return
        self._busy.add(job.hive_id)
        started = time.perf_counter()
        try:
            loop = asyncio.get_running_loop()
            result = await asyncio.wait_for(
                loop.run_in_executor(self._executor, _scan_sync, job),
                timeout=settings.scan_timeout_sec,
            )
            if result is not None:
                await self._handle_result(job, result)
            logger.debug(
                "hive %d quet xong (%.0fms)%s",
                job.hive_id, (time.perf_counter() - started) * 1000,
                " — CO THIEN DICH" if result else "",
            )
        except asyncio.TimeoutError:
            logger.warning(
                "hive %d: quet qua %ds — bo qua tick", job.hive_id, settings.scan_timeout_sec
            )
        except Exception:
            logger.exception("hive %d: loi khi quet (worker van chay)", job.hive_id)
        finally:
            self._busy.discard(job.hive_id)

    # ---------------------------------------------------------------- alerting
    async def _handle_result(self, job: ScanJob, result: ScanResult) -> None:
        det = result.detection
        alert_type = det.label.strip()
        now = datetime.now(timezone.utc)

        async with AsyncSessionLocal() as db:
            last = _aware(await db.scalar(
                select(HiveAlert.created_at)
                .where(HiveAlert.hive_id == job.hive_id, HiveAlert.alert_type == alert_type)
                .order_by(HiveAlert.created_at.desc())
                .limit(1)
            ))
            if last is not None and (now - last).total_seconds() < settings.alert_cooldown_sec:
                logger.info(
                    "hive %d: trong cooldown (%s) — van phat hien conf=%.2f nhung khong luu",
                    job.hive_id, alert_type, det.confidence,
                )
                return

            try:
                image_path = storage.save_capture(job.hive_id, result.frame, [det])
            except Exception:
                logger.exception("hive %d: khong luu duoc anh canh bao", job.hive_id)
                return

            db.add(
                HiveAlert(
                    hive_id=job.hive_id,
                    alert_type=alert_type,
                    confidence=round(det.confidence, 4),
                    image_path=image_path,
                    is_acknowledged=False,
                )
            )
            await db.commit()
            await storage.enforce_retention(db, job.hive_id)

        logger.info(
            "CANH BAO hive %d | %s | conf=%.2f | %s",
            job.hive_id, alert_type, det.confidence, image_path,
        )


worker = CameraWorker()  # singleton — goi trong lifespan cua main.py
