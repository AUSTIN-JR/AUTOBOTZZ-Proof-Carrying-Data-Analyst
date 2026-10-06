"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ProofPack } from "@/types/proof";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  FileQuestion,
  Database,
  ArrowRight,
  Code,
  ChevronDown,
  ChevronUp,
  Ban,
} from "lucide-react";
import { CodeViewer } from "../results/CodeViewer";
import { motionEasings, panelTransition, staggerContainer, staggerItem } from "@/lib/motion";

interface RefusalCardProps {
  proofPack: ProofPack;
  onSelectAlternativeQuestion?: (question: string) => void;
}

export function RefusalCard({
  proofPack,
  onSelectAlternativeQuestion,
}: RefusalCardProps) {
  const [showCode, setShowCode] = useState(false);
  const refusal = proofPack.refusalDetails;
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={panelTransition}
      initial="hidden"
      animate="visible"
      className="w-full max-w-4xl mx-auto my-6 space-y-4"
    >
      {/* Primary Refusal Banner - Communicates Intentional Policy Halt */}
      <div className="rounded-xl border border-rose-500/50 bg-rose-950/20 p-6 sm:p-8 shadow-xl relative overflow-hidden backdrop-blur-sm">
        {/* Animated deliberate stop top line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, ease: motionEasings.decelerate }}
          className="absolute top-0 left-0 right-0 h-1 bg-rose-500 origin-left"
        />

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div className="flex items-start gap-3.5">
            <motion.div
              initial={shouldReduceMotion ? {} : { scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 shrink-0 mt-1 shadow-sm"
            >
              <ShieldAlert className="w-6 h-6" />
            </motion.div>

            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="destructive" className="font-mono text-xs px-2.5 py-0.5 uppercase tracking-wide gap-1">
                  <Ban className="w-3 h-3" />
                  <span>Deliberate Policy Halt: Refusal</span>
                </Badge>
                <Badge variant="neutral" className="font-mono text-xs text-muted-foreground">
                  ProofPack {proofPack.id}
                </Badge>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold font-mono text-foreground tracking-tight">
                CANNOT VERIFY RELIABLY
              </h2>

              <p className="text-xs sm:text-sm text-foreground/90 mt-2 leading-relaxed max-w-2xl">
                {refusal?.reason || proofPack.shortExplanation}
              </p>
            </div>
          </div>
        </div>

        {/* Evidence Requirements Grid with Staggered Entry */}
        <motion.div
          variants={staggerContainer(0.08, 0.25)}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-rose-500/30 text-xs"
        >
          {/* Missing Evidence */}
          <motion.div
            variants={staggerItem}
            className="bg-surface-1/90 rounded-lg p-3.5 border border-border/70 shadow-sm"
          >
            <div className="flex items-center gap-1.5 text-rose-400 font-semibold mb-2">
              <FileQuestion className="w-3.5 h-3.5" />
              <span>Missing Evidence</span>
            </div>
            <ul className="space-y-1.5 text-muted-foreground">
              {refusal?.missingEvidence.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-rose-400 font-bold">•</span>
                  <span className="text-foreground/90">{item}</span>
                </li>
              )) || <li>Historical exchange-rate spot table</li>}
            </ul>
          </motion.div>

          {/* Affected Datasets */}
          <motion.div
            variants={staggerItem}
            className="bg-surface-1/90 rounded-lg p-3.5 border border-border/70 shadow-sm"
          >
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-2">
              <Database className="w-3.5 h-3.5" />
              <span>Affected Tables</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(refusal?.affectedDatasets || proofPack.datasets).map((ds) => (
                <span
                  key={ds}
                  className="px-2 py-0.5 rounded bg-surface-2 font-mono text-foreground border border-border/60"
                >
                  {ds}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Contains multi-currency records without rate synchronization.
            </p>
          </motion.div>

          {/* Recommended Action */}
          <motion.div
            variants={staggerItem}
            className="bg-surface-1/90 rounded-lg p-3.5 border border-border/70 shadow-sm"
          >
            <div className="flex items-center gap-1.5 text-primary font-semibold mb-2">
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Recommended Action</span>
            </div>
            <p className="text-foreground/90 leading-relaxed text-[11px]">
              {refusal?.recommendedAction ||
                "Provide an exchange-rate table or specify the conversion rule."}
            </p>
          </motion.div>
        </motion.div>

        {/* Safety assertion code toggle bar */}
        <div className="mt-4 pt-4 border-t border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            Zero-hallucination constraint prevented arbitrary conversion rate synthesis.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCode(!showCode)}
            className="text-xs h-7 gap-1 self-start sm:self-auto hover:border-rose-400/50 transition-colors"
          >
            <Code className="w-3 h-3" />
            <span>{showCode ? "Hide Details" : (proofPack.generatedCode ? "Inspect Safety Code" : "Inspect Execution Status")}</span>
            {showCode ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Safety Constraint Python Code Preview */}
      <AnimatePresence>
        {showCode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: motionEasings.decelerate }}
            className="space-y-3 overflow-hidden"
          >
            <CodeViewer generatedCode={proofPack.generatedCode} />
            {proofPack.execution?.stderr && (
              <div className="p-3 rounded-lg bg-black/60 border border-rose-500/40 text-xs font-mono text-rose-300">
                <span className="text-muted-foreground block text-[10px] uppercase mb-1">
                  Assertion Failure Trace
                </span>
                {proofPack.execution.stderr}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
