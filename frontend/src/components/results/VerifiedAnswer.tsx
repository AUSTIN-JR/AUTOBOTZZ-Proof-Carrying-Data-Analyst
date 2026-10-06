"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ProofPack } from "@/types/proof";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { CheckCircle2, AlertTriangle, Clock, Database, FileCheck2 } from "lucide-react";
import { formatDuration } from "@/lib/formatters";
import { motionEasings, panelTransition, staggerContainer, staggerItem } from "@/lib/motion";

interface VerifiedAnswerProps {
  proofPack: ProofPack;
}

export function VerifiedAnswer({ proofPack }: VerifiedAnswerProps) {
  const isWarning = proofPack.outcome === "warning";
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={panelTransition}
      initial="hidden"
      animate="visible"
      className="rounded-xl border border-border/80 bg-card p-6 shadow-xl relative overflow-hidden backdrop-blur-sm"
    >
      {/* Background status accent line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, ease: motionEasings.decelerate }}
        className={`absolute top-0 left-0 right-0 h-1 origin-left ${
          isWarning ? "bg-amber-500" : "bg-emerald-500"
        }`}
      />

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
        <div>
          {/* Status Badge + Confidence */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {isWarning ? (
              <Badge variant="warning" className="gap-1.5 px-2.5 py-1 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>VERIFIED WITH DATA HANDLING</span>
              </Badge>
            ) : (
              <Badge variant="verified" className="gap-1.5 px-2.5 py-1 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>VERIFIED DETERMINISTIC COMPUTATION</span>
              </Badge>
            )}

            <ConfidenceBadge confidence={proofPack.confidence} />
          </div>

          <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">
            {proofPack.metricLabel || "Reported Result"}
          </div>

          {/* Final Number / Headline Answer */}
          <div className="text-3xl sm:text-5xl font-extrabold font-mono tracking-tight text-foreground">
            <span>{proofPack.headlineAnswer}</span>
          </div>
        </div>

        {/* ProofPack Identifier Bundle */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="bg-surface-2/80 border border-border/70 rounded-lg p-3 text-right flex flex-col items-start md:items-end font-mono shadow-sm"
        >
          <div className="text-[10px] text-muted-foreground flex items-center gap-1 mb-0.5">
            <FileCheck2 className="w-3 h-3 text-primary" />
            PROOFPACK BUNDLE
          </div>
          <div className="text-sm font-bold text-foreground tracking-wider">
            {proofPack.id}
          </div>
          <div className="text-[10px] text-muted-foreground">
            Deterministic Trace
          </div>
        </motion.div>
      </div>

      {/* Supporting verification note with animated check */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="flex items-center gap-2 text-xs text-muted-foreground mb-6 py-2 px-3 rounded bg-surface-1/60 border border-border/40"
      >
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>Execution output matches the reported result byte-for-byte.</span>
      </motion.div>

      {/* Technical metadata footer with staggered entry */}
      <motion.div
        variants={staggerContainer(0.06, 0.35)}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border/60 text-xs font-mono"
      >
        <motion.div variants={staggerItem}>
          <span className="text-muted-foreground block text-[10px] uppercase">Datasets Used</span>
          <span className="text-foreground font-semibold flex items-center gap-1 mt-0.5 truncate">
            <Database className="w-3 h-3 text-primary shrink-0" />
            {proofPack.datasets.join(", ")}
          </span>
        </motion.div>

        <motion.div variants={staggerItem}>
          <span className="text-muted-foreground block text-[10px] uppercase">Execution Duration</span>
          <span className="text-foreground font-semibold flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
            {formatDuration(proofPack.durationMs)}
          </span>
        </motion.div>

        <motion.div variants={staggerItem}>
          <span className="text-muted-foreground block text-[10px] uppercase">Timestamp</span>
          <span className="text-foreground font-semibold mt-0.5 block truncate">
            {proofPack.createdAt}
          </span>
        </motion.div>

        <motion.div variants={staggerItem}>
          <span className="text-muted-foreground block text-[10px] uppercase">Quality Issues</span>
          <span className={`font-semibold mt-0.5 block ${isWarning ? "text-amber-400" : "text-emerald-400"}`}>
            {proofPack.dataQualityIssues.length === 0
              ? "0 Detected"
              : `${proofPack.dataQualityIssues.length} Excluded / Handled`}
          </span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
