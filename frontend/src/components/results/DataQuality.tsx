"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { DataQualityIssue } from "@/types/dataset";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, ShieldAlert, ChevronDown } from "lucide-react";
import { motionEasings, staggerContainer, staggerItem } from "@/lib/motion";

interface DataQualityProps {
  issues: DataQualityIssue[];
}

export function DataQuality({ issues }: DataQualityProps) {
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(issues[0]?.id || null);
  const shouldReduceMotion = useReducedMotion();

  if (issues.length === 0) {
    return (
      <motion.div
        initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="rounded-lg border border-border/80 bg-surface-1/40 p-6 text-center"
      >
        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-foreground">
          Zero Data-Quality Anomalies Detected
        </h4>
        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
          The selected tables satisfied deterministic constraints with no duplicate primary keys, null values, or formatting ambiguities.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Detected Data-Quality Issues ({issues.length})
        </span>
        <span className="text-xs text-muted-foreground font-mono">
          Sequential Audit Log
        </span>
      </div>

      <motion.div
        variants={staggerContainer(0.06, 0.05)}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-3"
      >
        {issues.map((issue) => {
          const isCritical = issue.severity === "critical";
          const isHigh = issue.severity === "high";
          const isMedium = issue.severity === "medium";
          const isExpanded = expandedIssueId === issue.id;

          return (
            <motion.div
              key={issue.id}
              variants={staggerItem}
              className={`rounded-lg border bg-surface-1 transition-all overflow-hidden ${
                isCritical
                  ? "border-rose-500/40 bg-rose-950/10"
                  : isHigh || isMedium
                  ? "border-amber-500/40 bg-amber-950/10"
                  : "border-border/80"
              }`}
            >
              <div
                onClick={() => setExpandedIssueId(isExpanded ? null : issue.id)}
                className="p-4 flex items-start justify-between gap-3 cursor-pointer hover:bg-surface-2/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {isCritical ? (
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm text-foreground tracking-tight">
                        {issue.title}
                      </h4>
                      <span className="text-xs font-mono text-muted-foreground">
                        ({issue.id})
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {issue.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {issue.datasetName}
                  </Badge>
                  <Badge
                    variant={isCritical ? "destructive" : "warning"}
                    className="text-[10px] uppercase font-mono px-2 py-0"
                  >
                    {issue.severity}
                  </Badge>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </motion.div>
                </div>
              </div>

              {/* Smoothly Revealed Impact & Handling Accordion */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: motionEasings.decelerate }}
                    className="border-t border-border/50 bg-black/30 p-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground text-[10px] font-mono uppercase block mb-1">
                          Impact on Calculation
                        </span>
                        <span className="text-foreground/90 leading-relaxed block bg-surface-2/60 p-2.5 rounded border border-border/40">
                          {issue.impact}
                        </span>
                      </div>

                      <div>
                        <span className="text-muted-foreground text-[10px] font-mono uppercase block mb-1">
                          Audited Handling / Decision
                        </span>
                        <span className="text-primary font-medium leading-relaxed block bg-surface-2/60 p-2.5 rounded border border-border/40">
                          {issue.handlingDecision}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
