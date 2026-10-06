import { DataQualityIssue } from "./dataset";

export interface GeneratedCode {
  language: "python";
  code: string;
  imports: string[];
  lineCount: number;
}

export interface ExecutionResult {
  stdout: string;
  stderr?: string;
  exitCode: number;
  executionTimeMs: number;
  memoryMb?: number;
}

export type VerificationStatus = "MATCH" | "MISMATCH" | "UNVERIFIABLE";

export interface VerificationResult {
  status: VerificationStatus;
  reportedValue: string | number;
  executionValue: string | number;
  isVerified: boolean;
  checkTimestamp: string;
}

export interface EvidenceSource {
  datasetId: string;
  filename: string;
  columnsUsed: string[];
  filterApplied?: string;
  rowsInvolved?: number;
}

export interface CalculationBreakdownItem {
  label: string;
  value: string;
  operation?: "add" | "subtract" | "result" | "metric";
}

export interface RefusalDetails {
  reason: string;
  missingEvidence: string[];
  affectedDatasets: string[];
  recommendedAction: string;
}

export interface ProofPackConfidence {
  score: number; // 0 to 1
  level: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
}

export type AnalysisOutcomeType = "verified" | "warning" | "refused" | "unsupported" | "error";

export interface ProofPack {
  id: string; // e.g., PP-2026-00127
  question: string;
  outcome: AnalysisOutcomeType;
  headlineAnswer: string;
  metricLabel?: string;
  shortExplanation: string;
  calculationBreakdown: CalculationBreakdownItem[];
  assumptions: string[];
  datasets: string[];
  sources: EvidenceSource[];
  dataQualityIssues: DataQualityIssue[];
  generatedCode?: GeneratedCode;
  execution?: ExecutionResult;
  verification?: VerificationResult;
  confidence: ProofPackConfidence;
  durationMs: number;
  createdAt: string;
  refusalDetails?: RefusalDetails;
}

export type VerifiedProofPack = ProofPack & { outcome: "verified" };
export type WarningProofPack = ProofPack & { outcome: "warning" };
export type RefusedProofPack = ProofPack & {
  outcome: "refused";
  refusalDetails: RefusalDetails;
};
export type ErrorProofPack = ProofPack & { outcome: "error" };

export type AnalysisOutcome =
  | VerifiedProofPack
  | WarningProofPack
  | RefusedProofPack
  | ErrorProofPack;

