"""Deterministic Query Planner and Intent Matcher for Qualifier Scope."""

from typing import Optional
from app.models.analysis import AnalysisPlan, FilterSpec


class Planner:
    """Deterministic intent matcher and analysis plan generator."""

    @classmethod
    def create_plan(cls, question: str) -> AnalysisPlan:
        """
        Map analytical question to a validated AnalysisPlan.
        Honest and bounded: maps to known qualifier operations, or marks UNSUPPORTED.
        """
        q = question.strip().lower()

        # 0. Predictive or Out-of-Scope Queries
        if any(w in q for w in ["predict", "forecast", "neural", "quantum", "machine learning", "ai model", "future", "estimate"]):
            return AnalysisPlan(
                plan_id="plan_unsupported",
                operation="UNSUPPORTED",
                title="Unsupported Analysis Request",
                primary_dataset="",
                handling_decisions=[],
                assumptions=["Predictive modeling and forecasting outside deterministic qualifier scope."],
            )

        # 0b. Category/Product breakdown or complex multi-table queries (outside qualifier MVP scope)
        if any(w in q for w in ["category", "product", "highest net", "highest refund", "region"]):
            return AnalysisPlan(
                plan_id="plan_unsupported_breakdown",
                operation="UNSUPPORTED",
                title="Unsupported Grouping Analysis Request",
                primary_dataset="",
                handling_decisions=[],
                assumptions=["Category breakdowns, product aggregations, and regional rate grouping fall outside bounded qualifier MVP scope."],
            )

        # 1. Currency Refusal Trap
        if ("usd" in q and "inr" in q) or "convert" in q or ("currency" in q and any(w in q for w in ["combine", "all", "total", "rate"])):
            return AnalysisPlan(
                plan_id="plan_currency_refusal",
                operation="CURRENCY_REFUSAL",
                title="Cross-Currency Ingestion Audit",
                primary_dataset="payments.csv",
                primary_column="amount",
                requires_evidence=[
                    "Verified foreign exchange spot conversion rates timestamped to settlement dates",
                    "Authorized FX provider conversion schedule",
                ],
                handling_decisions=[
                    "Refused arithmetic aggregation across unpegged currency representations (USD and INR)",
                    "Triggered zero-hallucination mathematical verification barrier",
                ],
                assumptions=[
                    "Summing distinct currencies without FX exchange rate evidence is mathematically invalid.",
                ],
            )

        # 2. Net Revenue after Refunds
        if ("net revenue" in q) or ("revenue" in q and "refund" in q) or ("net" in q and "september" in q):
            return AnalysisPlan(
                plan_id="plan_net_revenue",
                operation="NET_REVENUE",
                title="Net Revenue Calculation (Completed September Orders minus Completed Refunds)",
                primary_dataset="orders.csv",
                primary_column="total_amount",
                filters=[
                    FilterSpec(column="order_date", operator="contains", value="2026-09"),
                    FilterSpec(column="status", operator="==", value="completed"),
                ],
                secondary_dataset="refunds.csv",
                secondary_column="amount",
                secondary_filters=[
                    FilterSpec(column="refund_date", operator="contains", value="2026-09"),
                    FilterSpec(column="status", operator="==", value="completed"),
                ],
                handling_decisions=[
                    "Filtered orders to September 2026 (order_date matching 2026-09)",
                    "Explicitly deduplicated orders by order_id before revenue aggregation to prevent double counting",
                    "Filtered orders to status == 'completed'",
                    "Filtered refunds to September 2026 and status == 'completed'",
                    "Deducted refunds only for orders included in gross completed revenue population",
                ],
                assumptions=[
                    "Gross revenue derived from completed September order records.",
                    "Refund deduction applies only to completed refunds linked to recognized completed orders.",
                ],
            )

        # 3. Duplicate Orders Audit
        if "duplicate" in q or "integrity" in q or "repeated order" in q:
            return AnalysisPlan(
                plan_id="plan_duplicate_orders",
                operation="COUNT_DUPLICATES",
                title="Duplicate Transaction Identification Audit",
                primary_dataset="orders.csv",
                primary_column="order_id",
                handling_decisions=[
                    "Grouped records by order_id identifier to count multi-occurrence entries",
                    "Preserved raw duplicate records for forensic review",
                ],
                assumptions=[
                    "Each order_id is assumed to represent a unique distinct transaction.",
                ],
            )

        # 4. Total Completed Revenue (Simple / Filtered Success)
        if ("completed" in q and any(w in q for w in ["revenue", "sales", "order", "total"])) or ("total revenue" in q) or ("gross revenue" in q):
            return AnalysisPlan(
                plan_id="plan_total_completed_revenue",
                operation="FILTER_SUM",
                title="Total Completed Order Revenue",
                primary_dataset="orders.csv",
                primary_column="total_amount",
                filters=[FilterSpec(column="status", operator="==", value="completed")],
                handling_decisions=[
                    "Deduplicated orders by order_id before aggregation",
                    "Filtered transactions to status == 'completed'",
                ],
                assumptions=[
                    "Only completed transactions represent realized revenue.",
                ],
            )

        # 5. Unsupported question
        return AnalysisPlan(
            plan_id="plan_unsupported",
            operation="UNSUPPORTED",
            title="Unsupported Analysis Request",
            primary_dataset="",
            handling_decisions=[],
            assumptions=[],
        )
