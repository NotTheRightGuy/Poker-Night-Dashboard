"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { explainHand } from "@/lib/poker/describe";
import {
  useCommunityCardsForCurrentHand,
  useCurrentHand,
  useMyHandEvaluation,
  useMyHoleCardsForCurrentHand,
  useMyPlayer,
} from "@/lib/game/selectors";
import { clearMyHoleCards, submitMyHoleCards } from "@/lib/game/actions";
import { createClient } from "@/lib/supabase/client";
import { PlayingCard, EmptyCardSlot } from "./playing-card";
import { CardPicker } from "./card-picker";
import { SectionHeading } from "./section-heading";
import { Button } from "@/components/ui/button";

export function MyHandPanel() {
  const supabase = useMemo(() => createClient(), []);
  const myPlayer = useMyPlayer();
  const currentHand = useCurrentHand();
  const holeCards = useMyHoleCardsForCurrentHand();
  const communityCards = useCommunityCardsForCurrentHand();
  const evaluation = useMyHandEvaluation();

  if (!myPlayer) return null;

  const usedCards = new Set(communityCards.map((c) => c.card));

  async function handleSubmit(cards: string[]) {
    if (!currentHand || cards.length !== 2) return;
    try {
      await submitMyHoleCards(supabase, currentHand.id, [cards[0], cards[1]]);
      toast.success("Your cards are in");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save your cards");
    }
  }

  async function handleClear() {
    if (!currentHand) return;
    try {
      await clearMyHoleCards(supabase, currentHand.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't clear your cards");
    }
  }

  return (
    <div className="rounded-2xl border border-gold/30 bg-card p-6 felt-panel">
      <SectionHeading eyebrow="Private — only you can see this" title="Your Hand" />

      <div className="mt-4 flex justify-center gap-2">
        {holeCards.length > 0 ? (
          holeCards.map((card) => (
            <PlayingCard
              key={card}
              card={card}
              size="lg"
              highlighted={evaluation?.bestFive.some((c) => c.raw === card)}
            />
          ))
        ) : (
          <>
            <EmptyCardSlot size="lg" />
            <EmptyCardSlot size="lg" />
          </>
        )}
      </div>

      {!currentHand && (
        <p className="mt-4 text-center text-sm text-muted-foreground">Waiting for the next hand to start.</p>
      )}

      {currentHand && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <p className="text-center text-sm text-muted-foreground">
            {holeCards.length === 0
              ? "Look at your physical cards and enter them here — only you can see this."
              : "Made a mistake? Fix your cards below."}
          </p>
          <div className="flex items-center gap-2">
            <CardPicker
              label="your hole cards"
              max={2}
              value={holeCards}
              usedCards={usedCards}
              onChange={handleSubmit}
              showPreview={false}
              triggerLabel={holeCards.length === 0 ? "Enter Your Cards" : "Edit Your Cards"}
            />
            {holeCards.length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
                <X className="size-3.5" />
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {holeCards.length > 0 && !evaluation && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Waiting for the flop to see your current hand.
        </p>
      )}

      {evaluation && (
        <div className="mt-5 space-y-2 text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Current Hand</p>
          <p className="font-heading text-2xl tracking-wide text-cream">{evaluation.name}</p>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">{explainHand(evaluation)}</p>
        </div>
      )}
    </div>
  );
}
