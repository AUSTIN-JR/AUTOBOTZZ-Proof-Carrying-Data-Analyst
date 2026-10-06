"""Independent Result Verifier comparing analytical pandas calculations against subprocess proof output."""

from datetime import datetime, timezone
import math
from typing import Union

from app.models.proof import VerificationResult


class ResultVerifier:
    """Independent verification engine. Never forces MATCH."""

    @classmethod
    def verify(
        cls,
        calculated_value: Union[float, int, str],
        stdout: str,
    ) -> VerificationResult:
        """
        Compare in-memory calculated value against independent subprocess stdout.
        Supports integer exact equality and floating-point tolerance.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        clean_stdout = stdout.strip()

        if not clean_stdout:
            return VerificationResult(
                status="UNVERIFIABLE",
                reported_value=calculated_value,
                execution_value="<no_output>",
                is_verified=False,
                check_timestamp=now_iso,
            )

        # Attempt integer comparison first
        if isinstance(calculated_value, int):
            try:
                exec_int = int(clean_stdout)
                is_match = (calculated_value == exec_int)
                return VerificationResult(
                    status="MATCH" if is_match else "MISMATCH",
                    reported_value=calculated_value,
                    execution_value=exec_int,
                    is_verified=is_match,
                    check_timestamp=now_iso,
                )
            except ValueError:
                pass

        # Attempt floating-point comparison
        try:
            calc_float = float(calculated_value)
            exec_float = float(clean_stdout)

            # Tolerance for floating point precision: 0.01 currency cent or 0.01%
            is_match = math.isclose(calc_float, exec_float, rel_tol=1e-4, abs_tol=0.01)

            return VerificationResult(
                status="MATCH" if is_match else "MISMATCH",
                reported_value=calc_float,
                execution_value=exec_float,
                is_verified=is_match,
                check_timestamp=now_iso,
            )
        except (ValueError, TypeError):
            # String comparison fallback
            str_match = (str(calculated_value).strip().lower() == clean_stdout.lower())
            return VerificationResult(
                status="MATCH" if str_match else "MISMATCH",
                reported_value=calculated_value,
                execution_value=clean_stdout,
                is_verified=str_match,
                check_timestamp=now_iso,
            )

