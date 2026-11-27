"""CameraSource — giao dien doc khung hinh cho camera.

Flow A (worker quet nen) va Flow B (MJPEG) deu chi biet interface nay.
Demo v1 chi co VideoFileSource; sau nay them RtspSource / Esp32Source
bang cach keo dai file nay — worker va API khong doi gi.
"""
from __future__ import annotations

import logging
import random
from abc import ABC, abstractmethod
from pathlib import Path

import cv2
import numpy as np

logger = logging.getLogger(__name__)

DEFAULT_FPS = 30.0


class CameraError(RuntimeError):
    """Loi doc khung hinh: file khong ton tai, mo that bai, doc that bai."""


class CameraSource(ABC):
    """Giao dien chung cua nguon camera."""

    @abstractmethod
    def read_frame(self, index: int | None = None) -> np.ndarray | None:
        """Doc 1 khung hinh. index=None -> khung tiep theo; tra ve None neu that bai."""

    @abstractmethod
    def sample_frames(self, n: int, gap_sec: float = 3.0, start: int | None = None) -> list[np.ndarray]:
        """Lay n khung cach nhau gap_sec giay, wrap ve dau video khi het."""

    @abstractmethod
    def release(self) -> None:
        """Giai phong VideoCapture. Bat buoc goi trong finally."""

    @abstractmethod
    def is_open(self) -> bool:
        """True neu van doc duoc."""

    def __enter__(self) -> "CameraSource":
        return self

    def __exit__(self, *exc) -> None:
        self.release()


class VideoFileSource(CameraSource):
    """Doc frame tu file video (Demo v1) dung cv2.VideoCapture."""

    def __init__(self, path: str | Path, *, loop: bool = True):
        self.path = Path(path)
        self.loop = loop
        self._cap: cv2.VideoCapture | None = None
        self._fps: float = DEFAULT_FPS
        self._total: int = 0
        self._open()

    def _open(self) -> None:
        if not self.path.exists():
            raise CameraError(f"File video khong ton tai: {self.path}")
        cap = cv2.VideoCapture(str(self.path))
        if not cap.isOpened():
            cap.release()
            raise CameraError(f"Khong mo duoc video: {self.path}")
        self._cap = cap
        self._fps = float(cap.get(cv2.CAP_PROP_FPS)) or DEFAULT_FPS
        self._total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

    @property
    def fps(self) -> float:
        return self._fps

    @property
    def total_frames(self) -> int:
        return self._total

    def frame_index_at(self, seconds: float) -> int:
        """Chuyen so giay -> index frame (wrap trong doan video)."""
        if self._total <= 0:
            return 0
        return int(seconds * self._fps) % self._total

    def read_frame(self, index: int | None = None) -> np.ndarray | None:
        if self._cap is None:
            return None
        if index is not None:
            if self._total > 0:
                index = index % self._total
            self._cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, index))
        ok, frame = self._cap.read()
        if not ok:
            if not self.loop:
                return None
            self._cap.set(cv2.CAP_PROP_POS_FRAMES, 0)  # wrap ve dau video
            ok, frame = self._cap.read()
            if not ok:
                logger.warning("Khong doc duoc khung hinh tu %s", self.path)
                return None
        return frame

    def sample_frames(
        self, n: int, gap_sec: float = 3.0, start: int | None = None
    ) -> list[np.ndarray]:
        if self._cap is None or self._total <= 0:
            logger.warning("Video khong co frame hop le: %s", self.path)
            return []
        step = max(1, int(round(gap_sec * self._fps)))
        pos = random.randrange(self._total) if start is None else start
        frames: list[np.ndarray] = []
        for _ in range(n):
            frame = self.read_frame(index=pos)
            if frame is not None:
                frames.append(frame)
            pos += step
        return frames

    def is_open(self) -> bool:
        return self._cap is not None

    def release(self) -> None:
        if self._cap is not None:
            self._cap.release()
            self._cap = None


def open_camera(video_path: str | Path) -> VideoFileSource:
    """Factory — sau nay them nhanh RtspSource/Esp32Source o day, worker khong doi."""
    return VideoFileSource(video_path)
