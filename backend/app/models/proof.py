"""Pydantic models for verifiable ProofPack representations, execution traces, and verification."""

from typing import Any, List, Literal, Optional, Union
from pydantic import BaseModel, ConfigDict, Field


AnalysisOutcomeType = Literal["verified", "warning", "refused", "unsupported", "error"]


class GeneratedCode(BaseModel):
    """Reproducible Python proof script container."""

    language: Literal["python"] = "python"
    code: str
    imports: List[str] = Field(default_factory=list)
    line_count: int = Field(default=0, serialization_alias="lineCount")

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class ExecutionResult(BaseModel):
    """Execution telemetry captured from subprocess run."""

    stdout: str
    stderr: Optional[str] = None
    exit_code: int = Field(default=0, serialization_alias="exitCode")
    execution_time_ms: float = Field(default=0.0, serialization_alias="executionTimeMs")
    memory_mb: Optional[float] = Field(default=None, serialization_alias="memoryMb")

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class VerificationResult(BaseModel):
    """Independent mathematical verification output."""

    status: Literal["MATCH", "MISMATCH", "UNVERIFIABLE"]
    reported_value: Union[str, float, int] = Field(..., serialization_alias="reportedValue")
    execution_value: Union[str, float, int] = Field(..., serialization_alias="executionValue")
    is_verified: bool = Field(..., serialization_alias="isVerified")
    check_timestamp: str = Field(..., serialization_alias="checkTimestamp")

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class EvidenceSource(BaseModel):
    """Lineage trace linking analysis results to raw source data."""

    dataset_id: str = Field(..., serialization_alias="datasetId")
    filename: str
    columns_used: List[str] = Field(..., serialization_alias="columnsUsed")
    filter_applied: Optional[str] = Field(default=None, serialization_alias="filterApplied")
    rows_involved: Optional[int] = Field(default=None, serialization_alias="rowsInvolved")

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class CalculationBreakdownItem(BaseModel):
    """Step-by-step arithmetic breakdown item."""

    label: str
    value: str
    operation: Optional[Literal["add", "subtract", "result", "metric"]] = None


class RefusalDetails(BaseModel):
    """Evidence and guidance details when analytical computation is refused."""

    reason: str
    missing_evidence: List[str] = Field(..., serialization_alias="missingEvidence")
    affected_datasets: List[str] = Field(..., serialization_alias="affectedDatasets")
    recommended_action: str = Field(..., serialization_alias="recommendedAction")

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class ProofPackConfidence(BaseModel):
    """Confidence scoring and rationale."""

    score: float
    level: Literal["HIGH", "MEDIUM", "LOW"]
    reason: str


class ProofPack(BaseModel):
    """Complete verifiable proof bundle."""

    id: str
    question: str
    outcome: AnalysisOutcomeType
    headline_answer: str = Field(..., serialization_alias="headlineAnswer")
    metric_label: Optional[str] = Field(default=None, serialization_alias="metricLabel")
    short_explanation: str = Field(..., serialization_alias="shortExplanation")
    calculation_breakdown: List[CalculationBreakdownItem] = Field(
        default_factory=list, serialization_alias="calculationBreakdown"
    )
    assumptions: List[str] = Field(default_factory=list)
    datasets: List[str] = Field(default_factory=list)
    sources: List[EvidenceSource] = Field(default_factory=list)
    data_quality_issues: List[Any] = Field(
        default_factory=list, serialization_alias="dataQualityIssues"
    )
    generated_code: Optional[GeneratedCode] = Field(
        default=None, serialization_alias="generatedCode"
    )
    execution: Optional[ExecutionResult] = None
    verification: Optional[VerificationResult] = None
    confidence: ProofPackConfidence
    duration_ms: float = Field(default=0.0, serialization_alias="durationMs")
    created_at: str = Field(..., serialization_alias="createdAt")
    refusal_details: Optional[RefusalDetails] = Field(
        default=None, serialization_alias="refusalDetails"
    )

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)
