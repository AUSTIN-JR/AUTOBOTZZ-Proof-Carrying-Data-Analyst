"use client";

import { useState, useCallback, useEffect } from "react";
import {
  AnalysisWorkspaceState,
  PipelineStage,
  PipelineStageId,
  StageStatus,
  AnalysisHistoryItem,
} from "@/types/analysis";
import { Dataset } from "@/types/dataset";
import { ProofPack } from "@/types/proof";
import { INITIAL_PIPELINE_STAGES } from "@/lib/constants";
import { analysisService } from "@/services/analysisService";

export function useAnalysis(datasets: Dataset[]) {
  const [workspaceState, setWorkspaceState] = useState<AnalysisWorkspaceState>("EMPTY");
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [stages, setStages] = useState<PipelineStage[]>(INITIAL_PIPELINE_STAGES);
  const [activeProofPack, setActiveProofPack] = useState<ProofPack | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load initial history
  useEffect(() => {
    analysisService.getHistory().then((items) => {
      setHistory(items);
    });
  }, []);

  // Sync workspace state with dataset presence
  useEffect(() => {
    if (datasets.length === 0) {
      setWorkspaceState("EMPTY");
      setActiveProofPack(null);
    } else if (workspaceState === "EMPTY") {
      setWorkspaceState("DATASETS_LOADED");
    }
  }, [datasets.length, workspaceState]);

  const handleStageUpdate = useCallback(
    (stageId: PipelineStageId, status: StageStatus, detail?: string) => {
      setStages((prev) =>
        prev.map((stage) => {
          if (stage.id === stageId) {
            return {
              ...stage,
              status,
              detail: detail || stage.detail,
            };
          }
          return stage;
        })
      );
    },
    []
  );

  const runAnalysis = useCallback(
    async (question: string) => {
      if (!question.trim()) return;

      setCurrentQuestion(question);
      setWorkspaceState("ANALYZING");
      setErrorMessage(null);

      // Reset stages to pending
      setStages(
        INITIAL_PIPELINE_STAGES.map((s) => ({
          ...s,
          status: "pending",
          detail: undefined,
        }))
      );

      try {
        const result = await analysisService.analyze(
          question,
          datasets,
          handleStageUpdate
        );

        setActiveProofPack(result);

        // Map proof outcome to workspace state
        if (result.outcome === "verified") {
          setWorkspaceState("VERIFIED");
        } else if (result.outcome === "warning") {
          setWorkspaceState("WARNING");
        } else if (result.outcome === "refused") {
          setWorkspaceState("REFUSED");
        } else if (result.outcome === "unsupported") {
          setWorkspaceState("UNSUPPORTED");
        } else {
          setWorkspaceState("ERROR");
        }

        // Add to history if not duplicate
        const newHistItem: AnalysisHistoryItem = {
          id: `hist-${Date.now()}`,
          question: result.question,
          outcome: result.outcome,
          timestamp: "Just now",
          proofPackId: result.id,
          metricSummary: result.headlineAnswer,
        };

        setHistory((prev) => [newHistItem, ...prev.filter((h) => h.question !== result.question)]);
      } catch (err: unknown) {
        setWorkspaceState("ERROR");
        setErrorMessage(err instanceof Error ? err.message : "Analysis service encountered an unexpected error.");
      }
    },
    [datasets, handleStageUpdate]
  );

  const loadFromHistory = useCallback(
    async (item: AnalysisHistoryItem) => {
      setCurrentQuestion(item.question);
      const pack = await analysisService.getProofPack(item.proofPackId);
      if (pack) {
        setActiveProofPack(pack);
        if (pack.outcome === "verified") setWorkspaceState("VERIFIED");
        else if (pack.outcome === "warning") setWorkspaceState("WARNING");
        else if (pack.outcome === "refused") setWorkspaceState("REFUSED");
        else if (pack.outcome === "unsupported") setWorkspaceState("UNSUPPORTED");
        else setWorkspaceState("ERROR");
      }
    },
    []
  );

  const resetToNewQuestion = useCallback(() => {
    setActiveProofPack(null);
    setCurrentQuestion("");
    setStages(INITIAL_PIPELINE_STAGES);
    setWorkspaceState(datasets.length > 0 ? "DATASETS_LOADED" : "EMPTY");
  }, [datasets.length]);

  return {
    workspaceState,
    currentQuestion,
    setCurrentQuestion,
    stages,
    activeProofPack,
    history,
    errorMessage,
    runAnalysis,
    loadFromHistory,
    resetToNewQuestion,
  };
}

