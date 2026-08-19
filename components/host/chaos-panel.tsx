"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SectionHeading } from "@/components/game/section-heading";
import { useGame } from "@/lib/game/provider";
import { useActiveChaosEvent, useCurrentHand } from "@/lib/game/selectors";
import { triggerChaosEvent } from "@/lib/game/actions";
import { createClient } from "@/lib/supabase/client";
import { CHAOS_CARDS } from "@/lib/game/xpRules";
import type { ChaosCode, Game } from "@/lib/game/types";

export function ChaosPanel({ game }: { game: Game }) {
  const supabase = useMemo(() => createClient(), []);
  const { chaosCards } = useGame();
  const currentHand = useCurrentHand();
  const activeEvent = useActiveChaosEvent();

  async function handleTrigger(code: ChaosCode) {
    try {
      await triggerChaosEvent(supabase, game.id, code, currentHand?.id);
      toast.success("Chaos card triggered");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to trigger chaos card");
    }
  }

  const activeCardName = activeEvent ? chaosCards.find((c) => c.code === activeEvent.chaos_code)?.name : null;

  return (
    <Card>
      <CardHeader>
        <SectionHeading eyebrow="Chaos" title="Chaos Cards" />
      </CardHeader>
      <CardContent className="space-y-3">
        {activeEvent && (
          <p className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-gold">
            Active: {activeCardName ?? activeEvent.chaos_code}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          {CHAOS_CARDS.map((card) => (
            <Button
              key={card.code}
              type="button"
              variant="outline"
              className="h-auto flex-col items-start gap-1 whitespace-normal p-3 text-left"
              onClick={() => handleTrigger(card.code)}
            >
              <span className="flex items-center gap-1.5 font-heading text-base tracking-wide">
                <Zap className="size-4 text-gold" />
                {card.name}
              </span>
              <span className="text-xs text-muted-foreground">{card.description}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
