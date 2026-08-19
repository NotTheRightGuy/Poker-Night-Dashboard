"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { RotateCcw, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CardPicker } from "@/components/game/card-picker";
import { SectionHeading } from "@/components/game/section-heading";
import { useGame } from "@/lib/game/provider";
import { useCurrentHand } from "@/lib/game/selectors";
import { dealCommunityCards, removeLastCommunityCard, resetBoard, setGamePhase } from "@/lib/game/actions";
import { createClient } from "@/lib/supabase/client";
import type { Street } from "@/lib/game/types";

// Flop/turn/river dealing. The `deal_community_cards` RPC enforces the
// flop=3/turn=1/river=1-in-order rule server-side, so the picker "disabled"
// states here are a guided UX on top of that, not the actual enforcement —
// any mistake still surfaces as a toast from the RPC's own error message.
// Dealing a street also advances games.current_phase to match it, so the
// host never has to separately remember to click a phase button too.
export function CommunityCardManager() {
  const supabase = useMemo(() => createClient(), []);
  const { game, holeCards, communityCards } = useGame();
  const currentHand = useCurrentHand();

  if (!currentHand) {
    return (
      <Card>
        <CardHeader>
          <SectionHeading eyebrow="Cards" title="Community Cards" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hand in progress — start the next hand to deal the board.</p>
        </CardContent>
      </Card>
    );
  }

  const handId = currentHand.id;
  const cardsForHand = communityCards.filter((c) => c.hand_id === handId);
  const flop = cardsForHand
    .filter((c) => c.street === "flop")
    .sort((a, b) => a.card_index - b.card_index)
    .map((c) => c.card);
  const turn = cardsForHand.filter((c) => c.street === "turn").map((c) => c.card);
  const river = cardsForHand.filter((c) => c.street === "river").map((c) => c.card);
  const holeCardsForHand = holeCards.filter((c) => c.hand_id === handId).map((c) => c.card);

  const flopDone = flop.length === 3;
  const turnDone = turn.length === 1;
  const riverDone = river.length === 1;
  const boardHasCards = flop.length > 0 || turn.length > 0 || river.length > 0;

  async function handleDeal(street: Street, cards: string[]) {
    try {
      await dealCommunityCards(supabase, handId, street, cards);
      if (game) await setGamePhase(supabase, game.id, street);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to deal the ${street}`);
    }
  }

  async function handleRemoveLast() {
    try {
      await removeLastCommunityCard(supabase, handId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove card");
    }
  }

  async function handleResetBoard() {
    if (!window.confirm("Reset the board? This removes all community cards for this hand.")) return;
    try {
      await resetBoard(supabase, handId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset board");
    }
  }

  return (
    <Card>
      <CardHeader>
        <SectionHeading
          eyebrow="Cards"
          title={`Community Cards — Hand #${currentHand.hand_number}`}
          action={
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={handleRemoveLast} disabled={!boardHasCards}>
                <Undo2 className="size-3.5" />
                Remove Last
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={handleResetBoard} disabled={!boardHasCards}>
                <RotateCcw className="size-3.5" />
                Reset Board
              </Button>
            </div>
          }
        />
      </CardHeader>
      <CardContent className="flex flex-wrap gap-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Flop</p>
          <CardPicker
            label="Flop"
            max={3}
            value={flop}
            usedCards={new Set([...holeCardsForHand, ...turn, ...river])}
            onChange={(cards) => handleDeal("flop", cards)}
            disabled={flopDone}
          />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Turn</p>
          <CardPicker
            label="Turn"
            max={1}
            value={turn}
            usedCards={new Set([...holeCardsForHand, ...flop, ...river])}
            onChange={(cards) => handleDeal("turn", cards)}
            disabled={turnDone || !flopDone}
          />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">River</p>
          <CardPicker
            label="River"
            max={1}
            value={river}
            usedCards={new Set([...holeCardsForHand, ...flop, ...turn])}
            onChange={(cards) => handleDeal("river", cards)}
            disabled={riverDone || !turnDone}
          />
        </div>
      </CardContent>
    </Card>
  );
}
