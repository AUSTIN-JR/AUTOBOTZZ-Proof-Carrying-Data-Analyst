# AUTOBOTZZ — Evaluator Demo Script

**Problem Statement:** HNX26PSI08 — Proof-Carrying Data Analyst  
**Competition:** HackNex 2026 Internal Qualifier  

This script outlines the exact sequence to reproduce the AUTOBOTZZ qualifier demonstration.

---

## 1. Startup

1. **Terminal 1 — Backend:**
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload --port 8000
   ```
   *Verify:* Navigate to [http://localhost:8000/health](http://localhost:8000/health) → `{"status": "healthy", ...}`

2. **Terminal 2 — Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```
   *Verify:* Navigate to [http://localhost:3000](http://localhost:3000)

---

## 2. Step 1: Load Physical Demo Datasets

1. In the web workspace, click **"Load Demo Data (4 Datasets)"**.
2. Observe that 4 physical datasets load into the catalog:
   * `Customers` (`customers.csv` — 8 rows)
   * `Orders` (`orders.csv` — 14 rows, 1 duplicate flagged)
   * `Payments` (`payments.csv` — 12 rows, multi-currency detected)
   * `Refunds` (`refunds.csv` — 5 rows)

---

## 3. Step 2: Net Revenue Analysis (Verified Computation)

1. In the question bar, submit:
   ```
   What was net revenue in September after refunds?
   ```
2. Observe the animated pipeline progression across the 8 stages.
3. **Verify the Headline Answer:**
   * **Reported Value:** `₹150,400.50`
   * **Status Badge:** `VERIFIED WITH DATA HANDLING` (amber warning accent)
   * **Verification Note:** *"Execution output matches the reported result byte-for-byte."*
4. Click the **"Proof"** tab to inspect:
   * **Generated Python Code:** Review the standalone pandas script.
   * **Execution Telemetry:** Exit code 0, duration in ms.
   * **Reconciliation Block:** Reported (`₹150,400.50`) == Subprocess Stdout (`₹150,400.50`) → `MATCH`.

---

## 4. Step 3: Integrity Duplicate Audit

1. In the question bar, submit:
   ```
   How many duplicate orders exist in the transactions log?
   ```
2. **Verify the Result:**
   * **Reported Value:** `1 duplicate orders`
   * **Status Badge:** `VERIFIED DETERMINISTIC COMPUTATION`
   * **Explanation:** Identifies the duplicate transaction record for order `ORD-8902`.

---

## 5. Step 4: Deliberate Refusal (Multi-Currency Trap)

1. In the question bar, submit:
   ```
   Convert all USD and INR revenue into INR.
   ```
2. **Verify the Refusal Behavior:**
   * **Status Banner:** `CANNOT VERIFY RELIABLY` (Deliberate Policy Halt)
   * **Reason:** Missing FX spot rate table prevents unpegged conversion under zero-hallucination policy.
   * Click **"Inspect Safety Code" / "Inspect Execution Status"**:
     * Shows: *"No execution was required because analysis stopped at the evidence validation stage."*
     * No fake code or simulated execution is generated.

---

## 6. Step 5: Unsupported Analysis (Category Breakdown)

1. In the question bar, submit:
   ```
   Which product category generated the highest net revenue?
   ```
2. **Verify the Unsupported Card:**
   * Displays the amber **UNSUPPORTED ANALYSIS** card.
   * Truthfully states that multidimensional category analytics is outside the deterministic qualifier MVP scope.
   * Does **not** collide with scalar net revenue or return a misleading number.

---

## 7. Step 6: Backend Offline Test

1. In Terminal 1, stop the backend server (`Ctrl + C`).
2. In the browser, submit any question.
3. **Verify Resilience:**
   * Displays the red **BACKEND UNAVAILABLE** error card with connection troubleshooting instructions.
   * Zero silent mock fallback occurs.
