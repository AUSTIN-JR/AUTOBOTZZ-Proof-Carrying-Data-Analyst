"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ProofPack as IProofPack } from "@/types/proof";
import { VerifiedAnswer } from "./VerifiedAnswer";
import { ProofPanel } from "./ProofPanel";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { staggerContainer, staggerItem } from "@/lib/motion";

interface ProofPackProps {
  proofPack: IProofPack;
}

export function ProofPackComponent({ proofPack }: ProofPackProps) {
  const shouldReduceMotion = useReducedMotion();

  const checklistItems = [
    "QUESTION",
    "SOURCES",
    "CODE",
    "EXECUTION",
    "COMPARISON",
    "QUALITY AUDIT",
  ];

  return (
    <div className="w-full max-w-4xl mx-auto my-6 space-y-4">
      {/* Compact ProofPack Assembly Ribbon */}
      <motion.div
        variants={staggerContainer(0.04, 0.1)}
        initial="hidden"
        animate="visible"
        className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-surface-1/60 border border-border/50 text-[11px] font-mono text-muted-foreground shadow-sm"
      >
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>ProofPack Assembly:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {checklistItems.map((item) => (
            <motion.span
              key={item}
              variants={staggerItem}
              className="inline-flex items-center gap-1 text-[10px] bg-surface-2 px-1.5 py-0.5 rounded text-foreground/80 border border-border/40"
            >
              <span>{item}</span>
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
            </motion.span>
          ))}
        </div>

        <div className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
          {proofPack.id} PREVIEW
        </div>
      </motion.div>

      {/* Main Verified Results & Tab Panels */}
      <VerifiedAnswer proofPack={proofPack} />
      <ProofPanel proofPack={proofPack} />
    </div>
  );
}
