# Beehive Sound Analysis — End-to-End Pipeline (Phase 1)

> **Bài toán:** Binary classification — `queenright` (có ong chúa) vs `queenless` (mất ong chúa)
> **Dữ liệu:** `Data/AUDIO-BEE-DATA/` (20 file audio hợp lệ cho binary, ~2.9 giờ, nhãn theo tên file)
> **Feature chính:** Log-Mel Spectrogram (CNN) + MFCC-stats (Baseline)
> **Chạy được trên:** local (venv đã có torch + soundfile) hoặc Google Colab

---

## 1. Cấu trúc dự án

```
analyze_bee_sound/
├── code_recomand.md          ← file này
├── Data/AUDIO-BEE-DATA/      ← dữ liệu âm thanh + nhãn .lab
├── features/                 ← tự tạo khi chạy preprocess (features.npz, manifest.csv)
├── weights/                  ← kết quả train (results_*.npz) + confusion matrix PNG
├── src/
│   ├── __init__.py           ← file RỖNG (tạo mới)
│   ├── io.py                 ← quét data, gán nhãn & group, build manifest
│   ├── preprocessing.py      ← load, resample, high-pass, slice, augment
│   ├── features.py           ← Log-Mel + MFCC-stats
│   ├── train_model.py        ← Baseline (RF) + CNN (PyTorch), cross-validation
│   ├── eval_model.py         ← metrics, confusion matrix, recording-level scoring
│   └── pipeline.py           ← CLI điều phối: preprocess | train | eval
└── notebooks/                ← EDA & trình bày từng bước (mirror src/)
```

## 2. Cài đặt dependencies

```bash
# Local (venv đã có torch, soundfile, numpy)
pip install librosa scikit-learn pandas matplotlib tqdm

# Google Colab: chạy cell này trước
!pip install -q librosa scikit-learn pandas matplotlib tqdm
```

---

## 3. Code từng file

### 3.1 `src/__init__.py` — tạo file rỗng

```python
# (file rỗng — để dùng: python -m src.pipeline ...)
```

---

### 3.2 `src/io.py` — quét dữ liệu, gán nhãn & group

```python
"""io.py — Quét dữ liệu âm thanh ong: đọc file, gán nhãn & nhóm (group), build manifest.

Nhận xét data thật:
- Nhãn suy ra từ TÊN FILE: "NO_QueenBee"/"Missing Queen" -> queenless, "QueenBee" -> queenright
- Nhóm chống leakage: session ghi âm (hive + ngày) — mọi clip cùng nhóm phải nằm cùng fold
- File .lab (bee/nobee theo giây) là nhãn SỰ CÓ MẶT CỦA ONG, KHÔNG phải nhãn trạng thái
"""
from __future__ import annotations

import re
from pathlib import Path

import pandas as pd
import soundfile as sf

AUDIO_EXTS = {".wav", ".mp3", ".flac"}
LABEL_MAP = {"queenright": 0, "queenless": 1}
CLASS_NAMES = ["queenright", "queenless"]


def parse_label(filename: str) -> str | None:
    """Suy ra nhãn trạng thái từ tên file. None = bỏ qua (active/swarming/unknown)."""
    n = filename.lower()
    if "no_queenbee" in n or "missing queen" in n:
        return "queenless"
    if "queenbee" in n or "queenright" in n or "queen right" in n:
        return "queenright"
    return None


def parse_group(filename: str) -> str:
    """Nhóm chống data-leakage: 'Hive1_12_06_2018' nếu có, không thì hive code ('CJ001')."""
    m = re.search(r"Hive\d+_\d{2}_\d{2}_\d{4}", filename)
    if m:
        return m.group(0)
    m = re.match(r"([A-Z]{2}\d{3})", filename)
    if m:
        return m.group(1)
    return Path(filename).stem


def _audio_info(path: Path):
    """Đọc metadata; fallback librosa nếu libsndfile không hỗ trợ mp3."""
    try:
        info = sf.info(str(path))
        return info.samplerate, float(info.duration), info.channels
    except Exception:
        import librosa
        return None, float(librosa.get_duration(path=str(path))), None


def build_manifest(data_dir: str | Path) -> pd.DataFrame:
    """Quét thư mục audio -> DataFrame manifest (path, label, group, sr, duration, lab)."""
    data_dir = Path(data_dir)
    if not data_dir.exists():
        raise FileNotFoundError(f"Không tồn tại path: {data_dir}")

    rows = []
    for p in sorted(data_dir.iterdir()):
        if not p.is_file() or p.suffix.lower() not in AUDIO_EXTS:
            continue
        label = parse_label(p.name)
        if label is None:                       # active / swarming / unknown -> bỏ qua Phase 1
            continue
        sr, dur, ch = _audio_info(p)
        rows.append({
            "path": str(p),
            "filename": p.name,
            "label": label,
            "label_id": LABEL_MAP[label],
            "group": parse_group(p.name),
            "sr": sr,
            "duration": round(dur, 2),
            "channels": ch,
            "lab": str(p.with_suffix(".lab")),  # file nhãn .lab (nếu có)
        })

    if not rows:
        raise FileNotFoundError(f"Không tìm thấy file audio hợp lệ trong {data_dir}")

    df = pd.DataFrame(rows)
    df["has_lab"] = df["lab"].map(lambda x: Path(x).exists())
    return df


if __name__ == "__main__":
    m = build_manifest("Data/AUDIO-BEE-DATA")
    print(m.groupby(["label", "group"]).size())
    print(f"Total: {len(m)} file, {m.duration.sum()/3600:.2f} giờ")
```

---

### 3.3 `src/preprocessing.py` — load, chuẩn hóa, cắt clip, augment

```python
"""preprocessing.py — Load âm thanh, chuẩn hóa, cắt clip ngắn, augmentation.

Thiết kế (vì sao):
- 16 kHz mono: phủ dải sinh học 0–8 kHz (wingbeat ~200–250 Hz, piping ~400–800 Hz),
  chuẩn hóa đồng nhất file 32 kHz vs 44.1 kHz, nhẹ cho model.
- High-pass 80 Hz: loại gió / rung máy / hum điện.
- Clip 3 s, hop 1.5 s (50% overlap): tổ ong stationary trong vài chục giây ->
  clip 3 s là mẫu IID hợp lý; ngắn hơn mất context piping, dài hơn giảm số mẫu.
- Chỉ cắt đoạn .lab = 'bee' (loại đoạn 'nobee' — không có ong trong mic).
- Augmentation AN TOÀN với đặc trưng sinh học: gain, time-shift, thêm noise.
  CẤM pitch-shift lớn (wingbeat/piping CHÍNH là tần số phân loại).
"""
from __future__ import annotations

from pathlib import Path

import librosa
import numpy as np
from scipy.signal import butter, sosfilt

TARGET_SR = 16000
CLIP_SEC = 3.0
HOP_SEC = 1.5
PEAK = 0.95


def highpass(y: np.ndarray, sr: int, cut: float = 80.0, order: int = 4) -> np.ndarray:
    """Butterworth high-pass — loại gió/rung/hiềm tần."""
    sos = butter(order, cut / (sr / 2), btype="highpass", output="sos")
    return sosfilt(sos, y).astype(np.float32)


def normalize_peak(y: np.ndarray, peak: float = PEAK) -> np.ndarray:
    """Chuẩn hóa peak toàn recording (GIỮ relative loudness giữa các file)."""
    m = float(np.max(np.abs(y))) or 1.0
    return (y / m) * peak


def load_audio(path: str | Path, sr: int = TARGET_SR, hp: float = 80.0) -> np.ndarray:
    """Đọc audio -> mono float32 @16 kHz, high-pass, peak-normalize."""
    y, _ = librosa.load(str(path), sr=sr, mono=True)
    if hp:
        y = highpass(y, sr, hp)
    return normalize_peak(y).astype(np.float32)


def parse_lab(lab_path: str | Path) -> list[tuple[float, float, str]]:
    """Đọc file .lab: dòng 'start end label' (dòng đầu là tiêu đề — bỏ qua nếu không parse được)."""
    segs = []
    p = Path(lab_path)
    if not p.exists():
        return segs
    for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
        parts = line.split()
        if len(parts) >= 3:
            try:
                start, end = float(parts[0]), float(parts[1])
            except ValueError:
                continue
            segs.append((start, end, parts[2]))
    return segs


def slice_clips(
    y: np.ndarray,
    sr: int = TARGET_SR,
    lab_path: str | Path | None = None,
    clip_sec: float = CLIP_SEC,
    hop_sec: float = HOP_SEC,
) -> list[tuple[np.ndarray, float]]:
    """Cắt waveform thành clip (clip_sec, hop 50%). Trả về [(clip, start_time_sec)].

    Nếu có file .lab: chỉ cắt đoạn label == 'bee' (đoạn ngắn hơn clip_sec bị bỏ).
    """
    n, hop = int(clip_sec * sr), int(hop_sec * sr)
    clips = []

    segments = [(s, e) for s, e, lab in parse_lab(lab_path or "") if lab == "bee"]
    if lab_path and Path(lab_path).exists() and not segments:
        segments = [(0.0, len(y) / sr)]          # lab không có đoạn 'bee' -> dùng toàn file
    if not lab_path or not Path(lab_path).exists():
        segments = [(0.0, len(y) / sr)]          # không có lab -> dùng toàn file

    for s, e in segments:
        if e - s < clip_sec:                     # đoạn quá ngắn -> bỏ
            continue
        i0, i1 = int(s * sr), min(int(e * sr), len(y))
        for st in range(i0, i1 - n + 1, hop):
            clip = y[st:st + n]
            if len(clip) == n:
                clips.append((clip.copy(), st / sr))
    return clips


def add_noise(y: np.ndarray, snr_db: float, rng: np.random.Generator) -> np.ndarray:
    """Thêm white noise đạt SNR mục tiêu (mô phỏng noise nền ngoài trời)."""
    noise = rng.standard_normal(len(y)).astype(np.float32)
    ps, pn = float(np.mean(y ** 2)) + 1e-9, float(np.mean(noise ** 2)) + 1e-9
    return y + noise * np.sqrt(ps / (pn * 10 ** (snr_db / 10)))


def augment(y: np.ndarray, sr: int = TARGET_SR, rng: np.random.Generator | None = None) -> np.ndarray:
    """Augmentation an toàn với tín hiệu sinh học: gain ±6 dB, time-shift ±0.5 s, noise SNR 15–30 dB."""
    rng = rng or np.random.default_rng()
    y = librosa.effects.gain(y, float(rng.uniform(-6, 6)))
    shift = int(rng.uniform(-0.5, 0.5) * sr)
    y = librosa.effects.time_shift(y, n_steps=shift)     # zero-padding, không wrap-around
    if rng.random() < 0.5:
        y = add_noise(y, snr_db=float(rng.uniform(15, 30)), rng=rng)
    return y.astype(np.float32)


if __name__ == "__main__":
    from io import build_manifest          # khi chạy trực tiếp: python src/preprocessing.py
    df = build_manifest("Data/AUDIO-BEE-DATA")
    row = df.iloc[0]
    wav = load_audio(row["path"])
    clips = slice_clips(wav, lab_path=row["lab"] if row["has_lab"] else None)
    print(f"{row['filename']}: {len(wav)//TARGET_SR}s -> {len(clips)} clip")
```

---

### 3.4 `src/features.py` — Log-Mel (CNN) + MFCC-stats (Baseline)

```python
"""features.py — Trích xuất đặc trưng.

- Log-Mel (64 mels, fmax 8 kHz) cho CNN 2D: giữ cấu trúc tần số–thời gian,
  nhạy với piping (400–800 Hz) và roaring (queenless).
- MFCC 20 + mean/std/delta (80 chiều) cho baseline RandomForest/LogReg.
- STFT: n_fft=1024, hop=512 @16 kHz -> cửa sổ 64 ms, hop 32 ms
  (phân giải ~16 Hz, đủ bắt tín hiệu piping).
"""
from __future__ import annotations

import librosa
import numpy as np

SR = 16000
N_FFT = 1024
HOP = 512
N_MELS = 64
FMAX = 8000
N_MFCC = 20
DB_FLOOR = 80.0          # floor dB dưới của log-mel


def log_mel(y: np.ndarray, sr: int = SR) -> np.ndarray:
    """Log-Mel spectrogram (N_MELS, T) đã scale về [0, 1]."""
    m = librosa.feature.melspectrogram(
        y=y, sr=sr, n_fft=N_FFT, hop_length=HOP, n_mels=N_MELS, fmax=FMAX,
    )
    db = librosa.power_to_db(m, ref=np.max)          # ~[-80, 0] dB
    db = np.clip((db + DB_FLOOR) / DB_FLOOR, 0.0, 1.0)
    return db.astype(np.float32)


def mfcc_stats(y: np.ndarray, sr: int = SR) -> np.ndarray:
    """Vector MFCC-stats 80 chiều: mean/std của MFCC + mean/std của delta."""
    m = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=N_MFCC, n_fft=N_FFT, hop_length=HOP)
    d = librosa.feature.delta(m)
    return np.concatenate([m.mean(1), m.std(1), d.mean(1), d.std(1)]).astype(np.float32)


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    y = rng.standard_normal(3 * SR).astype(np.float32) * 0.1
    print("log_mel:", log_mel(y).shape)      # (64, 94)
    print("mfcc_stats:", mfcc_stats(y).shape)  # (80,)
```

---

### 3.5 `src/train_model.py` — Baseline (RF) + CNN (PyTorch) + Cross-Validation

```python
"""train_model.py — Baseline và CNN, đánh giá bằng StratifiedGroupKFold.

Ladder mô hình (từ đơn giản -> nâng cao):
1. Baseline: MFCC-stats -> RandomForest (class_weight='balanced') — sanity check.
   Nếu baseline ~ random -> data/nhãn có vấn đề, ĐỪNG vọc CNN.
2. CNN chính: 3 block Conv-BN-ReLU-Pool + GlobalAvgPool (~500K tham số),
   weighted Cross-Entropy, early-stop theo val macro-F1.

Chống leakage (quan trọng nhất):
- StratifiedGroupKFold theo recording session — mọi clip cùng file/nhóm ở cùng fold.
- Validation = 20% nhóm của fold train (không lấy clip rải rác).
- Augmentation chỉ áp lên fold train (SpecAugment trong lúc train).
"""
from __future__ import annotations

import numpy as np
import torch
import torch.nn as nn
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import f1_score
from sklearn.model_selection import StratifiedGroupKFold

CLASS_NAMES = ["queenright", "queenless"]
SEED = 42


def set_seed(seed: int = SEED) -> None:
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)


def make_folds(groups: np.ndarray, y: np.ndarray, n_splits: int = 5):
    """StratifiedGroupKFold — clamp số fold theo số nhóm duy nhất (data nhỏ)."""
    groups = np.asarray(groups)
    n_groups = len(np.unique(groups))
    n_splits = max(2, min(n_splits, n_groups))
    sgkf = StratifiedGroupKFold(n_splits=n_splits, shuffle=True, random_state=SEED)
    return list(sgkf.split(np.zeros(len(y)), y, groups))


# ----------------------------------------------------------------------------------
# Stage A — Baseline: MFCC-stats + RandomForest
# ----------------------------------------------------------------------------------
def train_baseline(
    X: np.ndarray, y: np.ndarray, groups: np.ndarray, n_splits: int = 5,
) -> tuple[np.array, np.ndarray]:
    """Cross-validation baseline. Trả về (fold_scores, oof_proba N×2)."""
    folds = make_folds(groups, y, n_splits)
    oof = np.zeros((len(y), len(CLASS_NAMES)), dtype=np.float32)
    scores = []
    for k, (tr, te) in enumerate(folds):
        clf = RandomForestClassifier(
            n_estimators=300, class_weight="balanced", random_state=SEED, n_jobs=-1,
        )
        clf.fit(X[tr], y[tr])
        oof[te] = clf.predict_proba(X[te])
        f = f1_score(y[te], oof[te].argmax(1), average="macro")
        scores.append(f)
        print(f"  [baseline] fold {k+1}/{len(folds)}: test macro-F1 = {f:.3f} (n={len(te)})")
    return np.array(scores), oof


# ----------------------------------------------------------------------------------
# Stage B — CNN trên Log-Mel
# ----------------------------------------------------------------------------------
class SmallCNN(nn.Module):
    """CNN nhỏ cho log-mel (B,1,64,94): 3 conv block -> GAP -> Dropout -> FC."""

    def __init__(self, n_classes: int = 2, dropout: float = 0.3):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 32, 3, padding=1), nn.BatchNorm2d(32), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(32, 64, 3, padding=1), nn.BatchNorm2d(64), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(64, 128, 3, padding=1), nn.BatchNorm2d(128), nn.ReLU(), nn.MaxPool2d(2),
        )
        self.head = nn.Sequential(
            nn.AdaptiveAvgPool2d(1), nn.Flatten(), nn.Dropout(dropout), nn.Linear(128, n_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.head(self.features(x))


def spec_augment(mel: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    """SpecAugment nhẹ: 2 time-mask + 2 freq-mask (an toàn — không đổi tần số sinh học)."""
    out = mel.copy()
    t, f = out.shape[1], out.shape[0]
    for _ in range(2):                                   # time mask
        w = int(rng.integers(0, t // 8 + 1))
        if w:
            s = int(rng.integers(0, t - w + 1))
            out[:, s:s + w] = 0.0
    for _ in range(2):                                   # freq mask
        w = int(rng.integers(0, f // 8 + 1))
        if w:
            s = int(rng.integers(0, f - w + 1))
            out[s:s + w, :] = 0.0
    return out


@torch.no_grad()
def _predict_proba(model, X, device, batch: int = 128) -> np.ndarray:
    model.eval()
    outs = []
    for s in range(0, len(X), batch):
        xb = torch.from_numpy(X[s:s + batch, None, :, :]).float().to(device)
        outs.append(torch.softmax(model(xb), dim=1).cpu().numpy())
    return np.vstack(outs)


def train_cnn(
    X: np.ndarray,                       # (N, 64, T) log-mel float32
    y: np.ndarray,
    groups: np.ndarray,
    n_splits: int = 5,
    epochs: int = 40,
    batch_size: int = 32,
    lr: float = 1e-3,
    patience: int = 8,
    device: str | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    """Cross-validation CNN. Trả về (fold_scores, oof_proba N×2)."""
    set_seed()
    rng = np.random.default_rng(SEED)
    device = device or ("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[cnn] device = {device}")

    folds = make_folds(groups, y, n_splits)
    oof = np.zeros((len(y), len(CLASS_NAMES)), dtype=np.float32)
    scores = []

    for k, (tr, te) in enumerate(folds):
        # --- tách val theo NHÓM (20% nhóm của fold train) ---
        tr_groups = np.unique(groups[tr])
        rng.shuffle(tr_groups)
        n_val = max(1, int(len(tr_groups) * 0.2))
        val_groups = tr_groups[:n_val]
        is_val = np.isin(groups[tr], val_groups)
        tr_i, va_i = tr[~is_val], tr[is_val]
        if len(va_i) == 0:
            va_i = tr_i

        model = SmallCNN().to(device)
        opt = torch.optim.Adam(model.parameters(), lr=lr)
        counts = np.bincount(y[tr_i], minlength=len(CLASS_NAMES)).astype(np.float32)
        w = torch.tensor(len(tr_i) / (len(CLASS_NAMES) * np.maximum(counts, 1)), device=device)
        crit = nn.CrossEntropyLoss(weight=w)            # xử lý class imbalance

        best_f1, best_state, bad = -1.0, None, 0
        for _ in range(epochs):
            model.train()
            order = rng.permutation(len(tr_i))
            for s in range(0, len(order), batch_size):
                idx = tr_i[order[s:s + batch_size]]
                xb = np.stack([spec_augment(m, rng) for m in X[idx]])[:, None]
                xb = torch.from_numpy(xb).float().to(device)
                yb = torch.from_numpy(y[idx]).long().to(device)
                opt.zero_grad()
                loss = crit(model(xb), yb)
                loss.backward()
                opt.step()

            val_pred = _predict_proba(model, X[va_i], device).argmax(1)
            val_f1 = f1_score(y[va_i], val_pred, average="macro")
            if val_f1 > best_f1 + 1e-4:                 # early stop theo val macro-F1
                best_f1, bad = val_f1, 0
                best_state = {k2: v.detach().cpu().clone() for k2, v in model.state_dict().items()}
            else:
                bad += 1
                if bad >= patience:
                    break

        if best_state is not None:
            model.load_state_dict(best_state)
        oof[te] = _predict_proba(model, X[te], device)
        f = f1_score(y[te], oof[te].argmax(1), average="macro")
        scores.append(f)
        print(f"  [cnn] fold {k+1}/{len(folds)}: test macro-F1 = {f:.3f} "
              f"(val best {best_f1:.3f}, n={len(te)})")

    return np.array(scores), oof
```

---

### 3.6 `src/eval_model.py` — metrics + Recording-level scoring

```python
"""eval_model.py — Đánh giá.

Nguyên tắc:
- Chỉ số chính: MACRO-F1 + per-class P/R/F1 + Confusion Matrix (KHÔNG tin accuracy).
- Recording-level: nhãn của data là cấp FILE -> gộp xác suất clip (mean) theo file,
  rồi chấm điểm trên ~20 file. Clip-level chỉ để tham khảo (overlap làm số ảo).
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix, f1_score

CLASS_NAMES = ["queenright", "queenless"]


def print_report(y_true: np.ndarray, y_pred: np.ndarray, title: str = "") -> np.ndarray:
    """In per-class P/R/F1 + macro-F1, trả về confusion matrix."""
    print(f"\n=== {title} ===")
    print(classification_report(
        y_true, y_pred, target_names=CLASS_NAMES, digits=3, zero_division=0,
    ))
    print(f"macro-F1 = {f1_score(y_true, y_pred, average='macro'):.3f}")
    return confusion_matrix(y_true, y_pred)


def save_confusion_png(cm: np.ndarray, out_path: str | Path, title: str) -> None:
    """Lưu confusion matrix dạng PNG (không cần display)."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(4, 3.5))
    im = ax.imshow(cm, cmap="Blues")
    ax.set_xticks(range(len(CLASS_NAMES)), CLASS_NAMES, rotation=30)
    ax.set_yticks(range(len(CLASS_NAMES)), CLASS_NAMES)
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, str(cm[i, j]), ha="center", va="center",
                    color="white" if cm[i, j] > cm.max() / 2 else "black")
    ax.set_xlabel("Predicted")
    ax.set_ylabel("True")
    ax.set_title(title)
    fig.colorbar(im, fraction=0.046)
    fig.tight_layout()
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, dpi=150)
    plt.close(fig)
    print(f"  -> đã lưu {out_path}")


def recording_level(
    proba: np.ndarray, files: np.ndarray, file_label: dict[str, int],
) -> pd.DataFrame:
    """Gộp xác suất clip -> xác suất theo FILE (mean), gán nhãn file thật."""
    df = pd.DataFrame({"file": list(files), "p_qr": proba[:, 0], "p_ql": proba[:, 1]})
    g = df.groupby("file")[["p_qr", "p_ql"]].mean()
    g["y_true"] = [file_label[f] for f in g.index]
    g["y_pred"] = (g["p_ql"] > 0.5).astype(int)
    return g.reset_index()


def evaluate_results(results_path: str | Path, manifest: pd.DataFrame, out_dir: str | Path):
    """Đánh giá 1 file kết quả: clip-level + recording-level + 2 confusion matrix."""
    r = np.load(results_path, allow_pickle=True)
    proba, y, files = r["oof"], r["y"], r["files"]
    name = Path(results_path).stem.replace("results_", "")

    cm_clip = print_report(y, proba.argmax(1), title=f"{name} — CLIP level")
    save_confusion_png(cm_clip, Path(out_dir) / f"confusion_{name}_clip.png",
                       f"{name} — clip-level")

    file_label = dict(zip(manifest["filename"], manifest["label_id"]))
    rec = recording_level(proba, files, file_label)
    cm_rec = print_report(rec["y_true"].values, rec["y_pred"].values,
                          title=f"{name} — RECORDING level ({len(rec)} file)")
    save_confusion_png(cm_rec, Path(out_dir) / f"confusion_{name}_recording.png",
                       f"{name} — recording-level")
    rec.to_csv(Path(out_dir) / f"recording_preds_{name}.csv", index=False)
```

---

### 3.7 `src/pipeline.py` — CLI điều phối

```python
"""pipeline.py — Điều phối pipeline: preprocess | train | eval.

Chạy từ thư mục analyze_bee_sound/:
    python -m src.pipeline preprocess [--aug 1]
    python -m src.pipeline train --model both [--splits 5] [--epochs 40]
    python -m src.pipeline eval
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

from . import eval_model, features, io, preprocessing, train_model

DATA_DIR = Path("Data/AUDIO-BEE-DATA")
FEAT_DIR = Path("features")
WEIGHTS_DIR = Path("weights")


def stage_preprocess(data_dir: Path = DATA_DIR, aug: int = 0, seed: int = 42) -> None:
    """Build manifest -> cắt clip -> trích Log-Mel + MFCC -> cache .npz.

    aug: số bản augment waveform thêm mỗi clip (giữ nguyên group -> không leakage).
    """
    rng = np.random.default_rng(seed)
    df = io.build_manifest(data_dir)
    print(f"Manifest: {len(df)} file "
          f"({df.groupby('label').size().to_dict()})")

    X_mel, X_mfcc, y, groups, files = [], [], [], [], []
    for _, row in df.iterrows():
        wav = preprocessing.load_audio(row["path"])
        lab = row["lab"] if row["has_lab"] else None
        clips = preprocessing.slice_clips(wav, lab_path=lab)
        for clip, _t0 in clips:
            for wave in [clip] + [preprocessing.augment(clip, rng=rng) for _ in range(aug)]:
                X_mel.append(features.log_mel(wave))
                X_mfcc.append(features.mfcc_stats(wave))
                y.append(row["label_id"])
                groups.append(row["group"])
                files.append(row["filename"])
        print(f"  {row['filename'][:50]:52s} -> {len(clips)} clip")

    FEAT_DIR.mkdir(exist_ok=True)
    np.savez_compressed(
        FEAT_DIR / "features.npz",
        X_mel=np.stack(X_mel).astype(np.float32),
        X_mfcc=np.stack(X_mfcc).astype(np.float32),
        y=np.array(y, dtype=np.int64),
        groups=np.array(groups),
        files=np.array(files),
    )
    df.to_csv(FEAT_DIR / "manifest.csv", index=False)
    print(f"Đã lưu {len(y)} clip -> {FEAT_DIR}/features.npz "
          f"(x{1 + aug} nếu có augment)")


def stage_train(model: str = "both", splits: int = 5, epochs: int = 40) -> None:
    """Train baseline và/hoặc CNN bằng StratifiedGroupKFold, lưu oof probabilities."""
    data = np.load(FEAT_DIR / "features.npz")
    y, groups = data["y"], data["groups"]
    print(f"Train trên {len(y)} clip, {len(np.unique(groups))} nhóm, "
          f"{np.bincount(y).tolist()} clip/lớp")

    WEIGHTS_DIR.mkdir(exist_ok=True)
    if model in ("baseline", "both"):
        scores, oof = train_model.train_baseline(data["X_mfcc"], y, groups, splits)
        np.savez(WEIGHTS_DIR / "results_baseline.npz", oof=oof, y=y, files=data["files"],
                 fold_scores=scores)
        print(f"[baseline] macro-F1 = {scores.mean():.3f} ± {scores.std():.3f}\n")

    if model in ("cnn", "both"):
        scores, oof = train_model.train_cnn(data["X_mel"], y, groups, splits, epochs=epochs)
        np.savez(WEIGHTS_DIR / "results_cnn.npz", oof=oof, y=y, files=data["files"],
                 fold_scores=scores)
        print(f"[cnn] macro-F1 = {scores.mean():.3f} ± {scores.std():.3f}")


def stage_eval() -> None:
    """Đánh giá mọi file results_*.npz: clip-level + recording-level."""
    manifest = pd.read_csv(FEAT_DIR / "manifest.csv")
    found = sorted(WEIGHTS_DIR.glob("results_*.npz"))
    if not found:
        print("Chưa có kết quả — chạy trước: python -m src.pipeline train")
        return
    for rp in found:
        eval_model.evaluate_results(rp, manifest, WEIGHTS_DIR)


def main() -> None:
    ap = argparse.ArgumentParser(description="Beehive sound pipeline")
    ap.add_argument("stage", choices=["preprocess", "train", "eval"])
    ap.add_argument("--data", default=str(DATA_DIR))
    ap.add_argument("--model", default="both", choices=["baseline", "cnn", "both"])
    ap.add_argument("--aug", type=int, default=0, help="số bản augment/clip khi preprocess")
    ap.add_argument("--splits", type=int, default=5)
    ap.add_argument("--epochs", type=int, default=40)
    args = ap.parse_args()

    if args.stage == "preprocess":
        stage_preprocess(Path(args.data), aug=args.aug)
    elif args.stage == "train":
        stage_train(args.model, args.splits, args.epochs)
    else:
        stage_eval()


if __name__ == "__main__":
    main()
```

---

## 4. Cách chạy

```bash
cd ai_engine/analyze_bee_sound

# Bước 1 — tiền xử lý + trích feature (~1–2 phút)
python -m src.pipeline preprocess            # không augment
python -m src.pipeline preprocess --aug 1    # thêm 1 bản augment/clip (khuyến nghị)

# Bước 2 — train Baseline (RF) + CNN, 5-fold StratifiedGroupKFold
python -m src.pipeline train --model both --epochs 40

# Bước 3 — đánh giá: clip-level + recording-level + confusion matrix PNG
python -m src.pipeline eval
# -> weights/confusion_cnn_recording.png, weights/recording_preds_cnn.csv
```

**Google Colab:** upload thư mục `src/` + `Data/` vào `/content`, cd vào thư mục chứa `src/`, chạy y hệt 3 lệnh trên (Colab có GPU T4 → CNN ~1 phút/fold).

**Notebooks (trình bày):** mỗi notebook `import` từ `src/`:

```python
import sys; sys.path.append("..")   # chạy notebook trong thư mục notebooks/
from src import io, preprocessing, features, train_model, eval_model
```

| Notebook | Nội dung trình bày |
|---|---|
| `preprocessing.ipynb` | manifest, waveform/spectrogram before–after, phân bố clip/lớp |
| `features.ipynb` | Log-Mel vs MFCC của 2 lớp, Augmentation trước/sau |
| `train_model.ipynb` | learning curve, baseline vs CNN theo fold |
| `eval_model.ipynb` | confusion matrix (clip + recording), bảng dự đoán từng file |

---

## 5. Giải thích nhanh rationale & bẫy thường gặp

| Quyết định | Vì sao | Bẫy nếu sai |
|---|---|---|
| Resample **16 kHz mono** | phủ 0–8 kHz sinh học, chuẩn hóa 32k vs 44.1k | model học "file nào là file nào" từ sample-rate |
| **High-pass 80 Hz** | loại gió, rung máy | giữ hum điện -> model học môi trường ghi âm |
| Clip **3 s, hop 1.5 s** | tổ stationary; đủ context piping | clip quá ngắn mất piping, quá dài giảm mẫu |
| **StratifiedGroupKFold** theo session | mọi clip cùng file ở cùng fold | F1 0.95 ảo do clip overlap rải train/test |
| Chỉ cắt đoạn `.lab = bee` | tránh đoạn không có ong làm nhiễu | nhãn âm thanh "tạp" giảm ceiling model |
| **Log-Mel 64×94** | giữ cấu trúc tần–thời gian, hợp CNN 2D | chỉ dùng MFCC sẽ mất chi tiết piping |
| **class_weight/weighted CE** | 14 vs 6 clip file (imbalance) | model bias về lớp lớn, recall lớp nhỏ thấp |
| **Macro-F1 + confusion matrix** | accuracy đánh lừa khi lệch lớp | báo cáo đẹp nhưng lớp thiểu số = 0 recall |
| **Recording-level scoring** | nhãn là cấp file | clip-level (overlap) khai man kết quả |
| Augment: gain/time-shift/noise/**SpecAugment** | mô phỏng biến thiên thực tế | **pitch-shift >2 semitones phá wingbeat/piping** |

**Giới hạn trung thực của Phase 1:**
1. **Confound theo hive/mic:** CJ001 chỉ có "missing queen", CF003 chỉ "active" → model có thể học *mic/hive* thay vì *ong*. Report luôn kèm caveat; bước tiếp thu thêm data mỗi lớp từ ≥3 hive.
2. **Số nhóm nhỏ** (~6 session binary) → kết quả CV lệch ±0.05–0.1 F1; báo mean±std, không nói "F1 = 0.93" đơn lẹ.
3. `.lab` = nhãn *có ong*, không phải trạng thái tổ → không trộn 2 loại nhãn.
4. Chưa có lớp swarming/noise/predator → cần bổ sung data trước khi mở bài toán đa lớp.

## 6. Bước tiếp theo (sau Phase 1)

1. EDA notebook: năng lượng theo dải tần 2 lớp, kiểm tra clipping/noise.
2. Thử `--group-by hive` (Leave-One-Hive-Out) để đo khả năng generalize ra hive mới.
3. Bổ sung data swarming + noise ngoài trời → mở bài toán multi-class.
4. (tùy chọn) Export ONNX/TorchScript nếu chuyển sang edge device.
