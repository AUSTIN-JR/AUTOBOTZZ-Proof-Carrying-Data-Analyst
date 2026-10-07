# NovaCart Dataset Design & Architecture Document
**Project:** Proof-Carrying Data Analyst (HNX26PSI08) — AUTOBOTTZZZZ
**Authoritative Business Domain:** NovaCart E-Commerce (Direct-to-Consumer & B2B)
**Target Markets:** India (INR) & United States (USD)

---

## 1. Executive Summary

The NovaCart benchmark is an enterprise-grade synthetic data platform specifically engineered to evaluate the analytical reasoning, data hygiene awareness, relational query execution, and refusal integrity of GenAI Data Analyst agents.

Unlike simplistic single-table toy datasets, NovaCart implements a fully reconciled multi-table relational model across six distinct entities (`customers`, `products`, `orders`, `order_items`, `payments`, and `refunds`). Every monetary unit, lifecycle transition, and foreign-key link is deterministically generated and mathematically verified.

---

## 2. Business Persona & Scope

### 2.1 The Company: NovaCart
NovaCart is an omnichannel electronics and smart lifestyle brand retailing premium audio, computing equipment, smart home devices, gaming peripherals, and mobile accessories.

### 2.2 Commercial Structure
- **Customer Segmentation:**
  - `Consumer (Retail)`: General public, individual purchases, standard return behavior.
  - `Prosumer`: High AOV individuals purchasing high-end computing/audio gear.
  - `Corporate (B2B)`: Bulk orders, high volumes, tax invoices, dedicated accounts.
  - `Student`: Price-conscious buyers, higher coupon discount utilization.
- **Geographic Markets:**
  - `India`: Sub-divided into `North`, `South`, `East`, and `West` sales territories. Base currency is `INR`.
  - `United States`: Sub-divided into `US-East`, `US-West`, `US-Central`, and `US-South`. Base currency is `USD`.
- **Sales Channels:**
  - `Web Direct` (primary DTC web portal)
  - `Mobile App` (iOS and Android app checkouts)
  - `Marketplace` (external partner fulfillment channels)
  - `B2B Portal` (direct procurement platform for enterprise clients)

---

## 3. Data Generation Architecture

The dataset generation engine is designed around two sibling datasets:

1. **Clean Dataset (`datasets/clean/`):**
   - 100% relational integrity (no orphan keys).
   - Fully reconciled financials (`subtotal == sum(items)`, `total == subtotal - discount + tax + shipping`, `payments == total`).
   - ISO 8601 standardized dates (`YYYY-MM-DD`).
   - Clean, distinct currency labeling (`INR` and `USD`).
   - Deterministic seed (`SEED = 42`) ensuring bit-level reproducibility across operating systems.

2. **Messy Dataset (`datasets/messy/`):**
   - Derived directly from the clean dataset via controlled, documented mutations.
   - Contains deliberate data quality traps (duplicates, missing keys, conflicting payments, currency formatting noise, ambiguous dates).
   - Every single distortion is logged in `docs/known_issues.md`.

---

## 4. Volume Targets & Distribution Profiles

| Table | Target Records | Key Distributions & Characteristics |
| :--- | :--- | :--- |
| `customers.csv` | ~150 – 250 | 60% Consumer, 20% Student, 15% Prosumer, 5% Corporate. 65% India, 35% US. |
| `products.csv` | 30 – 40 | 5 categories, price range ₹499 to ₹89,999 / $15 to $1,200. Documented COGS. |
| `orders.csv` | 400 – 600 | Covers months spanning 2026-07 through 2026-10 (focus on Sep & Oct 2026). Statuses: 75% completed/delivered, 10% shipped, 10% cancelled, 5% returned. |
| `order_items.csv` | 800 – 1400 | Average 1.8 to 2.5 line items per order. Quantities 1–3 for retail, up to 20 for B2B. |
| `payments.csv` | 400 – 600 | Methods: UPI (India dominant), Cards, Net Banking, Wire Transfer (B2B). Statuses: 85% completed, 10% failed, 5% pending. |
| `refunds.csv` | 40 – 80 | 80% processed, 10% pending, 10% rejected. Reconciles with order items and payments. |

---

## 5. Authoritative Accounting & Metric Ledger

When evaluating queries, the ground-truth calculation engine adheres strictly to the following principles:

1. **Revenue Recognition:**
   - Only orders with status `confirmed`, `shipped`, or `delivered` and accompanied by a `completed` payment in `payments.csv` count toward **Gross Recognized Revenue**.
   - Cancelled orders do NOT produce recognized revenue under any circumstances.
2. **Net Revenue:**
   - Defined as `Gross Recognized Revenue - sum(refunds.refund_amount WHERE refund_status == 'processed')`.
3. **Cost of Goods Sold (COGS) & Margin:**
   - `COGS = sum(order_items.quantity * products.unit_cost)` for recognized orders.
   - `Gross Profit = Net Revenue - COGS`.
4. **Currency Segregation:**
   - Raw sums across mixed currencies (`INR` and `USD`) without explicit conversion are strictly invalid.
   - Standard reference conversion rate: `1 USD = 83.50 INR`.
   - If an analytical question requests a combined total without providing or authorizing an FX rate, the analyst **must refuse** or flag the missing parameter.
