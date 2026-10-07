# AUTOBOTZZ — Benchmark Evaluation Report
**Evaluation Scope:** Selected Demo-Case Evaluation (Member 2 Recommended Set)
**Timestamp:** 2026-10-07
**Test Suite Target:** Member 2 Benchmark Fixtures (`clean` & `messy`)

---

## 1. Summary Statistics

| Metric | Count | Percentage |
| :--- | :--- | :--- |
| **Total Cases Attempted** | 5 | 100% |
| **Supported by Current MVP** | 2 | 40.0% |
| **Unsupported (Out of MVP Scope)** | 3 | 60.0% |
| **Passed (Verified Correct Answer)** | 1 | 20.0% |
| **Correct Refusals (Policy Compliant)** | 1 | 20.0% |
| **Supported but Wrong** | 0 | 0.0% |
| **Incorrect Refusals** | 0 | 0.0% |
| **Should Have Refused** | 0 | 0.0% |
| **Execution Errors** | 0 | 0.0% |

> **Note on Evaluation Methodology:** Under HackNex qualifier rules, out-of-scope operations return an explicit `UNSUPPORTED ANALYSIS` outcome rather than guessing. No percentage is fabricated over unsupported capabilities.

---

## 2. Selected Case Results

| Case ID | Demo ID | Question | Expected Behavior | Expected Result | Actual Outcome | Actual Result | Verification | Refusal Reason | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-A02` | `DEMO_01` | How many unique customers placed at least one order acr... | ANSWER | `181` | `unsupported` | `UNSUPPORTED ANALYSIS` | `-` | - | **UNSUPPORTED** |
| `TC-B04` | `DEMO_02` | What is the total value in INR of processed refunds ori... | ANSWER | `53044.03` | `unsupported` | `UNSUPPORTED ANALYSIS` | `-` | - | **UNSUPPORTED** |
| `TC-C01` | `DEMO_03` | How many duplicate order header rows (same order_id) ex... | ANSWER | `4` | `verified` | `4 duplicate orders` | `MATCH` | - | **PASS** |
| `TC-F03` | `DEMO_04` | What is the combined worldwide gross revenue in INR if ... | REFUSE | `None (REFUSE)` | `refused` | `CANNOT VERIFY RELIABLY` | `-` | Multiple unpegged currencies d... | **CORRECT_REFUSAL** |
| `TC-D02` | `DEMO_05` | Which customer ID has generated the highest Customer Li... | ANSWER | `CUST-0025` | `unsupported` | `UNSUPPORTED ANALYSIS` | `-` | - | **UNSUPPORTED** |

---

## 3. Case-by-Case Analysis

### TC-A02 (DEMO_01): How many unique customers placed at least one order across the entire dataset?

- **Dataset Variant:** `clean`
- **Expected Behavior:** `ANSWER` (Expected: `181`)
- **Actual Outcome:** `unsupported`
- **Actual Reported Answer:** `UNSUPPORTED ANALYSIS`
- **Proof Script Generated:** `False`
- **Subprocess Executed:** `False`
- **Verification State:** `None`
- **Status:** **`UNSUPPORTED`**

### TC-B04 (DEMO_02): What is the total value in INR of processed refunds originated from payments made via 'UPI'?

- **Dataset Variant:** `clean`
- **Expected Behavior:** `ANSWER` (Expected: `53044.03`)
- **Actual Outcome:** `unsupported`
- **Actual Reported Answer:** `UNSUPPORTED ANALYSIS`
- **Proof Script Generated:** `False`
- **Subprocess Executed:** `False`
- **Verification State:** `None`
- **Status:** **`UNSUPPORTED`**

### TC-C01 (DEMO_03): How many duplicate order header rows (same order_id) exist in messy orders.csv?

- **Dataset Variant:** `messy`
- **Expected Behavior:** `ANSWER` (Expected: `4`)
- **Actual Outcome:** `verified`
- **Actual Reported Answer:** `4 duplicate orders`
- **Proof Script Generated:** `True`
- **Subprocess Executed:** `True`
- **Verification State:** `MATCH`
- **Status:** **`PASS`**

### TC-F03 (DEMO_04): What is the combined worldwide gross revenue in INR if no exchange rate assumptions are permitted?

- **Dataset Variant:** `clean`
- **Expected Behavior:** `REFUSE` (Expected: `None`)
- **Actual Outcome:** `refused`
- **Actual Reported Answer:** `CANNOT VERIFY RELIABLY`
- **Proof Script Generated:** `False`
- **Subprocess Executed:** `False`
- **Verification State:** `None`
- **Refusal Reason:** Multiple unpegged currencies detected (INR, USD) without exchange rate evidence.
- **Status:** **`CORRECT_REFUSAL`**

### TC-D02 (DEMO_05): Which customer ID has generated the highest Customer Lifetime Value (net revenue in INR) across all completed orders?

- **Dataset Variant:** `clean`
- **Expected Behavior:** `ANSWER` (Expected: `CUST-0025`)
- **Actual Outcome:** `unsupported`
- **Actual Reported Answer:** `UNSUPPORTED ANALYSIS`
- **Proof Script Generated:** `False`
- **Subprocess Executed:** `False`
- **Verification State:** `None`
- **Status:** **`UNSUPPORTED`**
