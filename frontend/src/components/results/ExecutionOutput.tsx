"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ExecutionResult, VerificationResult } from "@/types/proof";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, PlayCircle, ShieldCheck, Equal } from "lucide-react";
import { formatDuration } from "@/lib/formatters";
import { motionEasings, motionSprings } from "@/lib/motion";

interface ExecutionOutputProps {
  execution: ExecutionResult;
  verification: VerificationResult;
}

export function ExecutionOutput({
  execution,
  verification,
}: ExecutionOutputProps) {
  const isMatch = verification.status === "MATCH";
  const isUnverifiable = verification.status === "UNVERIFIABLE";
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="space-y-4">
      {/* 1. Terminal Execution Box */}
      <div className="rounded-lg border border-border/80 bg-surface-1 overflow-hidden font-mono text-xs shadow-md">
        <div className="px-4 py-2 bg-surface-2/90 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
              Live Subprocess Output
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>Exit Code: {execution.exitCode}</span>
            <span>•</span>
            <span>Duration: {formatDuration(execution.executionTimeMs)}</span>
          </div>
        </div>

        <div className="p-4 bg-black/60 text-foreground font-mono space-y-1.5 leading-relaxed">
          <div className="text-muted-foreground flex items-center gap-2">
            <span className="text-primary">$</span>
            <span>python -u analysis.py</span>
          </div>

          {execution.stdout ? (
            <motion.pre
              initial={shouldReduceMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-emerald-400 font-bold text-sm whitespace-pre-wrap py-1"
            >
              {execution.stdout}
            </motion.pre>
          ) : execution.stderr ? (
            <motion.pre
              initial={shouldReduceMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-rose-400 whitespace-pre-wrap py-1"
            >
              {execution.stderr}
            </motion.pre>
          ) : (
            <span className="text-muted-foreground italic">(No stdout emitted)</span>
          )}

          <div className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Process finished with exit code {execution.exitCode}</span>
          </div>
        </div>
      </div>

      {/* 2. Visual Convergence Verification Block */}
      <motion.div
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35, ease: motionEasings.decelerate }}
        className="rounded-lg border border-border/80 bg-surface-1 p-5 font-mono text-xs shadow-md"
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/60">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="font-bold uppercase tracking-wider text-foreground text-xs">
              Deterministic Reconciliation Preview
            </span>
          </div>

          <Badge
            variant={
              isMatch
                ? "verified"
                : isUnverifiable
                ? "destructive"
                : "warning"
            }
            className="text-xs px-2.5 py-0.5 gap-1.5 font-bold shadow-sm"
          >
            {isMatch ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>MATCH</span>
              </>
            ) : isUnverifiable ? (
              <>
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>UNVERIFIABLE</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>MISMATCH</span>
              </>
            )}
          </Badge>
        </div>

        {/* Visual 2-Value Convergence: Reported Claim ← = → Executed Result */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-3 items-center">
          {/* Left: Reported Value (Enters from left) */}
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.4, ease: motionEasings.decelerate }}
            className="bg-surface-2/70 p-3.5 rounded-lg border border-border/70 text-center"
          >
            <span className="text-muted-foreground block text-[10px] uppercase tracking-wider mb-1">
              Reported Answer
            </span>
            <span className="text-foreground font-extrabold text-base sm:text-lg tracking-tight block">
              {String(verification.reportedValue)}
            </span>
          </motion.div>

          {/* Center: Equality Convergence Symbol */}
          <motion.div
            initial={shouldReduceMotion ? {} : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.45, ...motionSprings.snappy }}
            className="flex items-center justify-center p-2"
          >
            <div
              className={`w-8 h-8 rounded-full border flex items-center justify-center shadow-sm ${
                isMatch
                  ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-400"
                  : "bg-rose-950/80 border-rose-500/50 text-rose-400"
              }`}
            >
              <Equal className="w-4 h-4 stroke-[3]" />
            </div>
          </motion.div>

          {/* Right: Executed Result (Enters from right) */}
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.4, ease: motionEasings.decelerate }}
            className="bg-surface-2/70 p-3.5 rounded-lg border border-border/70 text-center"
          >
            <span className="text-muted-foreground block text-[10px] uppercase tracking-wider mb-1">
              Subprocess Stdout Output
            </span>
            <span
              className={`font-extrabold text-base sm:text-lg tracking-tight block ${
                isMatch ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {String(verification.executionValue)}
            </span>
          </motion.div>
        </div>

        {/* Verification Summary Banner */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.3 }}
          className={`mt-4 p-2.5 rounded-lg border text-center text-xs font-semibold flex items-center justify-center gap-2 ${
            isMatch
              ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
              : "bg-rose-950/30 border-rose-500/30 text-rose-300"
          }`}
        >
          {isMatch ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>THE REPORTED RESULT AND EXECUTED CODE OUTPUT ARE PROVABLY IDENTICAL.</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>CANNOT ESTABLISH DETERMINISTIC AGREEMENT.</span>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
