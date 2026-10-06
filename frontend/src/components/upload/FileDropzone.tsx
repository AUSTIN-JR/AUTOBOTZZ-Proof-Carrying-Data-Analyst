"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Upload,
  Database,
  FileSpreadsheet,
  FileCode,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motionSprings, motionEasings } from "@/lib/motion";

interface FileDropzoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
  onLoadDemoData: () => void;
  hasDatasets: boolean;
  uploadError?: string | null;
  onClearError?: () => void;
  isUploading?: boolean;
}

export function FileDropzone({
  onFilesSelected,
  onLoadDemoData,
  hasDatasets,
  uploadError,
  onClearError,
  isUploading = false,
}: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDemoIngesting, setIsDemoIngesting] = useState(false);
  const [ingestStep, setIngestStep] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const isBusy = isUploading || isDemoIngesting;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      // Reset input value so re-uploading same file name triggers onChange
      e.target.value = "";
    }
  };

  const handleDemoDataClick = () => {
    if (shouldReduceMotion) {
      onLoadDemoData();
      return;
    }

    setIsDemoIngesting(true);
    setIngestStep("Reading 4 physical demo datasets...");
    setTimeout(() => {
      setIngestStep("Inspecting schema & row counts...");
      setTimeout(() => {
        setIngestStep("Audit checks initialized...");
        setTimeout(() => {
          onLoadDemoData();
          setIsDemoIngesting(false);
        }, 300);
      }, 350);
    }, 300);
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <motion.div
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: motionEasings.decelerate }}
        className="text-center mb-8"
      >
        <Badge
          variant="outline"
          className="mb-3 px-3 py-1 font-mono text-xs border-primary/40 text-primary tracking-wide shadow-sm"
        >
          HNX26PSI08 — Deterministic Proof Engine
        </Badge>
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground mb-3">
          Ask questions your data can prove.
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Upload messy operational datasets to inspect quality flaws, generate reproducible
          analysis pipelines, execute deterministic computations, and verify exact numerical claims.
        </p>
      </motion.div>

      {/* Dropzone Card with Reaction and Lift */}
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        animate={
          isDragOver
            ? { y: -3, scale: 1.008, borderColor: "hsl(var(--primary))" }
            : { y: 0, scale: 1 }
        }
        transition={{ duration: 0.2 }}
        className={`relative rounded-xl border-2 border-dashed transition-colors p-8 sm:p-12 text-center bg-card/60 backdrop-blur-sm shadow-lg ${
          isDragOver
            ? "bg-primary/5 ring-4 ring-primary/10 border-primary"
            : "border-border/80 hover:border-border hover:bg-card/80"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv,.xlsx,.json"
          onChange={handleFileChange}
          className="hidden"
          id="file-dropzone-input"
        />

        {/* Icon reaction */}
        <motion.div
          animate={isDragOver ? { scale: 1.12, rotate: -2 } : { scale: 1, rotate: 0 }}
          transition={motionSprings.snappy}
          className="mx-auto w-12 h-12 rounded-full bg-surface-2 border border-border/80 flex items-center justify-center text-primary mb-4 shadow-sm"
        >
          {isBusy ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          ) : (
            <Upload className="w-6 h-6" />
          )}
        </motion.div>

        <h3 className="text-base font-semibold text-foreground mb-1">
          {isUploading
            ? "Uploading & Profiling with Backend..."
            : isDemoIngesting
            ? "Ingesting Demo Datasets..."
            : "Drop your operational datasets here"}
        </h3>

        <p className="text-xs text-muted-foreground mb-6 max-w-md mx-auto">
          {isUploading
            ? "Sending file to FastAPI backend for schema inspection & data-quality audits..."
            : isDemoIngesting
            ? ingestStep
            : "Drag and drop CSV, XLSX, or JSON files to inspect schema and profile anomalies."}
        </p>

        {/* Ingest Status Pulse Pill */}
        <AnimatePresence>
          {isBusy && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{isUploading ? "Processing in FastAPI..." : ingestStep}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Error Banner */}
        <AnimatePresence>
          {uploadError && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-6 max-w-lg mx-auto p-3 rounded-lg border border-rose-500/40 bg-rose-950/30 text-rose-300 text-xs flex items-center justify-between gap-3 shadow-md"
            >
              <div className="flex items-start gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span className="leading-snug">{uploadError}</span>
              </div>
              {onClearError && (
                <button
                  type="button"
                  onClick={onClearError}
                  className="text-rose-400/80 hover:text-rose-300 p-1"
                  title="Dismiss error"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Supported formats pills */}
        {!isBusy && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6 text-xs text-muted-foreground font-mono">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-2 border border-border/60 hover:border-border transition-colors">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> CSV
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-2 border border-border/60 hover:border-border transition-colors">
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" /> XLSX
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-2 border border-border/60 hover:border-border transition-colors">
              <FileCode className="w-3.5 h-3.5 text-amber-400" /> JSON
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-2/60 border border-border/40 text-muted-foreground/60 transition-colors" title="PDF Document Support Planned for future phase">
              <FileText className="w-3.5 h-3.5 text-rose-400/60" /> PDF (DOCUMENT SUPPORT — PLANNED)
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={isBusy}
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto"
            >
              Browse Local Files
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              type="button"
              variant="default"
              size="lg"
              disabled={isBusy}
              onClick={handleDemoDataClick}
              className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md"
            >
              <Database className="w-4 h-4" />
              <span>Load Demo Data (4 Datasets)</span>
            </Button>
          </motion.div>
        </div>

        {hasDatasets && (
          <div className="mt-6 pt-4 border-t border-border/50 text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Datasets already loaded. You can add more or query them below.
          </div>
        )}
      </motion.div>
    </div>
  );
}
