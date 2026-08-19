"use client";

import { Crown, Sparkles, TrendingUp, Skull, Swords } from "lucide-react";
import { useGame } from "@/lib/game/provider";
import { useRankedPlayers } from "@/lib/game/selectors";
import { PlayerAvatar } from "./player-avatar";
import { ChipStat, XpStat } from "./stat-pill";

export function WinnerReveal() {
  const { players, chaosEvents, playerPowerups } = useGame();
  const ranked = useRankedPlayers();

  if (players.length === 0) return null;

  const pokerChampion = [...ranked].sort((a, b) => b.chip_count - a.chip_count)[0];
  const xpLegend = [...ranked].sort((a, b) => b.xp_total - a.xp_total)[0];
  const mostHandsWon = [...ranked].sort((a, b) => b.hands_won - a.hands_won)[0];
  const mostEliminations = [...ranked].sort((a, b) => b.eliminations - a.eliminations)[0];
  const mostPowerups = [...ranked].sort(
    (a, b) => playerPowerups.filter((p) => p.player_id === b.id && p.status === "used").length -
      playerPowerups.filter((p) => p.player_id === a.id && p.status === "used").length,
  )[0];
  const biggestStack = [...ranked].sort((a, b) => b.chip_count - a.chip_count)[0];

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 text-center">
      <p className="text-xs font-semibold tracking-[0.3em] text-gold uppercase animate-rise-fade">Final Results</p>
      <h1 className="font-heading text-4xl tracking-wide text-cream text-glow-gold sm:text-6xl">Game Over</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <ChampionCard icon={Crown} title="Poker Champion" subtitle="Most Chips" player={pokerChampion} stat={<ChipStat value={pokerChampion.chip_count} size="lg" />} />
        <ChampionCard icon={Sparkles} title="XP Legend" subtitle="Most XP" player={xpLegend} stat={<XpStat value={xpLegend.xp_total} size="lg" />} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Superlative icon={Swords} label="Most Hands Won" name={mostHandsWon.display_name} value={mostHandsWon.hands_won} />
        <Superlative icon={Skull} label="Most Eliminations" name={mostEliminations.display_name} value={mostEliminations.eliminations} />
        <Superlative icon={TrendingUp} label="Biggest Chip Stack" name={biggestStack.display_name} value={biggestStack.chip_count} />
        <Superlative
          icon={Sparkles}
          label="Most Power-Ups Used"
          name={mostPowerups.display_name}
          value={playerPowerups.filter((p) => p.player_id === mostPowerups.id && p.status === "used").length}
        />
      </div>

      {chaosEvents.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {chaosEvents.length} chaos card{chaosEvents.length === 1 ? "" : "s"} triggered this game.
        </p>
      )}
    </div>
  );
}

function ChampionCard({
  icon: Icon,
  title,
  subtitle,
  player,
  stat,
}: {
  icon: typeof Crown;
  title: string;
  subtitle: string;
  player: { display_name: string };
  stat: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-8 felt-panel animate-rise-fade">
      <Icon className="size-10 text-gold" />
      <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">{title}</p>
      <PlayerAvatar name={player.display_name} size="lg" />
      <h2 className="font-heading text-2xl tracking-wide text-cream">{player.display_name}</h2>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
      {stat}
    </div>
  );
}

function Superlative({ icon: Icon, label, name, value }: { icon: typeof Crown; label: string; name: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-4 text-center">
      <Icon className="size-5 text-gold" />
      <span className="font-heading text-xl text-cream">{value}</span>
      <span className="text-xs font-medium text-foreground">{name}</span>
      <span className="text-[0.65rem] text-muted-foreground">{label}</span>
    </div>
  );
}
