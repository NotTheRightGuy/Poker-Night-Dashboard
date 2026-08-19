"use client";

import { useGame } from "@/lib/game/provider";
import { cn } from "@/lib/utils";

export function ConnectionStatus({ className }: { className?: string }) {
  const { connectionStatus, loading } = useGame();

  if (loading) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
        <span className="size-2 rounded-full bg-muted-foreground" />
        Connecting…
      </span>
    );
  }

  if (connectionStatus === "live") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-chart-3", className)}>
        <span className="size-2 rounded-full bg-chart-3 animate-pulse-live" />
        Live
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-destructive", className)}>
      <span className="size-2 rounded-full bg-destructive" />
      Connection lost — reconnecting…
    </span>
  );
}
