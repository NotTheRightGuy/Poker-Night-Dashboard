"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { allCards, cardRankLabel, cardSuitSymbol, isRedSuit, parseCard } from "@/lib/poker/cards";
import { PlayingCard, EmptyCardSlot } from "./playing-card";
import { cn } from "@/lib/utils";

const SUIT_ORDER = ["s", "h", "d", "c"] as const;

interface CardPickerProps {
  label: string;
  max: number;
  value: string[];
  usedCards: Set<string>; // cards already in play elsewhere this hand — disabled
  onChange: (cards: string[]) => void;
  disabled?: boolean;
  /** Set false when the caller already renders its own (bigger) card display and only needs the trigger button. */
  showPreview?: boolean;
  triggerLabel?: string;
}

export function CardPicker({
  label,
  max,
  value,
  usedCards,
  onChange,
  disabled,
  showPreview = true,
  triggerLabel,
}: CardPickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(value);

  function toggle(card: string) {
    setDraft((prev) => {
      if (prev.includes(card)) return prev.filter((c) => c !== card);
      if (prev.length >= max) return [...prev.slice(1), card];
      return [...prev, card];
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(value);
      }}
    >
      <div className="flex items-center gap-2">
        {showPreview &&
          Array.from({ length: max }).map((_, i) =>
            value[i] ? <PlayingCard key={i} card={value[i]} size="sm" /> : <EmptyCardSlot key={i} size="sm" />,
          )}
        <DialogTrigger render={<Button type="button" variant="outline" size="sm" disabled={disabled} />}>
          {triggerLabel ?? `${value.length > 0 ? "Edit" : "Pick"} ${label}`}
        </DialogTrigger>
      </div>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Pick {label} ({draft.length}/{max})
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {SUIT_ORDER.map((suit) => (
            <div key={suit} className="flex flex-wrap gap-1">
              {allCards()
                .filter((c) => parseCard(c).suit === suit)
                .map((c) => {
                  const parsed = parseCard(c);
                  const used = usedCards.has(c) && !draft.includes(c);
                  const selected = draft.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      disabled={used}
                      onClick={() => toggle(c)}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-md border font-mono text-xs font-semibold transition",
                        isRedSuit(parsed.suit) ? "text-suit-red" : "text-ink",
                        "bg-cream",
                        selected && "ring-2 ring-gold",
                        used && "cursor-not-allowed opacity-20",
                        !used && !selected && "hover:ring-1 hover:ring-gold/50",
                      )}
                      title={c}
                    >
                      {cardRankLabel(parsed.rank)}
                      {cardSuitSymbol(parsed)}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={draft.length !== max}
            onClick={() => {
              onChange(draft);
              setOpen(false);
            }}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
