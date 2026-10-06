"use client";

import { useState, useCallback } from "react";
import { Dataset } from "@/types/dataset";
import { MOCK_DATASETS } from "@/data/mockDatasets";
import { datasetService } from "@/services/datasetService";

export function useFileUpload() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadDemoData = useCallback(async () => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const demoDatasets = await datasetService.loadDemoDatasets();
      setDatasets(demoDatasets);
      setSelectedDatasetId(demoDatasets[0]?.id ?? null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load demo datasets from backend.";
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const addCustomFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      setIsUploading(true);
      setUploadError(null);

      const newlyUploaded: Dataset[] = [];
      const errors: string[] = [];

      for (const file of fileArray) {
        try {
          const dataset = await datasetService.uploadFile(file);
          newlyUploaded.push(dataset);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : `Failed to upload ${file.name}`;
          errors.push(msg);
        }
      }

      if (newlyUploaded.length > 0) {
        setDatasets((prev) => {
          const updated = [...prev, ...newlyUploaded];
          return updated;
        });
        setSelectedDatasetId(newlyUploaded[newlyUploaded.length - 1].id);
      }

      if (errors.length > 0) {
        setUploadError(errors.join(" | "));
      }

      setIsUploading(false);
    },
    []
  );

  const removeDataset = useCallback(
    async (id: string) => {
      // If dataset was ingested by backend, remove from server
      if (id.startsWith("ds_")) {
        await datasetService.deleteDataset(id);
      }

      setDatasets((prev) => {
        const filtered = prev.filter((d) => d.id !== id);
        if (selectedDatasetId === id) {
          setSelectedDatasetId(filtered[0]?.id ?? null);
        }
        return filtered;
      });
    },
    [selectedDatasetId]
  );

  const clearAllDatasets = useCallback(async () => {
    await datasetService.clearAllDatasets();
    setDatasets([]);
    setSelectedDatasetId(null);
    setUploadError(null);
  }, []);

  const clearUploadError = useCallback(() => {
    setUploadError(null);
  }, []);

  return {
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
    hasDatasets: datasets.length > 0,
  };
}
