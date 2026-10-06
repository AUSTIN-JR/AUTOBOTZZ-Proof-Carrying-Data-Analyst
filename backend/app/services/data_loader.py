"""Data Loader service for ingesting CSV, Excel, and JSON files into pandas DataFrames."""

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple

import pandas as pd


class DataLoaderException(Exception):
    """Exception raised during file loading and parsing."""

    def __init__(self, code: str, message: str, details: dict | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}


def normalize_columns(columns: List[Any]) -> Tuple[List[str], Dict[str, str]]:
    """
    Carefully normalize column headers:
    - Convert non-string headers to strings
    - Strip leading/trailing whitespace
    - Disambiguate duplicate column names
    - Preserve 1:1 mapping of normalized name to original name
    """
    normalized: List[str] = []
    original_mapping: Dict[str, str] = {}
    seen_counts: Dict[str, int] = {}

    for idx, col in enumerate(columns):
        orig_str = str(col) if col is not None else f"column_{idx}"
        clean_name = orig_str.strip()
        if not clean_name:
            clean_name = f"unnamed_column_{idx}"

        # Convert pandas auto-suffix like '.1' or ' .1' to standard '_1'
        clean_name = re.sub(r"\s*\.(\d+)$", r"_\1", clean_name)

        # Handle duplicates safely
        if clean_name in seen_counts:
            seen_counts[clean_name] += 1
            unique_name = f"{clean_name}_{seen_counts[clean_name]}"
        else:
            seen_counts[clean_name] = 0
            unique_name = clean_name

        normalized.append(unique_name)
        original_mapping[unique_name] = orig_str

    return normalized, original_mapping


class DataLoader:
    """Deterministic, robust data loader for tabular formats."""

    @classmethod
    def load_file(cls, file_path: Path, format_hint: str | None = None) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Load a file into a pandas DataFrame based on format extension.
        Returns (DataFrame, metadata_dict).
        """
        ext = (format_hint or file_path.suffix).lower()
        if not ext.startswith("."):
            ext = f".{ext}"

        # Verify file presence and basic size
        if not file_path.exists():
            raise DataLoaderException(
                code="FILE_NOT_FOUND",
                message=f"File not found on disk: {file_path.name}",
            )

        if file_path.stat().st_size == 0:
            raise DataLoaderException(
                code="EMPTY_FILE",
                message="The uploaded file is empty (0 bytes).",
            )

        if ext == ".csv":
            return cls._load_csv(file_path)
        elif ext == ".xlsx":
            return cls._load_excel(file_path, ext)
        elif ext == ".json":
            return cls._load_json(file_path)
        else:
            raise DataLoaderException(
                code="UNSUPPORTED_FORMAT",
                message=f"Unsupported format '{ext}'. Supported formats: CSV, XLSX, JSON.",
            )

    @classmethod
    def _load_csv(cls, file_path: Path) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Load CSV with UTF-8 first, then UTF-8 BOM, then latin-1 fallback.
        """
        encodings_to_try = ["utf-8-sig", "utf-8", "latin-1"]
        last_error: Exception | None = None
        df: pd.DataFrame | None = None
        used_encoding = "utf-8"

        for enc in encodings_to_try:
            try:
                # First check if file contains non-whitespace text
                with open(file_path, "r", encoding=enc, errors="strict") as f:
                    content_peek = f.read(2048).strip()
                    if not content_peek:
                        raise DataLoaderException(
                            code="EMPTY_FILE",
                            message="CSV file contains only whitespace or is empty.",
                        )

                df = pd.read_csv(file_path, encoding=enc)
                used_encoding = enc
                break
            except UnicodeDecodeError as err:
                last_error = err
                continue
            except pd.errors.EmptyDataError:
                raise DataLoaderException(
                    code="EMPTY_FILE",
                    message="CSV file contains no data or headers.",
                )
            except DataLoaderException:
                raise
            except Exception as err:
                last_error = err
                break

        if df is None:
            raise DataLoaderException(
                code="CSV_PARSE_FAILURE",
                message=f"Failed to parse CSV file: {str(last_error)}",
                details={"last_error": str(last_error)},
            )

        # Normalize column names
        norm_cols, orig_mapping = normalize_columns(df.columns.tolist())
        df.columns = norm_cols

        metadata = {
            "format": "csv",
            "encoding": used_encoding,
            "original_columns": orig_mapping,
            "row_count": len(df),
            "column_count": len(df.columns),
        }
        return df, metadata

    @classmethod
    def _load_excel(cls, file_path: Path, ext: str) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Load Excel workbook. Detect sheets, load the first sheet as primary table,
        and record sheet metadata without pretending workbook has only one sheet.
        """
        try:
            import openpyxl

            wb = openpyxl.load_workbook(file_path, read_only=True, keep_links=False)
            sheet_names = list(wb.sheetnames)
            wb.close()
        except Exception as err:
            # Fallback if openpyxl read_only fails or file is .xls
            try:
                excel_file = pd.ExcelFile(file_path)
                sheet_names = excel_file.sheet_names
            except Exception as excel_err:
                raise DataLoaderException(
                    code="EXCEL_PARSE_FAILURE",
                    message=f"Unable to read Excel workbook: {str(excel_err)}",
                    details={"error": str(excel_err)},
                )

        if not sheet_names:
            raise DataLoaderException(
                code="EMPTY_WORKBOOK",
                message="Excel workbook contains no visible sheets.",
            )

        selected_sheet = sheet_names[0]

        try:
            df = pd.read_excel(file_path, sheet_name=selected_sheet)
        except Exception as err:
            raise DataLoaderException(
                code="EXCEL_SHEET_PARSE_FAILURE",
                message=f"Failed to load Excel sheet '{selected_sheet}': {str(err)}",
                details={"sheet": selected_sheet, "error": str(err)},
            )

        norm_cols, orig_mapping = normalize_columns(df.columns.tolist())
        df.columns = norm_cols

        metadata = {
            "format": ext.replace(".", ""),
            "sheet_names": sheet_names,
            "selected_sheet": selected_sheet,
            "original_columns": orig_mapping,
            "row_count": len(df),
            "column_count": len(df.columns),
        }
        return df, metadata

    @classmethod
    def _load_json(cls, file_path: Path) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Load JSON data. Supports array-of-objects primarily.
        Rejects deeply nested arbitrary JSON structures with clear error.
        """
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except json.JSONDecodeError as err:
            raise DataLoaderException(
                code="INVALID_JSON",
                message=f"Malformed JSON syntax: {str(err)}",
                details={"line": err.lineno, "col": err.colno},
            )
        except UnicodeDecodeError:
            try:
                with open(file_path, "r", encoding="latin-1") as f:
                    data = json.load(f)
            except Exception as err:
                raise DataLoaderException(
                    code="INVALID_JSON_ENCODING",
                    message="Could not decode JSON file with UTF-8 or Latin-1.",
                )

        # Handle top-level formats
        if isinstance(data, list):
            if len(data) == 0:
                raise DataLoaderException(
                    code="EMPTY_JSON_ARRAY",
                    message="JSON array is empty (0 records).",
                )
            first_item = data[0]
            if not isinstance(first_item, dict):
                raise DataLoaderException(
                    code="UNSUPPORTED_JSON_STRUCTURE",
                    message="JSON root is a list of scalar values, not an array of objects. Tabular records expected.",
                )
            records = data
        elif isinstance(data, dict):
            # Check if dict contains an array under standard table keys
            found_records = None
            for key in ["data", "records", "rows", "items", "results"]:
                if key in data and isinstance(data[key], list) and len(data[key]) > 0 and isinstance(data[key][0], dict):
                    found_records = data[key]
                    break
            if found_records is not None:
                records = found_records
            else:
                raise DataLoaderException(
                    code="UNSUPPORTED_JSON_STRUCTURE",
                    message="Unsupported JSON structure. Expected array of objects: `[{\"col1\": val1, ...}, ...]`. Nested trees and arbitrary hierarchical objects are not supported.",
                )
        else:
            raise DataLoaderException(
                code="UNSUPPORTED_JSON_STRUCTURE",
                message="Expected top-level JSON array of record objects.",
            )

        try:
            df = pd.DataFrame(records)
        except Exception as err:
            raise DataLoaderException(
                code="JSON_DATAFRAME_CONVERSION_ERROR",
                message=f"Failed to convert JSON records to tabular DataFrame: {str(err)}",
            )

        norm_cols, orig_mapping = normalize_columns(df.columns.tolist())
        df.columns = norm_cols

        metadata = {
            "format": "json",
            "original_columns": orig_mapping,
            "row_count": len(df),
            "column_count": len(df.columns),
        }
        return df, metadata
