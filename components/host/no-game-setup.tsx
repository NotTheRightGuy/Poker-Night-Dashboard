"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Spade } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createGame } from "@/lib/game/actions";
import { createClient } from "@/lib/supabase/client";

// Shown instead of the dashboard when `useGame().game` is null — this is the
// one-time seed step for an event. Players are always added afterward from
// the Players tab, never hardcoded here.
export function NoGameSetup() {
  const supabase = useMemo(() => createClient(), []);
  const [name, setName] = useState("Inventory Pod Poker Night");
  const [startingChips, setStartingChips] = useState(1000);
  const [smallBlind, setSmallBlind] = useState(5);
  const [bigBlind, setBigBlind] = useState(10);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await createGame(supabase, name.trim(), startingChips, smallBlind, bigBlind);
      toast.success("Game created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create game");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center py-16">
      <Card className="w-full felt-panel">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Spade className="size-6 text-gold" />
            <CardTitle className="text-xl">Create the Game</CardTitle>
          </div>
          <CardDescription>
            No game exists yet for this event. Set the starting rules — players are added from the dashboard afterward.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="game-name">Game name</Label>
              <Input id="game-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="starting-chips">Starting chips</Label>
                <Input
                  id="starting-chips"
                  type="number"
                  min={0}
                  value={startingChips}
                  onChange={(e) => setStartingChips(Number(e.target.value) || 0)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="small-blind">Small blind</Label>
                <Input
                  id="small-blind"
                  type="number"
                  min={0}
                  value={smallBlind}
                  onChange={(e) => setSmallBlind(Number(e.target.value) || 0)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="big-blind">Big blind</Label>
                <Input
                  id="big-blind"
                  type="number"
                  min={0}
                  value={bigBlind}
                  onChange={(e) => setBigBlind(Number(e.target.value) || 0)}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Create Game
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
