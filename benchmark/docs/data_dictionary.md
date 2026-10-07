# NovaCart E-Commerce Data Dictionary & Schema Specification
**Version:** 1.0.0
**Project:** Proof-Carrying Data Analyst (HNX26PSI08) — AUTOBOTTZZZZ
**Authoritative Business Domain:** NovaCart Consumer Electronics & Smart Lifestyle (India & USA)

---

## 1. Relational Architecture & Entity Relationships

The NovaCart business model comprises six relational tables:

```
[ customers ] (1) ───────────< (0..N) [ orders ] (1) ───────────< (1..N) [ order_items ]
                                        │                                   │
                                        │ (1)                               │ (N)
                                        │                                   │
                                        ├───< (0..N) [ payments ]           │
                                        │         │                         │
                                        │         │ (1)                     │
                                        │         │                         │
                                        └───< (0..N) [ refunds ]            └───> (1) [ products ]
```

### Cardinality & Structural Rules
1. **Customer to Orders:** `1 : 0..N`. A customer can register without placing orders, or place multiple lifetime orders.
2. **Order to Order Items:** `1 : 1..N`. Every order must contain at least one line item in the clean dataset.
3. **Products to Order Items:** `1 : 0..N`. Products can be ordered multiple times across different orders or none at all if newly listed.
4. **Order to Payments:** `1 : 0..N`. An order may have zero payments (abandoned/unpaid), one payment (standard), or multiple payments (split transactions or retried failed authorizations).
5. **Order to Refunds:** `1 : 0..N`. An order may have zero, one, or multiple partial refunds, provided the cumulative refund does not exceed the successful payment amount.
6. **Payment to Refunds:** `1 : 0..N`. Each refund references the specific payment transaction through which credit was returned.

---

## 2. Table Specifications

### Table 1: `customers.csv`
Primary customer master dataset containing profile and demographic information.

| Column Name | Data Type | PK/FK | Nullable? | Description | Example Value | Units / Validation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `customer_id` | String | PK | No | Unique stable customer identifier | `CUST-0001` | Format: `^CUST-\d{4}$` |
| `customer_name` | String | None | No | Customer full legal/display name | `Aarav Sharma` | Valid non-empty text |
| `email` | String | None | No | Primary contact email address | `aarav.sharma@example.in` | Valid email syntax |
| `customer_segment` | String | None | No | Customer categorization segment | `Consumer` | Values: `Consumer`, `Prosumer`, `Corporate`, `Student` |
| `region` | String | None | No (Clean) | Operational geographical sales region | `North` | Values: `North`, `South`, `East`, `West`, `US-East`, `US-West`, `US-Central`, `US-South` |
| `country` | String | None | No | Country of primary residence/billing | `IND` | ISO 3-letter codes: `IND`, `USA` |
| `signup_date` | Date | None | No | Account creation date | `2025-11-15` | ISO 8601: `YYYY-MM-DD` |

---

### Table 2: `products.csv`
Master product catalog containing active hardware SKUs, retail pricing, and internal procurement cost (COGS).

| Column Name | Data Type | PK/FK | Nullable? | Description | Example Value | Units / Validation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `product_id` | String | PK | No | Unique product SKU identifier | `PROD-0001` | Format: `^PROD-\d{4}$` |
| `product_name` | String | None | No | Commercial marketing product name | `Nova Wireless ANC Headphones` | Valid text |
| `category` | String | None | No | Broad product classification | `Audio & Sound` | Values: `Audio & Sound`, `Computers & Workspace`, `Mobile & Accessories`, `Smart Home & Wearables`, `Gaming & Peripherals` |
| `currency` | String | None | No | Base currency for price and cost | `INR` | Standard: `INR` or `USD` |
| `base_price` | Float | None | No | Manufacturer suggested retail price (MSRP) | `7999.00` | Precision: 2 decimals, `> 0` |
| `unit_cost` | Float | None | No | Procurement / direct production cost (COGS) | `4200.00` | Precision: 2 decimals, `0 < unit_cost < base_price` |
| `is_active` | Boolean | None | No | Whether product is actively purchasable | `True` | Values: `True`, `False` |

---

### Table 3: `orders.csv`
Master transaction ledger recording customer orders at header level.

| Column Name | Data Type | PK/FK | Nullable? | Description | Example Value | Units / Validation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `order_id` | String | PK | No | Unique invoice/order header ID | `ORD-0001` | Format: `^ORD-\d{4}$` |
| `customer_id` | String | FK | No | Customer placing order (`customers.customer_id`) | `CUST-0024` | Must exist in `customers` table |
| `order_date` | Date | None | No | Timestamp/date order was submitted | `2026-09-14` | ISO 8601: `YYYY-MM-DD` |
| `currency` | String | None | No | Order billing currency | `INR` | `INR` or `USD` |
| `channel` | String | None | No | Sales channel origination | `Web Direct` | Values: `Web Direct`, `Mobile App`, `Marketplace`, `B2B Portal` |
| `order_status` | String | None | No | Current lifecycle status of order | `delivered` | Values: `placed`, `confirmed`, `shipped`, `delivered`, `cancelled`, `returned` |
| `subtotal_amount` | Float | None | No | Sum of line totals before header adjustments | `15998.00` | Reconciles with `sum(order_items.line_total)` |
| `discount_amount` | Float | None | No | Header level promotional discount voucher | `500.00` | `0 <= discount_amount <= subtotal_amount` |
| `tax_amount` | Float | None | No | Applicable GST or state sales tax | `2789.64` | `tax_amount >= 0` |
| `shipping_fee` | Float | None | No | Freight and handling fee charged to customer | `150.00` | `shipping_fee >= 0` |
| `total_amount` | Float | None | No | Total billed invoice balance | `18437.64` | `subtotal - discount + tax + shipping` |

---

### Table 4: `order_items.csv`
Granular line item breakdown for each SKU contained within an order.

| Column Name | Data Type | PK/FK | Nullable? | Description | Example Value | Units / Validation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `item_id` | String | PK | No | Unique line item identifier | `ITEM-0001` | Format: `^ITEM-\d{4}$` |
| `order_id` | String | FK | No | Parent order reference (`orders.order_id`) | `ORD-0001` | Must exist in `orders` table |
| `product_id` | String | FK | No | Product SKU ordered (`products.product_id`) | `PROD-0005` | Must exist in `products` table |
| `quantity` | Integer | None | No | Number of units purchased | `2` | Integer, `>= 1` |
| `unit_price` | Float | None | No | Unit selling price at purchase time | `7999.00` | Must match product currency |
| `item_discount` | Float | None | No | Line-item specific promotional discount | `0.00` | `0 <= item_discount <= (quantity * unit_price)` |
| `line_total` | Float | None | No | Net charge for this line item | `15998.00` | Exactly `(quantity * unit_price) - item_discount` |

---

### Table 5: `payments.csv`
Payment gateway settlement ledger recording transaction attempts, processor references, and statuses.

| Column Name | Data Type | PK/FK | Nullable? | Description | Example Value | Units / Validation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `payment_id` | String | PK | No | Unique gateway transaction reference ID | `PAY-0001` | Format: `^PAY-\d{4}$` |
| `order_id` | String | FK | No | Target order header (`orders.order_id`) | `ORD-0001` | Must exist in `orders` table |
| `payment_method` | String | None | No | Method of financial settlement | `UPI` | Values: `UPI`, `Credit Card`, `Debit Card`, `Net Banking`, `Wire Transfer` |
| `payment_status` | String | None | No | Transaction authorization outcome | `completed` | Values: `completed`, `pending`, `failed`, `refunded`, `partially_refunded` |
| `payment_date` | Date | None | No | Date payment was attempted/settled | `2026-09-14` | ISO 8601: `YYYY-MM-DD` |
| `amount` | Float | None | No | Monetary value captured or attempted | `18437.64` | Precision: 2 decimals, `> 0` |
| `currency` | String | None | No | Currency of the settlement transaction | `INR` | Must match `orders.currency` |

---

### Table 6: `refunds.csv`
Post-order reversal ledger documenting customer refund disbursements.

| Column Name | Data Type | PK/FK | Nullable? | Description | Example Value | Units / Validation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `refund_id` | String | PK | No | Unique refund disbursement ID | `REF-0001` | Format: `^REF-\d{4}$` |
| `order_id` | String | FK | No | Original order header (`orders.order_id`) | `ORD-0012` | Must exist in `orders` table |
| `payment_id` | String | FK | No | Originating payment transaction (`payments.payment_id`) | `PAY-0015` | Must exist in `payments` table |
| `refund_date` | Date | None | No | Date refund was issued/processed | `2026-09-20` | ISO 8601: `YYYY-MM-DD` (`>= order_date`) |
| `refund_amount` | Float | None | No | Monetary value credited back to customer | `4200.00` | `0 < refund_amount <= payment_amount` |
| `currency` | String | None | No | Currency of the refund transaction | `INR` | Must match `payments.currency` |
| `reason` | String | None | No (Clean) | Stated business justification for refund | `Defective Product` | Values: `Defective Product`, `Customer Cancellation`, `Late Delivery`, `Wrong Item Shipped` |
| `refund_status` | String | None | No | Current settlement state of the refund | `processed` | Values: `processed`, `pending`, `rejected` |

---

## 3. Authoritative Financial Definitions & Formulas

The following definitions are mandatory and strictly non-interchangeable:

```
+---------------------------------------------------------------------------------------------------+
| 1. Order Subtotal                                                                                 |
|    orders.subtotal_amount = sum(order_items.line_total)                                           |
+---------------------------------------------------------------------------------------------------+
| 2. Order Total (Invoice Value)                                                                    |
|    orders.total_amount = orders.subtotal_amount - orders.discount_amount                          |
|                        + orders.tax_amount + orders.shipping_fee                                  |
+---------------------------------------------------------------------------------------------------+
| 3. Gross Recognized Revenue                                                                       |
|    Sum of orders.total_amount where:                                                              |
|      - orders.order_status IN ('confirmed', 'shipped', 'delivered')                               |
|      - At least one payment in payments.csv has payment_status == 'completed'                     |
|    (Cancelled, returned, or uncompleted orders generate ZERO recognized gross revenue)            |
+---------------------------------------------------------------------------------------------------+
| 4. Completed Payment Value                                                                        |
|    Sum of payments.amount where payment_status == 'completed'                                     |
+---------------------------------------------------------------------------------------------------+
| 5. Total Processed Refunds                                                                        |
|    Sum of refunds.refund_amount where refund_status == 'processed'                                |
|    (Pending or rejected refunds DO NOT reduce cash or revenue)                                    |
+---------------------------------------------------------------------------------------------------+
| 6. Net Revenue                                                                                    |
|    Net Revenue = Gross Recognized Revenue - Total Processed Refunds                               |
+---------------------------------------------------------------------------------------------------+
| 7. Cost of Goods Sold (COGS)                                                                      |
|    Sum of (order_items.quantity * products.unit_cost) for all items in orders qualifying for     |
|    Gross Recognized Revenue.                                                                      |
+---------------------------------------------------------------------------------------------------+
| 8. Gross Profit                                                                                   |
|    Gross Profit = Net Revenue - COGS                                                              |
|    (Or Product Net Revenue - COGS when isolating catalog margin)                                  |
+---------------------------------------------------------------------------------------------------+
| 9. Currency Conversion Policy                                                                     |
|    - Standard Reference Benchmark Rate: 1 USD = 83.50 INR                                         |
|    - Questions asking for blended currency metrics MUST specify or explicitly assume this rate    |
|    - If an arbitrary or unspecified currency conversion is requested without a rate, the analyst  |
|      MUST REFUSE the question.                                                                    |
+---------------------------------------------------------------------------------------------------+
```

---

## 4. Special Edge Cases & Lifecycle States
1. **Cancelled Orders:** Orders with `order_status = 'cancelled'`. In clean data, either no payment exists or payment is failed/refunded. (In messy data, an adversarial trap pairs a cancelled order with a completed payment).
2. **Failed Payments:** Orders with only `payment_status = 'failed'` records. The order remains in `placed` or `cancelled` state; no fulfillment occurs and no revenue is recognized.
3. **Partial & Multiple Refunds:** Multiple refund entries for a single order are permitted, provided the sum of processed refunds $\le$ successful payment total.
4. **Unpaid Orders:** Orders where `payments.csv` has no corresponding entry. These are treated as abandoned checkouts (`order_status = 'placed'`).
