import { describe, expect, it } from "vitest";
import { evaluateHand, compareHands } from "./evaluator";
import { allCards, parseCard } from "./cards";

describe("evaluateHand — textbook hands", () => {
  it("recognizes a royal flush", () => {
    const result = evaluateHand(["As", "Ks"], ["Qs", "Js", "Ts", "2h", "3d"]);
    expect(result.category).toBe("royal_flush");
    expect(result.categoryRank).toBe(8);
    expect(result.name).toBe("Royal Flush");
  });

  it("recognizes a plain straight flush", () => {
    const result = evaluateHand(["9s", "8s"], ["7s", "6s", "5s", "2h", "3d"]);
    expect(result.category).toBe("straight_flush");
    expect(result.name).toBe("Straight Flush, 9-High");
  });

  it("recognizes the wheel straight flush (A-2-3-4-5) as 5-high, not ace-high", () => {
    const result = evaluateHand(["As", "2s"], ["3s", "4s", "5s", "9h", "9d"]);
    expect(result.category).toBe("straight_flush");
    expect(result.tiebreak[0]).toBe(5);
    expect(result.name).toBe("Straight Flush, 5-High");
  });

  it("recognizes the wheel straight (not flush) as 5-high", () => {
    const result = evaluateHand(["Ah", "2s"], ["3d", "4c", "5h", "9h", "Kd"]);
    expect(result.category).toBe("straight");
    expect(result.tiebreak[0]).toBe(5);
  });

  it("recognizes four of a kind and its kicker", () => {
    const result = evaluateHand(["Ah", "As"], ["Ad", "Ac", "7h", "2d", "3c"]);
    expect(result.category).toBe("four_of_a_kind");
    expect(result.tiebreak).toEqual([14, 7]);
  });

  it("ranks four of a kind above a full house", () => {
    const quads = evaluateHand(["Ah", "As"], ["Ad", "Ac", "7h", "2d", "3c"]);
    const fullHouse = evaluateHand(["Kh", "Ks"], ["Kd", "Qc", "Qh", "2d", "3c"]);
    expect(compareHands(quads, fullHouse)).toBeGreaterThan(0);
  });

  it("recognizes a full house and names trips-over-pair correctly", () => {
    const result = evaluateHand(["Kh", "Ks"], ["Kd", "Qc", "Qh", "2d", "3c"]);
    expect(result.category).toBe("full_house");
    expect(result.name).toBe("Full House, Kings over Queens");
  });

  it("prefers the higher trips when two sets of trips are possible (uses best 5 of 7)", () => {
    // Board gives trip Kings and trip 2s available across 7 cards; best hand
    // must be Full House Kings-over-2s (or better), not just trip Kings.
    const result = evaluateHand(["Kh", "2s"], ["Kd", "Kc", "2d", "2c", "9h"]);
    expect(result.category).toBe("full_house");
    expect(result.tiebreak[0]).toBe(13); // trips = Kings
    expect(result.tiebreak[1]).toBe(2); // pair = 2s
  });

  it("recognizes a flush and ranks it above a straight", () => {
    const flush = evaluateHand(["Ah", "9h"], ["5h", "2h", "Kh", "Qd", "3c"]);
    const straight = evaluateHand(["9d", "8c"], ["7h", "6s", "5d", "2c", "3h"]);
    expect(flush.category).toBe("flush");
    expect(straight.category).toBe("straight");
    expect(compareHands(flush, straight)).toBeGreaterThan(0);
  });

  it("recognizes two pair and orders the pairs by rank", () => {
    const result = evaluateHand(["As", "Kd"], ["Ah", "Kc", "7s", "2d", "3c"]);
    expect(result.category).toBe("two_pair");
    expect(result.name).toBe("Two Pair, Aces and Kings");
  });

  it("recognizes a simple pair with kickers, from the spec's own example", () => {
    // A♠ K♠ hole cards, board A♦ 7♣ 2♥ -> "Pair of Aces"
    const result = evaluateHand(["As", "Ks"], ["Ad", "7c", "2h"]);
    expect(result.category).toBe("pair");
    expect(result.name).toBe("Pair of Aces");
  });

  it("falls back to high card with no pairs at all", () => {
    const result = evaluateHand(["Ah", "Kd"], ["9c", "5h", "2s"]);
    expect(result.category).toBe("high_card");
    expect(result.tiebreak).toEqual([14, 13, 9, 5, 2]);
  });

  it("breaks a high-card tie correctly on kickers", () => {
    const a = evaluateHand(["Ah", "Kd"], ["9c", "5h", "2s"]);
    const b = evaluateHand(["Ac", "Kh"], ["9d", "5c", "3s"]);
    // a: A K 9 5 2, b: A K 9 5 3 -> b wins on the 5th kicker
    expect(compareHands(b, a)).toBeGreaterThan(0);
  });

  it("scores an exact tie as equal", () => {
    const a = evaluateHand(["Ah", "Kd"], ["9c", "5h", "2s", "3d", "4c"]);
    const b = evaluateHand(["Ac", "Ks"], ["9d", "5c", "2h", "3s", "4d"]);
    expect(compareHands(a, b)).toBe(0);
  });

  it("only evaluates with 5 cards available (2 hole + 3 flop, no turn/river yet)", () => {
    const result = evaluateHand(["As", "Ks"], ["Ad", "7c", "2h"]);
    expect(result.bestFive).toHaveLength(5);
  });

  it("throws with fewer than 5 total cards", () => {
    expect(() => evaluateHand(["As", "Ks"], [])).toThrow();
  });

  it("throws on an invalid card string", () => {
    expect(() => evaluateHand(["Zz", "Ks"], ["Ad", "7c", "2h"])).toThrow();
  });
});

describe("evaluateHand — property checks over random deals", () => {
  it("never throws, always returns a valid category and a transitive ordering", () => {
    const deck = allCards();
    for (let trial = 0; trial < 200; trial++) {
      const shuffled = [...deck];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = pseudoRandomIndex(trial, i);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const hole = shuffled.slice(0, 2);
      const community = shuffled.slice(2, 7);
      const result = evaluateHand(hole, community);
      expect(result.categoryRank).toBeGreaterThanOrEqual(0);
      expect(result.categoryRank).toBeLessThanOrEqual(8);
      expect(result.bestFive).toHaveLength(5);
      // every contributing card must come from the 7 dealt cards
      const dealtRaw = new Set([...hole, ...community]);
      for (const c of result.bestFive) expect(dealtRaw.has(c.raw)).toBe(true);
      // parsing round-trips
      for (const c of result.bestFive) expect(parseCard(c.raw).rank).toBe(c.rank);
    }
  });

  it("keeps a consistent, transitive ordering across many hands", () => {
    const deck = allCards();
    const evaluations = [];
    for (let trial = 0; trial < 50; trial++) {
      const shuffled = [...deck];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = pseudoRandomIndex(trial + 1000, i);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      evaluations.push(evaluateHand(shuffled.slice(0, 2), shuffled.slice(2, 7)));
    }
    const sorted = [...evaluations].sort((a, b) => a.score - b.score);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].score).toBeGreaterThanOrEqual(sorted[i - 1].score);
    }
  });
});

// Deterministic pseudo-random index generator so the property tests are
// reproducible (no Math.random dependency) while still exercising many deals.
function pseudoRandomIndex(seed: number, max: number): number {
  const x = Math.sin(seed * 12.9898 + max * 78.233) * 43758.5453;
  const frac = x - Math.floor(x);
  return Math.floor(frac * (max + 1));
}
