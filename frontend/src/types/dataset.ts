export type DataQualitySeverity = "low" | "medium" | "high" | "critical";

export interface DataQualityIssue {
  id: string;
  title: string;
  severity: DataQualitySeverity;
  datasetName: string;
  description: string;
  impact: string;
  handlingDecision: string;
}

export interface DatasetColumn {
  name: string;
  type: "string" | "integer" | "float" | "datetime" | "boolean" | "mixed";
  nullable: boolean;
  sampleValues: (string | number | boolean)[];
  distinctCount?: number;
}

export type DatasetFormat = "csv" | "xlsx" | "json";

export type DatasetStatus = "ready" | "warning" | "indexing" | "error";

export interface Dataset {
  id: string;
  name: string;
  filename: string;
  format: DatasetFormat;
  rowCount: number;
  columnCount: number;
  sizeFormatted: string;
  status: DatasetStatus;
  qualityIssuesCount: number;
  columns: DatasetColumn[];
  description?: string;
  loadedAt: string;
  qualityIssues?: DataQualityIssue[];
}

