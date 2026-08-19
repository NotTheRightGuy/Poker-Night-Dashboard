"use client";

import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SectionHeading } from "@/components/game/section-heading";
import { ChipAdjustForm } from "./chip-adjust-form";
import { XpAwardForm } from "./xp-award-form";
import { useGame } from "@/lib/game/provider";
import type { Game } from "@/lib/game/types";

export function ChipXpManager({ game }: { game: Game }) {
  const { players, chipTransactions, xpTransactions } = useGame();

  const playerName = (id: string) => players.find((p) => p.id === id)?.display_name ?? "Unknown";

  // Provider lists are sorted ascending by created_at — reverse for a
  // newest-first feed.
  const recentChips = [...chipTransactions].reverse().slice(0, 10);
  const recentXp = [...xpTransactions].reverse().slice(0, 10);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <SectionHeading eyebrow="Ledger" title="Adjust Chips" />
        </CardHeader>
        <CardContent>
          <ChipAdjustForm game={game} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionHeading eyebrow="Ledger" title="Award XP" />
        </CardHeader>
        <CardContent>
          <XpAwardForm game={game} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionHeading eyebrow="Recent" title="Chip Transactions" />
        </CardHeader>
        <CardContent className="space-y-1.5">
          {recentChips.length === 0 && <p className="text-sm text-muted-foreground">No chip transactions yet.</p>}
          {recentChips.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{playerName(tx.player_id)}</p>
                <p className="truncate text-xs text-muted-foreground">{tx.reason ?? tx.type}</p>
              </div>
              <div className="text-right">
                <p className={tx.amount >= 0 ? "font-mono text-chart-3" : "font-mono text-destructive"}>
                  {tx.amount >= 0 ? "+" : ""}
                  {tx.amount}
                </p>
                <p className="text-[0.65rem] text-muted-foreground">
                  {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionHeading eyebrow="Recent" title="XP Transactions" />
        </CardHeader>
        <CardContent className="space-y-1.5">
          {recentXp.length === 0 && <p className="text-sm text-muted-foreground">No XP transactions yet.</p>}
          {recentXp.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{playerName(tx.player_id)}</p>
                <p className="truncate text-xs text-muted-foreground">{tx.reason}</p>
              </div>
              <div className="text-right">
                <p className={tx.amount >= 0 ? "font-mono text-chart-4" : "font-mono text-destructive"}>
                  {tx.amount >= 0 ? "+" : ""}
                  {tx.amount}
                </p>
                <p className="text-[0.65rem] text-muted-foreground">
                  {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
