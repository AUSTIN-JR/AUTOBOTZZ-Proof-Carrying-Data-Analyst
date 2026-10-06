"""Pydantic schemas and models for dataset representation, profiling, and quality issues."""

from typing import Any, List, Literal, Optional
from pydantic import BaseModel, Field


QualitySeverity = Literal["info", "warning", "error"]


class QualityIssue(BaseModel):
    """Structured data quality issue identified by deterministic audits."""

    id: str
    type: str
    severity: QualitySeverity
    dataset_id: str
    column: Optional[str] = None
    count: Optional[int] = None
    message: str
    impact: str
    suggested_handling: str


class ColumnProfile(BaseModel):
    """Detailed profile information for an individual dataset column."""

    name: str
    original_name: Optional[str] = None
    dtype: str  # "string", "integer", "float", "datetime", "boolean", "mixed"
    nullable: bool = True
    non_null_count: int
    null_count: int
    null_percentage: float
    unique_count: int
    sample_values: List[Any] = Field(default_factory=list)
    semantic_hint: Optional[str] = None  # "numeric", "text", "boolean", "date-like", "currency-like", "identifier-like"


class DatasetProfile(BaseModel):
    """Complete profile of an ingested dataset including schema and quality audit results."""

    id: str
    name: str
    filename: str
    format: str  # "csv", "xlsx", "xls", "json"
    row_count: int
    column_count: int
    size_bytes: int
    size_formatted: str
    status: Literal["ready", "warning", "error"] = "ready"
    sheet_names: Optional[List[str]] = None
    selected_sheet: Optional[str] = None
    columns: List[ColumnProfile]
    quality_issues: List[QualityIssue] = Field(default_factory=list)
    quality_issues_count: int = 0
    loaded_at: str
    description: Optional[str] = None


class DatasetSummary(BaseModel):
    """Lightweight summary of an active dataset."""

    id: str
    name: str
    filename: str
    format: str
    row_count: int
    column_count: int
    size_formatted: str
    status: Literal["ready", "warning", "error"] = "ready"
    quality_issues_count: int = 0
    loaded_at: str
    columns: List[ColumnProfile]
    description: Optional[str] = None


class UploadResponse(BaseModel):
    """Response returned upon successful dataset upload and ingestion."""

    dataset: DatasetProfile
    message: str = "Dataset successfully ingested and profiled."


class DatasetListResponse(BaseModel):
    """Response returning all active datasets in current session."""

    datasets: List[DatasetProfile]
    total: int


class DeleteResponse(BaseModel):
    """Response returned upon dataset deletion."""

    status: str = "deleted"
    dataset_id: Optional[str] = None
    count: Optional[int] = None
    message: str


class APIErrorDetail(BaseModel):
    """Consistent nested error detail structure."""

    code: str
    message: str
    details: Optional[dict[str, Any]] = None


class APIErrorResponse(BaseModel):
    """Standardized top-level API error envelope."""

    error: APIErrorDetail

