"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Dataset } from "@/types/dataset";
import { AnalysisHistoryItem } from "@/types/analysis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Database,
  History,
  ChevronDown,
  ChevronRight,
  Plus,
  RefreshCw,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/formatters";
import { motionSprings, motionDurations, motionEasings } from "@/lib/motion";

interface SidebarProps {
  datasets: Dataset[];
  selectedDatasetId: string | null;
  onSelectDataset: (id: string) => void;
  onLoadDemoData: () => void;
  history: AnalysisHistoryItem[];
  onSelectHistoryItem: (item: AnalysisHistoryItem) => void;
  activeHistoryId?: string;
}

export function Sidebar({
  datasets,
  selectedDatasetId,
  onSelectDataset,
  onLoadDemoData,
  history,
  onSelectHistoryItem,
  activeHistoryId,
}: SidebarProps) {
  const [datasetsCollapsed, setDatasetsCollapsed] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [inspectDataset, setInspectDataset] = useState<Dataset | null>(null);
  const shouldReduceMotion = useReducedMotion();

  return (
    <aside className="w-80 flex-shrink-0 border-r border-border/70 bg-card/40 backdrop-blur-sm flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden select-none">
      {/* Top Section: Datasets */}
      <div className="flex-1 flex flex-col min-h-0 border-b border-border/60">
        <div className="px-4 py-3 flex items-center justify-between bg-surface-1/50 border-b border-border/40">
          <button
            onClick={() => setDatasetsCollapsed(!datasetsCollapsed)}
            className="flex items-center space-x-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase hover:text-foreground transition-colors group"
          >
            <motion.div
              animate={{ rotate: datasetsCollapsed ? -90 : 0 }}
              transition={{ duration: motionDurations.fast }}
            >
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
            </motion.div>
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-primary" />
              Datasets ({datasets.length})
            </span>
          </button>

          {datasets.length === 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onLoadDemoData}
              className="h-6 px-2 text-[11px] gap-1 hover:border-primary/60 transition-all"
            >
              <Plus className="w-3 h-3" /> Demo
            </Button>
          ) : (
            <motion.div whileTap={{ rotate: 180 }} transition={{ duration: 0.3 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLoadDemoData}
                title="Reload demo datasets"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </motion.div>
          )}
        </div>

        {!datasetsCollapsed && (
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {datasets.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 text-center"
              >
                <p className="text-xs text-muted-foreground mb-2">No datasets loaded yet</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onLoadDemoData}
                  className="w-full text-xs hover:border-primary/40 transition-colors"
                >
                  Load 4 Demo Datasets
                </Button>
              </motion.div>
            ) : (
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
                className="space-y-1"
              >
                {datasets.map((ds) => {
                  const isSelected = selectedDatasetId === ds.id;
                  const isInspected = inspectDataset?.id === ds.id;

                  return (
                    <motion.div
                      key={ds.id}
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        visible: {
                          opacity: 1,
                          x: 0,
                          transition: { duration: 0.22, ease: motionEasings.decelerate },
                        },
                      }}
                      whileHover={shouldReduceMotion ? {} : { x: 2 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => {
                        onSelectDataset(ds.id);
                        setInspectDataset(isInspected ? null : ds);
                      }}
                      className={cn(
                        "relative group rounded-md p-2 text-xs border transition-all cursor-pointer",
                        isSelected
                          ? "bg-surface-2 border-primary/40 shadow-sm"
                          : "bg-surface-1/30 border-transparent hover:bg-surface-2/60 hover:border-border/40"
                      )}
                    >
                      {/* Active Selection Indicator */}
                      {isSelected && (
                        <motion.div
                          layoutId="activeDatasetSelection"
                          className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary rounded-r"
                          transition={motionSprings.interactive}
                        />
                      )}

                      <div className="flex items-center justify-between mb-1 pl-1.5">
                        <div className="flex items-center space-x-2 font-mono font-medium text-foreground truncate">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                          <span className="truncate">{ds.filename}</span>
                        </div>
                        <Badge
                          variant={ds.qualityIssuesCount > 0 ? "warning" : "secondary"}
                          className="text-[10px] uppercase font-mono px-1 py-0 h-4 transition-colors"
                        >
                          {ds.format}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono pl-1.5">
                        <span>{formatNumber(ds.rowCount)} rows</span>
                        <AnimatePresence mode="wait">
                          {ds.qualityIssuesCount > 0 ? (
                            <motion.span
                              key="issue"
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0 }}
                              className="text-amber-400 flex items-center gap-1 font-sans"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              {ds.qualityIssuesCount} {ds.qualityIssuesCount === 1 ? "issue" : "issues"}
                            </motion.span>
                          ) : (
                            <motion.span
                              key="clean"
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0 }}
                              className="text-emerald-400/80 flex items-center gap-1 font-sans"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Ready
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Smooth Schema Accordion */}
                      <AnimatePresence>
                        {isInspected && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: motionEasings.decelerate }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 pt-2 border-t border-border/40 text-[10px] text-muted-foreground space-y-1 pl-1.5">
                              <div className="font-semibold text-foreground/80 flex items-center gap-1">
                                <Info className="w-3 h-3 text-primary" /> Columns ({ds.columns.length}):
                              </div>
                              <motion.div
                                initial="hidden"
                                animate="visible"
                                variants={{
                                  hidden: { opacity: 0 },
                                  visible: {
                                    opacity: 1,
                                    transition: { staggerChildren: 0.02 },
                                  },
                                }}
                                className="flex flex-wrap gap-1"
                              >
                                {ds.columns.map((c) => (
                                  <motion.span
                                    key={c.name}
                                    variants={{
                                      hidden: { opacity: 0, scale: 0.85 },
                                      visible: { opacity: 1, scale: 1 },
                                    }}
                                    className="bg-surface-3/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground"
                                  >
                                    {c.name}
                                  </motion.span>
                                ))}
                              </motion.div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Section: Analysis History */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-4 py-3 flex items-center justify-between bg-surface-1/50 border-b border-border/40">
          <button
            onClick={() => setHistoryCollapsed(!historyCollapsed)}
            className="flex items-center space-x-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase hover:text-foreground transition-colors group"
          >
            <motion.div
              animate={{ rotate: historyCollapsed ? -90 : 0 }}
              transition={{ duration: motionDurations.fast }}
            >
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
            </motion.div>
            <span className="flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-primary" />
              Analysis History ({history.length})
            </span>
          </button>
        </div>

        {!historyCollapsed && (
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {history.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs text-muted-foreground">No analyses performed yet</p>
              </div>
            ) : (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: shouldReduceMotion ? 0 : 0.04 },
                  },
                }}
                className="space-y-1"
              >
                {history.map((item) => {
                  const isActive = activeHistoryId === item.id;
                  return (
                    <motion.button
                      key={item.id}
                      variants={{
                        hidden: { opacity: 0, x: -8 },
                        visible: {
                          opacity: 1,
                          x: 0,
                          transition: { duration: 0.2, ease: motionEasings.decelerate },
                        },
                      }}
                      whileHover={shouldReduceMotion ? {} : { x: 2 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => onSelectHistoryItem(item)}
                      className={cn(
                        "w-full text-left rounded-md p-2 text-xs border transition-all block",
                        isActive
                          ? "bg-surface-2 border-primary/40 shadow-sm"
                          : "bg-surface-1/30 border-transparent hover:bg-surface-2/60 hover:border-border/40"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <span className="font-medium text-foreground truncate leading-snug">
                          {item.question}
                        </span>
                        <Badge
                          variant={
                            item.outcome === "verified"
                              ? "verified"
                              : item.outcome === "warning"
                              ? "warning"
                              : "destructive"
                          }
                          className="text-[9px] uppercase px-1 py-0 h-4 shrink-0 transition-colors"
                        >
                          {item.outcome === "verified" && (
                            <CheckCircle2 className="w-2.5 h-2.5 mr-1 text-emerald-400" />
                          )}
                          {item.outcome === "warning" && (
                            <AlertTriangle className="w-2.5 h-2.5 mr-1 text-amber-400" />
                          )}
                          {item.outcome === "refused" && (
                            <XCircle className="w-2.5 h-2.5 mr-1 text-rose-400" />
                          )}
                          {item.outcome}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                        <span className="truncate text-foreground/80 font-semibold">
                          {item.metricSummary}
                        </span>
                        <span>{item.timestamp}</span>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
