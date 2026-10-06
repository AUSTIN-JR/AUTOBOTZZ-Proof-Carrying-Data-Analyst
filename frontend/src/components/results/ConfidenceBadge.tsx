"use client";

import React from "react";
import { ProofPackConfidence } from "@/types/proof";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Shield } from "lucide-react";

interface ConfidenceBadgeProps {
  confidence: ProofPackConfidence;
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const percentage = Math.round(confidence.score * 100);

  if (confidence.level === "HIGH") {
    return (
      <div className="flex items-center gap-1.5" title={confidence.reason}>
        <Badge variant="verified" className="gap-1 font-mono text-[11px] px-2 py-0.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>CONFIDENCE: {percentage}% ({confidence.level})</span>
        </Badge>
      </div>
    );
  }

  if (confidence.level === "MEDIUM") {
    return (
      <div className="flex items-center gap-1.5" title={confidence.reason}>
        <Badge variant="warning" className="gap-1 font-mono text-[11px] px-2 py-0.5">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span>CONFIDENCE: {percentage}% ({confidence.level})</span>
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5" title={confidence.reason}>
      <Badge variant="destructive" className="gap-1 font-mono text-[11px] px-2 py-0.5">
        <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
        <span>UNVERIFIABLE ({percentage}%)</span>
      </Badge>
    </div>
  );
}

