from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
    )

    app_name: str = "VietBee API"
    app_version: str = "1.0.0"
    debug: bool = False
    database_url: str = "postgresql://postgres@localhost:5432/beehive_management"

    # --- Camera pipeline (Demo v1) ---
    # SCAN_INTERVAL_SEC: demo 20-30s, production 180-300s
    scan_interval_sec: int = 25
    # ALERT_COOLDOWN_SEC: 60-120s, tinh theo (hive_id, alert_type)
    alert_cooldown_sec: int = 90
    # Gioi han anh luu moi thùng (rolling retention)
    max_images_per_hive: int = 200
    # FPS cua luong MJPEG (Flow B)
    mjpeg_fps: int = 12
    # So luong xem dong thoi toi da
    max_concurrent_streams: int = 5
    # Demo v1: mau frame o moc giay co thien dich
    demo_mode: bool = True

    # Bien phu cung cho camera
    video_dir: str = str(PROJECT_ROOT / "0_DEMO_VIDEO")
    storage_dir: str = str(PROJECT_ROOT / "storage")
    model_path: str = str(
        PROJECT_ROOT
        / "ai_engine/bee-dectection/weights/dection_bee"
        / "yolo26s_img640_baseline_v1_small/yolo26s_img640_baseline_v1_small/weights/best.pt"
    )
    default_confidence_threshold: float = 0.5
    scan_frames: int = 5
    scan_timeout_sec: int = 60
    inference_workers: int = 2
    # Bi mat ky HMAC cho stream token (doi khi chay san)
    camera_token_secret: str = "vietbee-demo-stream-secret"

    @property
    def async_database_url(self) -> str:
        if self.database_url.startswith("postgresql+asyncpg://"):
            return self.database_url
        return self.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)


settings = Settings()
