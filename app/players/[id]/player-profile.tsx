"use client";

import Link from "next/link";
import { ArrowLeft, Skull, Swords, Trophy } from "lucide-react";
import { useGame } from "@/lib/game/provider";
import { useRankedPlayers } from "@/lib/game/selectors";
import { PlayerAvatar } from "@/components/game/player-avatar";
import { PlayerStatusBadge } from "@/components/game/status-badge";
import { ChipStat, XpStat } from "@/components/game/stat-pill";
import { SectionHeading } from "@/components/game/section-heading";
import { Badge } from "@/components/ui/badge";

export function PlayerProfile({ playerId }: { playerId: string }) {
  const { loading, playerPowerups, playerAchievements, achievements, chipTransactions, xpTransactions } = useGame();
  const ranked = useRankedPlayers();
  const player = ranked.find((p) => p.id === playerId);

  if (loading) {
    return <main className="mx-auto max-w-xl px-4 py-10 text-center text-muted-foreground">Loading…</main>;
  }

  if (!player) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10 text-center">
        <p className="text-muted-foreground">Player not found.</p>
        <Link href="/" className="mt-3 inline-flex items-center gap-1 text-sm text-gold hover:underline">
          <ArrowLeft className="size-4" /> Back to the game
        </Link>
      </main>
    );
  }

  const powerups = playerPowerups.filter((p) => p.player_id === playerId);
  const earnedAchievements = playerAchievements
    .filter((a) => a.player_id === playerId && !a.revoked_at)
    .sort((a, b) => b.earned_at.localeCompare(a.earned_at));
  const chipHistory = chipTransactions
    .filter((t) => t.player_id === playerId && !t.undone_at)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 20);
  const xpHistory = xpTransactions
    .filter((t) => t.player_id === playerId && !t.undone_at)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 20);

  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-6 sm:py-10">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-gold">
        <ArrowLeft className="size-4" /> Back to the game
      </Link>

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center felt-panel">
        <PlayerAvatar name={player.display_name} size="lg" dimmed={player.status === "eliminated"} />
        <h1 className="font-heading text-3xl tracking-wide text-cream">{player.display_name}</h1>
        <PlayerStatusBadge status={player.status} />
        <div className="flex flex-wrap justify-center gap-2">
          <ChipStat value={player.chip_count} size="lg" />
          <XpStat value={player.xp_total} size="lg" />
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Chip rank #{player.chipRank}</span>
          <span>XP rank #{player.xpRank}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={Trophy} label="Hands Won" value={player.hands_won} />
        <StatTile icon={Swords} label="Hands Played" value={player.hands_played} />
        <StatTile icon={Skull} label="Eliminations" value={player.eliminations} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <SectionHeading title="Power-Ups" />
        {powerups.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No power-ups awarded yet.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {powerups.map((p) => (
              <li key={p.id}>
                <Badge variant="outline" className="border-gold/40 px-3 py-1 capitalize">
                  {p.powerup_code.toLowerCase()} — {p.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <SectionHeading title="Achievements" />
        {earnedAchievements.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No achievements yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {earnedAchievements.map((a) => {
              const meta = achievements.find((x) => x.code === a.achievement_code);
              return (
                <li key={a.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{meta?.name ?? a.achievement_code}</span>
                  <span className="font-mono text-chart-4">+{a.xp_awarded} XP</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <SectionHeading title="XP History" />
        <HistoryList items={xpHistory.map((t) => ({ id: t.id, amount: t.amount, reason: t.reason, unit: "XP" }))} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <SectionHeading title="Chip Movement" />
        <HistoryList items={chipHistory.map((t) => ({ id: t.id, amount: t.amount, reason: t.reason ?? t.type, unit: "chips" }))} />
      </div>
    </main>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4 text-center">
      <Icon className="size-5 text-gold" />
      <span className="font-heading text-2xl text-cream">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function HistoryList({ items }: { items: { id: string; amount: number; reason: string; unit: string }[] }) {
  if (items.length === 0) return <p className="mt-3 text-sm text-muted-foreground">No history yet.</p>;
  return (
    <ul className="mt-3 space-y-1.5">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{item.reason}</span>
          <span className={`font-mono font-semibold ${item.amount >= 0 ? "text-chart-3" : "text-destructive"}`}>
            {item.amount >= 0 ? "+" : ""}
            {item.amount} {item.unit}
          </span>
        </li>
      ))}
    </ul>
  );
}
