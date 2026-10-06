import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "verified" | "warning" | "destructive" | "neutral";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const baseStyles =
    "inline-flex items-center rounded px-2 py-0.5 text-[11px] font-mono font-medium tracking-tight transition-colors focus:outline-none focus:ring-1 focus:ring-ring select-none";

  const variants = {
    default: "bg-primary/20 text-blue-300 border border-primary/30",
    secondary: "bg-secondary text-secondary-foreground border border-border/60",
    outline: "text-foreground border border-border",
    verified: "bg-emerald-950/60 text-emerald-300 border border-emerald-500/30",
    warning: "bg-amber-950/60 text-amber-300 border border-amber-500/30",
    destructive: "bg-rose-950/60 text-rose-300 border border-rose-500/30",
    neutral: "bg-surface-2 text-muted-foreground border border-border/40",
  };

  return <div className={cn(baseStyles, variants[variant], className)} {...props} />;
}

export { Badge };

