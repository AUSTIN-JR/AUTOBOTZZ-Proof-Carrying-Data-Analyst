# NovaCart Known Issues & Adversarial Anomaly Manifest
**Project:** Proof-Carrying Data Analyst (HNX26PSI08) — AUTOBOTTZZZZ
**Generated:** 2026-10-06 19:19:25
**Total Planted Issues:** 30

This manifest catalogs every intentional anomaly and corruption injected into `datasets/messy/`.
Use this ledger to verify whether an AI Data Analyst correctly identifies, cleans, flags, or refuses
compromised data according to rigorous data-quality standards.

---

## Summary by Severity Classification
- **INVALIDATING (Hard Errors):** Data corruption that invalidates calculation results if unhandled.
- **AMBIGUOUS (Clarification Required):** Data where multiple valid interpretations exist without clarification.
- **SUSPICIOUS (Plausible Anomalies & Noise):** Formatting quirks, casing inconsistencies, or valid business outliers.

---

## Detailed Issue Ledger

| Issue ID | Table | Record ID | Issue Type | Original Value | Messy Value | Severity |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ISSUE-001` | `orders.csv` | `ORD-0011` | `DUPLICATE_ORDER_ROW` | `Single unique row` | `Duplicate identical row inserted` | **INVALIDATING** |
| `ISSUE-002` | `orders.csv` | `ORD-0012` | `DUPLICATE_ORDER_ROW` | `Single unique row` | `Duplicate identical row inserted` | **INVALIDATING** |
| `ISSUE-003` | `orders.csv` | `ORD-0013` | `DUPLICATE_ORDER_ROW` | `Single unique row` | `Duplicate identical row inserted` | **INVALIDATING** |
| `ISSUE-004` | `orders.csv` | `ORD-0014` | `DUPLICATE_ORDER_ROW` | `Single unique row` | `Duplicate identical row inserted` | **INVALIDATING** |
| `ISSUE-005` | `payments.csv` | `PAY-0016` | `DUPLICATE_PAYMENT_ROW` | `Single unique payment` | `Duplicate identical payment row` | **INVALIDATING** |
| `ISSUE-006` | `payments.csv` | `PAY-0017` | `DUPLICATE_PAYMENT_ROW` | `Single unique payment` | `Duplicate identical payment row` | **INVALIDATING** |
| `ISSUE-007` | `payments.csv` | `PAY-0018` | `DUPLICATE_PAYMENT_ROW` | `Single unique payment` | `Duplicate identical payment row` | **INVALIDATING** |
| `ISSUE-008` | `customers.csv` | `CUST-0006` | `MISSING_REGION` | `East` | `NaN / Null` | **AMBIGUOUS** |
| `ISSUE-009` | `customers.csv` | `CUST-0013` | `MISSING_REGION` | `South` | `NaN / Null` | **AMBIGUOUS** |
| `ISSUE-010` | `customers.csv` | `CUST-0026` | `MISSING_REGION` | `West` | `NaN / Null` | **AMBIGUOUS** |
| `ISSUE-011` | `products.csv` | `PROD-0003` | `MISSING_UNIT_COST` | `1950.0` | `NaN / Null` | **INVALIDATING** |
| `ISSUE-012` | `products.csv` | `PROD-0008` | `MISSING_UNIT_COST` | `290.0` | `NaN / Null` | **INVALIDATING** |
| `ISSUE-013` | `order_items.csv` | `ITEM-0009` | `MISSING_QUANTITY` | `1` | `NaN / Null` | **INVALIDATING** |
| `ISSUE-014` | `order_items.csv` | `ITEM-0043` | `MISSING_QUANTITY` | `1.0` | `NaN / Null` | **INVALIDATING** |
| `ISSUE-015` | `refunds.csv` | `REF-0003` | `MISSING_REFUND_REASON` | `Wrong Item Shipped` | `NaN / Null` | **AMBIGUOUS** |
| `ISSUE-016` | `refunds.csv` | `REF-0007` | `MISSING_REFUND_REASON` | `Wrong Item Shipped` | `NaN / Null` | **AMBIGUOUS** |
| `ISSUE-017` | `orders.csv` | `ORD-0021` | `FORMATTED_CURRENCY_STRING` | `5043.38` | `₹5,043.38` | **SUSPICIOUS** |
| `ISSUE-018` | `orders.csv` | `ORD-0022` | `SUFFIXED_CURRENCY_STRING` | `2116.68` | `2116.68 INR` | **SUSPICIOUS** |
| `ISSUE-019` | `orders.csv` | `ORD-0005` | `AMBIGUOUS_DATE_FORMAT` | `2026-09-08` | `08/09/2026` | **AMBIGUOUS** |
| `ISSUE-020` | `orders.csv` | `ORD-0010` | `AMBIGUOUS_DATE_FORMAT` | `2026-09-26` | `12/09/2026` | **AMBIGUOUS** |
| `ISSUE-021` | `orders.csv` | `ORD-0019` | `AMBIGUOUS_DATE_FORMAT` | `2026-10-16` | `12/10/2026` | **AMBIGUOUS** |
| `ISSUE-022` | `orders.csv` | `ORD-0028` | `AMBIGUOUS_DATE_FORMAT` | `2026-08-11` | `11/08/2026` | **AMBIGUOUS** |
| `ISSUE-023` | `payments.csv` | `PAY-0031` | `PAYMENT_ORDER_MISMATCH` | `1667.16` | `1167.01` | **INVALIDATING** |
| `ISSUE-024` | `payments.csv` | `PAY-0005` | `CANCELLED_ORDER_COMPLETED_PAYMENT` | `failed` | `completed` | **INVALIDATING** |
| `ISSUE-025` | `orders.csv` | `ORD-0051` | `ORPHAN_CUSTOMER_FK` | `CUST-0121` | `CUST-9999` | **INVALIDATING** |
| `ISSUE-026` | `order_items.csv` | `ITEM-0061` | `ORPHAN_PRODUCT_FK` | `PROD-0018` | `PROD-9999` | **INVALIDATING** |
| `ISSUE-027` | `refunds.csv` | `REF-0001` | `REFUND_EXCEEDS_PAYMENT` | `8849.41` | `39822.34` | **INVALIDATING** |
| `ISSUE-028` | `orders.csv` | `ORD-0071` | `LEGITIMATE_HIGH_VALUE_OUTLIER` | `2458.82` | `3500000.0` | **SUSPICIOUS** |
| `ISSUE-029` | `order_items.csv` | `ITEM-0086` | `NEGATIVE_UNIT_PRICE` | `499.0` | `-150.00` | **INVALIDATING** |
| `ISSUE-030` | `products.csv` | `PROD-0004` | `INCONSISTENT_CATEGORY_CASING` | `Audio & Sound` | `audio & SOUND` | **SUSPICIOUS** |

---

## Exhaustive Anomaly Specifications

### ISSUE-001 — DUPLICATE_ORDER_ROW (orders.csv)
- **Target Record:** `ORD-0011`
- **Severity:** **INVALIDATING**
- **Original Clean Value:** `Single unique row`
- **Injected Messy Value:** `Duplicate identical row inserted`
- **Root Cause & Description:** Order header replayed identically in CSV export
- **Analytical Impact:** Overstates gross revenue and order volume if not deduplicated on order_id
- **Expected AI Analyst Behavior:** Must deduplicate records on primary key order_id prior to aggregation

### ISSUE-002 — DUPLICATE_ORDER_ROW (orders.csv)
- **Target Record:** `ORD-0012`
- **Severity:** **INVALIDATING**
- **Original Clean Value:** `Single unique row`
- **Injected Messy Value:** `Duplicate identical row inserted`
- **Root Cause & Description:** Order header replayed identically in CSV export
- **Analytical Impact:** Overstates gross revenue and order volume if not deduplicated on order_id
- **Expected AI Analyst Behavior:** Must deduplicate records on primary key order_id prior to aggregation

### ISSUE-003 — DUPLICATE_ORDER_ROW (orders.csv)
- **Target Record:** `ORD-0013`
- **Severity:** **INVALIDATING**
- **Original Clean Value:** `Single unique row`
- **Injected Messy Value:** `Duplicate identical row inserted`
- **Root Cause & Description:** Order header replayed identically in CSV export
- **Analytical Impact:** Overstates gross revenue and order volume if not deduplicated on order_id
- **Expected AI Analyst Behavior:** Must deduplicate records on primary key order_id prior to aggregation

### ISSUE-004 — DUPLICATE_ORDER_ROW (orders.csv)
- **Target Record:** `ORD-0014`
- **Severity:** **INVALIDATING**
- **Original Clean Value:** `Single unique row`
- **Injected Messy Value:** `Duplicate identical row inserted`
- **Root Cause & Description:** Order header replayed identically in CSV export
- **Analytical Impact:** Overstates gross revenue and order volume if not deduplicated on order_id
- **Expected AI Analyst Behavior:** Must deduplicate records on primary key order_id prior to aggregation

### ISSUE-005 — DUPLICATE_PAYMENT_ROW (payments.csv)
- **Target Record:** `PAY-0016`
- **Severity:** **INVALIDATING**
- **Original Clean Value:** `Single unique payment`
- **Injected Messy Value:** `Duplicate identical payment row`
- **Root Cause & Description:** Payment ledger contains duplicate capture record
- **Analytical Impact:** Causes double-counting of payment values if summed naively
- **Expected AI Analyst Behavior:** Deduplicate by payment_id

### ISSUE-006 — DUPLICATE_PAYMENT_ROW (payments.csv)
- **Target Record:** `PAY-0017`
- **Severity:** **INVALIDATING**
- **Original Clean Value:** `Single unique payment`
- **Injected Messy Value:** `Duplicate identical payment row`
- **Root Cause & Description:** Payment ledger contains duplicate capture record
- **Analytical Impact:** Causes double-counting of payment values if summed naively
- **Expected AI Analyst Behavior:** Deduplicate by payment_id

### ISSUE-007 — DUPLICATE_PAYMENT_ROW (payments.csv)
- **Target Record:** `PAY-0018`
- **Severity:** **INVALIDATING**
- **Original Clean Value:** `Single unique payment`
- **Injected Messy Value:** `Duplicate identical payment row`
- **Root Cause & Description:** Payment ledger contains duplicate capture record
- **Analytical Impact:** Causes double-counting of payment values if summed naively
- **Expected AI Analyst Behavior:** Deduplicate by payment_id

### ISSUE-008 — MISSING_REGION (customers.csv)
- **Target Record:** `CUST-0006`
- **Severity:** **AMBIGUOUS**
- **Original Clean Value:** `East`
- **Injected Messy Value:** `NaN / Null`
- **Root Cause & Description:** Customer regional assignment is null
- **Analytical Impact:** Regional aggregation excludes or groups under 'Unknown'
- **Expected AI Analyst Behavior:** Filter or report 'Unknown/Missing' without discarding customer

### ISSUE-009 — MISSING_REGION (customers.csv)
- **Target Record:** `CUST-0013`
- **Severity:** **AMBIGUOUS**
- **Original Clean Value:** `South`
- **Injected Messy Value:** `NaN / Null`
- **Root Cause & Description:** Customer regional assignment is null
- **Analytical Impact:** Regional aggregation excludes or groups under 'Unknown'
- **Expected AI Analyst Behavior:** Filter or report 'Unknown/Missing' without discarding customer

### ISSUE-010 — MISSING_REGION (customers.csv)
- **Target Record:** `CUST-0026`
- **Severity:** **AMBIGUOUS**
- **Original Clean Value:** `West`
- **Injected Messy Value:** `NaN / Null`
- **Root Cause & Description:** Customer regional assignment is null
- **Analytical Impact:** Regional aggregation excludes or groups under 'Unknown'
- **Expected AI Analyst Behavior:** Filter or report 'Unknown/Missing' without discarding customer

### ISSUE-011 — MISSING_UNIT_COST (products.csv)
- **Target Record:** `PROD-0003`
- **Severity:** **INVALIDATING**
- **Original Clean Value:** `1950.0`
- **Injected Messy Value:** `NaN / Null`
- **Root Cause & Description:** Procurement cost missing from catalog
- **Analytical Impact:** Total COGS and net profit cannot be computed for orders containing this SKU
- **Expected AI Analyst Behavior:** Refuse profit calculation for this SKU or state missing cost exclusion explicitly

### ISSUE-012 — MISSING_UNIT_COST (products.csv)
- **Target Record:** `PROD-0008`
- **Severity:** **INVALIDATING**
- **Original Clean Value:** `290.0`
- **Injected Messy Value:** `NaN / Null`
- **Root Cause & Description:** Procurement cost missing from catalog
- **Analytical Impact:** Total COGS and net profit cannot be computed for orders containing this SKU
- **Expected AI Analyst Behavior:** Refuse profit calculation for this SKU or state missing cost exclusion explicitly

### ISSUE-013 — MISSING_QUANTITY (order_items.csv)
- **Target Record:** `ITEM-0009`
- **Severity:** **INVALIDATING**
- **Original Clean Value:** `1`
- **Injected Messy Value:** `NaN / Null`
- **Root Cause & Description:** Order line quantity missing
- **Analytical Impact:** Item volume calculations broken; cannot verify unit_price * quantity
- **Expected AI Analyst Behavior:** Exclude null quantity line or flag data corruption

### ISSUE-014 — MISSING_QUANTITY (order_items.csv)
- **Target Record:** `ITEM-0043`
- **Severity:** **INVALIDATING**
- **Original Clean Value:** `1.0`
- **Injected Messy Value:** `NaN / Null`
- **Root Cause & Description:** Order line quantity missing
- **Analytical Impact:** Item volume calculations broken; cannot verify unit_price * quantity
- **Expected AI Analyst Behavior:** Exclude null quantity line or flag data corruption

### ISSUE-015 — MISSING_REFUND_REASON (refunds.csv)
- **Target Record:** `REF-0003`
- **Severity:** **AMBIGUOUS**
- **Original Clean Value:** `Wrong Item Shipped`
- **Injected Messy Value:** `NaN / Null`
- **Root Cause & Description:** Customer support omitted refund reason code
- **Analytical Impact:** Breakdown of refunds by reason contains missing category
- **Expected AI Analyst Behavior:** Group under 'Unspecified' or flag null reason

### ISSUE-016 — MISSING_REFUND_REASON (refunds.csv)
- **Target Record:** `REF-0007`
- **Severity:** **AMBIGUOUS**
- **Original Clean Value:** `Wrong Item Shipped`
- **Injected Messy Value:** `NaN / Null`
- **Root Cause & Description:** Customer support omitted refund reason code
- **Analytical Impact:** Breakdown of refunds by reason contains missing category
- **Expected AI Analyst Behavior:** Group under 'Unspecified' or flag null reason

### ISSUE-017 — FORMATTED_CURRENCY_STRING (orders.csv)
- **Target Record:** `ORD-0021`
- **Severity:** **SUSPICIOUS**
- **Original Clean Value:** `5043.38`
- **Injected Messy Value:** `₹5,043.38`
- **Root Cause & Description:** Numeric amount converted to symbol-prefixed formatted string
- **Analytical Impact:** Direct numeric sum will fail with TypeError or coerce to NaN
- **Expected AI Analyst Behavior:** Strip currency symbols and commas before parsing to float

### ISSUE-018 — SUFFIXED_CURRENCY_STRING (orders.csv)
- **Target Record:** `ORD-0022`
- **Severity:** **SUSPICIOUS**
- **Original Clean Value:** `2116.68`
- **Injected Messy Value:** `2116.68 INR`
- **Root Cause & Description:** Amount suffixed with currency code
- **Analytical Impact:** Non-numeric parsing failure
- **Expected AI Analyst Behavior:** Parse numeric component via regex

### ISSUE-019 — AMBIGUOUS_DATE_FORMAT (orders.csv)
- **Target Record:** `ORD-0005`
- **Severity:** **AMBIGUOUS**
- **Original Clean Value:** `2026-09-08`
- **Injected Messy Value:** `08/09/2026`
- **Root Cause & Description:** Date formatted as slash DD/MM/YYYY with day <= 12, indistinguishable from MM/DD/YYYY
- **Analytical Impact:** Queries filtering for specific months (e.g., March vs April) yield ambiguous records
- **Expected AI Analyst Behavior:** Refuse or demand explicit date parsing clarification for ambiguous slash dates

### ISSUE-020 — AMBIGUOUS_DATE_FORMAT (orders.csv)
- **Target Record:** `ORD-0010`
- **Severity:** **AMBIGUOUS**
- **Original Clean Value:** `2026-09-26`
- **Injected Messy Value:** `12/09/2026`
- **Root Cause & Description:** Date formatted as slash DD/MM/YYYY with day <= 12, indistinguishable from MM/DD/YYYY
- **Analytical Impact:** Queries filtering for specific months (e.g., March vs April) yield ambiguous records
- **Expected AI Analyst Behavior:** Refuse or demand explicit date parsing clarification for ambiguous slash dates

### ISSUE-021 — AMBIGUOUS_DATE_FORMAT (orders.csv)
- **Target Record:** `ORD-0019`
- **Severity:** **AMBIGUOUS**
- **Original Clean Value:** `2026-10-16`
- **Injected Messy Value:** `12/10/2026`
- **Root Cause & Description:** Date formatted as slash DD/MM/YYYY with day <= 12, indistinguishable from MM/DD/YYYY
- **Analytical Impact:** Queries filtering for specific months (e.g., March vs April) yield ambiguous records
- **Expected AI Analyst Behavior:** Refuse or demand explicit date parsing clarification for ambiguous slash dates

### ISSUE-022 — AMBIGUOUS_DATE_FORMAT (orders.csv)
- **Target Record:** `ORD-0028`
- **Severity:** **AMBIGUOUS**
- **Original Clean Value:** `2026-08-11`
- **Injected Messy Value:** `11/08/2026`
- **Root Cause & Description:** Date formatted as slash DD/MM/YYYY with day <= 12, indistinguishable from MM/DD/YYYY
- **Analytical Impact:** Queries filtering for specific months (e.g., March vs April) yield ambiguous records
- **Expected AI Analyst Behavior:** Refuse or demand explicit date parsing clarification for ambiguous slash dates

### ISSUE-023 — PAYMENT_ORDER_MISMATCH (payments.csv)
- **Target Record:** `PAY-0031`
- **Severity:** **INVALIDATING**
- **Original Clean Value:** `1667.16`
- **Injected Messy Value:** `1167.01`
- **Root Cause & Description:** Payment gateway captured partial amount (70%) while order marked full total
- **Analytical Impact:** Reconciliation discrepancy between payment ledger and order header
- **Expected AI Analyst Behavior:** Flag reconciliation error when auditing financial matches

### ISSUE-024 — CANCELLED_ORDER_COMPLETED_PAYMENT (payments.csv)
- **Target Record:** `PAY-0005`
- **Severity:** **INVALIDATING**
- **Original Clean Value:** `failed`
- **Injected Messy Value:** `completed`
- **Root Cause & Description:** Order was cancelled but payment status shows completed capture without refund
- **Analytical Impact:** Contradiction in revenue eligibility; audit liability
- **Expected AI Analyst Behavior:** Flag contradiction; do not recognize as earned revenue without manual audit

### ISSUE-025 — ORPHAN_CUSTOMER_FK (orders.csv)
- **Target Record:** `ORD-0051`
- **Severity:** **INVALIDATING**
- **Original Clean Value:** `CUST-0121`
- **Injected Messy Value:** `CUST-9999`
- **Root Cause & Description:** Order references non-existent customer ID CUST-9999
- **Analytical Impact:** Inner join on customers drops order; left join has null customer profile
- **Expected AI Analyst Behavior:** Identify as relational integrity violation during data quality audit

### ISSUE-026 — ORPHAN_PRODUCT_FK (order_items.csv)
- **Target Record:** `ITEM-0061`
- **Severity:** **INVALIDATING**
- **Original Clean Value:** `PROD-0018`
- **Injected Messy Value:** `PROD-9999`
- **Root Cause & Description:** Order item references deleted/non-existent product PROD-9999
- **Analytical Impact:** Category/product-level joins lose this item; catalog COGS unavailable
- **Expected AI Analyst Behavior:** Flag orphan foreign key in order_items table

### ISSUE-027 — REFUND_EXCEEDS_PAYMENT (refunds.csv)
- **Target Record:** `REF-0001`
- **Severity:** **INVALIDATING**
- **Original Clean Value:** `8849.41`
- **Injected Messy Value:** `39822.34`
- **Root Cause & Description:** Refund disbursement amount exceeds 100% of order value
- **Analytical Impact:** Results in negative net revenue for order; financial impossibility
- **Expected AI Analyst Behavior:** Flag as fraudulent/invalid reversal transaction

### ISSUE-028 — LEGITIMATE_HIGH_VALUE_OUTLIER (orders.csv)
- **Target Record:** `ORD-0071`
- **Severity:** **SUSPICIOUS**
- **Original Clean Value:** `2458.82`
- **Injected Messy Value:** `3500000.0`
- **Root Cause & Description:** Enterprise bulk corporate procurement of 50 laptops totaling INR 3.5M
- **Analytical Impact:** Skew in Average Order Value (AOV); statistical outlier
- **Expected AI Analyst Behavior:** Must NOT be discarded as error; retain and report median vs mean

### ISSUE-029 — NEGATIVE_UNIT_PRICE (order_items.csv)
- **Target Record:** `ITEM-0086`
- **Severity:** **INVALIDATING**
- **Original Clean Value:** `499.0`
- **Injected Messy Value:** `-150.00`
- **Root Cause & Description:** Negative unit price recorded due to point-of-sale glitch
- **Analytical Impact:** Distorts revenue and margin calculations
- **Expected AI Analyst Behavior:** Reject line item as invalid data corruption

### ISSUE-030 — INCONSISTENT_CATEGORY_CASING (products.csv)
- **Target Record:** `PROD-0004`
- **Severity:** **SUSPICIOUS**
- **Original Clean Value:** `Audio & Sound`
- **Injected Messy Value:** `audio & SOUND`
- **Root Cause & Description:** Unnormalized casing in product category column
- **Analytical Impact:** Case-sensitive GROUP BY will fragment 'Audio & Sound' into multiple bins
- **Expected AI Analyst Behavior:** Apply case-insensitive normalization (str.title() / str.lower()) before grouping
