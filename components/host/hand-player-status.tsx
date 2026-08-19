"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/game/player-avatar";
import { ChipStat } from "@/components/game/stat-pill";
import { SectionHeading } from "@/components/game/section-heading";
import { useGame } from "@/lib/game/provider";
import { updatePlayer } from "@/lib/game/actions";
import { createClient } from "@/lib/supabase/client";
import type { PlayerStatus } from "@/lib/game/types";

const STATUS_OPTIONS: PlayerStatus[] = ["active", "folded", "all_in", "away"];
const STATUS_LABEL: Record<PlayerStatus, string> = {
  active: "Active",
  folded: "Fold",
  all_in: "All-In",
  away: "Away",
  eliminated: "Eliminated",
};

// The single most-used control during a hand: fold/all-in/away toggles, one
// tap each, for every player still in the game. Deliberately just this — no
// edit/eliminate/remove/claim clutter, that's all in the Setup tab's fuller
// player manager since those aren't things you touch every hand.
export function HandPlayerStatus() {
  const supabase = useMemo(() => createClient(), []);
  const { players } = useGame();
  const [busyId, setBusyId] = useState<string | null>(null);

  const activePlayers = players.filter((p) => p.status !== "eliminated");

  async function handleSetStatus(playerId: string, status: PlayerStatus) {
    setBusyId(playerId);
    try {
      await updatePlayer(supabase, playerId, { status });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <SectionHeading eyebrow="This Hand" title="Player Status" />
      </CardHeader>
      <CardContent className="space-y-2">
        {activePlayers.length === 0 && <p className="text-sm text-muted-foreground">No active players.</p>}
        {activePlayers.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2">
            <PlayerAvatar name={p.display_name} size="sm" />
            <span className="min-w-16 flex-1 truncate text-sm font-medium">{p.display_name}</span>
            <ChipStat value={p.chip_count} size="sm" />
            <div className="flex gap-1">
              {STATUS_OPTIONS.map((status) => (
                <Button
                  key={status}
                  type="button"
                  size="xs"
                  variant={p.status === status ? (status === "folded" ? "destructive" : "default") : "outline"}
                  disabled={busyId === p.id}
                  onClick={() => handleSetStatus(p.id, status)}
                >
                  {STATUS_LABEL[status]}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
