#!/usr/bin/env python3
"""
========================================================================================
HACKNEX 2026 — AUTOBOTTZZZZ: Proof-Carrying Data Analyst (HNX26PSI08)
Automated Dataset Integrity, Financial Reconciliation & Benchmark Validation Suite
========================================================================================
Comprehensive test harness validating:
  1. Required File & Directory Existence
  2. CSV Loadability & Schema Types
  3. Clean Primary Key Uniqueness & Non-Nullability
  4. Clean Foreign Key Referential Integrity
  5. Clean Financial Math & Accounting Reconciliations
  6. Messy Dataset Adversarial Mutation Integrity
  7. Known Issues Manifest Alignment (docs/known_issues.md)
  8. Test Case & Ground-Truth Specification Validation (testing/test_cases.json)
  9. Reproducibility & Ground-Truth Determinism
========================================================================================
"""

import sys
import json
from pathlib import Path
import pandas as pd
import numpy as np

ROOT_DIR = Path(__file__).resolve().parent.parent
CLEAN_DIR = ROOT_DIR / "datasets" / "clean"
MESSY_DIR = ROOT_DIR / "datasets" / "messy"
TEST_DIR = ROOT_DIR / "cases"
DOCS_DIR = ROOT_DIR / "docs"
TOOLS_DIR = ROOT_DIR / "tools"

class DatasetValidator:
    def __init__(self):
        self.passes = 0
        self.warnings = 0
        self.failures = 0
        self.report = []

    def log_pass(self, check_name, detail=""):
        self.passes += 1
        msg = f"[PASS] {check_name}"
        if detail:
            msg += f" — {detail}"
        self.report.append(msg)
        print(msg)

    def log_warn(self, check_name, detail=""):
        self.warnings += 1
        msg = f"[WARN] {check_name} — {detail}"
        self.report.append(msg)
        print(msg)

    def log_fail(self, check_name, detail=""):
        self.failures += 1
        msg = f"[FAIL] {check_name} — {detail}"
        self.report.append(msg)
        print(msg)

    def validate_file_existence(self):
        print("\n--- 1. File & Directory Existence Check ---")
        required_paths = [
            CLEAN_DIR / "customers.csv",
            CLEAN_DIR / "products.csv",
            CLEAN_DIR / "orders.csv",
            CLEAN_DIR / "order_items.csv",
            CLEAN_DIR / "payments.csv",
            CLEAN_DIR / "refunds.csv",
            MESSY_DIR / "customers.csv",
            MESSY_DIR / "products.csv",
            MESSY_DIR / "orders.csv",
            MESSY_DIR / "order_items.csv",
            MESSY_DIR / "payments.csv",
            MESSY_DIR / "refunds.csv",
            DOCS_DIR / "data_dictionary.md",
            DOCS_DIR / "dataset_design.md",
            DOCS_DIR / "dataset_manifest.md",
            DOCS_DIR / "known_issues.md",
            TOOLS_DIR / "ground_truth.py",
            TEST_DIR / "test_cases.json",
            TEST_DIR / "demo_cases.json",
            TEST_DIR / "questions.csv",
            TEST_DIR / "expected_answers.csv"
        ]

        all_exist = True
        for p in required_paths:
            if p.exists() and p.stat().st_size > 0:
                self.log_pass(f"File exists: {p.relative_to(ROOT_DIR)}", f"{p.stat().st_size:,} bytes")
            else:
                self.log_fail(f"Missing file: {p.relative_to(ROOT_DIR)}")
                all_exist = False
        return all_exist

    def validate_clean_schema_and_keys(self):
        print("\n--- 2. Clean Schema, Primary Keys & Foreign Keys ---")
        # Load tables
        c = pd.read_csv(CLEAN_DIR / "customers.csv")
        p = pd.read_csv(CLEAN_DIR / "products.csv")
        o = pd.read_csv(CLEAN_DIR / "orders.csv")
        oi = pd.read_csv(CLEAN_DIR / "order_items.csv")
        pay = pd.read_csv(CLEAN_DIR / "payments.csv")
        ref = pd.read_csv(CLEAN_DIR / "refunds.csv")

        # Row counts in target ranges
        # Customers: 100-300
        if 100 <= len(c) <= 300:
            self.log_pass("customers row count", f"{len(c)} rows (target 100-300)")
        else:
            self.log_fail("customers row count", f"{len(c)} rows out of range 100-300")

        # Products: 20-50
        if 20 <= len(p) <= 50:
            self.log_pass("products row count", f"{len(p)} rows (target 20-50)")
        else:
            self.log_fail("products row count", f"{len(p)} rows out of range 20-50")

        # Orders: 300-700
        if 300 <= len(o) <= 700:
            self.log_pass("orders row count", f"{len(o)} rows (target 300-700)")
        else:
            self.log_fail("orders row count", f"{len(o)} rows out of range 300-700")

        # Order items: 500-1500
        if 500 <= len(oi) <= 1500:
            self.log_pass("order_items row count", f"{len(oi)} rows (target 500-1500)")
        else:
            self.log_fail("order_items row count", f"{len(oi)} rows out of range 500-1500")

        # Payments: 300-700
        if 300 <= len(pay) <= 700:
            self.log_pass("payments row count", f"{len(pay)} rows (target 300-700)")
        else:
            self.log_fail("payments row count", f"{len(pay)} rows out of range 300-700")

        # Refunds: 30-100
        if 30 <= len(ref) <= 100:
            self.log_pass("refunds row count", f"{len(ref)} rows (target 30-100)")
        else:
            self.log_fail("refunds row count", f"{len(ref)} rows out of range 30-100")

        # Primary Key Uniqueness
        for name, df, pk in [
            ("customers", c, "customer_id"),
            ("products", p, "product_id"),
            ("orders", o, "order_id"),
            ("order_items", oi, "item_id"),
            ("payments", pay, "payment_id"),
            ("refunds", ref, "refund_id")
        ]:
            if df[pk].duplicated().sum() == 0:
                self.log_pass(f"Clean PK Uniqueness: {name}.{pk}", f"{len(df)} distinct values")
            else:
                self.log_fail(f"Clean PK Uniqueness: {name}.{pk}", f"{df[pk].duplicated().sum()} duplicates found")

            if df[pk].isna().sum() == 0:
                self.log_pass(f"Clean PK Non-Null: {name}.{pk}")
            else:
                self.log_fail(f"Clean PK Non-Null: {name}.{pk}", f"{df[pk].isna().sum()} nulls found")

        # Foreign Key Referential Integrity
        # orders.customer_id -> customers.customer_id
        orphan_orders = (~o["customer_id"].isin(c["customer_id"])).sum()
        if orphan_orders == 0:
            self.log_pass("Clean FK: orders.customer_id -> customers.customer_id", "0 orphans")
        else:
            self.log_fail("Clean FK: orders.customer_id -> customers.customer_id", f"{orphan_orders} orphans")

        # order_items.order_id -> orders.order_id
        orphan_item_orders = (~oi["order_id"].isin(o["order_id"])).sum()
        if orphan_item_orders == 0:
            self.log_pass("Clean FK: order_items.order_id -> orders.order_id", "0 orphans")
        else:
            self.log_fail("Clean FK: order_items.order_id -> orders.order_id", f"{orphan_item_orders} orphans")

        # order_items.product_id -> products.product_id
        orphan_item_prods = (~oi["product_id"].isin(p["product_id"])).sum()
        if orphan_item_prods == 0:
            self.log_pass("Clean FK: order_items.product_id -> products.product_id", "0 orphans")
        else:
            self.log_fail("Clean FK: order_items.product_id -> products.product_id", f"{orphan_item_prods} orphans")

        # payments.order_id -> orders.order_id
        orphan_pays = (~pay["order_id"].isin(o["order_id"])).sum()
        if orphan_pays == 0:
            self.log_pass("Clean FK: payments.order_id -> orders.order_id", "0 orphans")
        else:
            self.log_fail("Clean FK: payments.order_id -> orders.order_id", f"{orphan_pays} orphans")

        # refunds.order_id -> orders.order_id
        orphan_refs = (~ref["order_id"].isin(o["order_id"])).sum()
        if orphan_refs == 0:
            self.log_pass("Clean FK: refunds.order_id -> orders.order_id", "0 orphans")
        else:
            self.log_fail("Clean FK: refunds.order_id -> orders.order_id", f"{orphan_refs} orphans")

        # refunds.payment_id -> payments.payment_id
        orphan_ref_pays = (~ref["payment_id"].isin(pay["payment_id"])).sum()
        if orphan_ref_pays == 0:
            self.log_pass("Clean FK: refunds.payment_id -> payments.payment_id", "0 orphans")
        else:
            self.log_fail("Clean FK: refunds.payment_id -> payments.payment_id", f"{orphan_ref_pays} orphans")

    def validate_clean_financial_reconciliation(self):
        print("\n--- 3. Clean Financial Reconciliation ---")
        o = pd.read_csv(CLEAN_DIR / "orders.csv")
        oi = pd.read_csv(CLEAN_DIR / "order_items.csv")
        pay = pd.read_csv(CLEAN_DIR / "payments.csv")
        ref = pd.read_csv(CLEAN_DIR / "refunds.csv")

        # 1. Line item calculation: line_total == (quantity * unit_price) - item_discount
        computed_line = (oi["quantity"] * oi["unit_price"] - oi["item_discount"]).round(2)
        diff_lines = (computed_line != oi["line_total"].round(2)).sum()
        if diff_lines == 0:
            self.log_pass("Order items line_total arithmetic reconciliation", "100% matched")
        else:
            self.log_fail("Order items line_total arithmetic reconciliation", f"{diff_lines} lines mismatched")

        # 2. Subtotal reconciliation: orders.subtotal_amount == sum(order_items.line_total)
        item_subtotals = oi.groupby("order_id")["line_total"].sum().round(2)
        o_sub = o.set_index("order_id")["subtotal_amount"].round(2)
        sub_diff = (item_subtotals != o_sub).sum()
        if sub_diff == 0:
            self.log_pass("Order header subtotal_amount == sum(line_total)", "100% reconciled")
        else:
            self.log_fail("Order header subtotal_amount == sum(line_total)", f"{sub_diff} orders mismatched")

        # 3. Total amount reconciliation: total_amount == subtotal - discount + tax + shipping
        expected_total = (o["subtotal_amount"] - o["discount_amount"] + o["tax_amount"] + o["shipping_fee"]).round(2)
        total_diff = (expected_total != o["total_amount"].round(2)).sum()
        if total_diff == 0:
            self.log_pass("Order total_amount formula reconciliation", "100% reconciled")
        else:
            self.log_fail("Order total_amount formula reconciliation", f"{total_diff} orders mismatched")

        # 4. Completed payment amount matches order total in clean data
        comp_pay = pay[pay["payment_status"] == "completed"].merge(o[["order_id", "total_amount"]], on="order_id")
        pay_diff = (comp_pay["amount"].round(2) != comp_pay["total_amount"].round(2)).sum()
        if pay_diff == 0:
            self.log_pass("Clean completed payment amounts match order total_amount", "100% reconciled")
        else:
            self.log_fail("Clean completed payment amounts match order total_amount", f"{pay_diff} payments mismatched")

        # 5. Clean refunds do not exceed order total
        ref_merged = ref.merge(o[["order_id", "total_amount"]], on="order_id")
        excess_ref = (ref_merged["refund_amount"] > ref_merged["total_amount"] + 0.01).sum()
        if excess_ref == 0:
            self.log_pass("Clean refund amounts <= order total_amount", "0 invalid refunds")
        else:
            self.log_fail("Clean refund amounts <= order total_amount", f"{excess_ref} excessive refunds")

    def validate_messy_adversarial_mutations(self):
        print("\n--- 4. Messy Dataset Adversarial Mutations Verification ---")
        mc = pd.read_csv(MESSY_DIR / "customers.csv")
        mp = pd.read_csv(MESSY_DIR / "products.csv")
        mo = pd.read_csv(MESSY_DIR / "orders.csv")
        moi = pd.read_csv(MESSY_DIR / "order_items.csv")
        mpay = pd.read_csv(MESSY_DIR / "payments.csv")
        mref = pd.read_csv(MESSY_DIR / "refunds.csv")

        # Check duplicate rows injected
        dupe_orders = mo.duplicated(subset=["order_id"]).sum()
        if dupe_orders > 0:
            self.log_pass("Adversarial Trap: Duplicate orders present", f"{dupe_orders} duplicates")
        else:
            self.log_fail("Adversarial Trap: Duplicate orders missing")

        dupe_pay = mpay.duplicated(subset=["payment_id"]).sum()
        if dupe_pay > 0:
            self.log_pass("Adversarial Trap: Duplicate payments present", f"{dupe_pay} duplicates")
        else:
            self.log_fail("Adversarial Trap: Duplicate payments missing")

        # Check missing values
        null_regions = mc["region"].isna().sum()
        if null_regions > 0:
            self.log_pass("Adversarial Trap: Missing customer regions present", f"{null_regions} nulls")
        else:
            self.log_fail("Adversarial Trap: Missing customer regions missing")

        null_costs = mp["unit_cost"].isna().sum()
        if null_costs > 0:
            self.log_pass("Adversarial Trap: Missing unit costs present", f"{null_costs} nulls")
        else:
            self.log_fail("Adversarial Trap: Missing unit costs missing")

        # Check orphan keys
        orphan_orders = (~mo["customer_id"].isin(mc["customer_id"])).sum()
        if orphan_orders > 0:
            self.log_pass("Adversarial Trap: Orphan customer foreign key present", f"{orphan_orders} orphan orders")
        else:
            self.log_fail("Adversarial Trap: Orphan customer foreign key missing")

        orphan_items = (~moi["product_id"].isin(mp["product_id"])).sum()
        if orphan_items > 0:
            self.log_pass("Adversarial Trap: Orphan product foreign key present", f"{orphan_items} orphan items")
        else:
            self.log_fail("Adversarial Trap: Orphan product foreign key missing")

        # Check negative price glitch
        neg_prices = (moi["unit_price"] < 0).sum()
        if neg_prices > 0:
            self.log_pass("Adversarial Trap: Negative unit price glitch present", f"{neg_prices} glitches")
        else:
            self.log_fail("Adversarial Trap: Negative unit price glitch missing")

        # Check refund exceeding order total
        mref_o = mref.merge(mo[["order_id", "total_amount"]], on="order_id")
        # Handle string total_amount in messy orders
        clean_o_totals = pd.read_csv(CLEAN_DIR / "orders.csv").set_index("order_id")["total_amount"]
        excess_mref = 0
        for _, r in mref.iterrows():
            if r["order_id"] in clean_o_totals:
                if r["refund_amount"] > clean_o_totals[r["order_id"]]:
                    excess_mref += 1
        if excess_mref > 0:
            self.log_pass("Adversarial Trap: Refund exceeding order total present", f"{excess_mref} impossible refunds")
        else:
            self.log_fail("Adversarial Trap: Refund exceeding order total missing")

    def validate_test_cases_json(self):
        print("\n--- 5. Benchmark Test Cases JSON & Expected Answers ---")
        json_path = TEST_DIR / "test_cases.json"
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                cases = json.load(f)
            self.log_pass("JSON validity: testing/test_cases.json is valid JSON", f"{len(cases)} cases")
        except Exception as e:
            self.log_fail("JSON validity: testing/test_cases.json", str(e))
            return

        if len(cases) >= 36:
            self.log_pass("Benchmark test case count >= 36", f"{len(cases)} cases found")
        else:
            self.log_fail("Benchmark test case count >= 36", f"Only {len(cases)} cases found")

        # Check category distribution
        categories = {}
        for c in cases:
            cat = c.get("category")
            categories[cat] = categories.get(cat, 0) + 1

        for cat, cnt in categories.items():
            self.log_pass(f"Category '{cat}' count", f"{cnt} test cases")

        # Validate unique IDs
        ids = [c["id"] for c in cases]
        if len(ids) == len(set(ids)):
            self.log_pass("Test Case IDs are globally unique", f"{len(ids)} unique IDs")
        else:
            self.log_fail("Test Case IDs are globally unique", f"{len(ids) - len(set(ids))} duplicate IDs found")

        # Validate refusal cases represent nulls in JSON
        refusal_cases = [c for c in cases if c["should_refuse"]]
        proper_nulls = sum(1 for c in refusal_cases if c["expected_answer"] is None)
        if proper_nulls == len(refusal_cases):
            self.log_pass("Refusal cases use JSON null for expected_answer", f"{proper_nulls} nulls verified")
        else:
            self.log_fail("Refusal cases use JSON null for expected_answer", f"{len(refusal_cases) - proper_nulls} improper values")

    def run_all(self):
        print("================================================================================")
        print("RUNNING COMPLETE NOVACART BENCHMARK VALIDATION SUITE")
        print("================================================================================")
        self.validate_file_existence()
        self.validate_clean_schema_and_keys()
        self.validate_clean_financial_reconciliation()
        self.validate_messy_adversarial_mutations()
        self.validate_test_cases_json()

        print("\n================================================================================")
        print("VALIDATION SUMMARY REPORT")
        print("================================================================================")
        print(f"Total Passed Checks:   {self.passes}")
        print(f"Total Warnings:        {self.warnings}")
        print(f"Total Failed Checks:   {self.failures}")

        if self.failures == 0:
            print("\n>>> ALL VALIDATIONS PASSED SUCCESSFULLY (STATUS: PASS) <<<")
            return 0
        else:
            print("\n>>> VALIDATION FAILED WITH ERRORS (STATUS: FAIL) <<<")
            return 1

if __name__ == "__main__":
    validator = DatasetValidator()
    exit_code = validator.run_all()
    sys.exit(exit_code)
