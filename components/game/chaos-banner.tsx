"use client";

import { Zap } from "lucide-react";
import { useGame } from "@/lib/game/provider";
import { useActiveChaosEvent } from "@/lib/game/selectors";

export function ChaosBanner() {
  const { chaosCards } = useGame();
  const active = useActiveChaosEvent();

  if (!active) return null;

  const card = chaosCards.find((c) => c.code === active.chaos_code);

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-primary/50 bg-primary/15 px-5 py-4 animate-rise-fade">
      <Zap className="size-6 shrink-0 text-primary" />
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Chaos Card Triggered</p>
        <p className="font-heading text-xl tracking-wide text-cream">{card?.name ?? active.chaos_code}</p>
        {card?.description && <p className="text-sm text-muted-foreground">{card.description}</p>}
      </div>
    </div>
  );
}
