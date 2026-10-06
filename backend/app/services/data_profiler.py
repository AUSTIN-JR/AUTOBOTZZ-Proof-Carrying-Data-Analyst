"""Data Profiler service for generating structural and statistical profiles of DataFrames."""

import math
import re
from datetime import datetime
from typing import Any, Dict, List

import numpy as np
import pandas as pd

from app.models.dataset import ColumnProfile, DatasetProfile


def format_bytes(size_bytes: int) -> str:
    """Format byte size into human-readable string (KB, MB, GB)."""
    if size_bytes <= 0:
        return "0 B"
    units = ["B", "KB", "MB", "GB", "TB"]
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 1)
    unit = units[i] if i < len(units) else "TB"
    return f"{s} {unit}"


def to_json_safe(val: Any) -> Any:
    """Convert any NumPy/Pandas scalar to standard JSON-serializable Python scalar."""
    if val is None or pd.isna(val):
        return None
    if isinstance(val, (np.integer, int)):
        return int(val)
    if isinstance(val, (np.floating, float)):
        if math.isnan(val) or math.isinf(val):
            return None
        return float(val)
    if isinstance(val, (np.bool_, bool)):
        return bool(val)
    if isinstance(val, (pd.Timestamp, datetime)):
        return val.isoformat()
    return str(val)


class DataProfiler:
    """Deterministic tabular data profiler."""

    CURRENCY_SYMBOLS = {"₹", "$", "€", "£", "¥"}
    CURRENCY_CODES = {"INR", "USD", "EUR", "GBP", "JPY"}
    DATE_REGEX = re.compile(r"^(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})")

    @classmethod
    def infer_column_dtype(cls, series: pd.Series) -> str:
        """Infer high-level column data type: integer, float, boolean, datetime, string, mixed."""
        if pd.api.types.is_bool_dtype(series):
            return "boolean"
        if pd.api.types.is_integer_dtype(series):
            return "integer"
        if pd.api.types.is_float_dtype(series):
            return "float"
        if pd.api.types.is_datetime64_any_dtype(series):
            return "datetime"

        # For object types, inspect underlying non-null python types
        non_nulls = series.dropna()
        if len(non_nulls) == 0:
            return "string"

        types_set = {type(v) for v in non_nulls.head(100)}
        if len(types_set) > 1:
            # Check if ints and floats are mixed (which pandas might consider numeric)
            if types_set <= {int, float, np.int64, np.float64}:
                return "float"
            return "mixed"

        sample_val = non_nulls.iloc[0]
        if isinstance(sample_val, bool):
            return "boolean"
        if isinstance(sample_val, (int, np.integer)):
            return "integer"
        if isinstance(sample_val, (float, np.floating)):
            return "float"
        if isinstance(sample_val, (pd.Timestamp, datetime)):
            return "datetime"

        # Check if strings can be coerced to dates
        if isinstance(sample_val, str):
            first_few_str = [str(v).strip() for v in non_nulls.head(20)]
            date_matches = sum(1 for s in first_few_str if cls.DATE_REGEX.match(s))
            if date_matches >= max(1, int(len(first_few_str) * 0.8)):
                return "datetime"

        return "string"

    @classmethod
    def infer_semantic_hint(cls, col_name: str, series: pd.Series, inferred_dtype: str) -> str:
        """
        Infer broad semantic hints:
        - 'currency-like'
        - 'date-like'
        - 'identifier-like'
        - 'numeric'
        - 'boolean'
        - 'text'
        """
        lower_name = col_name.lower()
        non_nulls = series.dropna()

        # 1. Currency Hint Check
        has_curr_symbol = False
        if len(non_nulls) > 0:
            sample_str = " ".join([str(v) for v in non_nulls.head(25)])
            has_curr_symbol = any(sym in sample_str for sym in cls.CURRENCY_SYMBOLS)
            has_curr_code = any(re.search(rf"\b{code}\b", sample_str, re.IGNORECASE) for code in cls.CURRENCY_CODES)
            if has_curr_symbol or has_curr_code:
                return "currency-like"

        if any(term in lower_name for term in ["revenue", "price", "amount", "cost", "salary", "balance"]):
            return "currency-like"

        # 2. Date Hint Check
        if inferred_dtype == "datetime":
            return "date-like"
        if any(term in lower_name for term in ["date", "time", "created_at", "updated_at", "timestamp", "dob"]):
            return "date-like"
        if len(non_nulls) > 0:
            sample_strings = [str(v).strip() for v in non_nulls.head(20)]
            if sum(1 for s in sample_strings if cls.DATE_REGEX.match(s)) >= max(1, int(len(sample_strings) * 0.7)):
                return "date-like"

        # 3. Identifier Hint Check
        if lower_name in {"id", "key", "code", "uuid", "guid", "pk", "sku"}:
            return "identifier-like"
        if lower_name.endswith(("_id", "_key", "_code", "_num", "_no", "id")):
            return "identifier-like"

        # 4. Numeric Hint Check
        if inferred_dtype in {"integer", "float"}:
            return "numeric"

        # 5. Boolean Hint Check
        if inferred_dtype == "boolean":
            return "boolean"

        return "text"

    @classmethod
    def profile_column(cls, col_name: str, series: pd.Series, original_name: str | None = None) -> ColumnProfile:
        """Generate structured profile for a single column."""
        total_rows = len(series)
        null_count = int(series.isna().sum())
        non_null_count = total_rows - null_count
        null_percentage = round((null_count / total_rows * 100.0), 1) if total_rows > 0 else 0.0

        inferred_dtype = cls.infer_column_dtype(series)
        unique_count = int(series.nunique(dropna=True))

        # Sample values (up to 5 distinct non-null values)
        non_null_samples = series.dropna().unique()
        sample_values = [to_json_safe(v) for v in non_null_samples[:5]]

        semantic_hint = cls.infer_semantic_hint(col_name, series, inferred_dtype)

        return ColumnProfile(
            name=col_name,
            original_name=original_name or col_name,
            dtype=inferred_dtype,
            nullable=null_count > 0,
            non_null_count=non_null_count,
            null_count=null_count,
            null_percentage=null_percentage,
            unique_count=unique_count,
            sample_values=sample_values,
            semantic_hint=semantic_hint,
        )

    @classmethod
    def profile_dataset(
        cls,
        df: pd.DataFrame,
        dataset_id: str,
        filename: str,
        file_size_bytes: int,
        loading_metadata: Dict[str, Any],
    ) -> DatasetProfile:
        """Generate complete dataset profile from DataFrame and loading metadata."""
        row_count = len(df)
        col_count = len(df.columns)
        orig_cols_mapping = loading_metadata.get("original_columns", {})

        column_profiles: List[ColumnProfile] = []
        for col in df.columns:
            orig_name = orig_cols_mapping.get(col, col)
            column_profiles.append(cls.profile_column(col, df[col], orig_name))

        # Memory estimation
        try:
            mem_bytes = int(df.memory_usage(deep=True).sum())
        except Exception:
            mem_bytes = file_size_bytes

        display_name = filename.rsplit(".", 1)[0].replace("_", " ").title()

        return DatasetProfile(
            id=dataset_id,
            name=display_name,
            filename=filename,
            format=loading_metadata.get("format", "csv"),
            row_count=row_count,
            column_count=col_count,
            size_bytes=file_size_bytes,
            size_formatted=format_bytes(file_size_bytes),
            status="ready",
            sheet_names=loading_metadata.get("sheet_names"),
            selected_sheet=loading_metadata.get("selected_sheet"),
            columns=column_profiles,
            quality_issues=[],
            quality_issues_count=0,
            loaded_at="Just now",
            description=f"Loaded {row_count} rows across {col_count} columns",
        )

