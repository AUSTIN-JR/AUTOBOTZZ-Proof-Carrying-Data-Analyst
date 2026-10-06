"""Tests for QualityChecker service."""

import pandas as pd
from app.verification.quality_checker import QualityChecker


def test_detect_duplicate_rows() -> None:
    df = pd.DataFrame({
        "order_id": [1, 2, 2, 3],
        "customer": ["A", "B", "B", "C"],
        "amount": [10, 20, 20, 30],
    })
    issues = QualityChecker.audit_dataset(df, "ds_test")
    dup_issues = [i for i in issues if i.type == "duplicate_rows"]
    assert len(dup_issues) == 1
    assert dup_issues[0].count == 1
    assert dup_issues[0].severity == "warning"


def test_detect_missing_values_and_empty_column() -> None:
    df = pd.DataFrame({
        "id": [1, 2, 3, 4],
        "notes": [None, None, None, None],  # completely empty column
        "rating": [5, None, 4, 3],          # partial null
    })
    issues = QualityChecker.audit_dataset(df, "ds_test")
    empty_col = [i for i in issues if i.type == "empty_column"]
    missing = [i for i in issues if i.type == "missing_values"]

    assert len(empty_col) == 1
    assert empty_col[0].column == "notes"
    assert len(missing) == 1
    assert missing[0].column == "rating"


def test_detect_multi_currency() -> None:
    # Column with both USD and INR representation
    df = pd.DataFrame({
        "order_id": [101, 102, 103, 104],
        "paid_amount": ["$100", "₹8200", "$50", "₹4100"],
    })
    issues = QualityChecker.audit_dataset(df, "ds_test")
    currency_issues = [i for i in issues if i.type == "multiple_currencies"]
    assert len(currency_issues) >= 1
    assert "INR" in currency_issues[0].message
    assert "USD" in currency_issues[0].message


def test_detect_ambiguous_dates() -> None:
    # Ambiguous date strings where day and month are <= 12
    df = pd.DataFrame({
        "event_id": [1, 2, 3],
        "event_date": ["03/04/2026", "05/06/2026", "07/08/2026"],
    })
    issues = QualityChecker.audit_dataset(df, "ds_test")
    date_issues = [i for i in issues if i.type == "ambiguous_dates"]
    assert len(date_issues) == 1
    assert date_issues[0].column == "event_date"
    assert "DD/MM vs MM/DD" in date_issues[0].message


def test_detect_constant_column() -> None:
    df = pd.DataFrame({
        "id": [1, 2, 3],
        "status": ["ACTIVE", "ACTIVE", "ACTIVE"],
    })
    issues = QualityChecker.audit_dataset(df, "ds_test")
    const_issues = [i for i in issues if i.type == "constant_column"]
    assert len(const_issues) == 1
    assert const_issues[0].column == "status"


def test_detect_duplicate_identifiers() -> None:
    df = pd.DataFrame({
        "user_id": ["U1", "U2", "U2", "U3"],
        "name": ["Alice", "Bob", "Robert", "Charlie"],
    })
    issues = QualityChecker.audit_dataset(df, "ds_test")
    dup_id_issues = [i for i in issues if i.type == "duplicate_identifiers"]
    assert len(dup_id_issues) == 1
    assert dup_id_issues[0].column == "user_id"
    assert dup_id_issues[0].count == 1


def test_detect_numeric_with_text() -> None:
    df = pd.DataFrame({
        "reading_id": [1, 2, 3, 4, 5, 6],
        "sensor_val": ["10.5", "12.0", "15.3", "PENDING", "14.2", "11.1"],
    })
    issues = QualityChecker.audit_dataset(df, "ds_test")
    text_issues = [i for i in issues if i.type == "numeric_with_text"]
    assert len(text_issues) == 1
    assert text_issues[0].column == "sensor_val"

