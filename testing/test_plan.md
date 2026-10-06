# AUTOBOTZZ — Quality Assurance & Test Plan

**Problem Statement:** HNX26PSI08 — Proof-Carrying Data Analyst  
**Competition:** HackNex 2026 Internal Qualifier  

---

## 1. Automated Test Suite (31 Tests)

The backend test suite is executed using `pytest`:

```bash
cd backend
python -m pytest tests -v
```

### Coverage Matrix:
* **Analysis Engine (`test_analysis_engine.py`):**
  * Planner intent matching.
  * Standalone proof generation and controlled subprocess execution.
  * Result verification (`MATCH` and `MISMATCH` assertion).
  * Real analysis net revenue computation with September filtering & refund lineage.
  * Real analysis duplicate order counting.
  * Multi-currency refusal barrier.
  * Unsupported query handling.
  * Analysis API HTTP endpoints.
* **Data Loader (`test_data_loader.py`):**
  * UTF-8 CSV ingestion.
  * UTF-8 with BOM CSV ingestion.
  * Empty file handling.
  * JSON array-of-objects loading.
  * Malformed JSON error rejection.
  * Modern Excel (`.xlsx`) parsing.
  * Column name normalization and raw-to-clean mapping preservation.
* **Datasets API (`test_datasets_api.py`):**
  * Multipart upload lifecycle for CSV, JSON, and Excel.
  * Unsupported file type rejection (including binary `.xls`).
  * Demo dataset loader (`POST /api/datasets/load-demo`).
  * Session catalog cleanup (`DELETE /api/datasets`).
* **Health Endpoint (`test_health.py`):**
  * Service uptime and readiness verification.
* **Data Quality Checker (`test_quality_checker.py`):**
  * Duplicate row detection.
  * Missing value and empty column auditing.
  * Unpegged multi-currency detection.
  * Ambiguous date format detection.
  * Constant column auditing.
  * Duplicate primary identifier detection.
  * Numeric-with-text contamination detection.

---

## 2. Frontend Automated Quality Gates

* **Linting:** `npm run lint` — ESLint verification with Next.js strict rules.
* **Production Build:** `npm run build` — Full TypeScript type checking and static asset generation.

---

## 3. End-to-End Judge Flow Tests

1. Physical demo datasets loading from `datasets/demo/`.
2. Net September revenue calculation and subprocess verification (`₹150,400.50`).
3. Order deduplication integrity audit.
4. Deliberate multi-currency refusal without code execution.
5. Out-of-scope query rejection (`UNSUPPORTED ANALYSIS`).
6. Backend offline resilience (explicit error card, zero mock fallback).
