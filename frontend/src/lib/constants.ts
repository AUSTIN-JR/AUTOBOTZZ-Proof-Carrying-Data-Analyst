import { PipelineStage, SuggestedQuestion } from "@/types/analysis";

export const APP_CONFIG = {
  name: "AUTOBOTZZ",
  tagline: "Proof-Carrying Data Analyst",
  version: "0.1.0-alpha",
  problemId: "HNX26PSI08",
  environment: "Prototype / Mock Verification Engine",
};

export const INITIAL_PIPELINE_STAGES: PipelineStage[] = [
  {
    id: "understanding_question",
    label: "Understanding question intent",
    status: "pending",
  },
  {
    id: "inspecting_datasets",
    label: "Inspecting relevant schema & tables",
    status: "pending",
  },
  {
    id: "checking_data_quality",
    label: "Checking data quality & inconsistencies",
    status: "pending",
  },
  {
    id: "planning_computation",
    label: "Planning deterministic computation",
    status: "pending",
  },
  {
    id: "generating_code",
    label: "Generating executable analysis code",
    status: "pending",
  },
  {
    id: "running_analysis",
    label: "Executing deterministic analysis script",
    status: "pending",
  },
  {
    id: "verifying_result",
    label: "Verifying execution output vs claim",
    status: "pending",
  },
  {
    id: "creating_proofpack",
    label: "Bundling verifiable ProofPack",
    status: "pending",
  },
];

export const SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  {
    id: "q-revenue-sep",
    question: "What was net revenue in September after refunds?",
    category: "Revenue",
    expectedOutcome: "verified",
    tag: "Verified Demo",
  },
  {
    id: "q-product-cat",
    question: "Which product category generated the highest net revenue?",
    category: "Products",
    expectedOutcome: "unsupported",
    tag: "Unsupported Demo (Category Breakdown)",
  },
  {
    id: "q-refusal-curr",
    question: "Convert all USD and INR revenue into INR.",
    category: "Refusal Test",
    expectedOutcome: "refused",
    tag: "Refusal Demo (Missing Evidence)",
  },
  {
    id: "q-refund-region",
    question: "Which region had the highest refund rate?",
    category: "Revenue",
    expectedOutcome: "verified",
    tag: "Cross-table Join",
  },
  {
    id: "q-duplicate-orders",
    question: "How many duplicate orders exist in the transactions log?",
    category: "Quality",
    expectedOutcome: "verified",
    tag: "Integrity Audit",
  },
];

