"use client";

import React from "react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useAnalysis } from "@/hooks/useAnalysis";
import { AppShell } from "@/components/layout/AppShell";
import { AnalysisWorkspace } from "@/components/analyst/AnalysisWorkspace";

export default function AnalystWorkspacePage() {
  const {
    datasets,
    selectedDatasetId,
    setSelectedDatasetId,
    isUploading,
    uploadError,
    clearUploadError,
    loadDemoData,
    addCustomFiles,
    removeDataset,
    clearAllDatasets,
  } = useFileUpload();

  const {
    workspaceState,
    currentQuestion,
    stages,
    activeProofPack,
    history,
    errorMessage,
    runAnalysis,
    loadFromHistory,
    resetToNewQuestion,
  } = useAnalysis(datasets);

  const handleResetWorkspace = () => {
    clearAllDatasets();
    resetToNewQuestion();
  };

  return (
    <AppShell
      datasets={datasets}
      selectedDatasetId={selectedDatasetId}
      onSelectDataset={setSelectedDatasetId}
      onLoadDemoData={loadDemoData}
      history={history}
      onSelectHistoryItem={loadFromHistory}
      onResetWorkspace={handleResetWorkspace}
    >
      <AnalysisWorkspace
        workspaceState={workspaceState}
        datasets={datasets}
        selectedDatasetId={selectedDatasetId}
        onSelectDataset={setSelectedDatasetId}
        onRemoveDataset={removeDataset}
        onClearAllDatasets={clearAllDatasets}
        onLoadDemoData={loadDemoData}
        onFilesSelected={addCustomFiles}
        uploadError={uploadError}
        onClearError={clearUploadError}
        isUploading={isUploading}
        currentQuestion={currentQuestion}
        onRunAnalysis={runAnalysis}
        stages={stages}
        activeProofPack={activeProofPack}
        errorMessage={errorMessage}
        onResetToNewQuestion={resetToNewQuestion}
      />
    </AppShell>
  );
}
