"""ai_service.py — Goi mo hinh YOLO hien co de phat hien thien dich.

CHI GOI mo hinh (ultralytics YOLO + weights best.pt). Khong sua model,
khong sua weights, khong sua notebook. Model duoc tai 1 lan va dung lai.
"""
from __future__ import annotations

import logging
import threading
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)

# Lop "thien dich" trong model hien co (classes: bee / 'bee ' / hornet)
ENEMY_LABEL = "hornet"


@dataclass(frozen=True)
class Detection:
    """1 phat hien tren frame — du lieu thuan, khong giu object ultralytics."""

    label: str
    confidence: float
    xyxy: tuple[float, float, float, float]


class InferenceError(RuntimeError):
    """Loi chay inference: weights khong ton tai, model tai that bai, predict loi."""


_model = None
_model_lock = threading.Lock()
_infer_lock = threading.Lock()   # ultralytics predict khong bao dam thread-safe


def _load_model():
    global _model
    if _model is not None:
        return _model
    with _model_lock:
        if _model is not None:
            return _model
        path = Path(settings.model_path)
        if not path.exists():
            raise InferenceError(f"Khong tim thay weights: {path}")
        from ultralytics import YOLO  # import cham — chi can khi chay thuc te

        model = YOLO(str(path))
        _model = model
        logger.info("Da tai model YOLO: %s | classes=%s", path, model.names)
    return _model


def detect(frame: np.ndarray, conf: float = 0.5) -> list[Detection]:
    """Chay inference tren 1 frame BGR. Tra ve [] neu khong co gi.

    Nang InferenceError neu model/predict loi — caller bat va log.
    """
    if frame is None or frame.size == 0:
        return []
    model = _load_model()
    try:
        with _infer_lock:
            results = model.predict(source=frame, imgsz=640, conf=conf, verbose=False)
    except Exception as exc:
        raise InferenceError(f"model.predict that bai: {exc}") from exc

    if not results:
        return []
    result = results[0]
    detections: list[Detection] = []
    for box in result.boxes:
        x1, y1, x2, y2 = (float(v) for v in box.xyxy[0])
        detections.append(
            Detection(
                label=str(result.names[int(box.cls)]),
                confidence=float(box.conf),
                xyxy=(x1, y1, x2, y2),
            )
        )
    return detections


def annotate(frame: np.ndarray, conf: float = 0.6) -> np.ndarray:
    """Run YOLO on one BGR frame and return its rendered bounding boxes."""
    model = _load_model()
    try:
        with _infer_lock:
            results = model.predict(source=frame, imgsz=640, conf=conf, verbose=False)
            if not results:
                raise InferenceError("model.predict khong tra ve ket qua")
            return results[0].plot()
    except InferenceError:
        raise
    except Exception as exc:
        raise InferenceError(f"model.predict/plot that bai: {exc}") from exc
