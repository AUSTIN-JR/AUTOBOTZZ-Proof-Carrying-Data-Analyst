"""Data Quality Engine for deterministic inspection of tabular datasets."""

import re
from typing import List, Set, Tuple

import pandas as pd

from app.models.dataset import QualityIssue


class QualityChecker:
    """
    Deterministic rule-based data quality engine.
    Audits DataFrames for duplicate records, missing values, empty/constant columns,
    duplicate identifiers, mixed types, multi-currency conflicts, ambiguous dates,
    and text anomalies in numeric columns.
    """

    CURRENCY_SYMBOLS = {"₹": "INR", "$": "USD", "€": "EUR", "£": "GBP", "¥": "JPY"}
    CURRENCY_CODES = {"INR", "USD", "EUR", "GBP", "JPY"}

    # Pattern for dates like 03/04/2026 or 04-05-2026 where both parts are <= 12
    AMBIGUOUS_DATE_PATTERN = re.compile(r"^0?([1-9]|1[0-2])[/-]0?([1-9]|1[0-2])[/-](\d{2,4})$")

    @classmethod
    def audit_dataset(cls, df: pd.DataFrame, dataset_id: str) -> List[QualityIssue]:
        """Run all deterministic audits against the DataFrame."""
        issues: List[QualityIssue] = []

        if df.empty:
            issues.append(
                QualityIssue(
                    id=f"{dataset_id}_empty",
                    type="empty_dataset",
                    severity="error",
                    dataset_id=dataset_id,
                    count=0,
                    message="Dataset has 0 rows.",
                    impact="Analytical queries cannot be performed on an empty dataset.",
                    suggested_handling="Verify data source contains populated records.",
                )
            )
            return issues

        # 1. Duplicate Rows Check
        cls._check_duplicate_rows(df, dataset_id, issues)

        # 2. Missing Values & Empty Columns
        cls._check_missing_values(df, dataset_id, issues)

        # 3. Constant Columns
        cls._check_constant_columns(df, dataset_id, issues)

        # 4. Duplicate Identifiers
        cls._check_duplicate_identifiers(df, dataset_id, issues)

        # 5. Mixed Data Types
        cls._check_mixed_types(df, dataset_id, issues)

        # 6. Currency Inconsistencies & Multi-Currency Detection
        cls._check_currencies(df, dataset_id, issues)

        # 7. Date Ambiguity
        cls._check_date_ambiguity(df, dataset_id, issues)

        # 8. Numeric Columns Containing Unexpected Text
        cls._check_numeric_with_text(df, dataset_id, issues)

        return issues

    @classmethod
    def _check_duplicate_rows(cls, df: pd.DataFrame, dataset_id: str, issues: List[QualityIssue]) -> None:
        """Audit for exact duplicate rows."""
        try:
            dup_count = int(df.duplicated().sum())
            if dup_count > 0:
                issues.append(
                    QualityIssue(
                        id=f"{dataset_id}_dup_rows",
                        type="duplicate_rows",
                        severity="warning",
                        dataset_id=dataset_id,
                        column=None,
                        count=dup_count,
                        message=f"{dup_count} duplicate rows detected.",
                        impact="Aggregations may double-count these records.",
                        suggested_handling="Review or explicitly deduplicate before aggregation.",
                    )
                )
        except Exception:
            pass

    @classmethod
    def _check_missing_values(cls, df: pd.DataFrame, dataset_id: str, issues: List[QualityIssue]) -> None:
        """Audit for completely empty columns or high null percentages."""
        total_rows = len(df)
        for col in df.columns:
            null_count = int(df[col].isna().sum())
            if null_count == 0:
                continue

            null_pct = round((null_count / total_rows * 100.0), 1)
            if null_count == total_rows:
                # 100% empty column
                issues.append(
                    QualityIssue(
                        id=f"{dataset_id}_{col}_empty_col",
                        type="empty_column",
                        severity="warning",
                        dataset_id=dataset_id,
                        column=col,
                        count=total_rows,
                        message=f"Column '{col}' is completely empty (100% missing values).",
                        impact="Column provides no analytical signal and joins on this column will yield no matches.",
                        suggested_handling="Exclude column or populate missing values from source.",
                    )
                )
            else:
                severity = "warning" if null_pct > 25.0 else "info"
                issues.append(
                    QualityIssue(
                        id=f"{dataset_id}_{col}_missing",
                        type="missing_values",
                        severity=severity,
                        dataset_id=dataset_id,
                        column=col,
                        count=null_count,
                        message=f"Column '{col}' has {null_count} missing values ({null_pct}%).",
                        impact="Calculations ignoring nulls may bias aggregate statistics.",
                        suggested_handling="Impute missing values, filter them, or document null exclusions.",
                    )
                )

    @classmethod
    def _check_constant_columns(cls, df: pd.DataFrame, dataset_id: str, issues: List[QualityIssue]) -> None:
        """Audit for columns with only 1 distinct non-null value."""
        if len(df) <= 1:
            return

        for col in df.columns:
            non_nulls = df[col].dropna()
            if len(non_nulls) > 0 and int(non_nulls.nunique()) == 1:
                val = str(non_nulls.iloc[0])
                if len(val) > 30:
                    val = f"{val[:27]}..."
                issues.append(
                    QualityIssue(
                        id=f"{dataset_id}_{col}_constant",
                        type="constant_column",
                        severity="info",
                        dataset_id=dataset_id,
                        column=col,
                        count=1,
                        message=f"Column '{col}' contains a constant value ('{val}') across all non-null records.",
                        impact="Column has zero variance and provides no discriminatory signal for grouping.",
                        suggested_handling="Exclude from group-by or segmentation queries.",
                    )
                )

    @classmethod
    def _check_duplicate_identifiers(cls, df: pd.DataFrame, dataset_id: str, issues: List[QualityIssue]) -> None:
        """Audit for columns that appear to be identifiers but have duplicate values."""
        for col in df.columns:
            lower_col = str(col).lower()
            is_identifier_named = (
                lower_col in {"id", "key", "code", "uuid", "guid", "pk"}
                or lower_col.endswith(("_id", "_key", "_code", "_num", "_no"))
            )
            if not is_identifier_named:
                continue

            non_nulls = df[col].dropna()
            if len(non_nulls) == 0:
                continue

            unique_count = int(non_nulls.nunique())
            if unique_count < len(non_nulls):
                dup_id_count = len(non_nulls) - unique_count
                issues.append(
                    QualityIssue(
                        id=f"{dataset_id}_{col}_dup_ids",
                        type="duplicate_identifiers",
                        severity="warning",
                        dataset_id=dataset_id,
                        column=col,
                        count=dup_id_count,
                        message=f"Duplicate identifier values detected in '{col}' ({dup_id_count} repeated IDs).",
                        impact="Unique key assumption violated. Relational joins may produce accidental Cartesian explosions.",
                        suggested_handling="Investigate duplicate IDs and specify explicit deduplication criteria.",
                    )
                )

    @classmethod
    def _is_text_or_object(cls, series: pd.Series) -> bool:
        """Check if series has object or string/arrow string dtype."""
        return series.dtype == "object" or pd.api.types.is_string_dtype(series)

    @classmethod
    def _check_mixed_types(cls, df: pd.DataFrame, dataset_id: str, issues: List[QualityIssue]) -> None:
        """Audit for object columns containing heterogeneous Python types."""
        for col in df.columns:
            if not cls._is_text_or_object(df[col]):
                continue

            non_nulls = df[col].dropna()
            if len(non_nulls) == 0:
                continue

            # Check types in a sample of non-nulls
            sample_types = {type(v).__name__ for v in non_nulls.head(200)}
            # If both int/float and str exist, or bool and str exist
            if len(sample_types) > 1 and not (sample_types <= {"int", "float"}):
                issues.append(
                    QualityIssue(
                        id=f"{dataset_id}_{col}_mixed_types",
                        type="mixed_types",
                        severity="warning",
                        dataset_id=dataset_id,
                        column=col,
                        count=len(sample_types),
                        message=f"Column '{col}' contains mixed data types: {', '.join(sorted(sample_types))}.",
                        impact="Type inconsistency can trigger unexpected pandas coercion and comparison errors.",
                        suggested_handling="Normalize column to a consistent type before computation.",
                    )
                )

    @classmethod
    def _check_currencies(cls, df: pd.DataFrame, dataset_id: str, issues: List[QualityIssue]) -> None:
        """
        Audit for currency symbols and codes.
        CRITICAL: Detect if multiple currencies exist in a single column or dataset.
        Never convert or guess exchange rates. Report the conflict.
        """
        dataset_currencies: Set[str] = set()

        for col in df.columns:
            non_nulls = df[col].dropna()
            if len(non_nulls) == 0:
                continue

            # Check column name itself for currency hint
            col_currencies: Set[str] = set()
            for code in cls.CURRENCY_CODES:
                if re.search(rf"\b{code}\b", str(col), re.IGNORECASE):
                    col_currencies.add(code)

            # Check string representation of sample values
            sample_strs = [str(v) for v in non_nulls.head(100)]
            for s in sample_strs:
                for sym, code in cls.CURRENCY_SYMBOLS.items():
                    if sym in s:
                        col_currencies.add(code)
                for code in cls.CURRENCY_CODES:
                    if re.search(rf"\b{code}\b", s, re.IGNORECASE):
                        col_currencies.add(code)

            if len(col_currencies) > 1:
                sorted_codes = sorted(list(col_currencies))
                issues.append(
                    QualityIssue(
                        id=f"{dataset_id}_{col}_multi_currency",
                        type="multiple_currencies",
                        severity="warning",
                        dataset_id=dataset_id,
                        column=col,
                        count=len(col_currencies),
                        message=f"Multiple currency representations detected in '{col}': {', '.join(sorted_codes)}.",
                        impact="Arithmetic across multiple unpegged currencies produces invalid totals without exchange rate conversion.",
                        suggested_handling="Segment analysis by currency or specify an explicit exchange rate.",
                    )
                )
            elif len(col_currencies) == 1:
                code = list(col_currencies)[0]
                # If column is text/object type and has currency symbols, note as info
                if cls._is_text_or_object(df[col]):
                    issues.append(
                        QualityIssue(
                            id=f"{dataset_id}_{col}_currency_hint",
                            type="currency_representation",
                            severity="info",
                            dataset_id=dataset_id,
                            column=col,
                            count=1,
                            message=f"Currency representation ({code}) detected in values of '{col}'.",
                            impact="String currency formatting requires extraction before numerical computation.",
                            suggested_handling="Parse currency text to numerical floats before aggregation.",
                        )
                    )

            dataset_currencies.update(col_currencies)

        # Dataset-level multi-currency check across all columns
        if len(dataset_currencies) > 1 and not any(i.type == "multiple_currencies" for i in issues):
            sorted_all = sorted(list(dataset_currencies))
            issues.append(
                QualityIssue(
                    id=f"{dataset_id}_cross_col_multi_currency",
                    type="multiple_currencies",
                    severity="warning",
                    dataset_id=dataset_id,
                    column=None,
                    count=len(dataset_currencies),
                    message=f"Multiple currency representations detected across dataset: {', '.join(sorted_all)}.",
                    impact="Cross-currency comparisons require spot exchange rates.",
                    suggested_handling="Ensure rate alignment before executing aggregate cross-table calculations.",
                )
            )

    @classmethod
    def _check_date_ambiguity(cls, df: pd.DataFrame, dataset_id: str, issues: List[QualityIssue]) -> None:
        """
        Audit for potentially ambiguous date strings (e.g., 03/04/2026 vs 04/03/2026).
        Do NOT guess DD/MM vs MM/DD when evidence is insufficient. Report the ambiguity.
        """
        for col in df.columns:
            if not cls._is_text_or_object(df[col]):
                continue

            non_nulls = df[col].dropna()
            if len(non_nulls) == 0:
                continue

            sample_strings = [str(v).strip() for v in non_nulls.head(50)]
            ambiguous_samples: List[str] = []

            for s in sample_strings:
                match = cls.AMBIGUOUS_DATE_PATTERN.match(s)
                if match:
                    p1, p2, yr = match.groups()
                    # Both day and month are <= 12 and distinct (e.g., 03/04/2026)
                    if int(p1) <= 12 and int(p2) <= 12 and int(p1) != int(p2):
                        ambiguous_samples.append(s)

            if len(ambiguous_samples) >= 2:
                issues.append(
                    QualityIssue(
                        id=f"{dataset_id}_{col}_ambiguous_dates",
                        type="ambiguous_dates",
                        severity="warning",
                        dataset_id=dataset_id,
                        column=col,
                        count=len(ambiguous_samples),
                        message=f"Ambiguous date format detected in '{col}' (e.g. '{ambiguous_samples[0]}'). Day and month order (DD/MM vs MM/DD) cannot be determined deterministically.",
                        impact="Temporal filtering and time-series aggregation may misassign records across calendar months.",
                        suggested_handling="Provide explicit date format or standard ISO-8601 timestamps (YYYY-MM-DD).",
                    )
                )

    @classmethod
    def _check_numeric_with_text(cls, df: pd.DataFrame, dataset_id: str, issues: List[QualityIssue]) -> None:
        """Audit for object columns where the majority of values are numbers, but some text sentinels exist."""
        for col in df.columns:
            if not cls._is_text_or_object(df[col]):
                continue

            non_nulls = df[col].dropna()
            if len(non_nulls) < 5:
                continue

            sample_vals = [str(v).strip() for v in non_nulls.head(100)]
            numeric_count = 0
            text_samples: List[str] = []

            for val in sample_vals:
                # Check if it looks like a number
                try:
                    float(val.replace(",", "").replace("$", "").replace("₹", ""))
                    numeric_count += 1
                except ValueError:
                    text_samples.append(val)

            # If majority (> 65%) are numeric, but some are non-numeric text
            if len(sample_vals) > 0 and (numeric_count / len(sample_vals) >= 0.65) and len(text_samples) > 0:
                sample_preview = ", ".join(text_samples[:3])
                issues.append(
                    QualityIssue(
                        id=f"{dataset_id}_{col}_numeric_with_text",
                        type="numeric_with_text",
                        severity="warning",
                        dataset_id=dataset_id,
                        column=col,
                        count=len(text_samples),
                        message=f"Column '{col}' appears numeric but contains unexpected text/sentinel values: {sample_preview}.",
                        impact="Non-numeric strings will cause calculation errors or silent null coercion in aggregations.",
                        suggested_handling="Clean or map sentinel values before numeric analysis.",
                    )
                )
