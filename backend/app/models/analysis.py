"""Pydantic models for analysis requests, structured plans, and execution schemas."""

from typing import Any, List, Literal, Optional
from pydantic import BaseModel, Field


class FilterSpec(BaseModel):
    """Specification for deterministic tabular filtering."""

    column: str
    operator: Literal["==", "!=", ">", "<", ">=", "<=", "in", "contains"]
    value: Any


class AnalysisPlan(BaseModel):
    """Validated, deterministic computation plan."""

    plan_id: str
    operation: str  # "NET_REVENUE", "FILTER_SUM", "COUNT_DUPLICATES", "CURRENCY_REFUSAL", "UNSUPPORTED"
    title: str
    primary_dataset: str
    primary_column: Optional[str] = None
    filters: List[FilterSpec] = Field(default_factory=list)
    secondary_dataset: Optional[str] = None
    secondary_column: Optional[str] = None
    secondary_filters: List[FilterSpec] = Field(default_factory=list)
    handling_decisions: List[str] = Field(default_factory=list)
    requires_evidence: List[str] = Field(default_factory=list)
    assumptions: List[str] = Field(default_factory=list)


class AnalysisRequest(BaseModel):
    """Analysis query input request."""

    question: str
    dataset_ids: Optional[List[str]] = None


class PipelineStageModel(BaseModel):
    """Pipeline progression step model."""

    id: str
    label: str
    status: Literal["pending", "active", "completed", "warning", "failed"]
    duration_ms: Optional[float] = None
    detail: Optional[str] = None
