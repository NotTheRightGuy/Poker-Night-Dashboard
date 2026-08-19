"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGame } from "@/lib/game/provider";
import { adjustChips } from "@/lib/game/actions";
import { createClient } from "@/lib/supabase/client";
import type { Game } from "@/lib/game/types";

// Manual chip corrections (buy-ins, top-ups, penalties). Deliberately not
// tied to the current hand — most of these happen between hands, not during
// one — `adjustChips`'s optional handId is simply left unset here.
export function ChipAdjustForm({ game, onDone }: { game: Game; onDone?: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const { players } = useGame();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [amount, setAmount] = useState(50);
  const [sign, setSign] = useState<1 | -1>(1);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const activePlayers = players.filter((p) => p.status !== "eliminated");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!playerId || amount === 0) return;
    setSubmitting(true);
    try {
      await adjustChips(supabase, game.id, playerId, amount * sign, reason.trim() || "Manual adjustment");
      toast.success(`${sign > 0 ? "+" : "-"}${amount} chips`);
      setReason("");
      onDone?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to adjust chips");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Player</Label>
        <Select value={playerId ?? undefined} onValueChange={(v) => setPlayerId(v)}>
          <SelectTrigger className="w-full">
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
      <div className="flex items-end gap-2">
        <Button type="button" size="icon-sm" variant={sign === -1 ? "default" : "outline"} onClick={() => setSign(-1)}>
          <Minus className="size-3.5" />
        </Button>
        <Button type="button" size="icon-sm" variant={sign === 1 ? "default" : "outline"} onClick={() => setSign(1)}>
          <Plus className="size-3.5" />
        </Button>
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="chip-amount">Amount</Label>
          <Input
            id="chip-amount"
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(Math.abs(Number(e.target.value) || 0))}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="chip-reason">Reason</Label>
        <Input id="chip-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Buy-in top up" />
      </div>
      <Button type="submit" className="w-full" disabled={submitting || !playerId || amount === 0}>
        {submitting && <Loader2 className="size-4 animate-spin" />}
        {sign > 0 ? "Add" : "Deduct"} Chips
      </Button>
    </form>
  );
}
