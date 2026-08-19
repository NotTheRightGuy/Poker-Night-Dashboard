"use client";

import { explainHand } from "@/lib/poker/describe";
import { useMyHandEvaluation, useMyHoleCardsForCurrentHand, useMyPlayer } from "@/lib/game/selectors";
import { PlayingCard, EmptyCardSlot } from "./playing-card";
import { SectionHeading } from "./section-heading";

export function MyHandPanel() {
  const myPlayer = useMyPlayer();
  const holeCards = useMyHoleCardsForCurrentHand();
  const evaluation = useMyHandEvaluation();

  if (!myPlayer) return null;

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

      {holeCards.length === 0 && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Waiting for the host to deal your cards for this hand.
        </p>
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
