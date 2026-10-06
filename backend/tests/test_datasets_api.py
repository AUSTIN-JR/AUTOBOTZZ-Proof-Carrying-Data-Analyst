"""Integration tests for dataset management and upload API endpoints."""

import io
import json
import openpyxl
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def setup_function() -> None:
    """Clear session before each test."""
    client.delete("/api/datasets")


def test_upload_csv_success() -> None:
    csv_content = b"user_id,signup_date,plan,mrr\n1,2026-01-01,pro,99.0\n2,2026-01-02,starter,29.0\n"
    files = {"file": ("customers.csv", csv_content, "text/csv")}

    response = client.post("/api/datasets/upload", files=files)
    assert response.status_code == 201
    data = response.json()

    assert "dataset" in data
    ds = data["dataset"]
    assert ds["filename"] == "customers.csv"
    assert ds["format"] == "csv"
    assert ds["row_count"] == 2
    assert ds["column_count"] == 4
    assert len(ds["columns"]) == 4

    # Verify column profiling
    col_names = [c["name"] for c in ds["columns"]]
    assert col_names == ["user_id", "signup_date", "plan", "mrr"]


def test_upload_json_success() -> None:
    records = [
        {"product_id": "P101", "name": "Keyboard", "price": 45.0},
        {"product_id": "P102", "name": "Mouse", "price": 25.0},
    ]
    json_bytes = json.dumps(records).encode("utf-8")
    files = {"file": ("catalog.json", json_bytes, "application/json")}

    response = client.post("/api/datasets/upload", files=files)
    assert response.status_code == 201
    data = response.json()
    assert data["dataset"]["row_count"] == 2
    assert data["dataset"]["format"] == "json"


def test_upload_excel_success() -> None:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Sales"
    ws.append(["id", "item", "qty"])
    ws.append([1, "Pen", 10])
    buf = io.BytesIO()
    wb.save(buf)
    excel_bytes = buf.getvalue()

    files = {
        "file": (
            "inventory.xlsx",
            excel_bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    }

    response = client.post("/api/datasets/upload", files=files)
    assert response.status_code == 201
    data = response.json()
    assert data["dataset"]["row_count"] == 1
    assert data["dataset"]["selected_sheet"] == "Sales"


def test_upload_unsupported_file_type() -> None:
    files = {"file": ("report.pdf", b"%PDF-1.4 dummy", "application/pdf")}
    response = client.post("/api/datasets/upload", files=files)

    assert response.status_code == 400
    error_data = response.json()
    assert "error" in error_data
    assert error_data["error"]["code"] == "UNSUPPORTED_FILE_TYPE"


def test_upload_empty_file() -> None:
    files = {"file": ("empty.csv", b"", "text/csv")}
    response = client.post("/api/datasets/upload", files=files)

    assert response.status_code == 400
    error_data = response.json()
    assert error_data["error"]["code"] == "EMPTY_FILE"


def test_get_datasets_lifecycle() -> None:
    # 1. Initially empty
    list_res = client.get("/api/datasets")
    assert list_res.status_code == 200
    assert list_res.json()["total"] == 0

    # 2. Upload one file
    csv_content = b"id,val\n1,A\n2,B\n"
    up_res = client.post("/api/datasets/upload", files={"file": ("data.csv", csv_content, "text/csv")})
    assert up_res.status_code == 201
    dataset_id = up_res.json()["dataset"]["id"]

    # 3. Retrieve single dataset
    get_res = client.get(f"/api/datasets/{dataset_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == dataset_id

    # 4. List now has 1
    list_res2 = client.get("/api/datasets")
    assert list_res2.status_code == 200
    assert list_res2.json()["total"] == 1

    # 5. Delete dataset
    del_res = client.delete(f"/api/datasets/{dataset_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"

    # 6. Verify 404 after deletion
    get_res404 = client.get(f"/api/datasets/{dataset_id}")
    assert get_res404.status_code == 404
    assert get_res404.json()["error"]["code"] == "DATASET_NOT_FOUND"


def test_clear_all_datasets() -> None:
    # Upload 2 datasets
    client.post("/api/datasets/upload", files={"file": ("d1.csv", b"a\n1\n", "text/csv")})
    client.post("/api/datasets/upload", files={"file": ("d2.csv", b"b\n2\n", "text/csv")})

    list_res = client.get("/api/datasets")
    assert list_res.json()["total"] == 2

    # Clear all
    clear_res = client.delete("/api/datasets")
    assert clear_res.status_code == 200
    assert clear_res.json()["status"] == "cleared"
    assert clear_res.json()["count"] == 2

    # Verify empty
    assert client.get("/api/datasets").json()["total"] == 0


def test_load_demo_datasets() -> None:
    res = client.post("/api/datasets/load-demo")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 4
    filenames = [d["filename"] for d in data["datasets"]]
    assert "orders.csv" in filenames
    assert "refunds.csv" in filenames
    assert "customers.csv" in filenames
    assert "payments.csv" in filenames
    # Verify orders has real 14 rows, not 684
    orders_meta = [d for d in data["datasets"] if d["filename"] == "orders.csv"][0]
    assert orders_meta["row_count"] == 14

