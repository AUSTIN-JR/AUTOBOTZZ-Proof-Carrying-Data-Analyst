# AUTOBOTZZ — Scope & Capability Matrix

**Problem Statement:** HNX26PSI08 — Proof-Carrying Data Analyst  
**Competition:** HackNex 2026 Internal Qualifier  

---

## 1. IMPLEMENTED (Verified Qualifier MVP)

### Data Ingestion & Quality Auditing
* **Formats Supported:** `.csv` (standard UTF-8 and UTF-8 with BOM), `.xlsx` (modern Excel via `openpyxl`), `.json` (array of uniform objects).
* **Profiling Metrics:** Total rows, total columns, inferred data types (integer, float, text, date, boolean), null counts, null percentages, distinct value counts, sample rows.
* **Automated Anomaly Checks:**
  * Duplicate row detection.
  * Duplicate primary identifier detection (e.g. repeated `order_id`).
  * Empty column detection (100% null).
  * Constant column detection (single unique value).
  * Multi-currency presence detection (identifies unpegged currency symbols/codes like USD and INR in amount columns).
  * Ambiguous date format detection (flags ambiguous `MM/DD/YYYY` vs `DD/MM/YYYY` entries).
* **Demo Dataset Ingestion:** Dedicated `POST /api/datasets/load-demo` endpoint loading 4 physical fixtures from `datasets/demo/` directly into memory.

### Intent Planning & Execution
* **Deterministic Intent Matching:** Strict mapping from natural language questions to typed `AnalysisPlan` objects without probabilistic guesswork.
* **Supported Analytical Operations:**
  * `NET_REVENUE`: September temporal filtering, order deduplication, status filtering (`completed`), lineage-checked refund subtraction.
  * `FILTER_SUM`: Filtered aggregation over single-table criteria.
  * `COUNT_DUPLICATES`: Primary-key uniqueness audit and duplicate record quantification.
  * `CURRENCY_REFUSAL`: Policy barrier halting unanswerable multi-currency queries.
  * `UNSUPPORTED`: Explicit routing for queries outside the MVP domain (e.g. multidimensional product category analytics).
* **In-Memory Computation:** Ground-truth calculations executed directly against pandas DataFrames.
* **Proof Script Generation:** Standalone, reproducible Python script synthesis from validated templates.
* **Controlled Subprocess Execution:** Live execution of proof scripts using `subprocess.run` with timeout protection (10 seconds), capturing stdout, stderr, exit code, and execution time.
* **Independent Result Verification:** Mathematical reconciliation comparing calculated pandas metrics against subprocess stdout. Emits `MATCH` or `MISMATCH`.
* **ProofPack™ Bundle:** Assembles all telemetry, source lineage, code, and verification proofs into a unified schema.

---

## 2. LIMITATIONS (Intentional Qualifier Trade-offs)

* **In-Memory Session Store:** Dataset profiles and cached DataFrames reside in the FastAPI process memory (`SessionStore`). Server restart clears uploaded data.
* **First-100-Row Quality Scanning:** High-speed heuristic scans (currency regex, date ambiguity) inspect the first 100 rows to ensure sub-second response times.
* **Bounded Question Scope:** Only questions matching recognized analytical templates are answered; out-of-scope questions are cleanly marked as `UNSUPPORTED ANALYSIS`.
* **Subprocess Execution Model:** Python scripts are run via `subprocess.run` with timeout guards rather than inside a full Docker/gVisor virtual container.

---

## 3. NOT IMPLEMENTED / FUTURE (Post-Qualifier Roadmap)

* **Universal Arbitrary NL-to-SQL / Code:** Freeform code generation for arbitrary user questions across arbitrary database schemas.
* **External LLM Runtime Integration:** Calling OpenAI, Anthropic, or Gemini APIs at query execution time.
* **Persistent Database Storage:** PostgreSQL / SQLite session persistence across server restarts.
* **Multi-User Authentication & Isolation:** RBAC, user accounts, and tenant isolation.
* **Cryptographic Signatures:** Digital cryptographic signing of ProofPacks using private keys / SHA-256 blockchain ledgers.
* **Unstructured Documents:** PDF parsing, OCR document ingestion, or image table extraction.
* **Automated Foreign Exchange Ingestion:** Dynamic fetching of historical FX spot rates from external market feeds.
