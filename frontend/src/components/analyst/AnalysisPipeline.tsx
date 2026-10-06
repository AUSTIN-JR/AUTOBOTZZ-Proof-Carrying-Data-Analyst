"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { PipelineStage } from "@/types/analysis";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Terminal,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motionEasings } from "@/lib/motion";

interface AnalysisPipelineProps {
  stages: PipelineStage[];
  currentQuestion?: string;
  isComplete?: boolean;
}

export function AnalysisPipeline({
  stages,
  currentQuestion,
  isComplete = false,
}: AnalysisPipelineProps) {
  const [collapsed, setCollapsed] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // Find currently active stage index
  const activeIndex = stages.findIndex((s) => s.status === "active");
  const completedCount = stages.filter(
    (s) => s.status === "completed" || s.status === "warning" || s.status === "failed"
  ).length;

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: motionEasings.decelerate }}
      className="w-full max-w-4xl mx-auto my-6 rounded-xl border border-border/80 bg-card/90 shadow-2xl backdrop-blur-md overflow-hidden"
    >
      {/* Pipeline Header */}
      <div className="px-5 py-4 bg-surface-1/60 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                Deterministic Execution Pipeline
              </h3>
              {isComplete && (
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                  Completed
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-mono truncate max-w-md sm:max-w-lg mt-0.5">
              {currentQuestion ? `Target: "${currentQuestion}"` : "Executing query plan..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-muted-foreground bg-surface-2 px-2.5 py-1 rounded border border-border/50">
            {completedCount} / {stages.length} Stages
          </span>

          {isComplete && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 rounded hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors"
              title={collapsed ? "Expand pipeline" : "Collapse pipeline"}
            >
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="p-5 overflow-hidden"
          >
            {/* Connected Pipeline Nodes Visual Bar (Desktop / Tablet) */}
            <div className="relative py-4 mb-4 hidden md:block">
              {/* Background baseline track */}
              <div className="absolute top-1/2 left-4 right-4 h-0.5 -translate-y-1/2 bg-surface-3 rounded-full" />

              {/* Progress filled line */}
              <motion.div
                className="absolute top-1/2 left-4 h-0.5 -translate-y-1/2 bg-gradient-to-r from-primary to-emerald-400 rounded-full"
                animate={{
                  width: `${Math.min(
                    100,
                    Math.max(0, (completedCount / (stages.length - 1)) * 92)
                  )}%`,
                }}
                transition={{ duration: 0.3, ease: motionEasings.decelerate }}
              />

              {/* Traveling highlight packet on active segment */}
              {!shouldReduceMotion && activeIndex >= 0 && (
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-1.5 bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)] z-10"
                  animate={{
                    left: [
                      `${(activeIndex / stages.length) * 90 + 4}%`,
                      `${((activeIndex + 1) / stages.length) * 90 + 4}%`,
                    ],
                    opacity: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              )}

              {/* Step Nodes */}
              <div className="relative flex items-center justify-between z-10 px-2">
                {stages.map((stage, idx) => {
                  const isActive = stage.status === "active";
                  const isCompleted = stage.status === "completed";
                  const isWarning = stage.status === "warning";
                  const isFailed = stage.status === "failed";
                  const isPending = stage.status === "pending";

                  return (
                    <div key={stage.id} className="flex flex-col items-center">
                      <div className="relative">
                        {/* Active pulsing glow ring */}
                        {isActive && !shouldReduceMotion && (
                          <motion.div
                            animate={{ scale: [1, 1.45, 1], opacity: [0.6, 0, 0.6] }}
                            transition={{ duration: 1.6, repeat: Infinity }}
                            className="absolute -inset-1 rounded-full bg-primary/40"
                          />
                        )}

                        <div
                          className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center border text-[11px] font-mono font-bold transition-all shadow-sm",
                            isActive && "bg-primary text-primary-foreground border-primary ring-2 ring-primary/30",
                            isCompleted && "bg-emerald-950 text-emerald-300 border-emerald-500/50",
                            isWarning && "bg-amber-950 text-amber-300 border-amber-500/50",
                            isFailed && "bg-rose-950 text-rose-300 border-rose-500/50",
                            isPending && "bg-surface-2 text-muted-foreground/60 border-border/60"
                          )}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : isWarning ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          ) : isFailed ? (
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          ) : isActive ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "mt-1.5 text-[9px] font-mono tracking-tight uppercase max-w-[80px] text-center leading-tight truncate",
                          isActive && "text-primary font-bold",
                          isCompleted && "text-foreground/80",
                          isPending && "text-muted-foreground/40",
                          isWarning && "text-amber-400",
                          isFailed && "text-rose-400"
                        )}
                      >
                        {stage.label.split(" ")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stages List with Live Operational Telemetry */}
            <div className="space-y-1.5 pt-2">
              {stages.map((stage, idx) => {
                const isPending = stage.status === "pending";
                const isActive = stage.status === "active";
                const isCompleted = stage.status === "completed";
                const isWarning = stage.status === "warning";
                const isFailed = stage.status === "failed";

                return (
                  <motion.div
                    key={stage.id}
                    layout
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors",
                      isActive && "bg-primary/5 border-primary/40 ring-1 ring-primary/20",
                      isCompleted && "bg-surface-1/40 border-border/40",
                      isWarning && "bg-amber-950/20 border-amber-500/40 text-amber-200",
                      isFailed && "bg-rose-950/20 border-rose-500/40 text-rose-200",
                      isPending && "bg-transparent border-transparent opacity-40"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        {isPending && <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />}
                        {isActive && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                        {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        {isWarning && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                        {isFailed && <XCircle className="w-4 h-4 text-rose-400" />}
                      </div>

                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono text-[11px] text-muted-foreground">
                          0{idx + 1}.
                        </span>
                        <span
                          className={cn(
                            "font-medium truncate",
                            isActive ? "text-primary font-semibold" : "text-foreground",
                            isPending && "text-muted-foreground"
                          )}
                        >
                          {stage.label}
                        </span>
                      </div>
                    </div>

                    {/* Operational Telemetry Badge / Transition */}
                    <div className="flex items-center gap-2.5 shrink-0 ml-3">
                      <AnimatePresence mode="wait">
                        {stage.detail && (
                          <motion.span
                            key={stage.detail}
                            initial={{ opacity: 0, x: 4 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            className={cn(
                              "font-mono text-[11px] hidden sm:inline max-w-sm truncate",
                              isActive ? "text-primary font-medium" : "text-muted-foreground",
                              isWarning && "text-amber-300 font-medium",
                              isFailed && "text-rose-300 font-medium"
                            )}
                          >
                            {stage.detail}
                          </motion.span>
                        )}
                      </AnimatePresence>

                      <span
                        className={cn(
                          "text-[10px] font-mono uppercase px-2 py-0.5 rounded",
                          isActive && "bg-primary/20 text-primary font-semibold",
                          isCompleted && "bg-emerald-950/40 text-emerald-400",
                          isWarning && "bg-amber-950/40 text-amber-400",
                          isFailed && "bg-rose-950/40 text-rose-400",
                          isPending && "text-muted-foreground/50"
                        )}
                      >
                        {stage.status === "failed" ? "BLOCKED" : stage.status}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
