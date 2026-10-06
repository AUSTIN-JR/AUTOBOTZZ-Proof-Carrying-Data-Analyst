"use client";

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Dataset } from "@/types/dataset";
import { AnalysisWorkspaceState, PipelineStage } from "@/types/analysis";
import { ProofPack } from "@/types/proof";
import { FileDropzone } from "../upload/FileDropzone";
import { DatasetList } from "../upload/DatasetList";
import { QuestionInput } from "./QuestionInput";
import { SuggestedQuestions } from "./SuggestedQuestions";
import { AnalysisPipeline } from "./AnalysisPipeline";
import { ProofPackComponent } from "../results/ProofPack";
import { RefusalCard } from "../refusal/RefusalCard";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw, Sparkles } from "lucide-react";
import { motionEasings, panelTransition } from "@/lib/motion";

interface AnalysisWorkspaceProps {
  workspaceState: AnalysisWorkspaceState;
  datasets: Dataset[];
  selectedDatasetId: string | null;
  onSelectDataset: (id: string) => void;
  onRemoveDataset: (id: string) => void;
  onClearAllDatasets: () => void;
  onLoadDemoData: () => void;
  onFilesSelected: (files: FileList | File[]) => void;
  uploadError?: string | null;
  onClearError?: () => void;
  isUploading?: boolean;
  currentQuestion: string;
  onRunAnalysis: (question: string) => void;
  stages: PipelineStage[];
  activeProofPack: ProofPack | null;
  errorMessage: string | null;
  onResetToNewQuestion: () => void;
}

export function AnalysisWorkspace({
  workspaceState,
  datasets,
  selectedDatasetId,
  onSelectDataset,
  onRemoveDataset,
  onClearAllDatasets,
  onLoadDemoData,
  onFilesSelected,
  uploadError,
  onClearError,
  isUploading,
  currentQuestion,
  onRunAnalysis,
  stages,
  activeProofPack,
  errorMessage,
  onResetToNewQuestion,
}: AnalysisWorkspaceProps) {
  const isAnalyzing = workspaceState === "ANALYZING";
  const resultRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Gentle scroll into view when result resolves
  useEffect(() => {
    if (activeProofPack && !isAnalyzing && resultRef.current) {
      if (!shouldReduceMotion) {
        resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [activeProofPack, isAnalyzing, shouldReduceMotion]);

  return (
    <div className="w-full min-h-[calc(100vh-3.5rem)] flex flex-col p-4 sm:p-8">
      {/* 1. EMPTY STATE */}
      <AnimatePresence mode="wait">
        {workspaceState === "EMPTY" && (
          <motion.div
            key="empty"
            variants={panelTransition}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="my-auto"
          >
            <FileDropzone
              onFilesSelected={onFilesSelected}
              onLoadDemoData={onLoadDemoData}
              hasDatasets={false}
              uploadError={uploadError}
              onClearError={onClearError}
              isUploading={isUploading}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. ACTIVE / LOADED WORKSPACE */}
      {workspaceState !== "EMPTY" && (
        <div className="w-full max-w-4xl mx-auto space-y-6">
          {/* Question Input Section */}
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: motionEasings.decelerate }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Ask a question about your data
              </h2>
              {activeProofPack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onResetToNewQuestion}
                  className="text-xs text-muted-foreground hover:text-foreground h-7 gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  New Question
                </Button>
              )}
            </div>

            <QuestionInput
              onSubmit={onRunAnalysis}
              isLoading={isAnalyzing}
              initialValue={currentQuestion}
            />

            {/* Suggested questions list when not actively running */}
            <AnimatePresence>
              {!isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: motionEasings.decelerate }}
                  className="overflow-hidden"
                >
                  <SuggestedQuestions
                    onSelect={(q) => onRunAnalysis(q)}
                    disabled={isAnalyzing}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Analysis Pipeline */}
          {(isAnalyzing || activeProofPack) && (
            <AnalysisPipeline
              stages={stages}
              currentQuestion={currentQuestion}
              isComplete={!isAnalyzing && Boolean(activeProofPack)}
            />
          )}

          {/* Result Anchor Container */}
          <div ref={resultRef}>
            <AnimatePresence mode="wait">
              {/* 3. VERIFIED / WARNING STATE */}
              {(workspaceState === "VERIFIED" || workspaceState === "WARNING") && activeProofPack && (
                <motion.div
                  key={`proof-${activeProofPack.id}`}
                  variants={panelTransition}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <ProofPackComponent proofPack={activeProofPack} />
                </motion.div>
              )}

              {/* 4. REFUSED STATE */}
              {workspaceState === "REFUSED" && activeProofPack && (
                <motion.div
                  key={`refusal-${activeProofPack.id}`}
                  variants={panelTransition}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <RefusalCard
                    proofPack={activeProofPack}
                    onSelectAlternativeQuestion={onRunAnalysis}
                  />
                </motion.div>
              )}

              {/* 4b. UNSUPPORTED STATE */}
              {workspaceState === "UNSUPPORTED" && activeProofPack && (
                <motion.div
                  key={`unsupported-${activeProofPack.id}`}
                  variants={panelTransition}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-6 my-6 text-center max-w-2xl mx-auto shadow-lg backdrop-blur-sm"
                >
                  <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 mb-1">
                    UNSUPPORTED ANALYSIS
                  </h3>
                  <p className="text-xs text-foreground/90 mt-2 mb-4 leading-relaxed font-mono">
                    {activeProofPack.headlineAnswer || activeProofPack.shortExplanation || "Multidimensional category analytics is outside the deterministic qualifier MVP scope."}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onResetToNewQuestion}
                    className="text-xs border-amber-500/40 hover:bg-amber-500/10"
                  >
                    Try Another Question
                  </Button>
                </motion.div>
              )}

              {/* 5. ERROR STATE */}
              {workspaceState === "ERROR" && (
                <motion.div
                  key="error-state"
                  variants={panelTransition}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 my-6 text-center"
                >
                  <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {errorMessage?.toLowerCase().includes("backend unavailable")
                      ? "BACKEND UNAVAILABLE"
                      : "Analysis Engine Failure"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto mb-4 font-mono">
                    {errorMessage || "The local analysis runner encountered an unhandled exception."}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onResetToNewQuestion}
                    className="text-xs"
                  >
                    Reset Workspace
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Active Datasets Panel */}
          <div className="pt-8 border-t border-border/50">
            <DatasetList
              datasets={datasets}
              selectedDatasetId={selectedDatasetId}
              onSelectDataset={onSelectDataset}
              onRemoveDataset={onRemoveDataset}
              onClearAll={onClearAllDatasets}
              onLoadDemoData={onLoadDemoData}
            />
          </div>
        </div>
      )}
    </div>
  );
}
