"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { Coins, History, Loader2, Sparkles, TrendingDown, TrendingUp, Trophy, UserCheck, UserX, VolumeX, Zap } from "lucide-react";
import { SectionHeading } from "@/components/game/section-heading";
import { PlayerAvatar } from "@/components/game/player-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGame } from "@/lib/game/provider";
import type { ChaosCode, GameEvent, Hand, Player, XpTransaction } from "@/lib/game/types";
import { cn } from "@/lib/utils";

interface ChaosTriggeredPayload {
  chaos_code: ChaosCode;
  name: string;
  affected_player_id: string | null;
}

interface AchievementEarnedPayload {
  player_id: string;
  achievement_code: string;
  name: string;
  xp_awarded: number;
}

interface PlayerStatusPayload {
  player_id: string;
  display_name: string;
}

const CHAOS_ICONS: Record<ChaosCode, typeof TrendingUp> = {
  BULL_MARKET: TrendingUp,
  MARKET_CRASH: TrendingDown,
  SILENT_ROUND: VolumeX,
};

function LoadingState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
      <Loader2 className="size-6 animate-spin" />
      <p className="text-sm">Loading recap…</p>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-24 text-center text-muted-foreground">
      <History className="size-8 opacity-50" />
      <p className="font-heading text-xl tracking-wide text-foreground">{title}</p>
      <p className="max-w-xs text-sm">{description}</p>
    </div>
  );
}

function findPlayerName(players: Player[], playerId: string | null): string | null {
  if (!playerId) return null;
  return players.find((p) => p.id === playerId)?.display_name ?? "Unknown player";
}

function HandCard({
  hand,
  players,
  xpTransactions,
  notableEvents,
}: {
  hand: Hand;
  players: Player[];
  xpTransactions: XpTransaction[];
  notableEvents: GameEvent[];
}) {
  const winnerName = findPlayerName(players, hand.winner_player_id);
  const endedAt = hand.ended_at ?? hand.started_at;

  return (
    <Card className="felt-panel animate-rise-fade">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs text-muted-foreground">
              {format(new Date(endedAt), "h:mm a")}
            </span>
            <h3 className="font-heading text-xl tracking-wide text-foreground">Hand #{hand.hand_number}</h3>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 font-mono text-sm font-semibold text-gold">
            <Coins className="size-3.5" />
            {hand.pot_total.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {winnerName ? (
            <>
              <PlayerAvatar name={winnerName} size="sm" />
              <div className="flex flex-col">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Trophy className="size-3.5 text-gold" />
                  {winnerName}
                </span>
                {hand.winning_hand_name && (
                  <span className="text-xs text-muted-foreground">won with {hand.winning_hand_name}</span>
                )}
              </div>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">No winner recorded for this hand.</span>
          )}
        </div>

        {xpTransactions.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-border pt-2">
            {xpTransactions.map((tx) => {
              const name = findPlayerName(players, tx.player_id) ?? "Unknown player";
              return (
                <div key={tx.id} className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="size-3 text-chart-4" />
                    <span className="text-foreground">{name}</span> — {tx.reason}
                  </span>
                  <span className={cn("font-mono", tx.amount >= 0 ? "text-chart-4" : "text-destructive")}>
                    {tx.amount >= 0 ? "+" : ""}
                    {tx.amount} XP
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {notableEvents.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-border pt-2">
            {notableEvents.map((event) => {
              if (event.event_type === "chaos_triggered") {
                const payload = event.payload as unknown as ChaosTriggeredPayload;
                const Icon = CHAOS_ICONS[payload.chaos_code] ?? Zap;
                return (
                  <Badge key={event.id} variant="outline" className="w-fit gap-1.5 border-primary/40 text-primary">
                    <Icon className="size-3" />
                    Chaos: {payload.name}
                  </Badge>
                );
              }
              if (event.event_type === "achievement_earned") {
                const payload = event.payload as unknown as AchievementEarnedPayload;
                const name = findPlayerName(players, payload.player_id) ?? "Unknown player";
                return (
                  <Badge key={event.id} variant="outline" className="w-fit gap-1.5 border-gold/40 text-gold">
                    <Trophy className="size-3" />
                    {name} earned &quot;{payload.name}&quot; (+{payload.xp_awarded} XP)
                  </Badge>
                );
              }
              return null;
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PlayerStatusFeed({ events }: { events: GameEvent[] }) {
  if (events.length === 0) return null;
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading eyebrow="Timeline" title="Eliminations & Comebacks" />
      <div className="flex flex-col gap-2">
        {events.map((event) => {
          const payload = event.payload as unknown as PlayerStatusPayload;
          const eliminated = event.event_type === "player_eliminated";
          return (
            <Card key={event.id}>
              <CardContent className="flex items-center gap-3">
                {eliminated ? (
                  <UserX className="size-4 text-destructive" />
                ) : (
                  <UserCheck className="size-4 text-chart-3" />
                )}
                <span className="text-sm text-foreground">
                  <strong>{payload.display_name}</strong> {eliminated ? "was eliminated." : "is back in the game."}
                </span>
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  {format(new Date(event.created_at), "h:mm a")}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export default function HistoryPage() {
  const { game, hands, players, xpTransactions, gameEvents, loading } = useGame();

  const completedHands = useMemo(
    () => [...hands].filter((h) => h.phase === "complete").sort((a, b) => b.hand_number - a.hand_number),
    [hands],
  );

  const xpByHand = useMemo(() => {
    const map = new Map<string, XpTransaction[]>();
    for (const tx of xpTransactions) {
      if (!tx.hand_id || tx.undone_at) continue;
      const list = map.get(tx.hand_id) ?? [];
      list.push(tx);
      map.set(tx.hand_id, list);
    }
    return map;
  }, [xpTransactions]);

  const notableEventsByHand = useMemo(() => {
    const map = new Map<string, GameEvent[]>();
    for (const event of gameEvents) {
      if (event.event_type !== "chaos_triggered" && event.event_type !== "achievement_earned") continue;
      if (!event.hand_id) continue;
      const list = map.get(event.hand_id) ?? [];
      list.push(event);
      map.set(event.hand_id, list);
    }
    return map;
  }, [gameEvents]);

  const statusEvents = useMemo(
    () =>
      [...gameEvents]
        .filter((e) => e.event_type === "player_eliminated" || e.event_type === "player_restored")
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [gameEvents],
  );

  if (loading) {
    return <LoadingState />;
  }

  if (!game) {
    return <EmptyState title="No game yet" description="The host hasn't created tonight's game yet. Check back soon." />;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-12 px-4 pb-28 pt-8 sm:pb-14">
      <header className="flex flex-col gap-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{game.name}</p>
        <h1 className="font-heading text-4xl tracking-wide text-foreground sm:text-5xl">Game Recap</h1>
        <p className="text-sm text-muted-foreground">Every completed hand, most recent first.</p>
      </header>

      <section className="flex flex-col gap-4">
        <SectionHeading eyebrow="Recap" title="Hand History" />
        {completedHands.length === 0 ? (
          <EmptyState title="No hands played yet" description="Once the first hand finishes, it'll show up here." />
        ) : (
          <div className="flex flex-col gap-3">
            {completedHands.map((hand) => (
              <HandCard
                key={hand.id}
                hand={hand}
                players={players}
                xpTransactions={xpByHand.get(hand.id) ?? []}
                notableEvents={notableEventsByHand.get(hand.id) ?? []}
              />
            ))}
          </div>
        )}
      </section>

      <PlayerStatusFeed events={statusEvents} />
    </div>
  );
}
