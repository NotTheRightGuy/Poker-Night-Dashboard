"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGame } from "@/lib/game/provider";
import { useCurrentHand } from "@/lib/game/selectors";
import { awardXp } from "@/lib/game/actions";
import { createClient } from "@/lib/supabase/client";
import { POKER_XP_RULES } from "@/lib/game/xpRules";
import type { Game, XpSource } from "@/lib/game/types";
import { cn } from "@/lib/utils";

// Shared XP form used both in the full Chips & XP tab and inside the quick
// action bar's dialog. Tapping a quick-pick pre-fills amount/reason/source —
// it doesn't submit by itself, since XP awards are per-player and the host
// still needs to confirm who it goes to.
export function XpAwardForm({ game, onDone }: { game: Game; onDone?: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const { players } = useGame();
  const currentHand = useCurrentHand();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [amount, setAmount] = useState(10);
  const [reason, setReason] = useState("");
  const [source, setSource] = useState<XpSource>("host_manual");
  const [submitting, setSubmitting] = useState(false);

  const activePlayers = players.filter((p) => p.status !== "eliminated");

  function applyQuickPick(ruleReason: string, ruleAmount: number) {
    setAmount(ruleAmount);
    setReason(ruleReason);
    setSource("poker_rule");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!playerId || !reason.trim() || amount === 0) return;
    setSubmitting(true);
    try {
      await awardXp(supabase, game.id, playerId, amount, reason.trim(), source, currentHand?.id);
      toast.success(`+${amount} XP — ${reason.trim()}`);
      setReason("");
      setSource("host_manual");
      onDone?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to award XP");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Player</Label>
        <Select value={playerId ?? ""} onValueChange={(v) => setPlayerId(v || null)}>
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

      <div className="space-y-1.5">
        <Label>Quick pick</Label>
        <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
          {POKER_XP_RULES.map((rule) => (
            <button
              key={rule.reason}
              type="button"
              onClick={() => applyQuickPick(rule.reason, rule.amount)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition",
                reason === rule.reason && source === "poker_rule"
                  ? "border-gold bg-gold/15 text-gold"
                  : "border-border text-muted-foreground hover:border-gold/40 hover:text-foreground",
              )}
            >
              {rule.reason} (+{rule.amount})
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[6rem_1fr] gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="xp-amount">Amount</Label>
          <Input
            id="xp-amount"
            type="number"
            value={amount}
            onChange={(e) => {
              setAmount(Number(e.target.value) || 0);
              setSource("host_manual");
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="xp-reason">Reason</Label>
          <Input
            id="xp-reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setSource("host_manual");
            }}
            placeholder="e.g. Great bluff"
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={submitting || !playerId || !reason.trim() || amount === 0}>
        {submitting && <Loader2 className="size-4 animate-spin" />}
        Award XP
      </Button>
    </form>
  );
}
