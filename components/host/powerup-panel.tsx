"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionHeading } from "@/components/game/section-heading";
import { useGame } from "@/lib/game/provider";
import { useCurrentHand } from "@/lib/game/selectors";
import { awardPowerup, usePowerup as markPowerupUsed } from "@/lib/game/actions";
import { createClient } from "@/lib/supabase/client";
import { POWERUPS } from "@/lib/game/xpRules";
import type { Game, PowerupCode } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export function PowerupPanel({ game }: { game: Game }) {
  const supabase = useMemo(() => createClient(), []);
  const { players, playerPowerups } = useGame();
  const currentHand = useCurrentHand();
  const [playerId, setPlayerId] = useState<string | null>(null);

  const activePlayers = players.filter((p) => p.status !== "eliminated");
  const playerName = (id: string) => players.find((p) => p.id === id)?.display_name ?? "Unknown";

  async function handleAward(code: PowerupCode) {
    if (!playerId) {
      toast.error("Pick a player first");
      return;
    }
    try {
      await awardPowerup(supabase, game.id, playerId, code);
      toast.success("Power-up awarded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to award power-up");
    }
  }

  async function handleMarkUsed(id: string) {
    try {
      await markPowerupUsed(supabase, id, currentHand?.id);
      toast.success("Power-up marked used");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark power-up used");
    }
  }

  const sortedPowerups = [...playerPowerups].sort((a, b) => b.acquired_at.localeCompare(a.acquired_at));

  return (
    <Card>
      <CardHeader>
        <SectionHeading eyebrow="Power-Ups" title="Power-Ups" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Player</Label>
          <Select value={playerId ?? undefined} onValueChange={(v) => setPlayerId(v)}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Pick a player" />
            </SelectTrigger>
            <SelectContent>
              {activePlayers.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          {POWERUPS.map((p) => (
            <Button
              key={p.code}
              type="button"
              variant="outline"
              disabled={!playerId}
              onClick={() => handleAward(p.code)}
              title={p.description}
            >
              <Sparkles className="size-3.5" />
              Award {p.name}
            </Button>
          ))}
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Awarded Power-Ups</p>
          {sortedPowerups.length === 0 && <p className="text-sm text-muted-foreground">None awarded yet.</p>}
          <div className="space-y-1.5">
            {sortedPowerups.map((pp) => (
              <div key={pp.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm">
                <span>
                  <strong>{playerName(pp.player_id)}</strong> — {pp.powerup_code}
                  <span
                    className={cn(
                      "ml-2 text-[0.65rem] uppercase tracking-wide",
                      pp.status === "available" && "text-chart-3",
                      pp.status === "used" && "text-muted-foreground",
                      pp.status === "locked" && "text-gold",
                    )}
                  >
                    {pp.status}
                  </span>
                </span>
                {pp.status === "available" && (
                  <Button type="button" size="xs" variant="outline" onClick={() => handleMarkUsed(pp.id)}>
                    <CheckCircle2 className="size-3" />
                    Mark Used
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
