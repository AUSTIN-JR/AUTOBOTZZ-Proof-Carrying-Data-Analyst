"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EvidenceSource } from "@/types/proof";
import { Badge } from "@/components/ui/badge";
import { Database, Filter, Layers, ArrowRight, GitCommit, Cpu, FileCheck } from "lucide-react";
import { formatNumber } from "@/lib/formatters";
import { staggerContainer, staggerItem, motionEasings } from "@/lib/motion";

interface SourceEvidenceProps {
  sources: EvidenceSource[];
}

export function SourceEvidence({ sources }: SourceEvidenceProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="space-y-5">
      {/* 1. Visual Data Lineage Flow Banner */}
      <motion.div
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: motionEasings.decelerate }}
        className="rounded-xl border border-border/80 bg-surface-1 p-4 shadow-sm"
      >
        <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider mb-3 flex items-center gap-1.5">
          <GitCommit className="w-3.5 h-3.5 text-primary" />
          <span>Deterministic Lineage Graph</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          {/* Source nodes */}
          <div className="flex flex-wrap gap-2 items-center">
            {sources.map((src) => (
              <div
                key={src.datasetId}
                className="bg-surface-2 px-3 py-1.5 rounded-lg border border-border/70 text-foreground font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Database className="w-3.5 h-3.5 text-primary" />
                <span>{src.filename}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <ArrowRight className="w-4 h-4 text-primary animate-pulse" />
          </div>

          {/* Computation Kernel */}
          <div className="bg-primary/10 border border-primary/30 text-primary px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            <span>Pandas Vectorized Kernel</span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <ArrowRight className="w-4 h-4 text-emerald-400" />
          </div>

          {/* Sealed ProofPack */}
          <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>ProofPack Bundle</span>
          </div>
        </div>
      </motion.div>

      {/* 2. Detailed Source Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Evidence Sources ({sources.length})
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            Lineage & Column Footprint
          </span>
        </div>

        <motion.div
          variants={staggerContainer(0.06, 0.05)}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          {sources.map((src) => (
            <motion.div
              key={src.datasetId}
              variants={staggerItem}
              className="rounded-lg border border-border/80 bg-surface-1 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-mono font-bold text-sm text-foreground">
                    {src.filename}
                  </span>
                </div>

                {src.rowsInvolved !== undefined && (
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {formatNumber(src.rowsInvolved)} rows evaluated
                  </Badge>
                )}
              </div>

              {src.filterApplied && (
                <div className="mb-3 p-2 rounded bg-black/40 border border-border/40 text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
                  <Filter className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-foreground/90 truncate">{src.filterApplied}</span>
                </div>
              )}

              <div>
                <div className="text-[10px] font-mono text-muted-foreground uppercase mb-1.5 flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  Columns Utilized ({src.columnsUsed.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {src.columnsUsed.map((col) => (
                    <span
                      key={col}
                      className="px-2 py-0.5 rounded bg-surface-2 text-foreground font-mono text-xs border border-border/50"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
