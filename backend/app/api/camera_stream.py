"""Flow B — xem truc tiep camera (MJPEG) khi bam "Kiểm tra ong".

- GET /api/cameras/{hive_id}/stream?token=...  -> multipart/x-mixed-replace
- Token HMAC han 60s vi the <img> khong gui duoc Authorization header.
- Moi luong co VideoCapture RIENG (hoan toan tach voi Flow A), loop tai cuoi video.
- Gioi han MAX_CONCURRENT_STREAMS -> 503 khi vuot.
."""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import logging
import queue
import threading
import time
from pathlib import Path

import cv2
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.background import BackgroundTask

from app.camera.source import CameraError, VideoFileSource, open_camera
from app.config import settings
from app.database import get_db
from app.models.camera_config import CameraConfig
from app.models.hive import Hive
from app.services import ai_service
from app.schemas.hive_alert import StreamTokenRead

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/cameras", tags=["Cameras"])

TOKEN_TTL_SEC = 60
STREAM_QUALITY = 80

_active_streams = 0


# ------------------------------------------------------------------ stream token
def _sign(hive_id: int, exp: int) -> str:
    msg = f"{hive_id}:{exp}".encode()
    return hmac.new(settings.camera_token_secret.encode(), msg, hashlib.sha256).hexdigest()


def mint_token(hive_id: int) -> tuple[str, int]:
    exp = int(time.time()) + TOKEN_TTL_SEC
    return f"{exp}.{_sign(hive_id, exp)}", TOKEN_TTL_SEC


def verify_token(hive_id: int, token: str) -> None:
    """Nang 401/403 neu token sai hoac het han."""
    try:
        exp_str, signature = token.split(".", 1)
        exp = int(exp_str)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=401, detail="Token khong hop le")
    if exp < int(time.time()):
        raise HTTPException(status_code=401, detail="Token da het han")
    if not hmac.compare_digest(signature, _sign(hive_id, exp)):
        raise HTTPException(status_code=403, detail="Token khong dung hive")


def _try_acquire_slot() -> bool:
    """Dong bo (khong await) — khong the bi interrupt boi cancellation."""
    global _active_streams
    if _active_streams >= settings.max_concurrent_streams:
        return False
    _active_streams += 1
    return True


def _release_slot() -> None:
    global _active_streams
    if _active_streams > 0:
        _active_streams -= 1


def _encode_jpeg(frame) -> bytes | None:
    ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, STREAM_QUALITY])
    return buf.tobytes() if ok else None


def _annotate_next_frame(source: VideoFileSource) -> bytes | None:
    frame = source.read_frame()
    if frame is None:
        return None
    annotated = ai_service.annotate(frame, conf=0.6)
    return _encode_jpeg(annotated)


def _produce(source: VideoFileSource, out: "queue.Queue[bytes | None]",
             stop: threading.Event, fps: float, first_frame: bytes) -> None:
    """Chay trong THREAD: YOLO annotate frame -> JPEG -> queue; release khi dung."""
    delay = 1.0 / max(1.0, fps)
    try:
        out.put_nowait(first_frame)
        while not stop.is_set():
            data = _annotate_next_frame(source)  # VideoFileSource tu loop khi het video
            if data is None:
                logger.warning("MJPEG: khong doc/encode duoc frame tiep theo")
                break
            while True:  # Giu frame moi nhat, bo frame cu neu client cham.
                try:
                    out.put_nowait(data)
                    break
                except queue.Full:
                    try:
                        out.get_nowait()
                    except queue.Empty:
                        pass
            time.sleep(delay)
    except ai_service.InferenceError as exc:
        logger.error("MJPEG: YOLO inference that bai: %s", exc)
    except Exception:
        logger.exception("MJPEG: loi khi tao frame camera")
    finally:
        source.release()


def _get_frame(out: "queue.Queue[bytes | None]", timeout: float = 1.0) -> bytes | None:
    try:
        return out.get(timeout=timeout)
    except queue.Empty:
        return None


class _StreamSession:
    """So huu VideoCapture + slot stream.

    close_now() la DONG BO (khong await) nen no khong bi ngat boi cancellation
    khi client ngat ket noi — dam bao slot khong bi ro ri.
    """

    def __init__(self, source: VideoFileSource, stop: threading.Event,
                 producer: asyncio.Future, out: "queue.Queue[bytes | None]"):
        self.source, self.stop, self.producer, self.out = source, stop, producer, out
        self._closed = False

    def close_now(self) -> None:
        if self._closed:
            return
        self._closed = True
        self.stop.set()          # producer thread se release VideoCapture trong finally
        _release_slot()

    async def wait_producer(self) -> None:
        """Best-effort cho producer thread dung sach (co bi ngat cung khong sao)."""
        try:
            await asyncio.wait_for(asyncio.shield(self.producer), timeout=5)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.debug("Producer khong dung sach trong 5s", exc_info=True)


async def _mjpeg_generator(request: Request, session: _StreamSession):
    loop = asyncio.get_running_loop()
    try:
        while True:
            if await request.is_disconnected():
                break
            data = await loop.run_in_executor(None, _get_frame, session.out)
            if data is None:
                if session.producer.done():
                    logger.warning("MJPEG: producer dung som (doc frame that bai)")
                    break
                continue  # van stall — doi frame tiep
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n"
                b"Content-Length: " + str(len(data)).encode() + b"\r\n\r\n"
                + data + b"\r\n"
            )
    finally:
        session.close_now()
        await session.wait_producer()


# ---------------------------------------------------------------------- endpoints
@router.post("/{hive_id}/stream-token", response_model=StreamTokenRead)
async def create_stream_token(hive_id: int, db: AsyncSession = Depends(get_db)):
    """POST /api/cameras/12/stream-token -> {token, expires_in, stream_url} (han 60s)."""
    if await db.get(Hive, hive_id) is None:
        raise HTTPException(status_code=404, detail="hive_id khong ton tai")
    token, ttl = mint_token(hive_id)
    return StreamTokenRead(
        token=token,
        expires_in=ttl,
        stream_url=f"/api/cameras/{hive_id}/stream?token={token}",
    )


@router.get("/{hive_id}/stream")
async def camera_stream(
    hive_id: int,
    request: Request,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """GET /api/cameras/{id}/stream?token=... — MJPEG, loop tai cuoi video."""
    verify_token(hive_id, token)

    cfg = await db.scalar(select(CameraConfig).where(CameraConfig.hive_id == hive_id))
    if cfg is None:
        raise HTTPException(status_code=404, detail="Chua co camera cho thùng nay")

    if not _try_acquire_slot():
        raise HTTPException(
            status_code=503,
            detail=f"Da dat gioi han xem dong thoi ({settings.max_concurrent_streams}). "
                   "Hay dong mot cua so khac.",
        )

    video = Path(settings.video_dir) / cfg.video_path
    loop = asyncio.get_running_loop()
    source: VideoFileSource | None = None
    try:
        source = await loop.run_in_executor(None, open_camera, video)
        first_frame = await loop.run_in_executor(None, _annotate_next_frame, source)
        if first_frame is None:
            raise CameraError(f"Khong doc/encode duoc frame tu video: {video}")
    except CameraError as exc:
        if source is not None:
            source.release()
        _release_slot()
        raise HTTPException(status_code=404, detail=str(exc))
    except ai_service.InferenceError as exc:
        if source is not None:
            source.release()
        _release_slot()
        logger.exception("hive %d: YOLO khong the xu ly frame dau tien", hive_id)
        raise HTTPException(status_code=503, detail=f"Khong chay duoc YOLO: {exc}")
    except Exception as exc:
        if source is not None:
            source.release()
        _release_slot()
        logger.exception("hive %d: khong mo duoc camera", hive_id)
        raise HTTPException(status_code=500, detail=f"Khong mo duoc camera: {exc}")

    stop = threading.Event()
    out: queue.Queue = queue.Queue(maxsize=2)
    producer = loop.run_in_executor(
        None, _produce, source, out, stop, float(settings.mjpeg_fps), first_frame
    )
    session = _StreamSession(source, stop, producer, out)

    return StreamingResponse(
        _mjpeg_generator(request, session),
        media_type="multipart/x-mixed-replace; boundary=frame",
        # Safety net: neu generator khong chay (client ngat ngay) van giai phong duoc
        background=BackgroundTask(session.close_now),
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
