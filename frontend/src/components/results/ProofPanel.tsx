"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ProofPack } from "@/types/proof";
import { CodeViewer } from "./CodeViewer";
import { ExecutionOutput } from "./ExecutionOutput";
import { DataQuality } from "./DataQuality";
import { SourceEvidence } from "./SourceEvidence";
import { Code, Database, FileText, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motionSprings, motionEasings } from "@/lib/motion";

interface ProofPanelProps {
  proofPack: ProofPack;
}

export function ProofPanel({ proofPack }: ProofPanelProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "proof" | "quality" | "sources">("overview");
  const shouldReduceMotion = useReducedMotion();

  interface TabItem {
    id: "overview" | "proof" | "quality" | "sources";
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }

  const tabs: TabItem[] = [
    { id: "overview", label: "Overview", icon: FileText },
    { id: "proof", label: "Proof & Code", icon: Code },
    {
      id: "quality",
      label: "Data Quality",
      icon: AlertTriangle,
      badge: proofPack.dataQualityIssues.length > 0 ? proofPack.dataQualityIssues.length : undefined,
    },
    {
      id: "sources",
      label: "Sources",
      icon: Database,
      badge: proofPack.sources.length,
    },
  ];

  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-6 shadow-xl mt-6 backdrop-blur-sm">
      {/* Tab Navigation with Animated Active Pill Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/60 gap-3">
        <div className="inline-flex h-9 items-center justify-start rounded-lg bg-surface-2 p-1 text-muted-foreground border border-border/60">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 select-none",
                  isActive ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {/* Framer Motion Active Indicator Pill */}
                {isActive && (
                  <motion.div
                    layoutId="activeProofTabIndicator"
                    className="absolute inset-0 bg-card rounded-md shadow-sm border border-border/70 z-0"
                    transition={motionSprings.interactive}
                  />
                )}

                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={cn(
                        "ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                        tab.id === "quality"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-surface-3 text-muted-foreground"
                      )}
                    >
                      {tab.badge}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-xs font-mono text-muted-foreground flex items-center gap-2">
          <span>ProofPack:</span>
          <span className="text-foreground font-semibold bg-surface-2 px-2 py-0.5 rounded border border-border/50">
            {proofPack.id}
          </span>
        </div>
      </div>

      {/* Tab Content with Fast Polished Transitions */}
      <div className="pt-4">
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? {} : { opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: motionEasings.decelerate }}
              className="space-y-6"
            >
              {/* Short Explanation */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Analytical Finding
                </h4>
                <p className="text-sm text-foreground/90 leading-relaxed bg-surface-1/50 p-4 rounded-lg border border-border/50">
                  {proofPack.shortExplanation}
                </p>
              </div>

              {/* Calculation Summary Table */}
              {proofPack.calculationBreakdown.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Calculation Summary
                  </h4>
                  <div className="rounded-lg border border-border/70 overflow-hidden bg-surface-1">
                    <div className="divide-y divide-border/60">
                      {proofPack.calculationBreakdown.map((item, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-3 text-xs font-mono ${
                            item.operation === "result"
                              ? "bg-surface-2/80 font-bold text-foreground text-sm"
                              : "text-muted-foreground"
                          }`}
                        >
                          <span className={item.operation === "result" ? "text-foreground" : "text-foreground/80"}>
                            {item.label}
                          </span>
                          <span
                            className={
                              item.operation === "subtract"
                                ? "text-rose-400 font-medium"
                                : item.operation === "result"
                                ? "text-emerald-400 font-bold"
                                : "text-foreground font-medium"
                            }
                          >
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Key Assumptions */}
              {proofPack.assumptions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Key Operational Assumptions
                  </h4>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {proofPack.assumptions.map((assumption, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 bg-surface-1/40 p-2.5 rounded border border-border/40"
                      >
                        <span className="font-mono text-primary font-bold">0{idx + 1}.</span>
                        <span className="text-foreground/90 leading-relaxed">{assumption}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "proof" && (
            <motion.div
              key="proof"
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? {} : { opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: motionEasings.decelerate }}
              className="space-y-6"
            >
              <CodeViewer generatedCode={proofPack.generatedCode} />
              {proofPack.execution && proofPack.verification && (
                <ExecutionOutput
                  execution={proofPack.execution}
                  verification={proofPack.verification}
                />
              )}
            </motion.div>
          )}

          {activeTab === "quality" && (
            <motion.div
              key="quality"
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? {} : { opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: motionEasings.decelerate }}
            >
              <DataQuality issues={proofPack.dataQualityIssues} />
            </motion.div>
          )}

          {activeTab === "sources" && (
            <motion.div
              key="sources"
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? {} : { opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: motionEasings.decelerate }}
            >
              <SourceEvidence sources={proofPack.sources} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
