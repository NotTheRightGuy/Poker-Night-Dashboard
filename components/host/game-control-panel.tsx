"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GameStatusBadge } from "@/components/game/status-badge";
import { SectionHeading } from "@/components/game/section-heading";
import { useGame } from "@/lib/game/provider";
import { setGamePhase, setGameStatus, startNextHand } from "@/lib/game/actions";
import { createClient } from "@/lib/supabase/client";
import type { Game, GamePhase, GameStatus } from "@/lib/game/types";

const STATUS_FLOW: GameStatus[] = ["not_started", "registration", "live", "break", "final_table", "finished"];
const PHASE_FLOW: GamePhase[] = ["preflop", "flop", "turn", "river", "showdown"];

const STATUS_LABEL: Record<GameStatus, string> = {
  not_started: "Not Started",
  registration: "Registration",
  live: "Live",
  break: "Break",
  final_table: "Final Table",
  finished: "Finished",
};

const PHASE_LABEL: Record<GamePhase, string> = {
  preflop: "Preflop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
  showdown: "Showdown",
};

export function GameControlPanel({ game }: { game: Game }) {
  const supabase = useMemo(() => createClient(), []);
  const { players } = useGame();
  const [dealerId, setDealerId] = useState<string | null>(null);
  const [startingHand, setStartingHand] = useState(false);

  const eligibleDealers = players.filter((p) => p.status !== "eliminated");

  async function handleStatus(status: GameStatus) {
    if (status === game.status) return;
    try {
      await setGameStatus(supabase, game.id, status);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function handlePhase(phase: GamePhase) {
    if (phase === game.current_phase) return;
    try {
      await setGamePhase(supabase, game.id, phase);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update phase");
    }
  }

  async function handleStartNextHand() {
    setStartingHand(true);
    try {
      await startNextHand(supabase, game.id, dealerId ?? undefined);
      toast.success(`Hand #${game.current_hand_number + 1} started`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start next hand");
    } finally {
      setStartingHand(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <SectionHeading
          eyebrow="Game Control"
          title={`Hand #${game.current_hand_number}`}
          action={<GameStatusBadge status={game.status} />}
        />
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_FLOW.map((status) => (
              <Button
                key={status}
                type="button"
                size="sm"
                variant={status === game.status ? "default" : "outline"}
                onClick={() => handleStatus(status)}
              >
                {STATUS_LABEL[status]}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phase</p>
          <div className="flex flex-wrap gap-2">
            {PHASE_FLOW.map((phase) => (
              <Button
                key={phase}
                type="button"
                size="sm"
                variant={phase === game.current_phase ? "default" : "outline"}
                onClick={() => handlePhase(phase)}
              >
                {PHASE_LABEL[phase]}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-gold/30 bg-gold/5 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Dealer</span>
            <Select value={dealerId ?? ""} onValueChange={(v) => setDealerId(v || null)}>
              <SelectTrigger size="sm" className="min-w-36">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {eligibleDealers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            size="lg"
            className="bg-gold text-gold-foreground hover:bg-gold/80"
            disabled={startingHand}
            onClick={handleStartNextHand}
          >
            <PlayCircle className="size-4" />
            Start Next Hand
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
