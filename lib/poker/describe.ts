// Plain-language guidance for first-time poker players (§25). Deliberately
// stays descriptive, not strategic — this teaches what hand you have, not
// how to bet it.

import { cardRankLabel, cardSuitSymbol, rankName, rankNamePlural } from "./cards";
import { HandEvaluation } from "./evaluator";

function listCards(evaluation: HandEvaluation): string {
  return evaluation.bestFive.map((c) => `${cardRankLabel(c.rank)}${cardSuitSymbol(c)}`).join(" ");
}

export function explainHand(evaluation: HandEvaluation): string {
  const t = evaluation.tiebreak;
  switch (evaluation.category) {
    case "royal_flush":
      return `You have the best possible hand in poker — a Royal Flush: ${listCards(evaluation)}.`;
    case "straight_flush":
      return `You have a Straight Flush: five cards in a row, all the same suit, topped by your ${rankName(t[0])}.`;
    case "four_of_a_kind":
      return `You have Four of a Kind: all four ${rankNamePlural(t[0])}.`;
    case "full_house":
      return `You have a Full House: three ${rankNamePlural(t[0])} plus a pair of ${rankNamePlural(t[1])}.`;
    case "flush":
      return `You have a Flush: five cards of the same suit, topped by your ${rankName(t[0])}.`;
    case "straight":
      return `You have a Straight: five cards in a row, topped by your ${rankName(t[0])}.`;
    case "three_of_a_kind":
      return `You have Three of a Kind: three ${rankNamePlural(t[0])}.`;
    case "two_pair":
      return `You currently have two pairs: ${rankNamePlural(t[0])} and ${rankNamePlural(t[1])}.`;
    case "pair":
      return `You currently have a pair of ${rankNamePlural(t[0])}.`;
    case "high_card":
      return `You don't have a pair yet — your best card is the ${rankName(t[0])} high.`;
  }
}
