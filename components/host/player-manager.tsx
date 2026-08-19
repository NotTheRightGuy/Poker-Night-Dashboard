"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeading } from "@/components/game/section-heading";
import { PlayerRow } from "./player-row";
import { useGame } from "@/lib/game/provider";
import { addPlayer } from "@/lib/game/actions";
import { createClient } from "@/lib/supabase/client";
import type { Game } from "@/lib/game/types";

export function PlayerManager({ game }: { game: Game }) {
  const supabase = useMemo(() => createClient(), []);
  const { players } = useGame();
  const [name, setName] = useState("");
  const [startingChips, setStartingChips] = useState(game.starting_chips);
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await addPlayer(supabase, game.id, name.trim(), startingChips);
      toast.success(`${name.trim()} added`);
      setName("");
      setStartingChips(game.starting_chips);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add player");
    } finally {
      setSubmitting(false);
    }
  }

  const sorted = [...players].sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <SectionHeading eyebrow="Roster" title={`Players (${players.length})`} />
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
            <div className="min-w-40 flex-1 space-y-1.5">
              <Label htmlFor="new-player-name">Name</Label>
              <Input id="new-player-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Player name" />
            </div>
            <div className="w-32 space-y-1.5">
              <Label htmlFor="new-player-chips">Starting chips</Label>
              <Input
                id="new-player-chips"
                type="number"
                min={0}
                value={startingChips}
                onChange={(e) => setStartingChips(Number(e.target.value) || 0)}
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              Add Player
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {sorted.length === 0 && <p className="text-sm text-muted-foreground">No players yet — add the first one above.</p>}
        {sorted.map((p) => (
          <PlayerRow key={p.id} player={p} />
        ))}
      </div>
    </div>
  );
}
