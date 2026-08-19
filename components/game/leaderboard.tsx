"use client";

import { useState } from "react";
import Link from "next/link";
import { Crown } from "lucide-react";
import { useLeaderboard } from "@/lib/game/selectors";
import { useGame } from "@/lib/game/provider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerAvatar } from "./player-avatar";
import { PlayerStatusBadge } from "./status-badge";
import { ChipStat, XpStat } from "./stat-pill";
import { SectionHeading } from "./section-heading";
import { cn } from "@/lib/utils";

export function Leaderboard() {
  const [mode, setMode] = useState<"chips" | "xp">("chips");
  const chipBoard = useLeaderboard("chips");
  const xpBoard = useLeaderboard("xp");
  const { myClaim } = useGame();

  const rows = mode === "chips" ? chipBoard : xpBoard;

  return (
    <div id="leaderboard" className="rounded-2xl border border-border bg-card p-6">
      <SectionHeading eyebrow="Rankings" title="Leaderboard" />
      <Tabs value={mode} onValueChange={(v) => setMode(v as "chips" | "xp")} className="mt-4">
        <TabsList>
          <TabsTrigger value="chips">Chip Leaderboard</TabsTrigger>
          <TabsTrigger value="xp">XP Leaderboard</TabsTrigger>
        </TabsList>
      </Tabs>
      <ol className="mt-2 space-y-1.5">
        {rows.map((p) => {
          const rank = mode === "chips" ? p.chipRank : p.xpRank;
          const isMine = myClaim?.player_id === p.id;
          return (
            <li key={p.id}>
              <Link
                href={`/players/${p.id}`}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 transition hover:bg-accent",
                  rank === 1 && "border-gold/50 bg-gold/10",
                  isMine && "ring-1 ring-gold",
                )}
              >
                <span className={cn("w-6 text-center font-heading text-lg", rank === 1 ? "text-gold" : "text-muted-foreground")}>
                  {rank === 1 ? <Crown className="mx-auto size-5" /> : rank}
                </span>
                <PlayerAvatar name={p.display_name} size="sm" dimmed={p.status === "eliminated"} />
                <span className="flex-1 truncate text-sm font-medium text-foreground">
                  {p.display_name}
                  {isMine && <span className="ml-1 text-xs text-gold">(you)</span>}
                </span>
                <PlayerStatusBadge status={p.status} className="hidden sm:inline-flex" />
                {mode === "chips" ? <ChipStat value={p.chip_count} size="sm" /> : <XpStat value={p.xp_total} size="sm" />}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
