import type { Database } from "./database.types";

export type {
  GameStatus,
  GamePhase,
  HandPhase,
  PlayerStatus,
  Street,
  ChipTransactionType,
  XpSource,
  PowerupStatus,
  PowerupCode,
  ChaosCode,
} from "./database.types";

type Tables = Database["public"]["Tables"];

export type Game = Tables["games"]["Row"];
export type Player = Tables["players"]["Row"];
export type PlayerClaim = Tables["player_claims"]["Row"];
export type Hand = Tables["hands"]["Row"];
export type CommunityCard = Tables["community_cards"]["Row"];
export type PlayerHoleCard = Tables["player_hole_cards"]["Row"];
export type ChipTransaction = Tables["chip_transactions"]["Row"];
export type XpTransaction = Tables["xp_transactions"]["Row"];
export type Powerup = Tables["powerups"]["Row"];
export type PlayerPowerup = Tables["player_powerups"]["Row"];
export type ChaosCard = Tables["chaos_cards"]["Row"];
export type ChaosEvent = Tables["chaos_events"]["Row"];
export type Achievement = Tables["achievements"]["Row"];
export type PlayerAchievement = Tables["player_achievements"]["Row"];
export type GameEvent = Tables["game_events"]["Row"];

export interface PlayerWithRank extends Player {
  chipRank: number;
  xpRank: number;
}
