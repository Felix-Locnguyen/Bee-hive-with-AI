from pydantic_settings import BaseSettings, SettingsConfigDict
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "VietBee API"
    app_version: str = "1.0.0"
    debug: bool = False
    database_url: str = "sqlite:///./vietbee.db"


settings = Settings()