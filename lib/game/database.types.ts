// Hand-written to mirror supabase/migrations/000{1,4}_*.sql exactly. Once a
// live Supabase project exists, this can be regenerated with
// `npx supabase gen types typescript` — keep the shape identical if so.
// Shape (Row/Insert/Update/Relationships per table, empty-mapped Views/Enums/
// CompositeTypes) matches what that generator itself emits, which is what
// @supabase/supabase-js's generic constraints expect structurally.

export type GameStatus = "not_started" | "registration" | "live" | "break" | "final_table" | "finished";
export type GamePhase = "preflop" | "flop" | "turn" | "river" | "showdown";
export type HandPhase = "preflop" | "flop" | "turn" | "river" | "showdown" | "complete";
export type PlayerStatus = "active" | "folded" | "all_in" | "eliminated" | "away";
export type Street = "flop" | "turn" | "river";
export type ChipTransactionType = "buy_in" | "pot_award" | "manual_adjustment" | "chaos_event" | "reversal";
export type XpSource = "poker_rule" | "host_achievement" | "host_manual" | "undo";
export type PowerupStatus = "available" | "used" | "locked";
export type PowerupCode = "PEEK" | "SWAP" | "SHIELD";
export type ChaosCode = "BULL_MARKET" | "MARKET_CRASH" | "SILENT_ROUND";

type HostProfileRow = {
  user_id: string;
  display_name: string;
  created_at: string;
}
type GameRow = {
  id: string;
  name: string;
  status: GameStatus;
  current_hand_number: number;
  current_phase: GamePhase;
  small_blind: number;
  big_blind: number;
  starting_chips: number;
  created_by: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}
type PlayerRow = {
  id: string;
  game_id: string;
  display_name: string;
  seat_number: number | null;
  status: PlayerStatus;
  starting_chips: number;
  chip_count: number;
  xp_total: number;
  hands_won: number;
  hands_played: number;
  eliminations: number;
  created_at: string;
}
type PlayerClaimRow = {
  id: string;
  game_id: string;
  player_id: string;
  user_id: string;
  claimed_at: string;
  released_at: string | null;
}
type HandRow = {
  id: string;
  game_id: string;
  hand_number: number;
  phase: HandPhase;
  pot_total: number;
  dealer_player_id: string | null;
  winner_player_id: string | null;
  winning_hand_name: string | null;
  winning_hand_score: number | null;
  notes: string | null;
  started_at: string;
  ended_at: string | null;
}
type CommunityCardRow = {
  id: string;
  hand_id: string;
  game_id: string;
  street: Street;
  card_index: number;
  card: string;
  created_at: string;
}
type PlayerHoleCardRow = {
  id: string;
  hand_id: string;
  game_id: string;
  player_id: string;
  card_index: number;
  card: string;
  created_at: string;
}
type ChipTransactionRow = {
  id: string;
  game_id: string;
  player_id: string;
  hand_id: string | null;
  action_id: string;
  type: ChipTransactionType;
  amount: number;
  reason: string | null;
  created_by: string | null;
  created_at: string;
  undone_at: string | null;
  reversed_by_transaction_id: string | null;
  reverses_transaction_id: string | null;
}
type XpTransactionRow = {
  id: string;
  game_id: string;
  player_id: string;
  hand_id: string | null;
  action_id: string;
  amount: number;
  reason: string;
  source: XpSource;
  created_by: string | null;
  created_at: string;
  undone_at: string | null;
  reversed_by_transaction_id: string | null;
  reverses_transaction_id: string | null;
}
type PowerupRow = {
  code: PowerupCode;
  name: string;
  description: string;
  sort_order: number;
}
type PlayerPowerupRow = {
  id: string;
  game_id: string;
  player_id: string;
  powerup_code: PowerupCode;
  action_id: string;
  status: PowerupStatus;
  acquired_at: string;
  used_at: string | null;
  used_in_hand_id: string | null;
  revoked_at: string | null;
}
type ChaosCardRow = {
  code: ChaosCode;
  name: string;
  description: string;
  sort_order: number;
}
type ChaosEventRow = {
  id: string;
  game_id: string;
  hand_id: string | null;
  chaos_code: ChaosCode;
  action_id: string;
  affected_player_id: string | null;
  triggered_by: string | null;
  triggered_at: string;
  reverted_at: string | null;
}
type AchievementRow = {
  code: string;
  name: string;
  description: string | null;
  xp_reward: number;
  is_preset: boolean;
  created_by: string | null;
  created_at: string;
}
type PlayerAchievementRow = {
  id: string;
  game_id: string;
  player_id: string;
  achievement_code: string;
  xp_awarded: number;
  hand_id: string | null;
  action_id: string;
  awarded_by: string | null;
  earned_at: string;
  revoked_at: string | null;
}
type GameEventRow = {
  id: string;
  game_id: string;
  hand_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
};

// The client only ever inserts/updates the handful of columns listed below —
// everything else goes through the RPCs in supabase/migrations/0004, so
// their Insert/Update types are intentionally permissive Partial<Row> rather
// than an exact match: nothing in lib/game/actions.ts calls insert/update on
// those tables, and RLS (not TypeScript) is the actual enforcement boundary.

export interface Database {
  public: {
    Tables: {
      host_profiles: { Row: HostProfileRow; Insert: Partial<HostProfileRow>; Update: Partial<HostProfileRow>; Relationships: [] };
      games: { Row: GameRow; Insert: Partial<GameRow>; Update: Partial<GameRow>; Relationships: [] };
      players: { Row: PlayerRow; Insert: Partial<PlayerRow>; Update: Partial<PlayerRow>; Relationships: [] };
      player_claims: { Row: PlayerClaimRow; Insert: Partial<PlayerClaimRow>; Update: Partial<PlayerClaimRow>; Relationships: [] };
      hands: { Row: HandRow; Insert: Partial<HandRow>; Update: Partial<HandRow>; Relationships: [] };
      community_cards: { Row: CommunityCardRow; Insert: Partial<CommunityCardRow>; Update: Partial<CommunityCardRow>; Relationships: [] };
      player_hole_cards: {
        Row: PlayerHoleCardRow;
        Insert: Partial<PlayerHoleCardRow>;
        Update: Partial<PlayerHoleCardRow>;
        Relationships: [];
      };
      chip_transactions: {
        Row: ChipTransactionRow;
        Insert: Partial<ChipTransactionRow>;
        Update: Partial<ChipTransactionRow>;
        Relationships: [];
      };
      xp_transactions: {
        Row: XpTransactionRow;
        Insert: Partial<XpTransactionRow>;
        Update: Partial<XpTransactionRow>;
        Relationships: [];
      };
      powerups: { Row: PowerupRow; Insert: Partial<PowerupRow>; Update: Partial<PowerupRow>; Relationships: [] };
      player_powerups: {
        Row: PlayerPowerupRow;
        Insert: Partial<PlayerPowerupRow>;
        Update: Partial<PlayerPowerupRow>;
        Relationships: [];
      };
      chaos_cards: { Row: ChaosCardRow; Insert: Partial<ChaosCardRow>; Update: Partial<ChaosCardRow>; Relationships: [] };
      chaos_events: { Row: ChaosEventRow; Insert: Partial<ChaosEventRow>; Update: Partial<ChaosEventRow>; Relationships: [] };
      achievements: { Row: AchievementRow; Insert: Partial<AchievementRow>; Update: Partial<AchievementRow>; Relationships: [] };
      player_achievements: {
        Row: PlayerAchievementRow;
        Insert: Partial<PlayerAchievementRow>;
        Update: Partial<PlayerAchievementRow>;
        Relationships: [];
      };
      game_events: { Row: GameEventRow; Insert: Partial<GameEventRow>; Update: Partial<GameEventRow>; Relationships: [] };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_host: { Args: Record<string, never>; Returns: boolean };
      claimed_player_id: { Args: Record<string, never>; Returns: string | null };
      deal_community_cards: {
        Args: { p_hand_id: string; p_street: Street; p_cards: string[] };
        Returns: CommunityCardRow[];
      };
      remove_last_community_card: { Args: { p_hand_id: string }; Returns: undefined };
      reset_board: { Args: { p_hand_id: string }; Returns: undefined };
      deal_hole_cards: {
        Args: { p_hand_id: string; p_player_id: string; p_cards: string[] };
        Returns: PlayerHoleCardRow[];
      };
      clear_hole_cards: { Args: { p_hand_id: string; p_player_id: string }; Returns: undefined };
      submit_my_hole_cards: {
        Args: { p_hand_id: string; p_cards: string[] };
        Returns: PlayerHoleCardRow[];
      };
      clear_my_hole_cards: { Args: { p_hand_id: string }; Returns: undefined };
      start_next_hand: {
        Args: { p_game_id: string; p_dealer_player_id: string | null };
        Returns: HandRow;
      };
      award_pot: {
        Args: {
          p_hand_id: string;
          p_winner_player_id: string;
          p_pot_amount: number;
          p_winning_hand_name: string | null;
          p_winning_hand_score: number | null;
        };
        Returns: HandRow;
      };
      eliminate_player: {
        Args: { p_player_id: string; p_eliminated_by_player_id: string | null };
        Returns: PlayerRow;
      };
      restore_player: { Args: { p_player_id: string }; Returns: PlayerRow };
      adjust_chips: {
        Args: { p_game_id: string; p_player_id: string; p_amount: number; p_reason: string; p_hand_id: string | null };
        Returns: ChipTransactionRow;
      };
      award_xp: {
        Args: {
          p_game_id: string;
          p_player_id: string;
          p_amount: number;
          p_reason: string;
          p_source: XpSource;
          p_hand_id: string | null;
        };
        Returns: XpTransactionRow;
      };
      trigger_chaos_event: {
        Args: { p_game_id: string; p_chaos_code: ChaosCode; p_hand_id: string | null };
        Returns: undefined;
      };
      award_powerup: {
        Args: { p_game_id: string; p_player_id: string; p_powerup_code: PowerupCode };
        Returns: PlayerPowerupRow;
      };
      use_powerup: {
        Args: { p_player_powerup_id: string; p_used_in_hand_id: string | null };
        Returns: PlayerPowerupRow;
      };
      award_achievement: {
        Args: {
          p_game_id: string;
          p_player_id: string;
          p_name: string;
          p_xp_reward: number;
          p_description: string | null;
          p_hand_id: string | null;
          p_code: string | null;
        };
        Returns: PlayerAchievementRow;
      };
      undo_last_action: { Args: { p_game_id: string }; Returns: undefined };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
