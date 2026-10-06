export type AnalysisWorkspaceState =
  | "EMPTY"
  | "DATASETS_LOADED"
  | "ANALYZING"
  | "VERIFIED"
  | "WARNING"
  | "REFUSED"
  | "UNSUPPORTED"
  | "ERROR";

export type PipelineStageId =
  | "understanding_question"
  | "inspecting_datasets"
  | "checking_data_quality"
  | "planning_computation"
  | "generating_code"
  | "running_analysis"
  | "verifying_result"
  | "creating_proofpack";

export type StageStatus = "pending" | "active" | "completed" | "warning" | "failed";

export interface PipelineStage {
  id: PipelineStageId;
  label: string;
  status: StageStatus;
  durationMs?: number;
  detail?: string;
}

export interface AnalysisHistoryItem {
  id: string;
  question: string;
  outcome: "verified" | "warning" | "refused" | "unsupported" | "error";
  timestamp: string;
  proofPackId: string;
  metricSummary: string;
}

export interface SuggestedQuestion {
  id: string;
  question: string;
  category: "Revenue" | "Products" | "Quality" | "Refusal Test";
  expectedOutcome: "verified" | "warning" | "refused" | "unsupported";
  tag: string;
}

