"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Dataset } from "@/types/dataset";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, AlertTriangle, CheckCircle2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { motionSprings, motionEasings } from "@/lib/motion";

interface UploadedFileProps {
  dataset: Dataset;
  onRemove?: (id: string) => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

export function UploadedFile({
  dataset,
  onRemove,
  isSelected,
  onSelect,
}: UploadedFileProps) {
  const [expanded, setExpanded] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      layout
      whileHover={shouldReduceMotion ? {} : { y: -2, transition: { duration: 0.15 } }}
      className={`rounded-lg border bg-card transition-colors ${
        isSelected ? "border-primary/80 ring-1 ring-primary/40 shadow-sm" : "border-border/70 hover:border-border"
      }`}
    >
      <div className="p-3.5 flex items-start justify-between gap-3">
        <div
          className="flex items-start gap-3 flex-1 cursor-pointer"
          onClick={() => onSelect?.(dataset.id)}
        >
          <div className="p-2 rounded bg-surface-2 border border-border/60 text-muted-foreground shrink-0 mt-0.5">
            <FileText className="w-4 h-4 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono font-semibold text-sm text-foreground truncate">
                {dataset.filename}
              </span>
              <Badge variant="outline" className="text-[10px] font-mono uppercase">
                {dataset.format}
              </Badge>
              {dataset.qualityIssuesCount > 0 ? (
                <Badge variant="warning" className="text-[10px] gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  {dataset.qualityIssuesCount} {dataset.qualityIssuesCount === 1 ? "issue" : "issues"}
                </Badge>
              ) : (
                <Badge variant="verified" className="text-[10px] gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Clean
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground mb-1 line-clamp-1">
              {dataset.description || "Dataset loaded"}
            </p>

            <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
              <span className="flex items-center gap-1">
                <AnimatedNumber value={dataset.rowCount} duration={0.6} /> rows
              </span>
              <span>•</span>
              <span>{dataset.columnCount} columns</span>
              <span>•</span>
              <span>{dataset.sizeFormatted}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title={expanded ? "Hide columns" : "View schema"}
          >
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </motion.div>
          </Button>

          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(dataset.id)}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-400"
              title="Remove dataset"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Animated Schema Expansion */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: motionEasings.decelerate }}
            className="overflow-hidden border-t border-border/50 bg-surface-1/30"
          >
            <div className="p-3.5 pt-2">
              <div className="text-[11px] font-mono text-muted-foreground mb-2 flex items-center justify-between">
                <span>Detected Schema ({dataset.columns.length} columns)</span>
                <span className="text-[10px] text-muted-foreground/80">Sample Preview</span>
              </div>

              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: shouldReduceMotion ? 0 : 0.03 },
                  },
                }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1"
              >
                {dataset.columns.map((col) => (
                  <motion.div
                    key={col.name}
                    variants={{
                      hidden: { opacity: 0, y: 4 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    className="flex items-center justify-between bg-surface-2/80 rounded px-2 py-1 text-xs font-mono border border-border/40"
                  >
                    <div className="truncate mr-2">
                      <span className="text-foreground font-medium">{col.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-1.5">({col.type})</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[90px]">
                      {col.sampleValues.slice(0, 2).join(", ")}
                    </span>
                  </motion.div>
                ))}
              </motion.div>

              {/* Real Quality Audit Findings */}
              {dataset.qualityIssues && dataset.qualityIssues.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-border/50">
                  <div className="text-[11px] font-mono text-amber-400 mb-1.5 flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span>Quality Audit Findings ({dataset.qualityIssues.length})</span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {dataset.qualityIssues.map((issue) => (
                      <div
                        key={issue.id}
                        className="bg-amber-950/20 border border-amber-500/30 rounded p-2 text-[11px] font-mono"
                      >
                        <div className="flex items-center justify-between text-amber-300 font-semibold mb-0.5">
                          <span>{issue.title}</span>
                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-amber-900/40 border border-amber-500/40">
                            {issue.severity}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-[10px]">{issue.description}</p>
                        {issue.impact && (
                          <p className="text-[10px] text-amber-300/80 mt-0.5">
                            Impact: {issue.impact}
                          </p>
                        )}
                        {issue.handlingDecision && (
                          <p className="text-[10px] text-muted-foreground/90 mt-0.5 italic">
                            Handling: {issue.handlingDecision}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
