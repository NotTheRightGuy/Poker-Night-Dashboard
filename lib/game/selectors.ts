"use client";

import { useMemo } from "react";
import { evaluateHand, type HandEvaluation } from "@/lib/poker/evaluator";
import { useGame } from "./provider";
import type { Player } from "./types";

export interface RankedPlayer extends Player {
  chipRank: number;
  xpRank: number;
}

/** Players ranked by chips and by XP independently — chips and XP never mix. */
export function useRankedPlayers(): RankedPlayer[] {
  const { players } = useGame();
  return useMemo(() => {
    const byChips = [...players].sort((a, b) => b.chip_count - a.chip_count);
    const byXp = [...players].sort((a, b) => b.xp_total - a.xp_total);
    const chipRank = new Map(byChips.map((p, i) => [p.id, i + 1]));
    const xpRank = new Map(byXp.map((p, i) => [p.id, i + 1]));
    return players.map((p) => ({ ...p, chipRank: chipRank.get(p.id)!, xpRank: xpRank.get(p.id)! }));
  }, [players]);
}

export function useLeaderboard(sortBy: "chips" | "xp"): RankedPlayer[] {
  const ranked = useRankedPlayers();
  return useMemo(
    () => [...ranked].sort((a, b) => (sortBy === "chips" ? a.chipRank - b.chipRank : a.xpRank - b.xpRank)),
    [ranked, sortBy],
  );
}

export function useCurrentHand() {
  const { game, hands } = useGame();
  return useMemo(() => {
    if (!game) return null;
    return hands.find((h) => h.hand_number === game.current_hand_number) ?? null;
  }, [game, hands]);
}

export function useCommunityCardsForCurrentHand() {
  const currentHand = useCurrentHand();
  const { communityCards } = useGame();
  return useMemo(() => {
    if (!currentHand) return [];
    return communityCards.filter((c) => c.hand_id === currentHand.id).sort((a, b) => a.card_index - b.card_index);
  }, [communityCards, currentHand]);
}

export function useMyPlayer(): Player | null {
  const { players, myClaim } = useGame();
  return useMemo(() => {
    if (!myClaim) return null;
    return players.find((p) => p.id === myClaim.player_id) ?? null;
  }, [players, myClaim]);
}

export function useMyHoleCardsForCurrentHand(): string[] {
  const { holeCards } = useGame();
  const myPlayer = useMyPlayer();
  const currentHand = useCurrentHand();
  return useMemo(() => {
    if (!myPlayer || !currentHand) return [];
    return holeCards
      .filter((c) => c.hand_id === currentHand.id && c.player_id === myPlayer.id)
      .sort((a, b) => a.card_index - b.card_index)
      .map((c) => c.card);
  }, [holeCards, myPlayer, currentHand]);
}

/** null when there aren't yet at least 5 total cards (2 hole + community) to evaluate. */
export function useMyHandEvaluation(): HandEvaluation | null {
  const holeCards = useMyHoleCardsForCurrentHand();
  const communityCards = useCommunityCardsForCurrentHand();
  return useMemo(() => {
    if (holeCards.length !== 2 || communityCards.length < 3) return null;
    try {
      return evaluateHand(holeCards, communityCards.map((c) => c.card));
    } catch {
      return null;
    }
  }, [holeCards, communityCards]);
}

export function usePlayerPowerups(playerId: string) {
  const { playerPowerups } = useGame();
  return useMemo(() => playerPowerups.filter((p) => p.player_id === playerId), [playerPowerups, playerId]);
}

export function usePlayerAchievements(playerId: string) {
  const { playerAchievements } = useGame();
  return useMemo(() => playerAchievements.filter((p) => p.player_id === playerId), [playerAchievements, playerId]);
}

export function useActiveChaosEvent() {
  const { chaosEvents } = useGame();
  return useMemo(() => {
    const active = chaosEvents.filter((c) => !c.reverted_at).sort((a, b) => b.triggered_at.localeCompare(a.triggered_at));
    return active[0] ?? null;
  }, [chaosEvents]);
}
