"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CardPicker } from "@/components/game/card-picker";
import { PlayerAvatar } from "@/components/game/player-avatar";
import { SectionHeading } from "@/components/game/section-heading";
import { useGame } from "@/lib/game/provider";
import { useCurrentHand } from "@/lib/game/selectors";
import { clearHoleCards, dealHoleCards } from "@/lib/game/actions";
import { createClient } from "@/lib/supabase/client";

// Players enter their own hole cards from the public app now (see
// components/game/my-hand-panel.tsx) — this panel is the host-side fallback:
// use it to check what everyone has, or to fix/enter a hand on someone's
// behalf if they can't do it themselves (dead phone, needs help, etc). RLS
// grants an authenticated host session every player's hole cards, so
// `useGame().holeCards` already contains everything needed here.
export function HoleCardManager() {
  const supabase = useMemo(() => createClient(), []);
  const { players, holeCards, communityCards } = useGame();
  const currentHand = useCurrentHand();

  if (!currentHand) {
    return (
      <Card>
        <CardHeader>
          <SectionHeading eyebrow="Cards — host override" title="Hole Cards" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hand in progress yet.</p>
        </CardContent>
      </Card>
    );
  }

  const handId = currentHand.id;
  const handHoleCards = holeCards.filter((c) => c.hand_id === handId);
  const handCommunityCards = communityCards.filter((c) => c.hand_id === handId).map((c) => c.card);
  const activePlayers = players.filter((p) => p.status !== "eliminated");

  async function handleDeal(playerId: string, cards: string[]) {
    if (cards.length !== 2) return;
    try {
      await dealHoleCards(supabase, handId, playerId, [cards[0], cards[1]]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to deal hole cards");
    }
  }

  async function handleClear(playerId: string) {
    try {
      await clearHoleCards(supabase, handId, playerId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clear hole cards");
    }
  }

  return (
    <Card>
      <CardHeader>
        <SectionHeading eyebrow="Cards — host override" title={`Hole Cards — Hand #${currentHand.hand_number}`} />
        <p className="text-xs text-muted-foreground">
          Players enter their own cards from their phone. Use this only to check what everyone has, or to enter/fix a
          hand for someone who can&apos;t do it themselves.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {activePlayers.length === 0 && <p className="text-sm text-muted-foreground">No players to deal to yet.</p>}
        {activePlayers.map((player) => {
          const myCards = handHoleCards
            .filter((c) => c.player_id === player.id)
            .sort((a, b) => a.card_index - b.card_index)
            .map((c) => c.card);
          const otherCards = handHoleCards.filter((c) => c.player_id !== player.id).map((c) => c.card);
          const usedCards = new Set([...handCommunityCards, ...otherCards]);

          return (
            <div key={player.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-2.5">
              <PlayerAvatar name={player.display_name} size="sm" />
              <span className="min-w-24 flex-1 text-sm font-medium">{player.display_name}</span>
              <CardPicker
                label={`${player.display_name}'s hole cards`}
                max={2}
                value={myCards}
                usedCards={usedCards}
                onChange={(cards) => handleDeal(player.id, cards)}
              />
              {myCards.length > 0 && (
                <Button type="button" size="xs" variant="ghost" onClick={() => handleClear(player.id)}>
                  <X className="size-3" />
                  Clear
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
