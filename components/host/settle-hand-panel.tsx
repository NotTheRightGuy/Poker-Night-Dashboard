"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionHeading } from "@/components/game/section-heading";
import { useGame } from "@/lib/game/provider";
import { useCurrentHand } from "@/lib/game/selectors";
import { awardPot, awardXp } from "@/lib/game/actions";
import { createClient } from "@/lib/supabase/client";
import { evaluateHand, type HandCategory } from "@/lib/poker/evaluator";
import { POKER_XP_RULES } from "@/lib/game/xpRules";

// Not every hand category has a dedicated §13 rule (e.g. two pair / three of
// a kind / straight flush / high card fall back to the generic "Win a hand"
// button below) — this only surfaces the specific higher-value rules that
// clearly match a hand category.
function suggestXpRule(category: HandCategory, tiebreak: number[]) {
  const byReason = (reason: string) => POKER_XP_RULES.find((r) => r.reason === reason) ?? null;
  switch (category) {
    case "royal_flush":
      return byReason("Royal flush");
    case "four_of_a_kind":
      return byReason("Win with four of a kind");
    case "full_house":
      return byReason("Win with a full house");
    case "flush":
      return byReason("Win with a flush");
    case "straight":
      return byReason("Win with a straight");
    case "pair":
      return tiebreak[0] === 2 ? byReason("Win with pair of 2s or lower") : null;
    default:
      return null;
  }
}

interface SettledInfo {
  handId: string;
  gameId: string;
  winnerId: string;
  winnerName: string;
  suggestedReason: string | null;
  suggestedAmount: number | null;
}

export function SettleHandPanel() {
  const supabase = useMemo(() => createClient(), []);
  const { players, holeCards, communityCards } = useGame();
  const currentHand = useCurrentHand();
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [potAmount, setPotAmount] = useState(0);
  const [handName, setHandName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [settled, setSettled] = useState<SettledInfo | null>(null);

  if (!currentHand) {
    return (
      <Card>
        <CardHeader>
          <SectionHeading eyebrow="Showdown" title="Settle Hand" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hand in progress.</p>
        </CardContent>
      </Card>
    );
  }

  const handId = currentHand.id;
  const gameId = currentHand.game_id;
  const handNumber = currentHand.hand_number;

  const eligiblePlayers = players.filter((p) => p.status === "active" || p.status === "all_in");
  const handCommunityCards = communityCards.filter((c) => c.hand_id === handId).map((c) => c.card);
  const winner = winnerId ? players.find((p) => p.id === winnerId) ?? null : null;

  let suggestion: { name: string; reason: string | null; amount: number | null } | null = null;
  if (winner) {
    const winnerHoleCards = holeCards
      .filter((c) => c.hand_id === handId && c.player_id === winner.id)
      .map((c) => c.card);
    if (winnerHoleCards.length === 2 && handCommunityCards.length >= 3) {
      try {
        const evaluation = evaluateHand(winnerHoleCards, handCommunityCards);
        const rule = suggestXpRule(evaluation.category, evaluation.tiebreak);
        suggestion = { name: evaluation.name, reason: rule?.reason ?? null, amount: rule?.amount ?? null };
      } catch {
        suggestion = null;
      }
    }
  }

  async function handleSettle(e: React.FormEvent) {
    e.preventDefault();
    if (!winnerId || !winner) {
      toast.error("Pick a winner first");
      return;
    }
    setSubmitting(true);
    try {
      await awardPot(supabase, handId, winnerId, potAmount, handName.trim() || undefined);
      toast.success("Pot awarded");
      setSettled({
        handId,
        gameId,
        winnerId,
        winnerName: winner.display_name,
        suggestedReason: suggestion?.reason ?? null,
        suggestedAmount: suggestion?.amount ?? null,
      });
      setWinnerId(null);
      setPotAmount(0);
      setHandName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to award pot");
    } finally {
      setSubmitting(false);
    }
  }

  async function awardFollowUpXp(amount: number, reason: string) {
    if (!settled) return;
    try {
      await awardXp(supabase, settled.gameId, settled.winnerId, amount, reason, "poker_rule", settled.handId);
      toast.success(`+${amount} XP — ${reason}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to award XP");
    }
  }

  return (
    <Card>
      <CardHeader>
        <SectionHeading eyebrow="Showdown" title={`Settle Hand #${handNumber}`} />
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSettle} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Winner</Label>
              <Select value={winnerId ?? ""} onValueChange={(v) => setWinnerId(v || null)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick winner" />
                </SelectTrigger>
                <SelectContent>
                  {eligiblePlayers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pot-amount">Pot amount</Label>
              <Input
                id="pot-amount"
                type="number"
                min={0}
                value={potAmount}
                onChange={(e) => setPotAmount(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hand-name">Winning hand (optional)</Label>
              <Input
                id="hand-name"
                value={handName}
                onChange={(e) => setHandName(e.target.value)}
                placeholder={suggestion?.name ?? "e.g. Full House, Kings over Queens"}
              />
            </div>
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={submitting || !winnerId}
            className="w-full bg-gold text-gold-foreground hover:bg-gold/80 sm:w-auto"
          >
            <Trophy className="size-4" />
            Award Pot
          </Button>
        </form>

        {suggestion && !settled && (
          <p className="text-xs text-muted-foreground">
            Suggestion: {winner?.display_name} currently has <span className="text-foreground">{suggestion.name}</span>
            {suggestion.reason && (
              <>
                {" "}
                — matches “{suggestion.reason}” (+{suggestion.amount} XP)
              </>
            )}
          </p>
        )}

        {settled && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gold/30 bg-gold/5 p-3">
            <span className="text-sm">
              Pot awarded to <strong>{settled.winnerName}</strong>. Quick XP:
            </span>
            <Button type="button" size="sm" variant="outline" onClick={() => awardFollowUpXp(10, "Win a hand")}>
              +10 XP — Win a hand
            </Button>
            {settled.suggestedReason && settled.suggestedAmount != null && settled.suggestedReason !== "Win a hand" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => awardFollowUpXp(settled.suggestedAmount!, settled.suggestedReason!)}
              >
                +{settled.suggestedAmount} XP — {settled.suggestedReason}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
