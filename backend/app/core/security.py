"""Security utilities for file validation, path traversal prevention, and dataset identification."""

import re
import uuid
from pathlib import Path
from typing import Tuple

from app.core.config import get_settings


class SecurityException(Exception):
    """Custom exception raised on security/validation failure."""

    def __init__(self, code: str, message: str, details: dict | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}


def sanitize_filename(filename: str | None) -> str:
    """
    Sanitize an untrusted user-supplied filename.
    Strips directory paths, control characters, null bytes, and path traversal sequences.
    Preserves a clean, readable display filename.
    """
    if not filename or not filename.strip():
        return "unnamed_dataset"

    # Extract base name to eliminate path traversal (Unix & Windows slashes)
    clean_name = Path(filename).name
    # Strip null bytes and control chars
    clean_name = re.sub(r"[\x00-\x1f\x7f-\x9f]", "", clean_name)
    # Strip dangerous shell/path characters but allow basic safe characters
    clean_name = re.sub(r'[\\/:*?"<>|]', "", clean_name)
    # Collapse multiple spaces or dots
    clean_name = re.sub(r"\s+", " ", clean_name).strip()

    if not clean_name:
        return "unnamed_dataset"

    # Limit display filename length
    if len(clean_name) > 120:
        stem = Path(clean_name).stem[:100]
        ext = Path(clean_name).suffix[:20]
        clean_name = f"{stem}{ext}"

    return clean_name


def generate_dataset_id() -> str:
    """Generate a unique, safe identifier for an uploaded dataset."""
    return f"ds_{uuid.uuid4().hex[:12]}"


def validate_file_extension(filename: str) -> str:
    """
    Validate that the file extension is strictly in the allowed set.
    Returns normalized lowercase extension (including leading dot, e.g. '.csv').
    """
    settings = get_settings()
    ext = Path(filename).suffix.lower()

    if not ext:
        raise SecurityException(
            code="MISSING_FILE_EXTENSION",
            message="Uploaded file has no file extension.",
            details={"allowed": sorted(list(settings.allowed_extensions))},
        )

    if ext not in settings.allowed_extensions:
        raise SecurityException(
            code="UNSUPPORTED_FILE_TYPE",
            message=f"File extension '{ext}' is not supported. Supported formats: CSV, XLSX, JSON.",
            details={
                "provided_extension": ext,
                "allowed_extensions": sorted(list(settings.allowed_extensions)),
            },
        )

    return ext


def validate_file_size(size_bytes: int) -> None:
    """Validate that the file size is within configured limits."""
    settings = get_settings()
    if size_bytes == 0:
        raise SecurityException(
            code="EMPTY_FILE",
            message="Uploaded file is empty (0 bytes).",
            details={"size_bytes": 0},
        )

    if size_bytes > settings.max_upload_size_bytes:
        raise SecurityException(
            code="FILE_TOO_LARGE",
            message=f"File exceeds maximum upload size of {settings.max_upload_size_mb} MB.",
            details={
                "size_bytes": size_bytes,
                "max_size_bytes": settings.max_upload_size_bytes,
                "max_size_mb": settings.max_upload_size_mb,
            },
        )


def get_safe_storage_path(dataset_id: str, extension: str) -> Path:
    """
    Generate a strictly controlled internal storage path.
    Never uses the user-supplied filename as the filesystem storage name.
    """
    settings = get_settings()
    safe_filename = f"{dataset_id}{extension}"
    target_path = (settings.storage_dir / safe_filename).resolve()

    # Path traversal assertion: target must strictly be inside storage_dir
    if not str(target_path).startswith(str(settings.storage_dir)):
        raise SecurityException(
            code="PATH_TRAVERSAL_DETECTED",
            message="Invalid storage path detected.",
        )

    return target_path

