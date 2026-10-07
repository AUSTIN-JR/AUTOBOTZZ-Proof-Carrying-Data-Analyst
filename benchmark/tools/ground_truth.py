#!/usr/bin/env python3
"""
========================================================================================
HACKNEX 2026 — AUTOBOTTZZZZ: Proof-Carrying Data Analyst (HNX26PSI08)
Ground-Truth Calculation Engine & Benchmark Test Suite Builder
========================================================================================
Calculates exact numerical answers programmatically from clean datasets using Pandas.
Generates:
  - testing/questions.csv
  - testing/expected_answers.csv
  - testing/test_cases.json
========================================================================================
"""

import json
from pathlib import Path
import pandas as pd
import numpy as np

ROOT_DIR = Path(__file__).resolve().parent.parent
CLEAN_DIR = ROOT_DIR / "datasets" / "clean"
MESSY_DIR = ROOT_DIR / "datasets" / "messy"
TEST_DIR = ROOT_DIR / "cases"
TEST_DIR.mkdir(parents=True, exist_ok=True)

# Standard Reference Exchange Rate
FX_USD_TO_INR = 83.50

def load_clean_data():
    customers = pd.read_csv(CLEAN_DIR / "customers.csv")
    products = pd.read_csv(CLEAN_DIR / "products.csv")
    orders = pd.read_csv(CLEAN_DIR / "orders.csv")
    order_items = pd.read_csv(CLEAN_DIR / "order_items.csv")
    payments = pd.read_csv(CLEAN_DIR / "payments.csv")
    refunds = pd.read_csv(CLEAN_DIR / "refunds.csv")
    return customers, products, orders, order_items, payments, refunds

def load_messy_data():
    customers = pd.read_csv(MESSY_DIR / "customers.csv")
    products = pd.read_csv(MESSY_DIR / "products.csv")
    orders = pd.read_csv(MESSY_DIR / "orders.csv")
    order_items = pd.read_csv(MESSY_DIR / "order_items.csv")
    payments = pd.read_csv(MESSY_DIR / "payments.csv")
    refunds = pd.read_csv(MESSY_DIR / "refunds.csv")
    return customers, products, orders, order_items, payments, refunds

def build_ground_truth():
    print("[1/3] Loading clean and messy datasets for ground-truth calculation...")
    c, p, o, oi, pay, ref = load_clean_data()
    mc, mp, mo, moi, mpay, mref = load_messy_data()

    # Authoritative Recognized Orders Filter:
    # orders with status in ('confirmed', 'shipped', 'delivered') AND matching completed payment
    completed_pays = pay[pay["payment_status"] == "completed"]["order_id"].unique()
    rec_orders = o[(o["order_status"].isin(["confirmed", "shipped", "delivered"])) & (o["order_id"].isin(completed_pays))].copy()

    # Processed refunds filter
    proc_ref = ref[ref["refund_status"] == "processed"].copy()

    test_cases = []

    # =========================================================================
    # CATEGORY A: BASIC ANALYTICS (Single Table / Simple Aggregations)
    # =========================================================================

    # Q01: Total gross recognized revenue in INR in September 2026
    sep_rec_inr = rec_orders[(rec_orders["currency"] == "INR") & (rec_orders["order_date"].str.startswith("2026-09"))]
    ans_q01 = round(float(sep_rec_inr["total_amount"].sum()), 2)
    test_cases.append({
        "id": "TC-A01",
        "category": "Basic Analytics",
        "question": "What was the total gross recognized revenue in INR from completed orders in September 2026?",
        "required_tables": ["orders.csv", "payments.csv"],
        "required_columns": ["orders.order_id", "orders.order_date", "orders.order_status", "orders.currency", "orders.total_amount", "payments.payment_status"],
        "expected_answer": ans_q01,
        "calculation_method": "Sum orders.total_amount where currency == 'INR', order_date is September 2026, status in (confirmed, shipped, delivered), and payment is completed.",
        "should_answer": True,
        "should_refuse": False,
        "expected_reason": None,
        "data_quality_issues": [],
        "difficulty": "Easy"
    })

    # Q02: Unique customers who placed at least one order
    ans_q02 = int(o["customer_id"].nunique())
    test_cases.append({
        "id": "TC-A02",
        "category": "Basic Analytics",
        "question": "How many unique customers placed at least one order across the entire dataset?",
        "required_tables": ["orders.csv"],
        "required_columns": ["orders.customer_id"],
        "expected_answer": ans_q02,
        "calculation_method": "Count distinct orders.customer_id across orders.csv.",
        "should_answer": True,
        "should_refuse": False,
        "expected_reason": None,
        "data_quality_issues": [],
        "difficulty": "Easy"
    })

    # Q03: Average Order Value (AOV) in USD for completed orders
    usd_rec = rec_orders[rec_orders["currency"] == "USD"]
    ans_q03 = round(float(usd_rec["total_amount"].mean()), 2)
    test_cases.append({
        "id": "TC-A03",
        "category": "Basic Analytics",
        "question": "What is the Average Order Value (AOV) in USD for completed orders?",
        "required_tables": ["orders.csv", "payments.csv"],
        "required_columns": ["orders.currency", "orders.total_amount", "orders.order_status", "payments.payment_status"],
        "expected_answer": ans_q03,
        "calculation_method": "Average orders.total_amount for USD completed orders with completed payments.",
        "should_answer": True,
        "should_refuse": False,
        "expected_reason": None,
        "data_quality_issues": [],
        "difficulty": "Easy"
    })

    # Q04: Total number of orders placed via Mobile App
    app_orders = o[o["channel"] == "Mobile App"]
    ans_q04 = int(len(app_orders))
    test_cases.append({
        "id": "TC-A04",
        "category": "Basic Analytics",
        "question": "How many total orders were placed through the 'Mobile App' sales channel?",
        "required_tables": ["orders.csv"],
        "required_columns": ["orders.channel", "orders.order_id"],
        "expected_answer": ans_q04,
        "calculation_method": "Count rows in orders.csv where channel == 'Mobile App'.",
        "should_answer": True,
        "should_refuse": False,
        "expected_reason": None,
        "data_quality_issues": [],
        "difficulty": "Easy"
    })

    # Q05: Bestselling product ID by total quantity sold in clean data
    rec_item_ids = oi[oi["order_id"].isin(rec_orders["order_id"])].copy()
    top_prod_qty = rec_item_ids.groupby("product_id")["quantity"].sum().sort_values(ascending=False)
    ans_q05 = str(top_prod_qty.index[0])
    test_cases.append({
        "id": "TC-A05",
        "category": "Basic Analytics",
        "question": "Which product ID had the highest total quantity sold across completed orders?",
        "required_tables": ["orders.csv", "order_items.csv", "payments.csv"],
        "required_columns": ["order_items.product_id", "order_items.quantity", "orders.order_status", "payments.payment_status"],
        "expected_answer": ans_q05,
        "calculation_method": "Group order_items by product_id for completed orders and select product_id with maximum sum(quantity).",
        "should_answer": True,
        "should_refuse": False,
        "expected_reason": None,
        "data_quality_issues": [],
        "difficulty": "Medium"
    })

    # Q06: Total count of processed refund transactions
    ans_q06 = int(len(proc_ref))
    test_cases.append({
        "id": "TC-A06",
        "category": "Basic Analytics",
        "question": "How many refund transactions have been successfully processed?",
        "required_tables": ["refunds.csv"],
        "required_columns": ["refunds.refund_status"],
        "expected_answer": ans_q06,
        "calculation_method": "Count rows in refunds.csv where refund_status == 'processed'.",
        "should_answer": True,
        "should_refuse": False,
        "expected_reason": None,
        "data_quality_issues": [],
        "difficulty": "Easy"
    })

    # =========================================================================
    # CATEGORY B: MULTI-TABLE REASONING (Relational Joins)
    # =========================================================================

    # Q07: Which customer segment generated the highest net revenue in INR?
    # Join rec_orders with customers
    rec_c = rec_orders[rec_orders["currency"] == "INR"].merge(c, on="customer_id")
    gross_by_seg = rec_c.groupby("customer_segment")["total_amount"].sum()

    # Processed refunds by customer segment
    ref_c = proc_ref[proc_ref["currency"] == "INR"].merge(o[["order_id", "customer_id"]], on="order_id").merge(c[["customer_id", "customer_segment"]], on="customer_id")
    ref_by_seg = ref_c.groupby("customer_segment")["refund_amount"].sum()
    net_by_seg = gross_by_seg.subtract(ref_by_seg, fill_value=0.0).sort_values(ascending=False)
    ans_q07 = str(net_by_seg.index[0])
    test_cases.append({
        "id": "TC-B01",
        "category": "Multi-Table Reasoning",
        "question": "Which customer segment generated the highest net revenue in INR (gross recognized revenue minus processed refunds)?",
        "required_tables": ["orders.csv", "customers.csv", "payments.csv", "refunds.csv"],
        "required_columns": ["orders.order_id", "orders.customer_id", "orders.total_amount", "orders.currency", "customers.customer_segment", "refunds.refund_amount", "refunds.refund_status"],
        "expected_answer": ans_q07,
        "calculation_method": "Join completed orders with customers, compute gross revenue per segment in INR, subtract processed refunds joined through orders, find argmax.",
        "should_answer": True,
        "should_refuse": False,
        "expected_reason": None,
        "data_quality_issues": [],
        "difficulty": "Hard"
    })

    # Q08: Product category generating highest gross line revenue in USD
    rec_items_usd = oi[oi["order_id"].isin(rec_orders[rec_orders["currency"] == "USD"]["order_id"])].merge(p, on="product_id")
    cat_rev_usd = rec_items_usd.groupby("category")["line_total"].sum().sort_values(ascending=False)
    ans_q08 = str(cat_rev_usd.index[0])
    test_cases.append({
        "id": "TC-B02",
        "category": "Multi-Table Reasoning",
        "question": "Which product category generated the highest total line revenue in USD from completed orders?",
        "required_tables": ["orders.csv", "order_items.csv", "products.csv", "payments.csv"],
        "required_columns": ["orders.order_id", "orders.currency", "order_items.line_total", "products.category", "payments.payment_status"],
        "expected_answer": ans_q08,
        "calculation_method": "Join completed USD orders with order_items and products, group by products.category, sum order_items.line_total, find argmax.",
        "should_answer": True,
        "should_refuse": False,
        "expected_reason": None,
        "data_quality_issues": [],
        "difficulty": "Medium"
    })

    # Q09: Which Indian region generated the highest completed order count?
    ind_orders_rec = rec_orders[rec_orders["currency"] == "INR"].merge(c, on="customer_id")
    top_region_ind = ind_orders_rec.groupby("region")["order_id"].count().sort_values(ascending=False)
    ans_q09 = str(top_region_ind.index[0])
    test_cases.append({
        "id": "TC-B03",
        "category": "Multi-Table Reasoning",
        "question": "Which geographical region in India had the highest count of completed orders?",
        "required_tables": ["orders.csv", "customers.csv", "payments.csv"],
        "required_columns": ["orders.customer_id", "orders.order_status", "customers.region", "customers.country", "payments.payment_status"],
        "expected_answer": ans_q09,
        "calculation_method": "Join completed INR orders with customers, filter for country == 'IND', group by region, count orders, find argmax.",
        "should_answer": True,
        "should_refuse": False,
        "expected_reason": None,
        "data_quality_issues": [],
        "difficulty": "Medium"
    })

    # Q10: Total amount refunded via 'UPI' payment method in INR
    ref_with_pay = proc_ref.merge(pay, on="payment_id", suffixes=("_ref", "_pay"))
    upi_refunds = ref_with_pay[(ref_with_pay["payment_method"] == "UPI") & (ref_with_pay["currency_ref"] == "INR")]
    ans_q10 = round(float(upi_refunds["refund_amount"].sum()), 2)
    test_cases.append({
        "id": "TC-B04",
        "category": "Multi-Table Reasoning",
        "question": "What is the total value in INR of processed refunds originated from payments made via 'UPI'?",
        "required_tables": ["refunds.csv", "payments.csv"],
        "required_columns": ["refunds.refund_amount", "refunds.payment_id", "refunds.refund_status", "payments.payment_method", "refunds.currency"],
        "expected_answer": ans_q10,
        "calculation_method": "Join processed refunds with payments on payment_id, filter where payment_method == 'UPI' and currency == 'INR', sum refund_amount.",
        "should_answer": True,
        "should_refuse": False,
        "expected_reason": None,
        "data_quality_issues": [],
        "difficulty": "Medium"
    })

    # Q11: How many distinct customers received at least one processed refund?
    ref_customers = proc_ref.merge(o[["order_id", "customer_id"]], on="order_id")["customer_id"].nunique()
    ans_q11 = int(ref_customers)
    test_cases.append({
        "id": "TC-B05",
        "category": "Multi-Table Reasoning",
        "question": "How many distinct customers have received at least one processed refund?",
        "required_tables": ["refunds.csv", "orders.csv"],
        "required_columns": ["refunds.order_id", "refunds.refund_status", "orders.customer_id"],
        "expected_answer": ans_q11,
        "calculation_method": "Join processed refunds with orders on order_id and count distinct customer_id.",
        "should_answer": True,
        "should_refuse": False,
        "expected_reason": None,
        "data_quality_issues": [],
        "difficulty": "Medium"
    })

    # Q12: Total COGS in INR incurred for completed orders
    rec_ind_items = oi[oi["order_id"].isin(rec_orders[rec_orders["currency"] == "INR"]["order_id"])].merge(p, on="product_id")
    ans_q12 = round(float((rec_ind_items["quantity"] * rec_ind_items["unit_cost"]).sum()), 2)
    test_cases.append({
        "id": "TC-B06",
        "category": "Multi-Table Reasoning",
        "question": "What was the total Cost of Goods Sold (COGS) in INR for all completed orders?",
        "required_tables": ["orders.csv", "order_items.csv", "products.csv", "payments.csv"],
        "required_columns": ["order_items.quantity", "order_items.order_id", "products.unit_cost", "orders.order_status", "orders.currency", "payments.payment_status"],
        "expected_answer": ans_q12,
        "calculation_method": "Filter completed INR orders with completed payments, join with order_items and products, calculate sum(quantity * unit_cost).",
        "should_answer": True,
        "should_refuse": False,
        "expected_reason": None,
        "data_quality_issues": [],
        "difficulty": "Hard"
    })

    # =========================================================================
    # CATEGORY C: DATA QUALITY & ANOMALY DETECTION (Tested against Messy Dataset)
    # =========================================================================

    # Q13: Number of duplicate order rows in messy orders.csv
    dupe_order_count = int(mo.duplicated(subset=["order_id"]).sum())
    test_cases.append({
        "id": "TC-C01",
        "category": "Data Quality",
        "question": "How many duplicate order header rows (same order_id) exist in messy orders.csv?",
        "required_tables": ["orders.csv"],
        "required_columns": ["orders.order_id"],
        "expected_answer": dupe_order_count,
        "calculation_method": "Calculate mo.duplicated(subset=['order_id']).sum() in messy orders.csv.",
        "should_answer": True,
        "should_refuse": False,
        "expected_reason": None,
        "data_quality_issues": ["DUPLICATE_ORDER_ROW"],
        "difficulty": "Easy"
    })

    # Q14: Number of duplicate payment rows in messy payments.csv
    dupe_pay_count = int(mpay.duplicated(subset=["payment_id"]).sum())
    test_cases.append({
        "id": "TC-C02",
        "category": "Data Quality",
        "question": "How many duplicate payment records exist in messy payments.csv?",
        "required_tables": ["payments.csv"],
        "required_columns": ["payments.payment_id"],
        "expected_answer": dupe_pay_count,
        "calculation_method": "Count duplicated rows based on payment_id in messy payments.csv.",
        "should_answer": True,
        "should_refuse": False,
        "expected_reason": None,
        "data_quality_issues": ["DUPLICATE_PAYMENT_ROW"],
        "difficulty": "Easy"
    })

    # Q15: Orphan orders referencing non-existent customer IDs in messy orders.csv
    orphan_orders = int((~mo["customer_id"].isin(mc["customer_id"])).sum())
    test_cases.append({
        "id": "TC-C03",
        "category": "Data Quality",
        "question": "How many order records in messy orders.csv reference customer IDs that do not exist in customers.csv?",
        "required_tables": ["orders.csv", "customers.csv"],
        "required_columns": ["orders.customer_id", "customers.customer_id"],
        "expected_answer": orphan_orders,
        "calculation_method": "Count orders in messy orders.csv where customer_id not in customers.customer_id.",
        "should_answer": True,
        "should_refuse": False,
        "expected_reason": None,
        "data_quality_issues": ["ORPHAN_CUSTOMER_FK"],
        "difficulty": "Medium"
    })

    # Q16: Orphan order items referencing non-existent product IDs in messy order_items.csv
    orphan_items = int((~moi["product_id"].isin(mp["product_id"])).sum())
    test_cases.append({
        "id": "TC-C04",
        "category": "Data Quality",
        "question": "How many order item records in messy order_items.csv reference product IDs that do not exist in products.csv?",
        "required_tables": ["order_items.csv", "products.csv"],
        "required_columns": ["order_items.product_id", "products.product_id"],
        "expected_answer": orphan_items,
        "calculation_method": "Count order items where product_id not in products.product_id.",
        "should_answer": True,
        "should_refuse": False,
        "expected_reason": None,
        "data_quality_issues": ["ORPHAN_PRODUCT_FK"],
        "difficulty": "Medium"
    })

    # Q17: Number of customer records with missing (null) region in messy customers.csv
    null_regions = int(mc["region"].isna().sum())
    test_cases.append({
        "id": "TC-C05",
        "category": "Data Quality",
        "question": "How many customer records in messy customers.csv have a missing or null region?",
        "required_tables": ["customers.csv"],
        "required_columns": ["customers.region"],
        "expected_answer": null_regions,
        "calculation_method": "Count null values in messy customers.region.",
        "should_answer": True,
        "should_refuse": False,
        "expected_reason": None,
        "data_quality_issues": ["MISSING_REGION"],
        "difficulty": "Easy"
    })

    # Q18: Count of order items with negative unit price in messy order_items.csv
    neg_prices = int((moi["unit_price"] < 0).sum())
    test_cases.append({
        "id": "TC-C06",
        "category": "Data Quality",
        "question": "How many order item lines in messy order_items.csv contain an invalid negative unit price?",
        "required_tables": ["order_items.csv"],
        "required_columns": ["order_items.unit_price"],
        "expected_answer": neg_prices,
        "calculation_method": "Count rows where unit_price < 0 in messy order_items.csv.",
        "should_answer": True,
        "should_refuse": False,
        "expected_reason": None,
        "data_quality_issues": ["NEGATIVE_UNIT_PRICE"],
        "difficulty": "Easy"
    })

    # =========================================================================
    # CATEGORY D: ADVANCED ANALYTICS (Financial Intelligence & Ratios)
    # =========================================================================

    # Q19: Refund rate in INR (processed refunds as percentage of gross recognized revenue)
    gross_inr = rec_orders[rec_orders["currency"] == "INR"]["total_amount"].sum()
    ref_inr = proc_ref[proc_ref["currency"] == "INR"]["refund_amount"].sum()
    ans_q19 = round(float((ref_inr / gross_inr) * 100.0), 2)
    test_cases.append({
        "id": "TC-D01",
        "category": "Advanced Analytics",
        "question": "What is the refund rate percentage in INR (total processed refunds divided by gross recognized revenue multiplied by 100)?",
        "required_tables": ["orders.csv", "refunds.csv", "payments.csv"],
        "required_columns": ["orders.total_amount", "orders.currency", "orders.order_status", "refunds.refund_amount", "refunds.refund_status", "refunds.currency", "payments.payment_status"],
        "expected_answer": ans_q19,
        "calculation_method": "Compute sum(processed refunds in INR) / sum(gross recognized revenue in INR) * 100, rounded to 2 decimals.",
        "should_answer": True,
        "should_refuse": False,
        "expected_reason": None,
        "data_quality_issues": [],
        "difficulty": "Hard"
    })

    # Q20: Customer ID with highest Customer Lifetime Value (Net Revenue) in INR
    cust_orders_inr = rec_orders[rec_orders["currency"] == "INR"].groupby("customer_id")["total_amount"].sum()
    cust_refs_inr = proc_ref[proc_ref["currency"] == "INR"].merge(o[["order_id", "customer_id"]], on="order_id").groupby("customer_id")["refund_amount"].sum()
    clv_inr = cust_orders_inr.subtract(cust_refs_inr, fill_value=0.0).sort_values(ascending=False)
    ans_q20 = str(clv_inr.index[0])
    test_cases.append({
        "id": "TC-D02",
        "category": "Advanced Analytics",
        "question": "Which customer ID has generated the highest Customer Lifetime Value (net revenue in INR) across all completed orders?",
        "required_tables": ["orders.csv", "refunds.csv", "payments.csv"],
        "required_columns": ["orders.customer_id", "orders.total_amount", "orders.order_status", "orders.currency", "refunds.refund_amount", "refunds.refund_status", "payments.payment_status"],
        "expected_answer": ans_q20,
        "calculation_method": "Calculate net recognized revenue per customer in INR (gross minus refunds) and find argmax customer_id.",
        "should_answer": True,
        "should_refuse": False,
        "expected_reason": None,
        "data_quality_issues": [],
        "difficulty": "Hard"
    })

    # Q21: Month-over-month Net Revenue growth in INR from September 2026 to October 2026
    sep_orders = rec_orders[(rec_orders["currency"] == "INR") & (rec_orders["order_date"].str.startswith("2026-09"))]
    oct_orders = rec_orders[(rec_orders["currency"] == "INR") & (rec_orders["order_date"].str.startswith("2026-10"))]
    sep_gross = sep_orders["total_amount"].sum()
    oct_gross = oct_orders["total_amount"].sum()

    sep_refs = proc_ref[(proc_ref["currency"] == "INR") & (proc_ref["refund_date"].str.startswith("2026-09"))]["refund_amount"].sum()
    oct_refs = proc_ref[(proc_ref["currency"] == "INR") & (proc_ref["refund_date"].str.startswith("2026-10"))]["refund_amount"].sum()

    sep_net = sep_gross - sep_refs
    oct_net = oct_gross - oct_refs
    ans_q21 = round(float(((oct_net - sep_net) / sep_net) * 100.0), 2)
    test_cases.append({
        "id": "TC-D03",
        "category": "Advanced Analytics",
        "question": "What was the month-over-month net revenue growth percentage in INR from September 2026 to October 2026?",
        "required_tables": ["orders.csv", "refunds.csv", "payments.csv"],
        "required_columns": ["orders.order_date", "orders.total_amount", "orders.currency", "orders.order_status", "refunds.refund_date", "refunds.refund_amount", "refunds.refund_status", "payments.payment_status"],
        "expected_answer": ans_q21,
        "calculation_method": "Calculate Net Revenue for Sep 2026 and Oct 2026, then compute ((Oct_Net - Sep_Net) / Sep_Net) * 100.",
        "should_answer": True,
        "should_refuse": False,
        "expected_reason": None,
        "data_quality_issues": [],
        "difficulty": "Hard"
    })

    # Q22: Product Category with the highest Gross Profit in INR
    # Gross Profit = Line Item Revenue - (Quantity * Unit Cost) for completed orders
    rec_ind_items["gross_profit_item"] = rec_ind_items["line_total"] - (rec_ind_items["quantity"] * rec_ind_items["unit_cost"])
    cat_gp = rec_ind_items.groupby("category")["gross_profit_item"].sum().sort_values(ascending=False)
    ans_q22 = str(cat_gp.index[0])
    test_cases.append({
        "id": "TC-D04",
        "category": "Advanced Analytics",
        "question": "Which product category generated the highest gross profit in INR from completed orders?",
        "required_tables": ["orders.csv", "order_items.csv", "products.csv", "payments.csv"],
        "required_columns": ["order_items.line_total", "order_items.quantity", "products.unit_cost", "products.category", "orders.currency", "orders.order_status", "payments.payment_status"],
        "expected_answer": ans_q22,
        "calculation_method": "Join completed INR orders with order_items and products, compute sum(line_total - (quantity * unit_cost)) by category, find argmax.",
        "should_answer": True,
        "should_refuse": False,
        "expected_reason": None,
        "data_quality_issues": [],
        "difficulty": "Hard"
    })

    # Q23: Percentage of total orders placed that were cancelled
    ans_q23 = round(float((len(o[o["order_status"] == "cancelled"]) / len(o)) * 100.0), 2)
    test_cases.append({
        "id": "TC-D05",
        "category": "Advanced Analytics",
        "question": "What percentage of all placed orders were cancelled?",
        "required_tables": ["orders.csv"],
        "required_columns": ["orders.order_status", "orders.order_id"],
        "expected_answer": ans_q23,
        "calculation_method": "(Count of cancelled orders / total count of orders) * 100 rounded to 2 decimals.",
        "should_answer": True,
        "should_refuse": False,
        "expected_reason": None,
        "data_quality_issues": [],
        "difficulty": "Medium"
    })

    # Q24: Overall Gross Margin percentage across all completed INR orders
    total_gp_inr = rec_ind_items["line_total"].sum() - (rec_ind_items["quantity"] * rec_ind_items["unit_cost"]).sum()
    ans_q24 = round(float((total_gp_inr / rec_ind_items["line_total"].sum()) * 100.0), 2)
    test_cases.append({
        "id": "TC-D06",
        "category": "Advanced Analytics",
        "question": "What was the overall gross product margin percentage across completed INR orders?",
        "required_tables": ["orders.csv", "order_items.csv", "products.csv", "payments.csv"],
        "required_columns": ["order_items.line_total", "order_items.quantity", "products.unit_cost", "orders.currency", "orders.order_status", "payments.payment_status"],
        "expected_answer": ans_q24,
        "calculation_method": "(Total Product Gross Profit / Total Product Revenue) * 100 for completed INR orders.",
        "should_answer": True,
        "should_refuse": False,
        "expected_reason": None,
        "data_quality_issues": [],
        "difficulty": "Hard"
    })

    # =========================================================================
    # CATEGORY E: AMBIGUOUS QUESTIONS (Must Seek Clarification or Refuse)
    # =========================================================================

    # Q25: Ambiguous slash date 03/04/2026
    test_cases.append({
        "id": "TC-E01",
        "category": "Ambiguous Questions",
        "question": "What was the total revenue on 03/04/2026?",
        "required_tables": ["orders.csv"],
        "required_columns": ["orders.order_date", "orders.total_amount"],
        "expected_answer": None,
        "calculation_method": "Date format 03/04/2026 is inherently ambiguous between 4th March 2026 (DD/MM/YYYY) and 3rd April 2026 (MM/DD/YYYY).",
        "should_answer": False,
        "should_refuse": True,
        "expected_reason": "Date string '03/04/2026' is ambiguous between DD/MM/YYYY and MM/DD/YYYY format. Clarification of date convention is required.",
        "data_quality_issues": ["AMBIGUOUS_DATE_FORMAT"],
        "difficulty": "Medium"
    })

    # Q26: Vague definition of "Sales" without specifying Gross vs Net or Currency
    test_cases.append({
        "id": "TC-E02",
        "category": "Ambiguous Questions",
        "question": "What were the total sales for NovaCart?",
        "required_tables": ["orders.csv"],
        "required_columns": ["orders.total_amount", "orders.currency"],
        "expected_answer": None,
        "calculation_method": "Metric 'sales' is ambiguous: unspecified whether Gross Billed, Recognized Delivered, or Net after refunds, and currency (INR vs USD) is unstated.",
        "should_answer": False,
        "should_refuse": True,
        "expected_reason": "Query is underspecified: 'total sales' does not distinguish between gross order value, recognized revenue, or net revenue, nor does it specify currency.",
        "data_quality_issues": [],
        "difficulty": "Medium"
    })

    # Q27: Vague "customer location" when customer has region and order has shipping address
    test_cases.append({
        "id": "TC-E03",
        "category": "Ambiguous Questions",
        "question": "Which location has the most sales?",
        "required_tables": ["customers.csv", "orders.csv"],
        "required_columns": ["customers.region", "customers.country"],
        "expected_answer": None,
        "calculation_method": "Geographic dimension 'location' is ambiguous between customer billing region and country, and metric 'sales' is undefined.",
        "should_answer": False,
        "should_refuse": True,
        "expected_reason": "'Location' is ambiguous (could refer to customer region or country), and sales metric is unspecified.",
        "data_quality_issues": [],
        "difficulty": "Medium"
    })

    # Q28: Ambiguous date range 'Q3 2026' without calendar vs fiscal specification
    test_cases.append({
        "id": "TC-E04",
        "category": "Ambiguous Questions",
        "question": "What was the total order volume in Q3?",
        "required_tables": ["orders.csv"],
        "required_columns": ["orders.order_date"],
        "expected_answer": None,
        "calculation_method": "Unspecified whether Q3 denotes Calendar Year Q3 (Jul-Sep) or Indian Fiscal Year Q3 (Oct-Dec).",
        "should_answer": False,
        "should_refuse": True,
        "expected_reason": "'Q3' is ambiguous without specifying calendar quarter (Jul-Sep) versus fiscal quarter (Oct-Dec in India).",
        "data_quality_issues": [],
        "difficulty": "Medium"
    })

    # Q29: Ambiguous "top customer" without specifying criterion (volume vs spend vs lifetime)
    test_cases.append({
        "id": "TC-E05",
        "category": "Ambiguous Questions",
        "question": "Who is NovaCart's best customer?",
        "required_tables": ["customers.csv", "orders.csv"],
        "required_columns": ["customers.customer_id", "orders.total_amount"],
        "expected_answer": None,
        "calculation_method": "'Best customer' is subjective and ambiguous without specifying order count, gross revenue, net revenue, or recency.",
        "should_answer": False,
        "should_refuse": True,
        "expected_reason": "Subjective metric 'best customer' is ambiguous without an objective ranking criterion (e.g. order count, gross spend, or net CLV).",
        "data_quality_issues": [],
        "difficulty": "Medium"
    })

    # Q30: Ambiguous currency conversion without specified date for fluctuating FX
    test_cases.append({
        "id": "TC-E06",
        "category": "Ambiguous Questions",
        "question": "What was total company revenue converted to EUR?",
        "required_tables": ["orders.csv"],
        "required_columns": ["orders.total_amount", "orders.currency"],
        "expected_answer": None,
        "calculation_method": "EUR conversion requested, but no EUR exchange rate is maintained or provided in the data dictionary.",
        "should_answer": False,
        "should_refuse": True,
        "expected_reason": "No EUR exchange rates are available in the schema or documented business rules.",
        "data_quality_issues": [],
        "difficulty": "Hard"
    })

    # =========================================================================
    # CATEGORY F: UNANSWERABLE QUESTIONS (Strict Justified Refusal)
    # =========================================================================

    # Q31: Marketing ROAS when ad spend is not tracked
    test_cases.append({
        "id": "TC-F01",
        "category": "Unanswerable Questions",
        "question": "What was NovaCart's Return on Ad Spend (ROAS) in September 2026?",
        "required_tables": ["orders.csv"],
        "required_columns": ["ad_spend", "marketing_cost"],
        "expected_answer": None,
        "calculation_method": "Advertising and marketing expenditure are completely absent from the database schema.",
        "should_answer": False,
        "should_refuse": True,
        "expected_reason": "Return on Ad Spend (ROAS) cannot be calculated because marketing and advertising expenditure data is not tracked in the database.",
        "data_quality_issues": [],
        "difficulty": "Easy"
    })

    # Q32: Net profit for SKU PROD-0003 when unit cost is null in messy dataset
    test_cases.append({
        "id": "TC-F02",
        "category": "Unanswerable Questions",
        "question": "What was the total net profit generated by product PROD-0003 in the messy catalog?",
        "required_tables": ["products.csv", "order_items.csv", "orders.csv"],
        "required_columns": ["products.unit_cost", "order_items.line_total"],
        "expected_answer": None,
        "calculation_method": "Product PROD-0003 has a null unit_cost in the messy catalog; COGS and profit cannot be computed.",
        "should_answer": False,
        "should_refuse": True,
        "expected_reason": "Cannot calculate profit for product PROD-0003 because its procurement cost (unit_cost) is missing (null) in the product catalog.",
        "data_quality_issues": ["MISSING_UNIT_COST"],
        "difficulty": "Medium"
    })

    # Q33: Blended worldwide revenue in INR when USD exchange rate is omitted and forbidden
    test_cases.append({
        "id": "TC-F03",
        "category": "Unanswerable Questions",
        "question": "What is the combined worldwide gross revenue in INR if no exchange rate assumptions are permitted?",
        "required_tables": ["orders.csv"],
        "required_columns": ["orders.total_amount", "orders.currency"],
        "expected_answer": None,
        "calculation_method": "Transactions span INR and USD; summing across distinct currencies without an exchange rate is mathematically invalid.",
        "should_answer": False,
        "should_refuse": True,
        "expected_reason": "Transactions are billed in both INR and USD; combined revenue cannot be calculated without an authorized foreign exchange conversion rate.",
        "data_quality_issues": [],
        "difficulty": "Medium"
    })

    # Q34: Employee commission payout when sales rep data is not recorded
    test_cases.append({
        "id": "TC-F04",
        "category": "Unanswerable Questions",
        "question": "How much sales commission is owed to representative Priya Patel for corporate deals?",
        "required_tables": ["orders.csv"],
        "required_columns": ["sales_rep", "commission_rate"],
        "expected_answer": None,
        "calculation_method": "Sales representative assignments and commission structures are not recorded in the schema.",
        "should_answer": False,
        "should_refuse": True,
        "expected_reason": "Sales representatives and commission structures are not tracked in the database.",
        "data_quality_issues": [],
        "difficulty": "Easy"
    })

    # Q35: Warehouse inventory holding cost when storage fees are missing
    test_cases.append({
        "id": "TC-F05",
        "category": "Unanswerable Questions",
        "question": "What were the total inventory carrying and warehousing costs for October 2026?",
        "required_tables": ["products.csv"],
        "required_columns": ["holding_cost", "warehouse_fee"],
        "expected_answer": None,
        "calculation_method": "Warehousing and logistics storage expenses are completely absent from the database.",
        "should_answer": False,
        "should_refuse": True,
        "expected_reason": "Warehousing fees, inventory holding expenses, and storage costs are not tracked in the dataset.",
        "data_quality_issues": [],
        "difficulty": "Easy"
    })

    # Q36: Website click-through rate (CTR) and conversion funnel when web analytics are absent
    test_cases.append({
        "id": "TC-F06",
        "category": "Unanswerable Questions",
        "question": "What was the website checkout conversion rate (visitors to completed purchases) in September 2026?",
        "required_tables": ["orders.csv"],
        "required_columns": ["website_sessions", "visitor_count"],
        "expected_answer": None,
        "calculation_method": "Web analytics sessions, impressions, and visit logs are not recorded in the transaction database.",
        "should_answer": False,
        "should_refuse": True,
        "expected_reason": "Web traffic sessions, visitor counts, and funnel telemetry are not tracked in the relational transaction database.",
        "data_quality_issues": [],
        "difficulty": "Easy"
    })

    # =========================================================================
    # EXPORT RESULTS
    # =========================================================================
    print(f"[2/3] Computed {len(test_cases)} ground-truth benchmark cases across 6 categories.")

    # 1. testing/test_cases.json
    with open(TEST_DIR / "test_cases.json", "w", encoding="utf-8") as f:
        json.dump(test_cases, f, indent=2)
    print(f"  - Saved test cases JSON: {TEST_DIR / 'test_cases.json'}")

    # 2. testing/questions.csv
    q_df = pd.DataFrame([{
        "id": tc["id"],
        "category": tc["category"],
        "question": tc["question"],
        "difficulty": tc["difficulty"],
        "should_answer": tc["should_answer"],
        "should_refuse": tc["should_refuse"]
    } for tc in test_cases])
    q_df.to_csv(TEST_DIR / "questions.csv", index=False)
    print(f"  - Saved questions CSV: {TEST_DIR / 'questions.csv'}")

    # 3. testing/expected_answers.csv
    ans_df = pd.DataFrame([{
        "id": tc["id"],
        "category": tc["category"],
        "expected_answer": tc["expected_answer"] if tc["expected_answer"] is not None else "REFUSAL_REQUIRED",
        "should_answer": tc["should_answer"],
        "should_refuse": tc["should_refuse"],
        "expected_reason": tc["expected_reason"] if tc["expected_reason"] is not None else "",
        "calculation_method": tc["calculation_method"]
    } for tc in test_cases])
    ans_df.to_csv(TEST_DIR / "expected_answers.csv", index=False)
    print(f"  - Saved expected answers CSV: {TEST_DIR / 'expected_answers.csv'}")

    print("[3/3] Ground-truth calculation and benchmark test suites completed successfully.")
    return test_cases

if __name__ == "__main__":
    build_ground_truth()
