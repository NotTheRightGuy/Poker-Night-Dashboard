// Thin, typed wrappers around Supabase table writes and RPCs. Every function
// takes the caller's own SupabaseClient (create one with
// `useMemo(() => createClient(), [])` in the component, same instance the
// GameProvider uses) so nothing here manages its own connection.
//
// RLS is the real authorization boundary (see supabase/migrations/0002 and
// 0004) — these wrappers exist for a consistent call shape and to surface
// Postgres errors as readable Error messages, not to enforce anything
// themselves.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { ChaosCode, GamePhase, GameStatus, PlayerStatus, PowerupCode, Street, XpSource } from "./types";

type Client = SupabaseClient<Database>;

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

// ── Game control ──────────────────────────────────────────────────────────
export async function createGame(supabase: Client, name: string, startingChips: number, smallBlind: number, bigBlind: number) {
  const { data: userData } = await supabase.auth.getUser();
  return unwrap(
    await supabase
      .from("games")
      .insert({
        name,
        starting_chips: startingChips,
        small_blind: smallBlind,
        big_blind: bigBlind,
        created_by: userData.user?.id,
      })
      .select("*")
      .single(),
  );
}

export async function setGameStatus(supabase: Client, gameId: string, status: GameStatus) {
  return unwrap(
    await supabase
      .from("games")
      .update({ status, started_at: status === "live" ? new Date().toISOString() : undefined, ended_at: status === "finished" ? new Date().toISOString() : undefined })
      .eq("id", gameId)
      .select("*")
      .single(),
  );
}

export async function setGamePhase(supabase: Client, gameId: string, phase: GamePhase) {
  return unwrap(await supabase.from("games").update({ current_phase: phase }).eq("id", gameId).select("*").single());
}

// ── Players ───────────────────────────────────────────────────────────────
export async function addPlayer(supabase: Client, gameId: string, displayName: string, startingChips: number) {
  // chip_count is column-protected against UPDATE (see 0002_rls_policies.sql)
  // but not INSERT — setting it here alongside starting_chips is the
  // player's one-time "opening balance", exactly like a ledger's initial
  // entry. Every change after this point must go through chip_transactions.
  return unwrap(
    await supabase
      .from("players")
      .insert({ game_id: gameId, display_name: displayName, starting_chips: startingChips, chip_count: startingChips })
      .select("*")
      .single(),
  );
}

export async function removePlayer(supabase: Client, playerId: string) {
  const { error } = await supabase.from("players").delete().eq("id", playerId);
  if (error) throw new Error(error.message);
}

export async function updatePlayer(
  supabase: Client,
  playerId: string,
  updates: Partial<{ display_name: string; seat_number: number | null; status: PlayerStatus; starting_chips: number }>,
) {
  return unwrap(await supabase.from("players").update(updates).eq("id", playerId).select("*").single());
}

export async function eliminatePlayer(supabase: Client, playerId: string, eliminatedByPlayerId?: string) {
  return unwrap(
    await supabase.rpc("eliminate_player", { p_player_id: playerId, p_eliminated_by_player_id: eliminatedByPlayerId ?? null }),
  );
}

export async function restorePlayer(supabase: Client, playerId: string) {
  return unwrap(await supabase.rpc("restore_player", { p_player_id: playerId }));
}

// ── Player claims (anonymous-auth identity) ─────────────────────────────────
export async function claimPlayer(supabase: Client, gameId: string, playerId: string) {
  // getUser() returns an AuthSessionMissingError for a brand-new visitor with
  // no session at all yet — that's expected, not a real failure, so it must
  // NOT abort here; it just means we fall through to signInAnonymously()
  // below like any other "not signed in yet" case.
  const { data: userData } = await supabase.auth.getUser();

  let userId: string | undefined = userData?.user?.id;
  if (!userId) {
    const { data: anon, error: anonError } = await supabase.auth.signInAnonymously();
    if (anonError) throw new Error(anonError.message);
    userId = anon.user?.id;
  }
  if (!userId) throw new Error("could not start a session");

  const { error } = await supabase.from("player_claims").insert({ game_id: gameId, player_id: playerId, user_id: userId });
  if (error) {
    if (error.code === "23505") throw new Error("Someone already claimed that seat. Ask the host to release it.");
    throw new Error(error.message);
  }
}

export async function releaseMyClaim(supabase: Client, claimId: string) {
  const { error } = await supabase.from("player_claims").update({ released_at: new Date().toISOString() }).eq("id", claimId);
  if (error) throw new Error(error.message);
}

export async function hostReleaseClaim(supabase: Client, playerId: string) {
  const { error } = await supabase
    .from("player_claims")
    .update({ released_at: new Date().toISOString() })
    .eq("player_id", playerId)
    .is("released_at", null);
  if (error) throw new Error(error.message);
}

// ── Hands / cards ────────────────────────────────────────────────────────────
export async function startNextHand(supabase: Client, gameId: string, dealerPlayerId?: string) {
  return unwrap(await supabase.rpc("start_next_hand", { p_game_id: gameId, p_dealer_player_id: dealerPlayerId ?? null }));
}

export async function dealHoleCards(supabase: Client, handId: string, playerId: string, cards: [string, string]) {
  return unwrap(await supabase.rpc("deal_hole_cards", { p_hand_id: handId, p_player_id: playerId, p_cards: cards }));
}

export async function clearHoleCards(supabase: Client, handId: string, playerId: string) {
  const { error } = await supabase.rpc("clear_hole_cards", { p_hand_id: handId, p_player_id: playerId });
  if (error) throw new Error(error.message);
}

// Player self-service — always resolves to whichever player this session has
// claimed, server-side, never a client-supplied player id.
export async function submitMyHoleCards(supabase: Client, handId: string, cards: [string, string]) {
  return unwrap(await supabase.rpc("submit_my_hole_cards", { p_hand_id: handId, p_cards: cards }));
}

export async function clearMyHoleCards(supabase: Client, handId: string) {
  const { error } = await supabase.rpc("clear_my_hole_cards", { p_hand_id: handId });
  if (error) throw new Error(error.message);
}

export async function dealCommunityCards(supabase: Client, handId: string, street: Street, cards: string[]) {
  return unwrap(await supabase.rpc("deal_community_cards", { p_hand_id: handId, p_street: street, p_cards: cards }));
}

export async function removeLastCommunityCard(supabase: Client, handId: string) {
  const { error } = await supabase.rpc("remove_last_community_card", { p_hand_id: handId });
  if (error) throw new Error(error.message);
}

export async function resetBoard(supabase: Client, handId: string) {
  const { error } = await supabase.rpc("reset_board", { p_hand_id: handId });
  if (error) throw new Error(error.message);
}

export async function awardPot(
  supabase: Client,
  handId: string,
  winnerPlayerId: string,
  potAmount: number,
  winningHandName?: string,
  winningHandScore?: number,
) {
  return unwrap(
    await supabase.rpc("award_pot", {
      p_hand_id: handId,
      p_winner_player_id: winnerPlayerId,
      p_pot_amount: potAmount,
      p_winning_hand_name: winningHandName ?? null,
      p_winning_hand_score: winningHandScore ?? null,
    }),
  );
}

// ── Chips / XP ────────────────────────────────────────────────────────────
export async function adjustChips(supabase: Client, gameId: string, playerId: string, amount: number, reason: string, handId?: string) {
  return unwrap(
    await supabase.rpc("adjust_chips", { p_game_id: gameId, p_player_id: playerId, p_amount: amount, p_reason: reason, p_hand_id: handId ?? null }),
  );
}

export async function awardXp(
  supabase: Client,
  gameId: string,
  playerId: string,
  amount: number,
  reason: string,
  source: XpSource = "host_manual",
  handId?: string,
) {
  return unwrap(
    await supabase.rpc("award_xp", {
      p_game_id: gameId,
      p_player_id: playerId,
      p_amount: amount,
      p_reason: reason,
      p_source: source,
      p_hand_id: handId ?? null,
    }),
  );
}

// ── Chaos cards ───────────────────────────────────────────────────────────
export async function triggerChaosEvent(supabase: Client, gameId: string, chaosCode: ChaosCode, handId?: string) {
  const { error } = await supabase.rpc("trigger_chaos_event", { p_game_id: gameId, p_chaos_code: chaosCode, p_hand_id: handId ?? null });
  if (error) throw new Error(error.message);
}

// ── Power-ups ─────────────────────────────────────────────────────────────
export async function awardPowerup(supabase: Client, gameId: string, playerId: string, powerupCode: PowerupCode) {
  return unwrap(await supabase.rpc("award_powerup", { p_game_id: gameId, p_player_id: playerId, p_powerup_code: powerupCode }));
}

export async function usePowerup(supabase: Client, playerPowerupId: string, usedInHandId?: string) {
  return unwrap(await supabase.rpc("use_powerup", { p_player_powerup_id: playerPowerupId, p_used_in_hand_id: usedInHandId ?? null }));
}

// ── Achievements ───────────────────────────────────────────────────────────
export async function awardAchievement(
  supabase: Client,
  gameId: string,
  playerId: string,
  name: string,
  xpReward: number,
  options?: { description?: string; handId?: string; code?: string },
) {
  return unwrap(
    await supabase.rpc("award_achievement", {
      p_game_id: gameId,
      p_player_id: playerId,
      p_name: name,
      p_xp_reward: xpReward,
      p_description: options?.description ?? null,
      p_hand_id: options?.handId ?? null,
      p_code: options?.code ?? null,
    }),
  );
}

// ── Undo ──────────────────────────────────────────────────────────────────
export async function undoLastAction(supabase: Client, gameId: string) {
  const { error } = await supabase.rpc("undo_last_action", { p_game_id: gameId });
  if (error) throw new Error(error.message);
}
