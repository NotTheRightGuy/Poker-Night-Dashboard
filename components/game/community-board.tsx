"use client";

import { useGame } from "@/lib/game/provider";
import { useCommunityCardsForCurrentHand, useCurrentHand } from "@/lib/game/selectors";
import { PlayingCard, EmptyCardSlot } from "./playing-card";
import { SectionHeading } from "./section-heading";

const PHASE_LABEL: Record<string, string> = {
  preflop: "Pre-Flop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
  showdown: "Showdown",
};

export function CommunityBoard() {
  const { game } = useGame();
  const currentHand = useCurrentHand();
  const communityCards = useCommunityCardsForCurrentHand();

  if (!game) return null;

  const cards = communityCards.map((c) => c.card);
  const slots = [0, 1, 2, 3, 4];

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <SectionHeading eyebrow={`Hand #${game.current_hand_number}`} title={PHASE_LABEL[game.current_phase] ?? game.current_phase} />
      <div className="mt-5 flex justify-center gap-2 sm:gap-3">
        {slots.map((i) =>
          cards[i] ? (
            <PlayingCard key={i} card={cards[i]} size="lg" animateIn className="sm:hidden" />
          ) : (
            <EmptyCardSlot key={i} size="lg" className="sm:hidden" />
          ),
        )}
        {slots.map((i) =>
          cards[i] ? (
            <PlayingCard key={`xl-${i}`} card={cards[i]} size="xl" animateIn className="hidden sm:flex" />
          ) : (
            <EmptyCardSlot key={`xl-${i}`} size="xl" className="hidden sm:block" />
          ),
        )}
      </div>
      {currentHand?.pot_total ? (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Pot: <span className="font-mono font-semibold text-gold">{currentHand.pot_total.toLocaleString()}</span> chips
        </p>
      ) : null}
    </div>
  );
}
