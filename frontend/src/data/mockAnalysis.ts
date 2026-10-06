import { ProofPack } from "@/types/proof";

export const MOCK_ANALYSES: Record<string, ProofPack> = {
  // Flow 1: Verified
  revenue_sep: {
    id: "PP-2026-00127",
    question: "What was net revenue in September after refunds?",
    outcome: "verified",
    headlineAnswer: "₹2,431,902",
    metricLabel: "September Net Revenue",
    shortExplanation:
      "Calculated from 684 orders and 73 refunds. Gross revenue of ₹2,589,402 was reduced by ₹157,500 in completed customer refunds.",
    calculationBreakdown: [
      { label: "Gross completed revenue", value: "₹2,589,402", operation: "add" },
      { label: "Completed refunds deducted", value: "−₹157,500", operation: "subtract" },
      { label: "Net realized revenue", value: "₹2,431,902", operation: "result" },
    ],
    assumptions: [
      "Only records with orders.status == 'completed' are recognized as gross earnings.",
      "Only refunds with refunds.status == 'completed' are deducted from period revenue.",
      "Pending and chargeback-disputed transactions are held in escrow and omitted.",
    ],
    datasets: ["orders.csv", "refunds.csv"],
    sources: [
      {
        datasetId: "ds-orders",
        filename: "orders.csv",
        columnsUsed: ["order_id", "status", "total_amount", "order_date"],
        filterApplied: "orders['status'].str.lower() == 'completed'",
        rowsInvolved: 684,
      },
      {
        datasetId: "ds-refunds",
        filename: "refunds.csv",
        columnsUsed: ["refund_id", "order_id", "amount", "status", "refund_date"],
        filterApplied: "refunds['status'].str.lower() == 'completed'",
        rowsInvolved: 73,
      },
    ],
    dataQualityIssues: [
      {
        id: "DQI-01",
        title: "DUPLICATE RECORDS",
        severity: "medium",
        datasetName: "orders.csv",
        description: "3 duplicate order rows detected with identical timestamp and customer ID.",
        impact: "Gross revenue would be overstated by ₹18,450 if not deduplicated.",
        handlingDecision: "Deduplicated by unique order_id before aggregation.",
      },
      {
        id: "DQI-02",
        title: "MISSING VALUES",
        severity: "low",
        datasetName: "customers.csv",
        description: "2 customer regions missing in directory.",
        impact: "No effect on period aggregate totals.",
        handlingDecision: "Marked as unallocated region.",
      },
    ],
    generatedCode: {
      language: "python",
      imports: ["import pandas as pd"],
      lineCount: 16,
      code: `import pandas as pd

orders = pd.read_csv("orders.csv")
refunds = pd.read_csv("refunds.csv")

# Filter completed orders
completed = orders[orders["status"].str.lower() == "completed"]
gross_revenue = completed["total_amount"].sum()

# Filter valid completed refunds
valid_refunds = refunds[refunds["status"].str.lower() == "completed"]
refund_total = valid_refunds["amount"].sum()

# Compute verifiable net figure
net_revenue = gross_revenue - refund_total
print(int(net_revenue))`,
    },
    execution: {
      stdout: "2431902",
      exitCode: 0,
      executionTimeMs: 342,
      memoryMb: 14.8,
    },
    verification: {
      status: "MATCH",
      reportedValue: "2431902",
      executionValue: "2431902",
      isVerified: true,
      checkTimestamp: "2026-10-06T19:04:15Z",
    },
    confidence: {
      score: 0.99,
      level: "HIGH",
      reason: "Execution output matches reported figure byte-for-byte with 0 join anomalies.",
    },
    durationMs: 2450,
    createdAt: "2026-10-06T19:04:15Z",
  },

  // Flow 2: Warning
  product_cat: {
    id: "PP-2026-00128",
    question: "Which product category generated the highest net revenue?",
    outcome: "warning",
    headlineAnswer: "Enterprise Hardware (₹1,142,500)",
    metricLabel: "Leading Product Category",
    shortExplanation:
      "Enterprise Hardware produced highest revenue after isolating and excluding 3 duplicate transaction rows detected in orders.csv.",
    calculationBreakdown: [
      { label: "Enterprise Hardware (deduplicated)", value: "₹1,142,500", operation: "metric" },
      { label: "Cloud Services", value: "₹894,200", operation: "metric" },
      { label: "Consumer Accessories", value: "₹395,202", operation: "metric" },
    ],
    assumptions: [
      "Duplicate order keys #ORD-8901, #ORD-8944, #ORD-8962 were quarantined.",
      "Item price times quantity was validated against order total before grouping.",
    ],
    datasets: ["orders.csv", "order_items.csv", "products.csv"],
    sources: [
      {
        datasetId: "ds-orders",
        filename: "orders.csv",
        columnsUsed: ["order_id", "status"],
        filterApplied: "orders.drop_duplicates(subset=['order_id'])",
        rowsInvolved: 681,
      },
      {
        datasetId: "ds-order-items",
        filename: "order_items.csv",
        columnsUsed: ["order_id", "product_id", "quantity", "unit_price"],
        rowsInvolved: 1327,
      },
      {
        datasetId: "ds-products",
        filename: "products.csv",
        columnsUsed: ["product_id", "category"],
        rowsInvolved: 42,
      },
    ],
    dataQualityIssues: [
      {
        id: "DQI-03",
        title: "DUPLICATE RECORDS",
        severity: "medium",
        datasetName: "orders.csv",
        description: "3 duplicate order rows detected with conflicting retry headers.",
        impact: "Would artificially inflate Enterprise Hardware category revenue by ₹64,000.",
        handlingDecision: "Excluded 3 duplicate rows from analysis set to preserve integrity.",
      },
    ],
    generatedCode: {
      language: "python",
      imports: ["import pandas as pd"],
      lineCount: 15,
      code: `import pandas as pd

orders = pd.read_csv("orders.csv").drop_duplicates(subset=["order_id"])
items = pd.read_csv("order_items.csv")
products = pd.read_csv("products.csv")

# Join items with products
merged = items.merge(products, on="product_id").merge(orders, on="order_id")
merged = merged[merged["status"].str.lower() == "completed"]
merged["revenue"] = merged["quantity"] * merged["unit_price"]

by_cat = merged.groupby("category")["revenue"].sum().sort_values(ascending=False)
top_category = by_cat.index[0]
top_value = int(by_cat.iloc[0])

print(f"{top_category}: {top_value}")`,
    },
    execution: {
      stdout: "Enterprise Hardware: 1142500",
      exitCode: 0,
      executionTimeMs: 412,
      memoryMb: 16.1,
    },
    verification: {
      status: "MATCH",
      reportedValue: "Enterprise Hardware: 1142500",
      executionValue: "Enterprise Hardware: 1142500",
      isVerified: true,
      checkTimestamp: "2026-10-06T19:07:22Z",
    },
    confidence: {
      score: 0.88,
      level: "MEDIUM",
      reason: "Computation is verified, but relies on deduplication assumption for 3 duplicate records.",
    },
    durationMs: 2850,
    createdAt: "2026-10-06T19:07:22Z",
  },

  // Flow 3: Refusal
  currency_refusal: {
    id: "PP-2026-00129",
    question: "Convert all USD and INR revenue into INR.",
    outcome: "refused",
    headlineAnswer: "CANNOT VERIFY RELIABLY",
    metricLabel: "Verification Status",
    shortExplanation:
      "This calculation requires a USD → INR conversion rate for the relevant transaction dates. The uploaded datasets do not contain sufficient exchange rate information.",
    calculationBreakdown: [],
    assumptions: [
      "Refusal policy: Hallucinating unpegged currency exchange rates is strictly disallowed under zero-unverified-claim policy.",
    ],
    datasets: ["payments.csv"],
    sources: [
      {
        datasetId: "ds-payments",
        filename: "payments.csv",
        columnsUsed: ["payment_id", "amount", "currency", "settled_at"],
        filterApplied: "currency IN ('USD', 'INR')",
        rowsInvolved: 671,
      },
    ],
    dataQualityIssues: [
      {
        id: "DQI-04",
        title: "CURRENCY WARNING",
        severity: "critical",
        datasetName: "payments.csv",
        description: "USD and INR values detected without foreign exchange spot rates or time-series peg.",
        impact: "Direct summation produces mathematically invalid currency mixtures.",
        handlingDecision: "Query refused to prevent unverified financial claims.",
      },
    ],
    generatedCode: {
      language: "python",
      imports: ["import pandas as pd"],
      lineCount: 14,
      code: `import pandas as pd

payments = pd.read_csv("payments.csv")
currencies = payments["currency"].unique()

# Pre-computation safety constraint check
if set(currencies) != {"INR"}:
    raise ValueError(
        f"Multi-currency reconciliation requires an explicit exchange rate table. "
        f"Found unpegged currencies: {currencies}"
    )`,
    },
    execution: {
      stdout: "",
      stderr: "ValueError: Multi-currency reconciliation requires an explicit exchange rate table. Found unpegged currencies: ['INR' 'USD']",
      exitCode: 1,
      executionTimeMs: 145,
      memoryMb: 11.2,
    },
    verification: {
      status: "UNVERIFIABLE",
      reportedValue: "REFUSED",
      executionValue: "REFUSED",
      isVerified: false,
      checkTimestamp: "2026-10-06T19:09:44Z",
    },
    confidence: {
      score: 0.0,
      level: "LOW",
      reason: "Missing historical foreign exchange rate table. Proof cannot be constructed.",
    },
    durationMs: 1820,
    createdAt: "2026-10-06T19:09:44Z",
    refusalDetails: {
      reason:
        "This calculation requires a USD → INR conversion rate for the relevant transaction dates. The uploaded datasets do not contain sufficient exchange rate information.",
      missingEvidence: [
        "Historical USD → INR spot rates for September 2026 transactions",
        "Benchmark settlement exchange rate rule (e.g. RBI reference rate)",
      ],
      affectedDatasets: ["payments.csv"],
      recommendedAction:
        "Upload an exchange_rates.csv table or specify the conversion rule (e.g. 'Use fixed rate 1 USD = 83.5 INR').",
    },
  },

  // Flow 4: Region refund rate
  refund_region: {
    id: "PP-2026-00125",
    question: "Which region had the highest refund rate?",
    outcome: "verified",
    headlineAnswer: "West Region (14.2% Refund Rate)",
    metricLabel: "Highest Regional Refund Rate",
    shortExplanation:
      "Cross-table join across customers, orders, and refunds identified West region as having 24 refunded orders out of 169 completed orders (14.20%).",
    calculationBreakdown: [
      { label: "West Region refund rate", value: "14.20%", operation: "metric" },
      { label: "North Region refund rate", value: "8.15%", operation: "metric" },
      { label: "South Region refund rate", value: "6.40%", operation: "metric" },
    ],
    assumptions: ["Refund rate computed as count(refunded_orders) / count(total_orders) per region."],
    datasets: ["customers.csv", "orders.csv", "refunds.csv"],
    sources: [
      {
        datasetId: "ds-customers",
        filename: "customers.csv",
        columnsUsed: ["customer_id", "region"],
        rowsInvolved: 248,
      },
      {
        datasetId: "ds-orders",
        filename: "orders.csv",
        columnsUsed: ["order_id", "customer_id"],
        rowsInvolved: 684,
      },
      {
        datasetId: "ds-refunds",
        filename: "refunds.csv",
        columnsUsed: ["order_id", "amount"],
        rowsInvolved: 73,
      },
    ],
    dataQualityIssues: [
      {
        id: "DQI-05",
        title: "MISSING REGIONS",
        severity: "low",
        datasetName: "customers.csv",
        description: "2 customer accounts lack regional mapping.",
        impact: "Omitted from regional denominator.",
        handlingDecision: "Excluded non-attributed accounts.",
      },
    ],
    generatedCode: {
      language: "python",
      imports: ["import pandas as pd"],
      lineCount: 12,
      code: `import pandas as pd

customers = pd.read_csv("customers.csv")
orders = pd.read_csv("orders.csv")
refunds = pd.read_csv("refunds.csv")

m = orders.merge(customers, on="customer_id")
m["is_refunded"] = m["order_id"].isin(refunds["order_id"])

rates = m.groupby("region")["is_refunded"].mean() * 100
top_reg = rates.sort_values(ascending=False).index[0]
print(f"{top_reg}: {rates[top_reg]:.2f}%")`,
    },
    execution: {
      stdout: "West: 14.20%",
      exitCode: 0,
      executionTimeMs: 298,
      memoryMb: 13.5,
    },
    verification: {
      status: "MATCH",
      reportedValue: "West: 14.20%",
      executionValue: "West: 14.20%",
      isVerified: true,
      checkTimestamp: "2026-10-06T18:30:10Z",
    },
    confidence: {
      score: 0.95,
      level: "HIGH",
      reason: "Complete foreign key linkage across customer, order, and refund datasets.",
    },
    durationMs: 2100,
    createdAt: "2026-10-06T18:30:10Z",
  },

  // Flow 5: Duplicate orders
  duplicate_orders: {
    id: "PP-2026-00126",
    question: "How many duplicate orders exist in the transactions log?",
    outcome: "verified",
    headlineAnswer: "3 Duplicate Orders Detected",
    metricLabel: "Integrity Audit",
    shortExplanation:
      "Scanned 684 rows in orders.csv using compound key [customer_id, order_date, total_amount]. Exactly 3 redundant submissions were isolated.",
    calculationBreakdown: [
      { label: "Total order rows logged", value: "684", operation: "metric" },
      { label: "Unique transaction events", value: "681", operation: "metric" },
      { label: "Duplicate rows quarantined", value: "3", operation: "metric" },
    ],
    assumptions: ["Order duplicates defined by matching customer_id, order_date, and total_amount within 5 seconds."],
    datasets: ["orders.csv"],
    sources: [
      {
        datasetId: "ds-orders",
        filename: "orders.csv",
        columnsUsed: ["order_id", "customer_id", "order_date", "total_amount"],
        rowsInvolved: 684,
      },
    ],
    dataQualityIssues: [
      {
        id: "DQI-06",
        title: "DUPLICATE RECORDS",
        severity: "medium",
        datasetName: "orders.csv",
        description: "3 duplicate order rows detected with identical timestamp and customer ID.",
        impact: "Accounting records show duplicated receivables.",
        handlingDecision: "Flagged for database cleanup script.",
      },
    ],
    generatedCode: {
      language: "python",
      imports: ["import pandas as pd"],
      lineCount: 8,
      code: `import pandas as pd

orders = pd.read_csv("orders.csv")
dup_count = orders.duplicated(subset=["customer_id", "order_date", "total_amount"]).sum()
print(dup_count)`,
    },
    execution: {
      stdout: "3",
      exitCode: 0,
      executionTimeMs: 195,
      memoryMb: 12.0,
    },
    verification: {
      status: "MATCH",
      reportedValue: "3",
      executionValue: "3",
      isVerified: true,
      checkTimestamp: "2026-10-06T18:15:00Z",
    },
    confidence: {
      score: 1.0,
      level: "HIGH",
      reason: "Deterministic hash check over exact composite fields.",
    },
    durationMs: 1650,
    createdAt: "2026-10-06T18:15:00Z",
  },
};

