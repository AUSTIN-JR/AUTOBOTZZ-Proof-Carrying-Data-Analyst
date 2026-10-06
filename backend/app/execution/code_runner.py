"""Controlled subprocess runner for executing verified proof scripts."""

import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from app.models.proof import ExecutionResult, GeneratedCode


class CodeRunner:
    """Executes trusted, generated Python proof scripts via Controlled Subprocess Execution."""

    @classmethod
    def execute_proof(
        cls,
        generated_code: GeneratedCode,
        timeout_seconds: float = 10.0,
    ) -> ExecutionResult:
        """
        Execute generated Python proof code via controlled subprocess.
        Captures stdout, stderr, exit code, and execution duration.
        """
        with tempfile.TemporaryDirectory(prefix="autobotzz_run_") as temp_dir:
            script_path = Path(temp_dir) / "proof_script.py"
            script_path.write_text(generated_code.code, encoding="utf-8")

            start_time = time.perf_counter()
            try:
                env = {**os.environ, "PYTHONIOENCODING": "utf-8"}
                proc = subprocess.run(
                    [sys.executable, "-u", str(script_path)],
                    cwd=temp_dir,
                    capture_output=True,
                    text=True,
                    timeout=timeout_seconds,
                    env=env,
                )
                duration_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

                return ExecutionResult(
                    stdout=proc.stdout.strip(),
                    stderr=proc.stderr.strip() if proc.stderr else None,
                    exit_code=proc.returncode,
                    execution_time_ms=duration_ms,
                    memory_mb=None,
                )

            except subprocess.TimeoutExpired as timeout_err:
                duration_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
                return ExecutionResult(
                    stdout="",
                    stderr=f"Execution timed out after {timeout_seconds} seconds.",
                    exit_code=124,
                    execution_time_ms=duration_ms,
                )

            except Exception as err:
                duration_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
                return ExecutionResult(
                    stdout="",
                    stderr=f"Subprocess runner execution failure: {str(err)}",
                    exit_code=1,
                    execution_time_ms=duration_ms,
                )
