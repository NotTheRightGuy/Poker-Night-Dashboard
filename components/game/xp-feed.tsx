"use client";

import { useMemo } from "react";
import { useGame } from "@/lib/game/provider";
import { SectionHeading } from "./section-heading";
import { PlayerAvatar } from "./player-avatar";
import { cn } from "@/lib/utils";

export function XpFeed() {
  const { xpTransactions, players } = useGame();

  const recent = useMemo(
    () =>
      [...xpTransactions]
        .filter((t) => !t.undone_at && !t.reverses_transaction_id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 12),
    [xpTransactions],
  );

  const playerName = (id: string) => players.find((p) => p.id === id)?.display_name ?? "Someone";

  return (
    <div id="xp-feed" className="rounded-2xl border border-border bg-card p-6">
      <SectionHeading eyebrow="Live Activity" title="XP Feed" />
      {recent.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No XP awarded yet — first one on the board wins bragging rights.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {recent.map((t) => (
            <li key={t.id} className="flex items-start gap-3 animate-rise-fade">
              <PlayerAvatar name={playerName(t.player_id)} size="sm" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  <span className={cn("font-mono font-bold", t.amount >= 0 ? "text-chart-4" : "text-destructive")}>
                    {t.amount >= 0 ? "+" : ""}
                    {t.amount} XP
                  </span>{" "}
                  {playerName(t.player_id)}
                </p>
                <p className="text-xs text-muted-foreground">{t.reason}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
