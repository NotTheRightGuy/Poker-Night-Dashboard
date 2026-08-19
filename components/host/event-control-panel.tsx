"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GameStatusBadge } from "@/components/game/status-badge";
import { SectionHeading } from "@/components/game/section-heading";
import { setGameStatus } from "@/lib/game/actions";
import { createClient } from "@/lib/supabase/client";
import type { Game, GameStatus } from "@/lib/game/types";

const STATUS_FLOW: GameStatus[] = ["not_started", "registration", "live", "break", "final_table", "finished"];
const STATUS_LABEL: Record<GameStatus, string> = {
  not_started: "Not Started",
  registration: "Registration",
  live: "Live",
  break: "Break",
  final_table: "Final Table",
  finished: "Finished",
};

// The overall event lifecycle — set once at the start, maybe once for a
// break, once at the end. Not something you touch every hand, hence living
// in Setup rather than the main Live Hand view.
export function EventControlPanel({ game }: { game: Game }) {
  const supabase = useMemo(() => createClient(), []);

  async function handleStatus(status: GameStatus) {
    if (status === game.status) return;
    try {
      await setGameStatus(supabase, game.id, status);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  return (
    <Card>
      <CardHeader>
        <SectionHeading eyebrow="Event" title="Game Status" action={<GameStatusBadge status={game.status} />} />
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
