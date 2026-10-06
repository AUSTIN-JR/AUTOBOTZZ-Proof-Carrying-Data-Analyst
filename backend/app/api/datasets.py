"""API router for dataset upload, inspection, and session lifecycle management."""

from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.core.config import get_settings
from app.core.security import (
    SecurityException,
    generate_dataset_id,
    get_safe_storage_path,
    sanitize_filename,
    validate_file_extension,
)
from app.models.dataset import (
    DatasetListResponse,
    DatasetProfile,
    DeleteResponse,
    UploadResponse,
)
from app.services.data_loader import DataLoader, DataLoaderException
from app.services.data_profiler import DataProfiler
from app.services.session_store import get_session_store
from app.verification.quality_checker import QualityChecker

router = APIRouter(prefix="/api/datasets", tags=["datasets"])


@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and ingest a dataset file",
    description="Accepts multipart CSV, XLSX, or JSON files. Validates, loads, profiles, and detects data quality issues.",
)
async def upload_dataset(file: UploadFile = File(...)) -> UploadResponse:
    """Handle multipart file upload, deterministic profiling, and session registration."""
    settings = get_settings()
    session_store = get_session_store()

    # 1. Sanitize user-provided filename
    clean_filename = sanitize_filename(file.filename)

    # 2. Validate file extension
    try:
        ext = validate_file_extension(clean_filename)
    except SecurityException as sec_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": sec_err.code,
                "message": sec_err.message,
                "details": sec_err.details,
            },
        )

    # 3. Generate safe internal dataset ID and filesystem target path
    dataset_id = generate_dataset_id()
    safe_storage_path = get_safe_storage_path(dataset_id, ext)

    # 4. Stream file to disk and validate size limits
    bytes_read = 0
    try:
        with open(safe_storage_path, "wb") as disk_file:
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                bytes_read += len(chunk)
                if bytes_read > settings.max_upload_size_bytes:
                    disk_file.close()
                    safe_storage_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail={
                            "code": "FILE_TOO_LARGE",
                            "message": f"File exceeds maximum upload size of {settings.max_upload_size_mb} MB.",
                            "details": {
                                "size_bytes": bytes_read,
                                "max_size_mb": settings.max_upload_size_mb,
                            },
                        },
                    )
                disk_file.write(chunk)
    except HTTPException:
        raise
    except Exception as io_err:
        safe_storage_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "FILE_WRITE_ERROR",
                "message": f"Failed to save uploaded file: {str(io_err)}",
            },
        )

    # 5. Check empty file
    if bytes_read == 0:
        safe_storage_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "EMPTY_FILE",
                "message": "Uploaded file is completely empty (0 bytes).",
                "details": {"size_bytes": 0},
            },
        )

    # 6. Parse file with deterministic DataLoader
    try:
        df, loading_metadata = DataLoader.load_file(safe_storage_path, format_hint=ext)
    except DataLoaderException as dl_err:
        safe_storage_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": dl_err.code,
                "message": dl_err.message,
                "details": dl_err.details,
            },
        )
    except Exception as parse_err:
        safe_storage_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "DATA_PARSE_FAILURE",
                "message": f"Failed to parse file structure: {str(parse_err)}",
            },
        )

    # 7. Generate statistical profile
    profile = DataProfiler.profile_dataset(
        df=df,
        dataset_id=dataset_id,
        filename=clean_filename,
        file_size_bytes=bytes_read,
        loading_metadata=loading_metadata,
    )

    # 8. Run deterministic data quality audits
    quality_issues = QualityChecker.audit_dataset(df=df, dataset_id=dataset_id)
    profile.quality_issues = quality_issues
    profile.quality_issues_count = len(quality_issues)

    # Assign high-level dataset health status
    if any(q.severity == "error" for q in quality_issues):
        profile.status = "error"
    elif any(q.severity == "warning" for q in quality_issues):
        profile.status = "warning"
    else:
        profile.status = "ready"

    # 9. Register in active session store
    session_store.add_dataset(profile=profile, df=df, file_path=safe_storage_path)

    return UploadResponse(
        dataset=profile,
        message=f"Dataset '{clean_filename}' ({profile.row_count} rows, {profile.column_count} columns) successfully ingested and audited.",
    )


@router.get(
    "",
    response_model=DatasetListResponse,
    summary="List active datasets in demo session",
    description="Returns summaries and profiles for all currently uploaded datasets in the active session.",
)
async def list_datasets() -> DatasetListResponse:
    """Retrieve all datasets registered in the current active session."""
    session_store = get_session_store()
    datasets = session_store.list_datasets()
    return DatasetListResponse(datasets=datasets, total=len(datasets))


@router.get(
    "/{dataset_id}",
    response_model=DatasetProfile,
    summary="Get single dataset profile",
    description="Returns detailed schema, statistics, and quality issues for the specified dataset.",
)
async def get_dataset(dataset_id: str) -> DatasetProfile:
    """Retrieve a single dataset by ID."""
    session_store = get_session_store()
    dataset = session_store.get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "DATASET_NOT_FOUND",
                "message": f"Dataset with ID '{dataset_id}' was not found in the current session.",
            },
        )
    return dataset


@router.delete(
    "/{dataset_id}",
    response_model=DeleteResponse,
    summary="Delete dataset from session",
    description="Removes the dataset from the active session registry and deletes temporary disk files.",
)
async def delete_dataset(dataset_id: str) -> DeleteResponse:
    """Delete a dataset by ID."""
    session_store = get_session_store()
    deleted = session_store.delete_dataset(dataset_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "DATASET_NOT_FOUND",
                "message": f"Dataset with ID '{dataset_id}' was not found in the current session.",
            },
        )
    return DeleteResponse(
        status="deleted",
        dataset_id=dataset_id,
        message=f"Dataset '{dataset_id}' successfully removed from session.",
    )


@router.delete(
    "",
    response_model=DeleteResponse,
    summary="Clear all datasets from session",
    description="Removes all uploaded datasets and temporary files from the active session.",
)
async def clear_all_datasets() -> DeleteResponse:
    """Clear all datasets from session."""
    session_store = get_session_store()
    count = session_store.clear_all()
    return DeleteResponse(
        status="cleared",
        count=count,
        message=f"Cleared {count} dataset(s) from current session.",
    )


@router.post(
    "/load-demo",
    response_model=DatasetListResponse,
    status_code=status.HTTP_200_OK,
    summary="Load physical demo datasets into active session",
    description="Loads datasets/demo/*.csv into SessionStore using the real tabular loader, profiler, and quality checker.",
)
async def load_demo_datasets() -> DatasetListResponse:
    """Ingest existing demo files from datasets/demo/ into session store."""
    session_store = get_session_store()
    demo_dir = Path(__file__).resolve().parent.parent.parent.parent / "datasets" / "demo"
    demo_files = ["customers.csv", "orders.csv", "payments.csv", "refunds.csv"]

    # Clear previous instances of demo datasets if any to ensure fresh load
    for p in list(session_store.list_datasets()):
        if p.filename.lower() in [f.lower() for f in demo_files]:
            session_store.delete_dataset(p.id)

    loaded_profiles = []
    for fname in demo_files:
        file_path = demo_dir / fname
        if not file_path.exists():
            continue

        dataset_id = generate_dataset_id()
        file_size = file_path.stat().st_size
        df, loading_metadata = DataLoader.load_file(file_path, format_hint=".csv")

        profile = DataProfiler.profile_dataset(
            df=df,
            dataset_id=dataset_id,
            filename=fname,
            file_size_bytes=file_size,
            loading_metadata=loading_metadata,
        )

        quality_issues = QualityChecker.audit_dataset(df=df, dataset_id=dataset_id)
        profile.quality_issues = quality_issues
        profile.quality_issues_count = len(quality_issues)

        if any(q.severity == "error" for q in quality_issues):
            profile.status = "error"
        elif any(q.severity == "warning" for q in quality_issues):
            profile.status = "warning"
        else:
            profile.status = "ready"

        session_store.add_dataset(profile=profile, df=df, file_path=file_path)
        loaded_profiles.append(profile)

    return DatasetListResponse(datasets=loaded_profiles, total=len(loaded_profiles))

