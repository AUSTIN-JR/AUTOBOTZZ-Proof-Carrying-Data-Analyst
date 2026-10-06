"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Cpu, Database, RotateCcw } from "lucide-react";
import { APP_CONFIG } from "@/lib/constants";

interface HeaderProps {
  onResetWorkspace?: () => void;
  datasetCount: number;
}

export function Header({ onResetWorkspace, datasetCount }: HeaderProps) {
  return (
    <header className="h-14 border-b border-border/70 bg-card/70 backdrop-blur px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand & Wordmark */}
      <div className="flex items-center space-x-3">
        <div className="h-8 w-8 rounded border border-border/80 bg-surface-2 flex items-center justify-center font-mono font-bold text-xs text-primary shadow-sm">
          AB
        </div>
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:space-x-2">
          <span className="font-mono font-bold tracking-tight text-sm text-foreground">
            {APP_CONFIG.name}
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            / {APP_CONFIG.tagline}
          </span>
        </div>
        <Badge variant="outline" className="hidden md:inline-flex text-[10px] text-muted-foreground border-border/60">
          {APP_CONFIG.problemId}
        </Badge>
      </div>

      {/* System Status Indicators */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        <div className="hidden lg:flex items-center space-x-2 text-xs text-muted-foreground bg-surface-2/60 border border-border/50 px-2.5 py-1 rounded">
          <Database className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-mono text-[11px]">
            {datasetCount} {datasetCount === 1 ? "Dataset" : "Datasets"} Loaded
          </span>
        </div>

        <div className="flex items-center space-x-2 text-xs text-muted-foreground bg-surface-2/60 border border-border/50 px-2.5 py-1 rounded">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-subtle" />
          <span className="font-mono text-[11px] hidden sm:inline text-emerald-400/90">
            Engine Ready
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">
            (Deterministic Engine)
          </span>
        </div>

        <Badge variant="neutral" className="text-[10px] hidden sm:inline-flex">
          Demo Analysis Active
        </Badge>

        {onResetWorkspace && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetWorkspace}
            title="Reset Workspace"
            className="text-muted-foreground hover:text-foreground h-8 px-2"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:mr-1" />
            <span className="hidden sm:inline text-xs">Reset</span>
          </Button>
        )}
      </div>
    </header>
  );
}

