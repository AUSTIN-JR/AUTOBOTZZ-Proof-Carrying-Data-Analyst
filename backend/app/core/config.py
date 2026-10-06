"""Application configuration settings for AUTOBOTZZ API."""

import os
from pathlib import Path
from typing import List


class Settings:
    """Core application settings with environment variable fallbacks."""

    def __init__(self) -> None:
        self.app_name: str = "AUTOBOTZZ API"
        self.app_version: str = "0.2.0"
        self.description: str = "Deterministic Proof-Carrying Data Analyst API"
        self.environment: str = os.getenv("AUTOBOTZZ_ENV", "development")

        # Upload configuration
        self.max_upload_size_mb: int = int(os.getenv("AUTOBOTZZ_MAX_UPLOAD_SIZE_MB", "25"))
        self.max_upload_size_bytes: int = self.max_upload_size_mb * 1024 * 1024

        # Allowed file extensions
        self.allowed_extensions: set[str] = {".csv", ".xlsx", ".json"}

        # CORS configuration
        origins_env = os.getenv(
            "AUTOBOTZZ_ALLOWED_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000",
        )
        self.allowed_origins: List[str] = [origin.strip() for origin in origins_env.split(",") if origin.strip()]

        # Storage directory for temporary dataset storage
        base_dir = Path(__file__).resolve().parent.parent.parent
        storage_env = os.getenv("AUTOBOTZZ_STORAGE_DIR")
        if storage_env:
            self.storage_dir: Path = Path(storage_env).resolve()
        else:
            self.storage_dir: Path = (base_dir / "temp_storage").resolve()

        # Ensure storage directory exists
        self.storage_dir.mkdir(parents=True, exist_ok=True)


_settings_instance: Settings | None = None


def get_settings() -> Settings:
    """Return singleton application settings instance."""
    global _settings_instance
    if _settings_instance is None:
        _settings_instance = Settings()
    return _settings_instance

