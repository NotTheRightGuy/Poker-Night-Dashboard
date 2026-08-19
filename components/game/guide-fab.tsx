"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HAND_RANKINGS } from "@/lib/game/xpRules";

// A floating shortcut to the hand-ranking cheat sheet — the guide is the one
// reference people actually reach for mid-hand, so it shouldn't require
// leaving the current page to check. Full /guide (Hold'em basics, power-ups,
// chaos cards, XP table) is one tap further for anyone who wants the rest.
export function GuideFab() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            size="icon-lg"
            aria-label="Poker hand rankings"
            className="fixed right-4 bottom-20 z-40 size-14 rounded-full bg-gold text-gold-foreground shadow-lg hover:bg-gold/80 md:bottom-6"
          />
        }
      >
        <BookOpen className="size-6" />
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Hand Rankings</DialogTitle>
        </DialogHeader>
        <ol className="space-y-1.5">
          {HAND_RANKINGS.map((hand, i) => (
            <li key={hand.name} className="flex items-start gap-2.5 rounded-lg border border-border p-2">
              <span className="w-4 shrink-0 pt-0.5 text-center font-mono text-xs text-muted-foreground">{i + 1}</span>
              <div>
                <p className="text-sm font-semibold text-foreground">{hand.name}</p>
                <p className="text-xs text-muted-foreground">{hand.explanation}</p>
              </div>
            </li>
          ))}
        </ol>
        <Link href="/guide" className="block text-center text-sm text-gold hover:underline">
          Full guide (rules, power-ups, chaos cards, XP) →
        </Link>
      </DialogContent>
    </Dialog>
  );
}
