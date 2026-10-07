"""In-memory session registry and temporary file store for uploaded datasets."""

import threading
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import pandas as pd

from app.core.config import get_settings
from app.models.dataset import DatasetProfile


class SessionStore:
    """Thread-safe in-memory session registry for datasets and DataFrames."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._profiles: Dict[str, DatasetProfile] = {}
        self._dataframes: Dict[str, pd.DataFrame] = {}
        self._file_paths: Dict[str, Path] = {}

    def add_dataset(
        self,
        profile: DatasetProfile,
        df: pd.DataFrame,
        file_path: Path,
    ) -> None:
        """Store dataset profile, DataFrame, and physical file path."""
        with self._lock:
            self._profiles[profile.id] = profile
            self._dataframes[profile.id] = df
            self._file_paths[profile.id] = file_path

    def get_dataset(self, dataset_id: str) -> Optional[DatasetProfile]:
        """Retrieve dataset profile by ID."""
        with self._lock:
            return self._profiles.get(dataset_id)

    def get_dataframe(self, dataset_id: str) -> Optional[pd.DataFrame]:
        """Retrieve active pandas DataFrame by ID."""
        with self._lock:
            return self._dataframes.get(dataset_id)

    def list_datasets(self) -> List[DatasetProfile]:
        """Retrieve all active dataset profiles."""
        with self._lock:
            return list(self._profiles.values())

    def delete_dataset(self, dataset_id: str) -> bool:
        """
        Remove dataset from session registry and clean up temporary storage file.
        Returns True if dataset was found and removed.
        """
        with self._lock:
            if dataset_id not in self._profiles:
                return False

            # Delete file from disk safely only if inside temporary storage
            file_path = self._file_paths.pop(dataset_id, None)
            if file_path and file_path.exists():
                try:
                    storage_dir = get_settings().storage_dir.resolve()
                    if file_path.resolve().is_relative_to(storage_dir):
                        file_path.unlink(missing_ok=True)
                except Exception:
                    pass

            self._dataframes.pop(dataset_id, None)
            self._profiles.pop(dataset_id, None)
            return True

    def clear_all(self) -> int:
        """
        Clear all datasets from the current session and remove all temporary files.
        Returns count of removed datasets.
        """
        with self._lock:
            count = len(self._profiles)
            storage_dir = get_settings().storage_dir.resolve()
            for file_path in self._file_paths.values():
                if file_path and file_path.exists():
                    try:
                        if file_path.resolve().is_relative_to(storage_dir):
                            file_path.unlink(missing_ok=True)
                    except Exception:
                        pass

            self._profiles.clear()
            self._dataframes.clear()
            self._file_paths.clear()
            return count


_store_instance: SessionStore | None = None


def get_session_store() -> SessionStore:
    """Return singleton session store instance."""
    global _store_instance
    if _store_instance is None:
        _store_instance = SessionStore()
    return _store_instance

