"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { SUGGESTED_QUESTIONS } from "@/lib/constants";
import { SuggestedQuestion } from "@/types/analysis";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import { motionEasings } from "@/lib/motion";

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
  disabled?: boolean;
}

export function SuggestedQuestions({ onSelect, disabled }: SuggestedQuestionsProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="w-full mt-4">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span>Suggested Verification Benchmarks</span>
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: shouldReduceMotion ? 0 : 0.04,
            },
          },
        }}
        className="grid grid-cols-1 md:grid-cols-2 gap-2"
      >
        {SUGGESTED_QUESTIONS.map((item: SuggestedQuestion) => (
          <motion.button
            key={item.id}
            type="button"
            disabled={disabled}
            variants={{
              hidden: { opacity: 0, y: 6 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.22, ease: motionEasings.decelerate },
              },
            }}
            whileHover={shouldReduceMotion ? {} : { x: 2, y: -1 }}
            whileTap={{ scale: 0.985 }}
            onClick={() => onSelect(item.question)}
            className="group flex flex-col p-2.5 text-left rounded-lg border border-border/60 bg-surface-1/40 hover:bg-surface-2/80 hover:border-border transition-all disabled:opacity-50 text-xs shadow-sm"
          >
            <div className="flex items-center justify-between mb-1.5 gap-2 w-full">
              <span className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {item.question}
              </span>
              <Badge
                variant={
                  item.expectedOutcome === "verified"
                    ? "verified"
                    : item.expectedOutcome === "warning"
                    ? "warning"
                    : "destructive"
                }
                className="text-[10px] shrink-0 font-mono py-0 h-4.5 transition-colors"
              >
                {item.expectedOutcome === "verified" && (
                  <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
                )}
                {item.expectedOutcome === "warning" && (
                  <AlertTriangle className="w-3 h-3 mr-1 text-amber-400" />
                )}
                {item.expectedOutcome === "refused" && (
                  <ShieldAlert className="w-3 h-3 mr-1 text-rose-400" />
                )}
                {item.tag}
              </Badge>
            </div>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
