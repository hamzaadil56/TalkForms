"""Backend configuration."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class BackendSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    reload: bool = False
    log_level: str = "INFO"

    # CORS — set CORS_ORIGINS in .env as a comma-separated list of allowed origins
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Audio pipeline
    audio_sample_rate: int = 24000
    audio_channels: int = 1
    audio_chunk_size: int = 4096
