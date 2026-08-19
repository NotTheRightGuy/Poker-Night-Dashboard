-- Inventory Pod Poker Night — reset hand numbering back to 1
--
-- Scope is deliberately narrow: this clears hand records (hands, and via
-- cascade their community_cards/player_hole_cards) and resets
-- games.current_hand_number/current_phase, so the next "Start Next Hand"
-- creates Hand #1 again. It does NOT touch players' chip_count, xp_total, or
-- game status — those are untouched on purpose, distinct from the heavier
-- scripts/reset-game-data.ts (which resets stats to starting values too).
-- Use this when you want to restart hand counting mid-event without
-- disturbing current chip/XP standings.
--
-- hands has no DELETE policy at all (by design — history is normally
-- permanent), so this must run as SECURITY DEFINER to perform the delete,
-- exactly like the other privileged RPCs in 0004 — gated by the same manual
-- is_host() check.
create or replace function reset_hands(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_host() then
    raise exception 'only the host can reset hands';
  end if;

  -- community_cards/player_hole_cards cascade automatically; chip/xp
  -- transactions' hand_id is ON DELETE SET NULL already (their chip/XP
  -- effects are never reversed — only the "which hand" tag is cleared).
  -- These four have no ON DELETE action, so the hands delete below would
  -- otherwise fail with a foreign key violation.
  update player_powerups set used_in_hand_id = null where game_id = p_game_id and used_in_hand_id is not null;
  update chaos_events set hand_id = null where game_id = p_game_id and hand_id is not null;
  update player_achievements set hand_id = null where game_id = p_game_id and hand_id is not null;
  update game_events set hand_id = null where game_id = p_game_id and hand_id is not null;

  delete from hands where game_id = p_game_id;

  -- These counters are derived entirely from hand history that no longer
  -- exists after the delete above, so they'd otherwise be stale.
  update players set hands_won = 0, hands_played = 0, eliminations = 0 where game_id = p_game_id;

  update games set current_hand_number = 0, current_phase = 'preflop' where id = p_game_id;
end;
$$;
