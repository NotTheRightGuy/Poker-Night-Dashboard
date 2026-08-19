// The §13 "Poker XP" table. This never changes during an event, so it's a
// static constant rather than a database table — it only ever feeds the
// /guide page and the host's "Award XP" quick-pick buttons (which call
// award_xp() with the matching reason/amount/source).

export interface XpRule {
  reason: string;
  amount: number;
}

export const POKER_XP_RULES: XpRule[] = [
  { reason: "Win a hand", amount: 10 },
  { reason: "Win a hand with a bluff", amount: 25 },
  { reason: "Win an all-in", amount: 20 },
  { reason: "Successfully call a bluff", amount: 25 },
  { reason: "Eliminate another player", amount: 30 },
  { reason: "Win with pair of 2s or lower", amount: 20 },
  { reason: "Win with a straight", amount: 15 },
  { reason: "Win with a flush", amount: 20 },
  { reason: "Win with a full house", amount: 30 },
  { reason: "Win with four of a kind", amount: 50 },
  { reason: "Royal flush", amount: 100 },
  { reason: "Survive an all-in while under 25% starting chips", amount: 40 },
  { reason: "Comeback from last place to Top 3", amount: 50 },
  { reason: "Win mini-game / side quest", amount: 30 },
  { reason: "Successfully use a Power-Up", amount: 10 },
  { reason: "Cause a Chaos Card to trigger", amount: 10 },
];

export const HOST_ACHIEVEMENT_XP_RANGE = { min: 20, max: 50 } as const;

export interface PowerupInfo {
  code: "PEEK" | "SWAP" | "SHIELD";
  name: string;
  description: string;
}

export const POWERUPS: PowerupInfo[] = [
  {
    code: "PEEK",
    name: "Peek",
    description:
      "Privately look at one random card from the top of the deck before the next community card is dealt. The card is returned and the deck is reshuffled.",
  },
  {
    code: "SWAP",
    name: "Swap",
    description: "Discard one hole card and receive one random replacement. Only available before the flop.",
  },
  {
    code: "SHIELD",
    name: "Shield",
    description:
      "If you lose the current hand, recover 50% of the chips you personally put into the pot during that hand. Must be declared before showdown.",
  },
];

export interface ChaosCardInfo {
  code: "BULL_MARKET" | "MARKET_CRASH" | "SILENT_ROUND";
  name: string;
  description: string;
}

export const CHAOS_CARDS: ChaosCardInfo[] = [
  { code: "BULL_MARKET", name: "Bull Market", description: "Everyone receives +50 chips before the next hand." },
  {
    code: "MARKET_CRASH",
    name: "Market Crash",
    description: "Everyone pays 25 chips into the central pot before the next hand.",
  },
  {
    code: "SILENT_ROUND",
    name: "Silent Round",
    description: "Nobody may speak during the next hand. Talking results in a 10-chip penalty.",
  },
];

export const HAND_RANKINGS: { name: string; example: string[]; explanation: string }[] = [
  { name: "Royal Flush", example: ["As", "Ks", "Qs", "Js", "Ts"], explanation: "The top five cards of one suit, in order." },
  { name: "Straight Flush", example: ["9h", "8h", "7h", "6h", "5h"], explanation: "Five cards in a row, all the same suit." },
  { name: "Four of a Kind", example: ["Ah", "As", "Ad", "Ac", "3c"], explanation: "All four cards of the same rank." },
  { name: "Full House", example: ["Kh", "Ks", "Kd", "Qc", "Qh"], explanation: "Three of a kind plus a separate pair." },
  { name: "Flush", example: ["Ah", "Th", "7h", "5h", "2h"], explanation: "Five cards of the same suit, any order." },
  { name: "Straight", example: ["9d", "8c", "7h", "6s", "5d"], explanation: "Five cards in a row, mixed suits." },
  { name: "Three of a Kind", example: ["7h", "7s", "7d", "Kc", "2h"], explanation: "Three cards of the same rank." },
  { name: "Two Pair", example: ["Ah", "As", "Kh", "Kd", "3c"], explanation: "Two separate pairs." },
  { name: "One Pair", example: ["Ah", "As", "Kd", "7c", "2h"], explanation: "Two cards of the same rank." },
  { name: "High Card", example: ["Ah", "Jd", "8s", "5c", "2h"], explanation: "No pair — ranked by the highest card." },
];
