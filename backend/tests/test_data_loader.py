"""Tests for DataLoader service."""

import json
from pathlib import Path
import openpyxl
import pandas as pd
import pytest

from app.services.data_loader import DataLoader, DataLoaderException


def test_load_csv_utf8(tmp_path: Path) -> None:
    csv_file = tmp_path / "orders.csv"
    csv_file.write_text("order_id,customer_name,amount\n1,Alice,100.5\n2,Bob,250.0\n", encoding="utf-8")

    df, meta = DataLoader.load_file(csv_file)
    assert len(df) == 2
    assert list(df.columns) == ["order_id", "customer_name", "amount"]
    assert meta["format"] == "csv"
    assert meta["row_count"] == 2
    assert meta["column_count"] == 3


def test_load_csv_bom(tmp_path: Path) -> None:
    csv_file = tmp_path / "bom_data.csv"
    csv_file.write_text("id,val\n10,Alpha\n", encoding="utf-8-sig")

    df, meta = DataLoader.load_file(csv_file)
    assert len(df) == 1
    assert "id" in df.columns
    assert meta["encoding"] in {"utf-8-sig", "utf-8"}


def test_load_empty_csv(tmp_path: Path) -> None:
    csv_file = tmp_path / "empty.csv"
    csv_file.write_text("", encoding="utf-8")

    with pytest.raises(DataLoaderException) as exc_info:
        DataLoader.load_file(csv_file)
    assert exc_info.value.code == "EMPTY_FILE"


def test_load_json_array_of_objects(tmp_path: Path) -> None:
    json_file = tmp_path / "records.json"
    data = [
        {"item_id": "A1", "price": 10.99, "in_stock": True},
        {"item_id": "A2", "price": 25.50, "in_stock": False},
    ]
    json_file.write_text(json.dumps(data), encoding="utf-8")

    df, meta = DataLoader.load_file(json_file)
    assert len(df) == 2
    assert meta["format"] == "json"
    assert set(df.columns) == {"item_id", "price", "in_stock"}


def test_load_json_unsupported_structure(tmp_path: Path) -> None:
    json_file = tmp_path / "nested.json"
    data = {"company": {"departments": ["Engineering", "Sales"]}}
    json_file.write_text(json.dumps(data), encoding="utf-8")

    with pytest.raises(DataLoaderException) as exc_info:
        DataLoader.load_file(json_file)
    assert exc_info.value.code == "UNSUPPORTED_JSON_STRUCTURE"


def test_load_excel_xlsx(tmp_path: Path) -> None:
    excel_path = tmp_path / "test_book.xlsx"
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Transactions"
    ws.append(["tx_id", "status", "revenue"])
    ws.append(["TX1", "SUCCESS", 500])
    ws.append(["TX2", "PENDING", 750])
    wb.create_sheet("Notes")
    wb.save(excel_path)

    df, meta = DataLoader.load_file(excel_path)
    assert len(df) == 2
    assert "Transactions" in meta["sheet_names"]
    assert "Notes" in meta["sheet_names"]
    assert meta["selected_sheet"] == "Transactions"
    assert list(df.columns) == ["tx_id", "status", "revenue"]


def test_column_normalization_preserves_mapping(tmp_path: Path) -> None:
    csv_file = tmp_path / "messy_cols.csv"
    csv_file.write_text("  trimmed_id  , duplicate , duplicate \n1,A,B\n", encoding="utf-8")

    df, meta = DataLoader.load_file(csv_file)
    assert "trimmed_id" in df.columns
    assert "duplicate" in df.columns
    assert "duplicate_1" in df.columns
    assert meta["original_columns"]["trimmed_id"] == "  trimmed_id  "

