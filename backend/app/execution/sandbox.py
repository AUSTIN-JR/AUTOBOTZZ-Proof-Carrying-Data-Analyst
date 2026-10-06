"""Trusted Proof Code Generator from vetted deterministic templates."""

from typing import Optional
from app.models.analysis import AnalysisPlan
from app.models.proof import GeneratedCode


class ProofGenerator:
    """Generate standalone, rerunnable Python proof scripts from validated plans."""

    @classmethod
    def generate_proof(
        cls,
        plan: AnalysisPlan,
        primary_file_path: str,
        secondary_file_path: Optional[str] = None,
    ) -> GeneratedCode:
        """Synthesize verified standalone Python script from trusted templates."""
        # Normalize Windows path separators for Python script literals
        clean_primary = primary_file_path.replace("\\", "/")
        clean_secondary = (secondary_file_path or "").replace("\\", "/")

        if plan.operation == "NET_REVENUE":
            code = f"""import pandas as pd

# 1. Load source datasets
orders_df = pd.read_csv("{clean_primary}")
refunds_df = pd.read_csv("{clean_secondary}")

# 2. Explicitly deduplicate orders by order_id to prevent double counting
orders_clean = orders_df.drop_duplicates(subset=["order_id"])

# 3. Filter orders to September 2026 completed transactions
orders_sep = orders_clean[orders_clean["order_date"].astype(str).str.contains(r"^2026-09", na=False)]
completed_orders = orders_sep[orders_sep["status"] == "completed"]
gross_revenue = float(completed_orders["total_amount"].sum())

# 4. Filter refunds to September 2026 completed refunds matching recognized completed orders
refunds_sep = refunds_df[refunds_df["refund_date"].astype(str).str.contains(r"^2026-09", na=False)]
valid_refunds = refunds_sep[
    (refunds_sep["status"] == "completed") &
    (refunds_sep["order_id"].isin(completed_orders["order_id"]))
]
total_refunds = float(valid_refunds["amount"].sum())

# 5. Compute net realized revenue
net_revenue = gross_revenue - total_refunds

# 6. Emit exact deterministic result
print(round(net_revenue, 2))
"""
            imports = ["pandas"]

        elif plan.operation == "FILTER_SUM":
            code = f"""import pandas as pd

# 1. Load orders dataset
orders_df = pd.read_csv("{clean_primary}")

# 2. Explicitly deduplicate orders by order_id
orders_clean = orders_df.drop_duplicates(subset=["order_id"])

# 3. Filter orders to completed transactions
completed_orders = orders_clean[orders_clean["status"] == "completed"]

# 4. Compute gross completed revenue
total_revenue = float(completed_orders["total_amount"].sum())

# 5. Emit exact deterministic result
print(round(total_revenue, 2))
"""
            imports = ["pandas"]

        elif plan.operation == "COUNT_DUPLICATES":
            code = f"""import pandas as pd

# 1. Load orders dataset
orders_df = pd.read_csv("{clean_primary}")

# 2. Count duplicate order_id records
duplicate_count = int(orders_df.duplicated(subset=["order_id"]).sum())

# 3. Emit exact integer count
print(duplicate_count)
"""
            imports = ["pandas"]

        else:
            raise ValueError(f"No proof code template registered for operation: {plan.operation}")

        lines = code.strip().split("\n")
        return GeneratedCode(
            language="python",
            code=code.strip(),
            imports=imports,
            line_count=len(lines),
        )

