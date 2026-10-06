"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Dataset } from "@/types/dataset";
import { UploadedFile } from "./UploadedFile";
import { Button } from "@/components/ui/button";
import { Database } from "lucide-react";
import { motionEasings } from "@/lib/motion";

interface DatasetListProps {
  datasets: Dataset[];
  selectedDatasetId: string | null;
  onSelectDataset: (id: string) => void;
  onRemoveDataset: (id: string) => void;
  onClearAll: () => void;
  onLoadDemoData: () => void;
}

export function DatasetList({
  datasets,
  selectedDatasetId,
  onSelectDataset,
  onRemoveDataset,
  onClearAll,
  onLoadDemoData,
}: DatasetListProps) {
  const shouldReduceMotion = useReducedMotion();
  if (datasets.length === 0) return null;

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: motionEasings.decelerate }}
      className="w-full max-w-4xl mx-auto my-6 px-4 sm:px-6"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Active Datasets ({datasets.length})
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadDemoData}
            className="text-xs text-muted-foreground hover:text-foreground h-7"
          >
            Reset Demo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-xs text-rose-400 hover:text-rose-300 h-7"
          >
            Clear All
          </Button>
        </div>
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: shouldReduceMotion ? 0 : 0.05,
            },
          },
        }}
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        {datasets.map((dataset) => (
          <motion.div
            key={dataset.id}
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
            }}
          >
            <UploadedFile
              dataset={dataset}
              isSelected={selectedDatasetId === dataset.id}
              onSelect={onSelectDataset}
              onRemove={onRemoveDataset}
            />
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
