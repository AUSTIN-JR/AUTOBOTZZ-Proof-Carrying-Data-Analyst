#!/usr/bin/env python3
"""
========================================================================================
AUTOBOTZZ — Selected Demo-Case Evaluation Harness
Tests Member 2's 5 recommended demo cases through the real AUTOBOTZZ FastAPI analysis pipeline.
========================================================================================
"""

import sys
import os
import json
from pathlib import Path

# Ensure backend app is importable
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

BENCHMARK_DIR = Path(__file__).resolve().parent.parent
CLEAN_DIR = BENCHMARK_DIR / "datasets" / "clean"
MESSY_DIR = BENCHMARK_DIR / "datasets" / "messy"
RESULTS_DIR = BENCHMARK_DIR / "results"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

SELECTED_CASES = [
    {
        "id": "DEMO_01",
        "case_id": "TC-A02",
        "question": "How many unique customers placed at least one order across the entire dataset?",
        "dataset_variant": "clean",
        "files": ["orders.csv"],
        "expected_behavior": "ANSWER",
        "expected_result": 181,
    },
    {
        "id": "DEMO_02",
        "case_id": "TC-B04",
        "question": "What is the total value in INR of processed refunds originated from payments made via 'UPI'?",
        "dataset_variant": "clean",
        "files": ["refunds.csv", "payments.csv"],
        "expected_behavior": "ANSWER",
        "expected_result": 53044.03,
    },
    {
        "id": "DEMO_03",
        "case_id": "TC-C01",
        "question": "How many duplicate order header rows (same order_id) exist in messy orders.csv?",
        "dataset_variant": "messy",
        "files": ["orders.csv"],
        "expected_behavior": "ANSWER",
        "expected_result": 4,
    },
    {
        "id": "DEMO_04",
        "case_id": "TC-F03",
        "question": "What is the combined worldwide gross revenue in INR if no exchange rate assumptions are permitted?",
        "dataset_variant": "clean",
        "files": ["orders.csv"],
        "expected_behavior": "REFUSE",
        "expected_result": None,
    },
    {
        "id": "DEMO_05",
        "case_id": "TC-D02",
        "question": "Which customer ID has generated the highest Customer Lifetime Value (net revenue in INR) across all completed orders?",
        "dataset_variant": "clean",
        "files": ["orders.csv", "refunds.csv", "payments.csv"],
        "expected_behavior": "ANSWER",
        "expected_result": "CUST-0025",
    },
]


def evaluate_cases():
    results = []

    for case in SELECTED_CASES:
        # Clear existing session datasets
        client.delete("/api/datasets")

        base_dir = CLEAN_DIR if case["dataset_variant"] == "clean" else MESSY_DIR
        dataset_ids = []

        # Ingest datasets via real API
        for fname in case["files"]:
            fpath = base_dir / fname
            with open(fpath, "rb") as fp:
                resp = client.post(
                    "/api/datasets/upload",
                    files={"file": (fname, fp, "text/csv")},
                )
            if resp.status_code not in (200, 201):
                raise RuntimeError(f"Failed to upload {fname}: {resp.text}")
            dataset_ids.append(resp.json()["dataset"]["id"])

        # Execute analysis via real API
        analysis_resp = client.post(
            "/api/analysis",
            json={"question": case["question"], "dataset_ids": dataset_ids},
        )

        if analysis_resp.status_code == 200:
            proof = analysis_resp.json()
            actual_outcome = proof["outcome"]
            actual_result = proof["headlineAnswer"]
            proof_generated = proof.get("generatedCode") is not None
            proof_executed = proof.get("execution") is not None
            verification_state = (
                proof.get("verification", {}).get("status")
                if proof.get("verification")
                else None
            )
            refusal_reason = (
                proof.get("refusalDetails", {}).get("reason")
                if proof.get("refusalDetails")
                else None
            )
        else:
            actual_outcome = "error"
            actual_result = f"HTTP {analysis_resp.status_code}: {analysis_resp.text}"
            proof_generated = False
            proof_executed = False
            verification_state = None
            refusal_reason = None

        # Determine status per Rule 7:
        # PASS, CORRECT_REFUSAL, SUPPORTED_BUT_WRONG, INCORRECT_REFUSAL,
        # SHOULD_HAVE_REFUSED, UNSUPPORTED, ERROR, NOT_APPLICABLE
        if actual_outcome == "unsupported":
            status = "UNSUPPORTED"
        elif actual_outcome == "error":
            status = "ERROR"
        elif actual_outcome == "refused":
            if case["expected_behavior"] == "REFUSE":
                status = "CORRECT_REFUSAL"
            else:
                status = "INCORRECT_REFUSAL"
        elif actual_outcome in ("verified", "warning"):
            if case["expected_behavior"] == "REFUSE":
                status = "SHOULD_HAVE_REFUSED"
            else:
                expected_str = str(case["expected_result"]).lower()
                actual_str = str(actual_result).lower()
                if expected_str in actual_str or (
                    isinstance(case["expected_result"], (int, float))
                    and str(case["expected_result"]) in actual_str
                ):
                    status = "PASS"
                else:
                    status = "SUPPORTED_BUT_WRONG"
        else:
            status = "ERROR"

        eval_item = {
            "case_id": case["case_id"],
            "demo_id": case["id"],
            "question": case["question"],
            "dataset_variant": case["dataset_variant"],
            "expected_behavior": case["expected_behavior"],
            "expected_result": case["expected_result"],
            "actual_autobotzz_outcome": actual_outcome,
            "actual_autobotzz_result": actual_result,
            "proof_generated": proof_generated,
            "proof_executed": proof_executed,
            "verification_state": verification_state,
            "refusal_reason": refusal_reason,
            "status": status,
        }
        results.append(eval_item)

    # Save benchmark results
    out_json = RESULTS_DIR / "autobotzz_benchmark.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    # Generate benchmark report markdown
    out_md = RESULTS_DIR / "autobotzz_benchmark.md"
    generate_markdown_report(results, out_md)

    return results


def generate_markdown_report(results, out_path):
    total = len(results)
    passed = sum(1 for r in results if r["status"] == "PASS")
    correct_refusal = sum(1 for r in results if r["status"] == "CORRECT_REFUSAL")
    unsupported = sum(1 for r in results if r["status"] == "UNSUPPORTED")
    supported_but_wrong = sum(1 for r in results if r["status"] == "SUPPORTED_BUT_WRONG")
    incorrect_refusal = sum(1 for r in results if r["status"] == "INCORRECT_REFUSAL")
    should_have_refused = sum(1 for r in results if r["status"] == "SHOULD_HAVE_REFUSED")
    errors = sum(1 for r in results if r["status"] == "ERROR")
    supported = total - unsupported

    md = f"""# AUTOBOTZZ — Benchmark Evaluation Report
**Evaluation Scope:** Selected Demo-Case Evaluation (Member 2 Recommended Set)
**Timestamp:** 2026-10-07
**Test Suite Target:** Member 2 Benchmark Fixtures (`clean` & `messy`)

---

## 1. Summary Statistics

| Metric | Count | Percentage |
| :--- | :--- | :--- |
| **Total Cases Attempted** | {total} | 100% |
| **Supported by Current MVP** | {supported} | {supported / total * 100:.1f}% |
| **Unsupported (Out of MVP Scope)** | {unsupported} | {unsupported / total * 100:.1f}% |
| **Passed (Verified Correct Answer)** | {passed} | {passed / total * 100:.1f}% |
| **Correct Refusals (Policy Compliant)** | {correct_refusal} | {correct_refusal / total * 100:.1f}% |
| **Supported but Wrong** | {supported_but_wrong} | {supported_but_wrong / total * 100:.1f}% |
| **Incorrect Refusals** | {incorrect_refusal} | {incorrect_refusal / total * 100:.1f}% |
| **Should Have Refused** | {should_have_refused} | {should_have_refused / total * 100:.1f}% |
| **Execution Errors** | {errors} | {errors / total * 100:.1f}% |

> **Note on Evaluation Methodology:** Under HackNex qualifier rules, out-of-scope operations return an explicit `UNSUPPORTED ANALYSIS` outcome rather than guessing. No percentage is fabricated over unsupported capabilities.

---

## 2. Selected Case Results

| Case ID | Demo ID | Question | Expected Behavior | Expected Result | Actual Outcome | Actual Result | Verification | Refusal Reason | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
"""

    for r in results:
        q_trunc = r["question"][:55] + "..." if len(r["question"]) > 55 else r["question"]
        exp_res = str(r["expected_result"]) if r["expected_result"] is not None else "None (REFUSE)"
        act_res = str(r["actual_autobotzz_result"])
        if len(act_res) > 30:
            act_res = act_res[:27] + "..."
        ver = r["verification_state"] or "-"
        ref = (r["refusal_reason"][:30] + "...") if r["refusal_reason"] else "-"
        md += f"| `{r['case_id']}` | `{r['demo_id']}` | {q_trunc} | {r['expected_behavior']} | `{exp_res}` | `{r['actual_autobotzz_outcome']}` | `{act_res}` | `{ver}` | {ref} | **{r['status']}** |\n"

    md += """
---

## 3. Case-by-Case Analysis

"""
    for r in results:
        md += f"### {r['case_id']} ({r['demo_id']}): {r['question']}\n\n"
        md += f"- **Dataset Variant:** `{r['dataset_variant']}`\n"
        md += f"- **Expected Behavior:** `{r['expected_behavior']}` (Expected: `{r['expected_result']}`)\n"
        md += f"- **Actual Outcome:** `{r['actual_autobotzz_outcome']}`\n"
        md += f"- **Actual Reported Answer:** `{r['actual_autobotzz_result']}`\n"
        md += f"- **Proof Script Generated:** `{r['proof_generated']}`\n"
        md += f"- **Subprocess Executed:** `{r['proof_executed']}`\n"
        md += f"- **Verification State:** `{r['verification_state']}`\n"
        if r["refusal_reason"]:
            md += f"- **Refusal Reason:** {r['refusal_reason']}\n"
        md += f"- **Status:** **`{r['status']}`**\n\n"

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(md)


if __name__ == "__main__":
    results = evaluate_cases()
    for r in results:
        print(f"[{r['status']}] {r['case_id']} ({r['demo_id']}): {r['question']}")
        print(f"   Expected: {r['expected_result']} | Actual: {r['actual_autobotzz_result']}")
        print(f"   Outcome: {r['actual_autobotzz_outcome']} | Verification: {r['verification_state']}")
        print()
