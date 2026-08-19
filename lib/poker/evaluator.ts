// Deterministic 7-card poker hand evaluator. No external poker library, no
// LLM involvement — plain brute-force scan of the C(7,5)=21 five-card
// combinations available from 2 hole cards + up to 5 community cards. At the
// scale of a single office poker night (a handful of showdowns total),
// brute force is trivial to run, and — more importantly for a "must be
// deterministic" requirement — trivial to read, trace, and exhaustively test.

import { Card, parseCards, rankName, rankNamePlural } from "./cards";

export type HandCategory =
  | "high_card"
  | "pair"
  | "two_pair"
  | "three_of_a_kind"
  | "straight"
  | "flush"
  | "full_house"
  | "four_of_a_kind"
  | "straight_flush"
  | "royal_flush";

export interface HandEvaluation {
  category: HandCategory;
  categoryRank: number; // 0-8 (royal_flush shares rank 8 with straight_flush — it's the top of that category, not a separate one)
  score: number; // comparable integer; higher always wins, exact ties compare equal
  name: string; // e.g. "Full House, Kings over Queens"
  tiebreak: number[];
  bestFive: Card[]; // the 5 cards making up the best hand — i.e. what's "contributing"
}

const BASE = 15; // ranks run 2-14 (wheel straights score their high card as 5), safely under BASE

function encodeScore(categoryRank: number, tiebreak: number[]): number {
  const t = [tiebreak[0] ?? 0, tiebreak[1] ?? 0, tiebreak[2] ?? 0, tiebreak[3] ?? 0, tiebreak[4] ?? 0];
  let score = categoryRank;
  for (const v of t) score = score * BASE + v;
  return score;
}

function combinationsOf5<T>(arr: T[]): T[][] {
  const result: T[][] = [];
  const combo: T[] = [];
  function backtrack(start: number) {
    if (combo.length === 5) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      backtrack(i + 1);
      combo.pop();
    }
  }
  backtrack(0);
  return result;
}

interface RawScore {
  categoryRank: number;
  isRoyal: boolean;
  tiebreak: number[];
}

function scoreFiveCards(cards: Card[]): RawScore {
  const ranksDesc = cards.map((c) => c.rank).sort((a, b) => b - a);
  const isFlush = cards.every((c) => c.suit === cards[0].suit);

  const counts = new Map<number, number>();
  for (const r of ranksDesc) counts.set(r, (counts.get(r) ?? 0) + 1);
  // Groups sorted by (count desc, rank desc) — e.g. for a full house KKKQQ this
  // is [[13,3],[12,2]]; for two pair AAKK7 it's [[14,2],[13,2],[7,1]].
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);

  // Straight detection, including the wheel (A-2-3-4-5, ace counts low and
  // the straight's high card is 5, never 14). A straight requires 5 distinct
  // ranks — impossible if any group has count > 1.
  let straightHigh: number | null = null;
  const distinctRanks = [...new Set(ranksDesc)];
  if (distinctRanks.length === 5) {
    const asc = [...distinctRanks].sort((a, b) => a - b);
    if (asc[0] === 2 && asc[1] === 3 && asc[2] === 4 && asc[3] === 5 && asc[4] === 14) {
      straightHigh = 5;
    } else if (asc[4] - asc[0] === 4) {
      straightHigh = asc[4];
    }
  }
  const isStraight = straightHigh !== null;

  // A valid 5-card hand from a standard deck can never combine two of these
  // categories (e.g. four-of-a-kind's 4 same-rank cards already span all 4
  // suits, so it can never also be a flush) — these checks are mutually
  // exclusive in practice, ordered strongest-shape-first.
  if (isStraight && isFlush) {
    return { categoryRank: 8, isRoyal: straightHigh === 14, tiebreak: [straightHigh!] };
  }
  if (groups[0][1] === 4) {
    const kicker = groups[1][0];
    return { categoryRank: 7, isRoyal: false, tiebreak: [groups[0][0], kicker] };
  }
  if (groups[0][1] === 3 && groups[1]?.[1] === 2) {
    return { categoryRank: 6, isRoyal: false, tiebreak: [groups[0][0], groups[1][0]] };
  }
  if (isFlush) {
    return { categoryRank: 5, isRoyal: false, tiebreak: ranksDesc };
  }
  if (isStraight) {
    return { categoryRank: 4, isRoyal: false, tiebreak: [straightHigh!] };
  }
  if (groups[0][1] === 3) {
    const kickers = groups.slice(1).map((g) => g[0]).sort((a, b) => b - a).slice(0, 2);
    return { categoryRank: 3, isRoyal: false, tiebreak: [groups[0][0], ...kickers] };
  }
  if (groups[0][1] === 2 && groups[1]?.[1] === 2) {
    const pairs = [groups[0][0], groups[1][0]].sort((a, b) => b - a);
    const kicker = groups[2][0];
    return { categoryRank: 2, isRoyal: false, tiebreak: [pairs[0], pairs[1], kicker] };
  }
  if (groups[0][1] === 2) {
    const kickers = groups.slice(1).map((g) => g[0]).sort((a, b) => b - a).slice(0, 3);
    return { categoryRank: 1, isRoyal: false, tiebreak: [groups[0][0], ...kickers] };
  }
  return { categoryRank: 0, isRoyal: false, tiebreak: ranksDesc };
}

const CATEGORY_BY_RANK: HandCategory[] = [
  "high_card",
  "pair",
  "two_pair",
  "three_of_a_kind",
  "straight",
  "flush",
  "full_house",
  "four_of_a_kind",
  "straight_flush",
];

function buildName(category: HandCategory, tiebreak: number[]): string {
  switch (category) {
    case "royal_flush":
      return "Royal Flush";
    case "straight_flush":
      return `Straight Flush, ${rankName(tiebreak[0])}-High`;
    case "four_of_a_kind":
      return `Four of a Kind, ${rankNamePlural(tiebreak[0])}`;
    case "full_house":
      return `Full House, ${rankNamePlural(tiebreak[0])} over ${rankNamePlural(tiebreak[1])}`;
    case "flush":
      return `Flush, ${rankName(tiebreak[0])}-High`;
    case "straight":
      return `${rankName(tiebreak[0])}-High Straight`;
    case "three_of_a_kind":
      return `Three of a Kind, ${rankNamePlural(tiebreak[0])}`;
    case "two_pair":
      return `Two Pair, ${rankNamePlural(tiebreak[0])} and ${rankNamePlural(tiebreak[1])}`;
    case "pair":
      return `Pair of ${rankNamePlural(tiebreak[0])}`;
    case "high_card":
      return `High Card, ${rankName(tiebreak[0])}`;
  }
}

/**
 * Evaluates the best possible 5-card poker hand from 2 hole cards plus
 * however many community cards are on the board (0-5). Requires at least 5
 * cards total. Deterministic — same input always yields the same output.
 */
export function evaluateHand(holeCardStrings: string[], communityCardStrings: string[]): HandEvaluation {
  const holeCards = parseCards(holeCardStrings);
  const communityCards = parseCards(communityCardStrings);
  const all = [...holeCards, ...communityCards];

  if (all.length < 5) {
    throw new Error("at least 5 cards (hole + community) are required to evaluate a hand");
  }

  let bestScore = -1;
  let bestCombo: Card[] = [];
  let bestRaw: RawScore | null = null;

  for (const combo of combinationsOf5(all)) {
    const raw = scoreFiveCards(combo);
    const score = encodeScore(raw.categoryRank, raw.tiebreak);
    if (score > bestScore) {
      bestScore = score;
      bestCombo = combo;
      bestRaw = raw;
    }
  }

  const category: HandCategory =
    bestRaw!.categoryRank === 8 && bestRaw!.isRoyal ? "royal_flush" : CATEGORY_BY_RANK[bestRaw!.categoryRank];

  return {
    category,
    categoryRank: bestRaw!.categoryRank,
    score: bestScore,
    name: buildName(category, bestRaw!.tiebreak),
    tiebreak: bestRaw!.tiebreak,
    bestFive: bestCombo,
  };
}

/** Compares two evaluations; positive if `a` wins, negative if `b` wins, 0 on an exact tie. */
export function compareHands(a: HandEvaluation, b: HandEvaluation): number {
  return a.score - b.score;
}
