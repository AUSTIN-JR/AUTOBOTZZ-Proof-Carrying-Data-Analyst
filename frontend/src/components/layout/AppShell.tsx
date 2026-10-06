"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { AmbientBackground } from "./AmbientBackground";
import { Dataset } from "@/types/dataset";
import { AnalysisHistoryItem } from "@/types/analysis";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motionEasings } from "@/lib/motion";

interface AppShellProps {
  datasets: Dataset[];
  selectedDatasetId: string | null;
  onSelectDataset: (id: string) => void;
  onLoadDemoData: () => void;
  history: AnalysisHistoryItem[];
  onSelectHistoryItem: (item: AnalysisHistoryItem) => void;
  onResetWorkspace: () => void;
  children: React.ReactNode;
}

export function AppShell({
  datasets,
  selectedDatasetId,
  onSelectDataset,
  onLoadDemoData,
  history,
  onSelectHistoryItem,
  onResetWorkspace,
  children,
}: AppShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      <AmbientBackground />

      {/* Orchestrated Header Entrance */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: motionEasings.decelerate }}
        className="relative z-30"
      >
        <Header
          onResetWorkspace={onResetWorkspace}
          datasetCount={datasets.length}
        />
      </motion.div>

      {/* Mobile Sidebar Toggle Bar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-2 bg-surface-1 border-b border-border/70 text-xs relative z-20">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="gap-1.5 h-8"
        >
          {mobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          <span>{mobileSidebarOpen ? "Close Panel" : "Datasets & History"}</span>
        </Button>
        <span className="text-muted-foreground font-mono">
          {datasets.length} Datasets Loaded
        </span>
      </div>

      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Desktop Sidebar with Orchestrated Entrance */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: motionEasings.decelerate }}
          className="hidden lg:block"
        >
          <Sidebar
            datasets={datasets}
            selectedDatasetId={selectedDatasetId}
            onSelectDataset={onSelectDataset}
            onLoadDemoData={onLoadDemoData}
            history={history}
            onSelectHistoryItem={onSelectHistoryItem}
          />
        </motion.div>

        {/* Mobile Sidebar Drawer */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="relative z-10 w-80 max-w-[85vw] bg-card h-full shadow-2xl border-r border-border"
            >
              <Sidebar
                datasets={datasets}
                selectedDatasetId={selectedDatasetId}
                onSelectDataset={(id) => {
                  onSelectDataset(id);
                  setMobileSidebarOpen(false);
                }}
                onLoadDemoData={() => {
                  onLoadDemoData();
                  setMobileSidebarOpen(false);
                }}
                history={history}
                onSelectHistoryItem={(item) => {
                  onSelectHistoryItem(item);
                  setMobileSidebarOpen(false);
                }}
              />
            </motion.div>
          </div>
        )}

        {/* Main Workspace Area with Orchestrated Entrance */}
        <motion.main
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.16, ease: motionEasings.decelerate }}
          className="flex-1 overflow-y-auto"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
