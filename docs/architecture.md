# AUTOBOTZZ — System Architecture

**Problem:** HNX26PSI08 — Proof-Carrying Data Analyst  
**Version:** 0.3.0 (Phase 2B — Core MVP)

---

## 1. Overview & Architectural Principle

AUTOBOTZZ is built with strict separation between **probabilistic query planning** and **deterministic computational verification**:
- The analytical intent is mapped into a strictly typed, validated `AnalysisPlan`.
- The system **never** relies on arbitrary LLM-generated code or hallucinated arithmetic.
- Calculations run against real pandas DataFrames.
- Standalone, rerunnable Python proof scripts are generated from trusted templates.
- Proof scripts run in an isolated subprocess.
- Output is captured and independently compared (`CALCULATED == EXECUTED`) before issuing a verified `ProofPack`.
- When evidence is insufficient (e.g., mixed unpegged currencies without spot rates), the system deterministically **refuses** to speculate.

---

## 2. End-to-End Analysis Pipeline (Phase 2B — REAL)

```
User Question
    │
    ▼
Intent Matcher / Simple Planner (planner.py)
    │  Maps to validated AnalysisPlan or flags UNSUPPORTED
    ▼
Deterministic Analysis Engine (analysis_engine.py)
    │
    ├─► Refusal Barrier Evaluation
    │      • Audits multi-currency representation (e.g., USD & INR in payments.csv)
    │      • If unpegged without FX spot rate evidence ➔ REFUSE (CANNOT VERIFY RELIABLY)
    │
    ├─► Real Pandas Computation
    │      • Resolves source DataFrame(s) from SessionStore or demo fixtures
    │      • Applies explicit filtering, joins, and deduplication
    │      • Computes in-memory ground-truth metric (calculated_value)
    │
    ├─► Trusted Proof Generator (sandbox.py)
    │      • Synthesizes standalone, rerunnable Python script from vetted templates
    │      • Never injects arbitrary unvalidated strings
    │
    ├─► Controlled Subprocess Runner (code_runner.py)
    │      • Executes Python in isolated subprocess with timeout protection
    │      • Captures stdout, stderr, exit code, and runtime duration
    │
    ├─► Independent Result Verifier (result_verifier.py)
    │      • Parses numeric scalar from subprocess stdout
    │      • Independently reconciles: calculated_value vs execution_stdout
    │      • Asserts integer equality or floating-point tolerance (rel_tol=1e-4, abs_tol=0.01)
    │      • Emits MATCH or MISMATCH (never forced)
    │
    └─► ProofPack Bundler
           • Assembles verified answer, calculation breakdown, evidence sources,
             handling decisions, generated proof script, execution telemetry, and verification
           │
           ▼
Frontend Next.js (HybridAnalysisService)
    • Drives animated 8-stage UI telemetry
    • Displays real calculated answer, standalone Python code, stdout trace, and MATCH status
```

---

## 3. Supported Scenarios in Qualifier Scope

| Scenario | Question Example | Operation | Expected Outcome | Description |
| :--- | :--- | :--- | :--- | :--- |
| **1. Filtered Net Revenue** | *"What was net revenue in September after refunds?"* | `NET_REVENUE` | `verified` / `warning` | Deduplicates orders by `order_id`, filters completed orders, subtracts completed refunds. |
| **2. Gross Completed Revenue** | *"What is total completed order revenue?"* | `FILTER_SUM` | `verified` / `warning` | Filters orders to `status == 'completed'`, aggregates sum. |
| **3. Integrity Duplicate Audit** | *"How many duplicate orders exist in the transactions log?"* | `COUNT_DUPLICATES` | `verified` | Audits order table, counts multi-occurrence `order_id` records. |
| **4. Multi-Currency Trap** | *"Convert all USD and INR revenue into INR."* | `CURRENCY_REFUSAL` | `refused` | Halts under zero-hallucination constraint; shows missing FX spot rate evidence. |
| **5. Out-of-Scope Queries** | *"Predict revenue for Q4 2027 using neural networks"* | `UNSUPPORTED` | `unsupported` | Returns honest unsupported status; does not hallucinate. |

---

## 4. Current Implementation Status

| Component | Status in Phase 2B | Implementation Details |
| :--- | :--- | :--- |
| **Data Ingestion & Profiling** | **REAL** | FastAPI multipart uploads for CSV, XLSX, JSON with deep profiling. |
| **Data Quality Engine** | **REAL** | Detects duplicate rows, empty columns, currencies, ambiguous dates. |
| **Query Intent Planning** | **REAL** | Deterministic planner with bounded relational operations and unsupported detection. |
| **Data Calculation** | **REAL** | Real calculations against in-memory pandas DataFrames. |
| **Proof Code Generation** | **REAL** | Standalone rerunnable Python scripts generated from vetted templates. |
| **Controlled Code Execution** | **REAL** | Subprocess runner capturing stdout, stderr, exit code, and runtime. |
| **Independent Verification** | **REAL** | Independent comparison of in-memory calculation vs subprocess output (`MATCH` / `MISMATCH`). |
| **Refusal Engine** | **REAL** | Real refusal path for unpegged currencies without spot exchange rate evidence. |
| **ProofPack Assembly** | **REAL** | Real JSON bundle with calculation breakdown, evidence sources, and code traces. |
| **REST API** | **REAL** | `POST /api/analysis`, `GET /api/analysis/status`, `GET /health`, `POST /api/datasets/upload`. |
| **Frontend Integration** | **REAL** | `HybridAnalysisService` streams real backend analysis into the Phase 1.5 animated UI. |
| **LLM Arbitrary Reasoning** | **NONE** | No arbitrary code generation or unverified arithmetic permitted. |
