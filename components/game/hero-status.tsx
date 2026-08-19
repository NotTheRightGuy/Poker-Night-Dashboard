"use client";

import { Spade } from "lucide-react";
import { useGame } from "@/lib/game/provider";
import { GameStatusBadge } from "./status-badge";
import { ConnectionStatus } from "./connection-status";

export function HeroStatus() {
  const { game, players, loading } = useGame();

  const activeCount = players.filter((p) => p.status !== "eliminated" && p.status !== "away").length;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-8 text-center felt-panel sm:py-10">
      <div className="flex justify-center">
        <Spade className="size-8 text-primary" />
      </div>
      <p className="mt-2 text-xs font-semibold tracking-[0.3em] text-gold uppercase">Inventory Pod</p>
      <h1 className="font-heading text-4xl leading-none tracking-wide text-cream text-glow-gold sm:text-6xl">Poker Night</h1>

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading live game…</p>
      ) : !game ? (
        <p className="mt-4 text-sm text-muted-foreground">The host hasn&apos;t started a game yet — check back soon.</p>
      ) : (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <GameStatusBadge status={game.status} />
          <span className="text-sm text-muted-foreground">
            Hand <span className="font-mono font-semibold text-foreground">#{game.current_hand_number}</span>
          </span>
          <span className="text-sm text-muted-foreground">
            <span className="font-mono font-semibold text-foreground">{activeCount}</span> active /{" "}
            <span className="font-mono font-semibold text-foreground">{players.length}</span> total players
          </span>
        </div>
      )}

      <div className="mt-4 flex justify-center">
        <ConnectionStatus />
      </div>
    </div>
  );
}
