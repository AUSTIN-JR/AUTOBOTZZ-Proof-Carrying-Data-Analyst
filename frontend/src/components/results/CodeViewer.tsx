"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { GeneratedCode } from "@/types/proof";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Terminal } from "lucide-react";

interface CodeViewerProps {
  generatedCode?: GeneratedCode | null;
}

export function CodeViewer({ generatedCode }: CodeViewerProps) {
  const [copied, setCopied] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  if (!generatedCode || !generatedCode.code) {
    return (
      <div className="rounded-lg border border-border/80 bg-surface-1 p-4 font-mono text-xs text-muted-foreground shadow-md">
        No execution was required because analysis stopped at the evidence validation stage.
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const codeLines = generatedCode.code.split("\n");

  return (
    <div className="rounded-lg border border-border/80 bg-surface-1 overflow-hidden font-mono text-xs shadow-md">
      {/* Code Header */}
      <div className="px-4 py-2.5 bg-surface-2/90 border-b border-border/70 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Terminal className="w-3.5 h-3.5 text-primary" />
          <span className="font-semibold text-foreground">Generated Analysis Code</span>
          <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0 h-4">
            {generatedCode.language}
          </Badge>
          <span className="text-[11px] text-muted-foreground">
            ({generatedCode.lineCount} lines)
          </span>
        </div>

        {/* Copy Button with smooth Icon Replacement */}
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2.5 text-[11px] text-muted-foreground hover:text-foreground gap-1.5 border border-transparent hover:border-border/60 transition-colors"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span
                  key="check"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1 text-emerald-400 font-semibold"
                >
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Copied</span>
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Code</span>
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </motion.div>
      </div>

      {/* Code Body with line numbering and critical statement highlight */}
      <div className="p-4 overflow-x-auto bg-black/50">
        <pre className="font-mono text-xs leading-relaxed">
          <code>
            {codeLines.map((line, idx) => {
              const isPrintLine = line.trim().startsWith("print(") || line.trim().startsWith("raise ");
              const isAggLine = line.includes("net_revenue =") || line.includes("gross_revenue =");

              return (
                <div
                  key={idx}
                  className={`flex items-start py-0.5 rounded px-1 -mx-1 transition-colors ${
                    isPrintLine
                      ? "bg-primary/10 text-emerald-300 font-semibold border-l-2 border-primary"
                      : isAggLine
                      ? "text-blue-300"
                      : "text-foreground/90"
                  }`}
                >
                  <span className="w-8 select-none text-[11px] text-muted-foreground/50 text-right pr-3 shrink-0">
                    {idx + 1}
                  </span>
                  <span className="flex-1">{line || " "}</span>
                </div>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
}
