"""Tests for Phase 2B Deterministic Analysis Engine, Proof Generation, and Verification."""

from fastapi.testclient import TestClient
import pytest

from app.agents.planner import Planner
from app.execution.code_runner import CodeRunner
from app.execution.sandbox import ProofGenerator
from app.main import app
from app.models.analysis import AnalysisPlan, FilterSpec
from app.models.proof import GeneratedCode
from app.services.analysis_engine import AnalysisEngine
from app.verification.result_verifier import ResultVerifier

client = TestClient(app)


def test_planner_intent_matching() -> None:
    # 1. Net revenue intent
    p1 = Planner.create_plan("What was net revenue in September after refunds?")
    assert p1.operation == "NET_REVENUE"
    assert p1.primary_dataset == "orders.csv"
    assert p1.secondary_dataset == "refunds.csv"

    # 2. Total completed revenue intent
    p2 = Planner.create_plan("What is total completed order revenue?")
    assert p2.operation == "FILTER_SUM"

    # 3. Duplicate orders intent
    p3 = Planner.create_plan("How many duplicate orders exist in the transactions log?")
    assert p3.operation == "COUNT_DUPLICATES"

    # 4. Currency refusal intent
    p4 = Planner.create_plan("Convert all USD and INR revenue into INR.")
    assert p4.operation == "CURRENCY_REFUSAL"

    # 5. Unsupported question
    p5 = Planner.create_plan("Predict revenue for Q4 2027 using neural networks")
    assert p5.operation == "UNSUPPORTED"

    # 6. Category breakdown query (outside qualifier MVP scope) returns UNSUPPORTED
    p6 = Planner.create_plan("Which product category generated the highest net revenue?")
    assert p6.operation == "UNSUPPORTED"


def test_proof_generator_and_code_runner() -> None:
    plan = AnalysisPlan(
        plan_id="plan_test",
        operation="COUNT_DUPLICATES",
        title="Test Duplicate Count",
        primary_dataset="orders.csv",
    )
    # Generate proof for orders.csv fixture
    from pathlib import Path
    orders_path = str(Path(__file__).resolve().parent.parent.parent / "datasets" / "demo" / "orders.csv")

    generated = ProofGenerator.generate_proof(plan, primary_file_path=orders_path)
    assert "import pandas as pd" in generated.code
    assert "print(duplicate_count)" in generated.code
    assert generated.language == "python"

    # Execute in controlled subprocess
    exec_res = CodeRunner.execute_proof(generated, timeout_seconds=5.0)
    assert exec_res.exit_code == 0
    assert exec_res.stdout != ""
    assert exec_res.stderr is None
    # 1 duplicate row ORD-8903 in demo fixture
    assert int(exec_res.stdout) == 1


def test_result_verifier_match_and_mismatch() -> None:
    # 1. Integer match
    v1 = ResultVerifier.verify(calculated_value=1, stdout="1\n")
    assert v1.status == "MATCH"
    assert v1.is_verified is True

    # 2. Float match with tolerance
    v2 = ResultVerifier.verify(calculated_value=143700.50, stdout="143700.50\n")
    assert v2.status == "MATCH"
    assert v2.is_verified is True

    # 3. Forced mismatch
    v3 = ResultVerifier.verify(calculated_value=500.0, stdout="490.0\n")
    assert v3.status == "MISMATCH"
    assert v3.is_verified is False

    # 4. Empty output -> UNVERIFIABLE
    v4 = ResultVerifier.verify(calculated_value=100, stdout="")
    assert v4.status == "UNVERIFIABLE"
    assert v4.is_verified is False


def test_real_analysis_net_revenue_success() -> None:
    proof = AnalysisEngine.run_analysis("What was net revenue in September after refunds?")
    assert proof.outcome in {"verified", "warning"}
    assert proof.verification is not None
    assert proof.verification.status == "MATCH"
    assert proof.verification.is_verified is True
    assert proof.generated_code is not None
    assert proof.execution is not None
    assert proof.execution.exit_code == 0
    # Gross orders sum (deduplicated completed in Sep 2026):
    # 14200 + 8500.5 + 42000 + 6100 + 19500 + 11400 + 26000 + 5400 + 15000 + 9300 = 157,400.5
    # Completed refunds matching completed orders (REF-201: 1500, REF-202: 3500, REF-205: 2000):
    # Total valid refunds deducted: 7,000.0 (REF-203 excluded as ORD-8906 was not in completed population)
    # Net = 150,400.50
    assert "₹150,400.50" in proof.headline_answer
    assert str(proof.verification.reported_value) in str(proof.verification.execution_value)


def test_real_analysis_duplicate_orders() -> None:
    proof = AnalysisEngine.run_analysis("How many duplicate orders exist in the transactions log?")
    assert proof.verification is not None
    assert proof.verification.status == "MATCH"
    assert "1 duplicate orders" in proof.headline_answer


def test_real_analysis_currency_refusal() -> None:
    proof = AnalysisEngine.run_analysis("Convert all USD and INR revenue into INR.")
    assert proof.outcome == "refused"
    assert proof.headline_answer == "CANNOT VERIFY RELIABLY"
    assert proof.refusal_details is not None
    assert len(proof.refusal_details.missing_evidence) >= 1
    assert "payments.csv" in proof.refusal_details.affected_datasets


def test_real_analysis_unsupported_query() -> None:
    proof = AnalysisEngine.run_analysis("What is the quantum state of the supply chain?")
    assert proof.outcome == "unsupported"
    assert proof.headline_answer == "UNSUPPORTED ANALYSIS"


def test_api_analysis_endpoint() -> None:
    response = client.post("/api/analysis", json={"question": "What was net revenue in September after refunds?"})
    assert response.status_code == 200
    data = response.json()
    assert data["outcome"] in {"verified", "warning"}
    assert data["verification"]["status"] == "MATCH"
    assert "generatedCode" in data or "generated_code" in data
    assert "execution" in data

