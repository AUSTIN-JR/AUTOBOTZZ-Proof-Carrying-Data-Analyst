"use client";

import React, { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight, Loader2 } from "lucide-react";
import { motionSprings } from "@/lib/motion";

interface QuestionInputProps {
  onSubmit: (question: string) => void;
  isLoading: boolean;
  initialValue?: string;
}

export function QuestionInput({
  onSubmit,
  isLoading,
  initialValue = "",
}: QuestionInputProps) {
  const [value, setValue] = useState(initialValue);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (initialValue) {
      setValue(initialValue);
    }
  }, [initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading) {
      onSubmit(value.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onSubmit(value.trim());
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <motion.div
        animate={
          isLoading
            ? { borderColor: "hsl(var(--primary))", boxShadow: "0 0 15px rgba(59, 130, 246, 0.15)" }
            : {}
        }
        transition={{ duration: 0.2 }}
        className="relative flex items-center rounded-xl border border-border/90 bg-card/90 shadow-lg focus-within:border-primary/80 focus-within:ring-2 focus-within:ring-primary/20 transition-all p-1.5 sm:p-2 backdrop-blur-sm"
      >
        <div className="pl-3 pr-2 text-muted-foreground flex items-center">
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            >
              <Loader2 className="w-5 h-5 text-primary" />
            </motion.div>
          ) : (
            <Search className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="Ask a question about your data (e.g., What was net revenue in September after refunds?)"
          className="flex-1 bg-transparent px-2 py-2 text-sm sm:text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none disabled:opacity-75 font-sans"
          aria-label="Analytical Question Input"
        />

        <div className="flex items-center gap-1.5 pl-2">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}>
            <Button
              type="submit"
              disabled={!value.trim() || isLoading}
              size="sm"
              className="h-9 px-4 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Proving...</span>
                </>
              ) : (
                <>
                  <span>Prove</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </motion.div>

      <div className="flex items-center justify-between mt-2 px-2 text-[11px] text-muted-foreground font-mono">
        <span>Deterministic Proof-Carrying Analysis Engine</span>
        <span className="hidden sm:inline">Press ↵ Enter to analyze</span>
      </div>
    </form>
  );
}
