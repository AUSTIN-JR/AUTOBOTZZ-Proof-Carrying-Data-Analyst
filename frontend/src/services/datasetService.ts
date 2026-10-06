import { Dataset, DatasetColumn, DataQualityIssue, DatasetFormat } from "@/types/dataset";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8000";

interface BackendColumnProfile {
  name: string;
  original_name?: string;
  dtype: string;
  nullable: boolean;
  non_null_count: number;
  null_count: number;
  null_percentage: number;
  unique_count: number;
  sample_values: (string | number | boolean)[];
  semantic_hint?: string;
}

interface BackendQualityIssue {
  id: string;
  type: string;
  severity: "info" | "warning" | "error";
  dataset_id: string;
  column?: string | null;
  count?: number | null;
  message: string;
  impact: string;
  suggested_handling: string;
}

interface BackendDatasetProfile {
  id: string;
  name: string;
  filename: string;
  format: string;
  row_count: number;
  column_count: number;
  size_bytes: number;
  size_formatted: string;
  status: "ready" | "warning" | "error";
  sheet_names?: string[];
  selected_sheet?: string;
  columns: BackendColumnProfile[];
  quality_issues: BackendQualityIssue[];
  quality_issues_count: number;
  loaded_at: string;
  description?: string;
}

interface BackendUploadResponse {
  dataset: BackendDatasetProfile;
  message: string;
}

interface BackendErrorResponse {
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

function mapBackendDtype(dtype: string): DatasetColumn["type"] {
  switch (dtype) {
    case "integer":
      return "integer";
    case "float":
      return "float";
    case "boolean":
      return "boolean";
    case "datetime":
      return "datetime";
    case "mixed":
      return "mixed";
    default:
      return "string";
  }
}

function mapQualityIssues(
  issues: BackendQualityIssue[] = [],
  datasetName: string
): DataQualityIssue[] {
  return issues.map((issue) => {
    const severityMap: Record<string, "low" | "medium" | "high" | "critical"> = {
      info: "low",
      warning: "high",
      error: "critical",
    };

    return {
      id: issue.id,
      title: issue.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      severity: severityMap[issue.severity] || "medium",
      datasetName: datasetName,
      description: issue.message,
      impact: issue.impact,
      handlingDecision: issue.suggested_handling,
    };
  });
}

export function transformBackendProfile(profile: BackendDatasetProfile): Dataset {
  const qualityIssues = mapQualityIssues(profile.quality_issues, profile.filename);
  const format = (["csv", "xlsx", "json"].includes(profile.format)
    ? profile.format
    : "csv") as DatasetFormat;

  return {
    id: profile.id,
    name: profile.name,
    filename: profile.filename,
    format,
    rowCount: profile.row_count,
    columnCount: profile.column_count,
    sizeFormatted: profile.size_formatted,
    status: profile.status,
    qualityIssuesCount: profile.quality_issues_count,
    loadedAt: profile.loaded_at,
    description:
      profile.description ||
      `Real dataset loaded (${profile.row_count} rows, ${profile.column_count} columns)`,
    qualityIssues,
    columns: profile.columns.map((col) => ({
      name: col.name,
      type: mapBackendDtype(col.dtype),
      nullable: col.nullable,
      sampleValues: col.sample_values || [],
      distinctCount: col.unique_count,
    })),
  };
}

export class DatasetService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async uploadFile(file: File): Promise<Dataset> {
    const formData = new FormData();
    formData.append("file", file);

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/api/datasets/upload`, {
        method: "POST",
        body: formData,
      });
    } catch (err: unknown) {
      throw new Error(
        "Backend unavailable. Start the AUTOBOTZZ API on port 8000 (cd backend && python -m uvicorn app.main:app --port 8000)."
      );
    }

    if (!res.ok) {
      let errMsg = `Upload failed (HTTP ${res.status})`;
      try {
        const errJson: BackendErrorResponse = await res.json();
        if (errJson.error?.message) {
          errMsg = errJson.error.message;
        }
      } catch {
        // Fallback to generic status text
      }
      throw new Error(errMsg);
    }

    const data: BackendUploadResponse = await res.json();
    return transformBackendProfile(data.dataset);
  }

  async getDatasets(): Promise<Dataset[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/datasets`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.datasets || []).map(transformBackendProfile);
    } catch {
      return [];
    }
  }

  async deleteDataset(datasetId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/datasets/${encodeURIComponent(datasetId)}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async clearAllDatasets(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/datasets`, {
        method: "DELETE",
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async loadDemoDatasets(): Promise<Dataset[]> {
    const res = await fetch(`${this.baseUrl}/api/datasets/load-demo`, {
      method: "POST",
    });
    if (!res.ok) {
      throw new Error(`Failed to load demo datasets (HTTP ${res.status})`);
    }
    const data = await res.json();
    return (data.datasets || []).map(transformBackendProfile);
  }
}

export const datasetService = new DatasetService();

