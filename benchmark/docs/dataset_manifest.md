# AUTOBOTZZ QUALIFIER DATASET — MANIFEST

**Version:** AUTOBOTZZ QUALIFIER DATASET v1
**Project:** HackNex 2026 — AUTOBOTZZ (HNX26PSI08)
**Business:** NovaCart Omnichannel Electronics & Smart Lifestyle (India & USA)
**Status:** FROZEN — Do not add records or traps without documenting changes

---

## Overview

The dataset represents a **synthetic relational e-commerce database** for NovaCart.
It exists in two variants: **clean** (authoritative ground truth) and **messy** (adversarial, with 28 injected data quality issues).

---

## Clean Datasets (`datasets/clean/`)

---

### `customers.csv`

**Purpose:** Master customer profile and demographic table.
**Classification:** CLEAN
**Row count:** 200 (201 lines including header)
**Primary key:** `customer_id`

**Important columns:**

| Column | Type | Description |
|--------|------|-------------|
| `customer_id` | String | Unique ID (CUST-XXXX) |
| `customer_name` | String | Full name |
| `email` | String | Contact email |
| `customer_segment` | String | Consumer / Prosumer / Corporate / Student |
| `region` | String | North / South / East / West / US-East / US-West / US-Central / US-South |
| `country` | String | IND or USA |
| `signup_date` | Date | ISO 8601 YYYY-MM-DD |

**Intentional issues:** None
**Questions using it:** TC-B01, TC-B03, TC-B05, TC-C03, TC-C05
**Expected behavior:** ANSWER — clean data, no warnings needed

---

### `orders.csv`

**Purpose:** Order header records for all placed orders across both markets.
**Classification:** CLEAN
**Row count:** 520 (521 lines including header)
**Primary key:** `order_id`
**Foreign keys:** `customer_id → customers.customer_id`

**Important columns:**

| Column | Type | Description |
|--------|------|-------------|
| `order_id` | String | Unique order ID (ORD-XXXX) |
| `customer_id` | String | FK → customers |
| `order_date` | Date/String | ISO 8601 format in clean data |
| `currency` | String | INR or USD |
| `channel` | String | Mobile App / Web / In-Store / Phone |
| `order_status` | String | confirmed / shipped / delivered / cancelled / pending |
| `total_amount` | Float | Total including tax and shipping |

**Intentional issues:** None
**Questions using it:** TC-A01 through TC-A06, TC-B01 through TC-B06, TC-D01 through TC-D06, TC-E01 through TC-E06, TC-F01 through TC-F06
**Expected behavior:** ANSWER for specific scoped questions

---

### `order_items.csv`

**Purpose:** Line-item detail for every order.
**Classification:** CLEAN
**Row count:** 878 (879 lines including header)
**Primary key:** `item_id`
**Foreign keys:** `order_id → orders.order_id`, `product_id → products.product_id`

**Important columns:**

| Column | Type | Description |
|--------|------|-------------|
| `item_id` | String | Unique line-item ID (ITEM-XXXX) |
| `order_id` | String | FK → orders |
| `product_id` | String | FK → products |
| `quantity` | Integer | Units ordered |
| `unit_price` | Float | Selling price at time of order |
| `item_discount` | Float | Discount applied |
| `line_total` | Float | Effective revenue = quantity * unit_price - item_discount |

**Intentional issues:** None
**Questions using it:** TC-A05, TC-B02, TC-B06, TC-C04, TC-C06, TC-D04, TC-D06
**Expected behavior:** ANSWER

---

### `payments.csv`

**Purpose:** Payment transaction records linked to orders.
**Classification:** CLEAN
**Row count:** 520 (521 lines including header)
**Primary key:** `payment_id`
**Foreign keys:** `order_id → orders.order_id`

**Important columns:**

| Column | Type | Description |
|--------|------|-------------|
| `payment_id` | String | Unique payment ID (PAY-XXXX) |
| `order_id` | String | FK → orders |
| `payment_method` | String | UPI / Credit Card / Debit Card / Net Banking / Stripe / PayPal |
| `payment_status` | String | completed / failed / pending |
| `payment_date` | Date | ISO 8601 |
| `amount` | Float | Payment amount |
| `currency` | String | INR or USD |

**Intentional issues:** None
**Questions using it:** TC-A01, TC-A03, TC-A06, TC-B01 through TC-B06, TC-D01 through TC-D06
**Expected behavior:** ANSWER — must filter to payment_status='completed' for recognized revenue

---

### `products.csv`

**Purpose:** Product master catalog with retail pricing and procurement costs.
**Classification:** CLEAN
**Row count:** 30 (31 lines including header)
**Primary key:** `product_id`

**Important columns:**

| Column | Type | Description |
|--------|------|-------------|
| `product_id` | String | Unique SKU (PROD-XXXX) |
| `product_name` | String | Commercial product name |
| `category` | String | Audio & Sound / Computers & Workspace / Mobile & Accessories / Smart Home & Wearables / Gaming & Peripherals |
| `currency` | String | INR or USD |
| `base_price` | Float | MSRP |
| `unit_cost` | Float | Procurement/COGS cost |
| `is_active` | Boolean | Active listing flag |

**Intentional issues:** None
**Questions using it:** TC-A05, TC-B02, TC-B06, TC-D04, TC-D06, TC-F02 (messy only)
**Expected behavior:** ANSWER

---

### `refunds.csv`

**Purpose:** Processed refund transactions linked to orders and payments.
**Classification:** CLEAN
**Row count:** 58 (59 lines including header)
**Primary key:** `refund_id`
**Foreign keys:** `order_id → orders.order_id`, `payment_id → payments.payment_id`

**Important columns:**

| Column | Type | Description |
|--------|------|-------------|
| `refund_id` | String | Unique refund ID (REF-XXXX) |
| `order_id` | String | FK → orders |
| `payment_id` | String | FK → payments |
| `refund_date` | Date | ISO 8601 |
| `refund_amount` | Float | Amount refunded |
| `currency` | String | INR or USD |
| `reason` | String | Refund reason text |
| `refund_status` | String | processed / pending / rejected |

**Intentional issues:** None
**Questions using it:** TC-A06, TC-B01, TC-B04, TC-B05, TC-D01, TC-D02, TC-D03
**Expected behavior:** ANSWER — must filter to refund_status='processed'

---

## Messy Datasets (`datasets/messy/`)

> All messy datasets are derived from the clean datasets by injecting exactly 28 documented issues.
> See `docs/known_issues.md` for the complete issue ledger.

---

### `customers.csv` (messy)

**Classification:** MESSY / ADVERSARIAL
**Row count:** 200 (same as clean)

**Intentional issues:**
- `ISSUE-008`: CUST-0006 — region set to NULL (was East)
- `ISSUE-009`: CUST-0013 — region set to NULL (was South)
- `ISSUE-010`: CUST-0026 — region set to NULL (was West)

**Questions using it:** TC-C03, TC-C05
**Expected behavior:** ANSWER — count of 3 null regions; 1 orphan order customer

---

### `orders.csv` (messy)

**Classification:** MESSY / ADVERSARIAL
**Row count:** 524 (4 extra duplicate rows vs clean's 520)

**Intentional issues:**
- `ISSUE-001` to `ISSUE-004`: ORD-0011 to ORD-0014 — exact duplicate rows inserted
- `ISSUE-017`: ORD-0021 — total_amount formatted as `₹5,043.38` (string with currency symbol)
- `ISSUE-018`: ORD-0022 — total_amount formatted as `2116.68 INR` (suffixed string)
- `ISSUE-019`: ORD-0005 — order_date `08/09/2026` (ambiguous DD/MM vs MM/DD)
- `ISSUE-020`: ORD-0010 — order_date `12/09/2026` (ambiguous)
- `ISSUE-021`: ORD-0019 — order_date `12/10/2026` (ambiguous)
- `ISSUE-022`: ORD-0028 — order_date `11/08/2026` (ambiguous)
- `ISSUE-025`: ORD-0051 — customer_id changed to CUST-9999 (non-existent → orphan FK)
- `ISSUE-028`: ORD-0071 — total_amount inflated to 3,500,000.0 (legitimate-looking outlier)

**Questions using it:** TC-C01, TC-C03
**Expected behavior:** TC-C01 → ANSWER (4 duplicates); TC-C03 → ANSWER (1 orphan)

---

### `order_items.csv` (messy)

**Classification:** MESSY / ADVERSARIAL
**Row count:** 878 (same count as clean; mutations are in-place)

**Intentional issues:**
- `ISSUE-013`: ITEM-0009 — quantity set to NULL
- `ISSUE-014`: ITEM-0043 — quantity set to NULL
- `ISSUE-026`: ITEM-0061 — product_id changed to PROD-9999 (orphan FK)
- Negative unit price injected (1 row, exact row documented in known_issues)

**Questions using it:** TC-C04, TC-C06
**Expected behavior:** TC-C04 → ANSWER (1 orphan product FK); TC-C06 → ANSWER (1 negative price)

---

### `payments.csv` (messy)

**Classification:** MESSY / ADVERSARIAL
**Row count:** 523 (3 extra duplicate payment rows vs clean's 520)

**Intentional issues:**
- `ISSUE-005` to `ISSUE-007`: PAY-0016 to PAY-0018 — exact duplicate rows
- `ISSUE-023`: PAY-0031 — amount changed from 1667.16 to 1167.01 (payment/order mismatch)
- `ISSUE-024`: PAY-0005 — payment_status changed from failed to completed (cancelled order with completed payment — logical contradiction)

**Questions using it:** TC-C02
**Expected behavior:** TC-C02 → ANSWER (3 duplicate payment records)

---

### `products.csv` (messy)

**Classification:** MESSY / ADVERSARIAL
**Row count:** 30 (same as clean)

**Intentional issues:**
- `ISSUE-011`: PROD-0003 — unit_cost set to NULL (was 1950.0)
- `ISSUE-012`: PROD-0008 — unit_cost set to NULL (was 290.0)

**Questions using it:** TC-F02
**Expected behavior:** REFUSE — PROD-0003 unit_cost is NULL, profit cannot be computed

---

### `refunds.csv` (messy)

**Classification:** MESSY / ADVERSARIAL
**Row count:** 58 (same as clean)

**Intentional issues:**
- `ISSUE-015`: REF-0003 — reason field set to NULL
- `ISSUE-016`: REF-0007 — reason field set to NULL
- `ISSUE-027`: REF-0001 — refund_amount inflated to 39,822.34 (exceeds original payment of 8,849.41)

**Questions using it:** No direct test questions; REF-0001 is a general data quality trap
**Expected behavior:** System should flag refund_amount > payment_amount as an anomaly

---

## FX Reference Data

**No separate FX file exists.**
The exchange rate is hardcoded as a business rule:

```
FX_USD_TO_INR = 83.50  (1 USD = 83.50 INR)
```

**Source:** Defined in `testing/ground_truth.py` (line 27) and `analyst.py` (line 31)
**Type:** Static benchmark constant — not dynamic, not sourced from live market data
**Currencies supported:** INR, USD only
**EUR:** NOT supported — no rate defined → must REFUSE any EUR conversion question

**Critical policy:** The existence of the USD→INR rate does NOT make every multi-currency question answerable.
Questions that explicitly forbid exchange rate assumptions (TC-F03) must still REFUSE.
Questions asking for EUR conversion (TC-E06) must REFUSE — no EUR rate exists.
