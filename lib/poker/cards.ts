// Card string format used everywhere in this app: a rank character
// [2-9TJQKA] followed by a suit character [shdc], e.g. "As", "Td", "9h".
// This mirrors the CHECK constraints on community_cards.card and
// player_hole_cards.card in the database.

export type Suit = "s" | "h" | "d" | "c";

export interface Card {
  rank: number; // 2-14, ace is 14 (high) — straight detection special-cases the wheel (A-2-3-4-5)
  suit: Suit;
  raw: string;
}

const RANK_CHARS = "23456789TJQKA";
const SUITS: Suit[] = ["s", "h", "d", "c"];
const SUIT_SYMBOLS: Record<Suit, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };
const RANK_NAMES: Record<number, string> = {
  2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", 10: "10",
  11: "Jack", 12: "Queen", 13: "King", 14: "Ace",
};
const RANK_NAMES_PLURAL: Record<number, string> = {
  2: "2s", 3: "3s", 4: "4s", 5: "5s", 6: "6s", 7: "7s", 8: "8s", 9: "9s", 10: "10s",
  11: "Jacks", 12: "Queens", 13: "Kings", 14: "Aces",
};

export const CARD_REGEX = /^([2-9TJQKA])([shdc])$/;

export function parseCard(raw: string): Card {
  const match = CARD_REGEX.exec(raw);
  if (!match) {
    throw new Error(`Invalid card string: "${raw}"`);
  }
  const [, rankChar, suitChar] = match;
  const rank = RANK_CHARS.indexOf(rankChar) + 2;
  return { rank, suit: suitChar as Suit, raw };
}

export function parseCards(raws: string[]): Card[] {
  return raws.map(parseCard);
}

export function allCards(): string[] {
  const out: string[] = [];
  for (const r of RANK_CHARS) {
    for (const s of SUITS) out.push(`${r}${s}`);
  }
  return out;
}

export function cardSuitSymbol(card: Card | string): string {
  const suit = typeof card === "string" ? parseCard(card).suit : card.suit;
  return SUIT_SYMBOLS[suit];
}

export function cardRankLabel(rank: number): string {
  return rank === 10 ? "10" : RANK_CHARS[rank - 2];
}

export function rankName(rank: number): string {
  return RANK_NAMES[rank] ?? String(rank);
}

export function rankNamePlural(rank: number): string {
  return RANK_NAMES_PLURAL[rank] ?? `${rank}s`;
}

export function isRedSuit(suit: Suit): boolean {
  return suit === "h" || suit === "d";
}
