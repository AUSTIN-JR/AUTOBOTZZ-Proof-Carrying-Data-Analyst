"""Analysis API router executing deterministic proof-carrying analysis."""

from fastapi import APIRouter, HTTPException, status
from app.models.analysis import AnalysisRequest
from app.models.proof import ProofPack
from app.services.analysis_engine import AnalysisEngine

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.post(
    "",
    response_model=ProofPack,
    summary="Execute deterministic proof-carrying analysis",
    description="Takes an analytical question, builds an AnalysisPlan, computes results with pandas, executes rerunnable proof code, independently verifies output, and returns a ProofPack.",
)
async def analyze_question(request: AnalysisRequest) -> ProofPack:
    """Execute deterministic analysis and verification pipeline."""
    try:
        return AnalysisEngine.run_analysis(
            question=request.question,
            dataset_ids=request.dataset_ids,
        )
    except FileNotFoundError as fnf_err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "DATASET_NOT_FOUND",
                "message": str(fnf_err),
            },
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "ANALYSIS_EXECUTION_ERROR",
                "message": f"Analysis execution failed: {str(err)}",
            },
        )


@router.get(
    "/status",
    summary="Analysis service status",
    description="Reports the operational status of the analysis and reasoning engine.",
)
async def analysis_status() -> dict:
    """Return status indicating analysis engine is operational."""
    return {
        "status": "active",
        "phase": "2B",
        "service": "Deterministic Proof-Carrying Analysis Engine",
    }
