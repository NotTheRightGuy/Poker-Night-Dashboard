-- Inventory Pod Poker Night — functions, triggers, RPCs
--
-- SECURITY DEFINER is used narrowly, only where a function must write a
-- column-level-protected value (players.chip_count / xp_total / hands_won /
-- hands_played / eliminations) or must bypass RLS to avoid recursion
-- (is_host(), claimed_player_id()). Every other RPC is SECURITY INVOKER (the
-- Postgres default, stated explicitly below) and re-checks is_host() itself,
-- so the normal RLS policies from 0002 still apply to its writes.

-- ── Ledger triggers: the only path that may change players.chip_count/xp_total ──
create or replace function apply_chip_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update players set chip_count = chip_count + new.amount where id = new.player_id;
  return new;
end;
$$;

create trigger chip_transactions_after_insert
  after insert on chip_transactions
  for each row execute function apply_chip_transaction();

create or replace function apply_xp_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update players set xp_total = xp_total + new.amount where id = new.player_id;
  return new;
end;
$$;

create trigger xp_transactions_after_insert
  after insert on xp_transactions
  for each row execute function apply_xp_transaction();

-- ── Achievement -> XP transaction (fully automatic, always the same shape) ──
create or replace function apply_achievement_xp()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_name text;
begin
  if new.xp_awarded <> 0 then
    select name into v_name from achievements where code = new.achievement_code;
    insert into xp_transactions (game_id, player_id, hand_id, action_id, amount, reason, source, created_by)
    values (new.game_id, new.player_id, new.hand_id, new.action_id, new.xp_awarded, coalesce(v_name, new.achievement_code), 'host_achievement', new.awarded_by);
  end if;
  return new;
end;
$$;

create trigger player_achievements_after_insert_xp
  after insert on player_achievements
  for each row execute function apply_achievement_xp();

-- ── Cross-table duplicate-card guard ─────────────────────────────────────────
-- Per-table UNIQUE(hand_id, card) catches duplicates within one table
-- natively; this trigger catches the case a card is already in play in the
-- *other* table for the same hand (native constraints can't span two tables).
create or replace function check_no_duplicate_card_in_hand()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_exists boolean;
begin
  select exists (
    select 1 from community_cards where hand_id = new.hand_id and card = new.card
    union all
    select 1 from player_hole_cards where hand_id = new.hand_id and card = new.card
  ) into v_exists;
  if v_exists then
    raise exception 'card % is already in play for this hand', new.card;
  end if;
  return new;
end;
$$;

create trigger community_cards_no_dup
  before insert on community_cards
  for each row execute function check_no_duplicate_card_in_hand();

create trigger player_hole_cards_no_dup
  before insert on player_hole_cards
  for each row execute function check_no_duplicate_card_in_hand();

-- ── Dealing RPCs ──────────────────────────────────────────────────────────────
-- pg_advisory_xact_lock closes the TOCTOU gap between the duplicate-card
-- check and the insert in case of an accidental double-click/double-submit.
create or replace function deal_community_cards(p_hand_id uuid, p_street text, p_cards text[])
returns setof community_cards
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_game_id uuid;
  v_existing_count int;
  v_card text;
  v_index int;
begin
  if not is_host() then
    raise exception 'only the host can deal cards';
  end if;

  select game_id into v_game_id from hands where id = p_hand_id;
  if v_game_id is null then
    raise exception 'hand not found';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_hand_id::text));

  select count(*) into v_existing_count from community_cards where hand_id = p_hand_id;

  if p_street = 'flop' and (v_existing_count <> 0 or coalesce(array_length(p_cards, 1), 0) <> 3) then
    raise exception 'the flop must be exactly 3 cards, dealt before the turn or river';
  elsif p_street = 'turn' and (v_existing_count <> 3 or coalesce(array_length(p_cards, 1), 0) <> 1) then
    raise exception 'the turn must be exactly 1 card, dealt after the flop';
  elsif p_street = 'river' and (v_existing_count <> 4 or coalesce(array_length(p_cards, 1), 0) <> 1) then
    raise exception 'the river must be exactly 1 card, dealt after the turn';
  end if;

  v_index := v_existing_count;
  foreach v_card in array p_cards loop
    insert into community_cards (hand_id, game_id, street, card_index, card)
    values (p_hand_id, v_game_id, p_street, v_index, v_card);
    v_index := v_index + 1;
  end loop;

  return query select * from community_cards where hand_id = p_hand_id and street = p_street order by card_index;
end;
$$;

create or replace function remove_last_community_card(p_hand_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_max_index int;
begin
  if not is_host() then
    raise exception 'only the host can modify community cards';
  end if;
  select max(card_index) into v_max_index from community_cards where hand_id = p_hand_id;
  if v_max_index is null then
    raise exception 'no community cards to remove';
  end if;
  delete from community_cards where hand_id = p_hand_id and card_index = v_max_index;
end;
$$;

create or replace function reset_board(p_hand_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not is_host() then
    raise exception 'only the host can modify community cards';
  end if;
  delete from community_cards where hand_id = p_hand_id;
end;
$$;

create or replace function deal_hole_cards(p_hand_id uuid, p_player_id uuid, p_cards text[])
returns setof player_hole_cards
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_game_id uuid;
  v_card text;
  v_index int;
begin
  if not is_host() then
    raise exception 'only the host can deal hole cards';
  end if;
  if array_length(p_cards, 1) is distinct from 2 then
    raise exception 'exactly 2 hole cards are required';
  end if;

  select game_id into v_game_id from hands where id = p_hand_id;
  if v_game_id is null then
    raise exception 'hand not found';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_hand_id::text));

  delete from player_hole_cards where hand_id = p_hand_id and player_id = p_player_id;

  v_index := 0;
  foreach v_card in array p_cards loop
    insert into player_hole_cards (hand_id, game_id, player_id, card_index, card)
    values (p_hand_id, v_game_id, p_player_id, v_index, v_card);
    v_index := v_index + 1;
  end loop;

  return query select * from player_hole_cards where hand_id = p_hand_id and player_id = p_player_id order by card_index;
end;
$$;

create or replace function clear_hole_cards(p_hand_id uuid, p_player_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not is_host() then
    raise exception 'only the host can modify hole cards';
  end if;
  delete from player_hole_cards where hand_id = p_hand_id and player_id = p_player_id;
end;
$$;

-- ── Hand lifecycle ────────────────────────────────────────────────────────────
create or replace function start_next_hand(p_game_id uuid, p_dealer_player_id uuid default null)
returns hands
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_next_number int;
  v_hand hands;
begin
  if not is_host() then
    raise exception 'only the host can start the next hand';
  end if;

  select current_hand_number + 1 into v_next_number from games where id = p_game_id;
  if v_next_number is null then
    raise exception 'game not found';
  end if;

  insert into hands (game_id, hand_number, dealer_player_id)
  values (p_game_id, v_next_number, p_dealer_player_id)
  returning * into v_hand;

  update games
  set current_hand_number = v_next_number,
      current_phase = 'preflop',
      status = case when status = 'not_started' then 'live' else status end
  where id = p_game_id;

  return v_hand;
end;
$$;

-- Settles a hand and awards the pot. Called either directly by the host (a
-- fold-to-one-player win needs no hand evaluation) or by
-- app/api/host/settle-showdown after the server re-runs the evaluator —
-- RLS proves *who* can call this, not that a client-supplied winner is
-- mathematically correct, which is why showdown settlement re-verifies
-- server-side before ever reaching here.
-- SECURITY DEFINER: writes players.hands_won / hands_played (protected columns).
create or replace function award_pot(
  p_hand_id uuid,
  p_winner_player_id uuid,
  p_pot_amount int,
  p_winning_hand_name text default null,
  p_winning_hand_score int default null
)
returns hands
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hand hands;
  v_game_id uuid;
begin
  if not is_host() then
    raise exception 'only the host can settle a hand';
  end if;
  if p_pot_amount < 0 then
    raise exception 'pot cannot be negative';
  end if;

  select game_id into v_game_id from hands where id = p_hand_id;
  if v_game_id is null then
    raise exception 'hand not found';
  end if;

  update hands
  set phase = 'complete',
      pot_total = p_pot_amount,
      winner_player_id = p_winner_player_id,
      winning_hand_name = p_winning_hand_name,
      winning_hand_score = p_winning_hand_score,
      ended_at = now()
  where id = p_hand_id
  returning * into v_hand;

  if p_pot_amount > 0 then
    insert into chip_transactions (game_id, player_id, hand_id, type, amount, reason, created_by)
    values (v_game_id, p_winner_player_id, p_hand_id, 'pot_award', p_pot_amount, 'Won the pot', auth.uid());
  end if;

  update players set hands_won = hands_won + 1 where id = p_winner_player_id;
  update players set hands_played = hands_played + 1
    where id in (select distinct player_id from player_hole_cards where hand_id = p_hand_id);

  return v_hand;
end;
$$;

-- SECURITY DEFINER: writes players.eliminations (protected column).
create or replace function eliminate_player(p_player_id uuid, p_eliminated_by_player_id uuid default null)
returns players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row players;
begin
  if not is_host() then
    raise exception 'only the host can eliminate a player';
  end if;
  update players set status = 'eliminated' where id = p_player_id returning * into v_row;
  if p_eliminated_by_player_id is not null then
    update players set eliminations = eliminations + 1 where id = p_eliminated_by_player_id;
  end if;
  return v_row;
end;
$$;

-- SECURITY DEFINER for symmetry with eliminate_player (no protected column
-- write today, but keeps the elimination lifecycle in one privilege tier).
create or replace function restore_player(p_player_id uuid)
returns players
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row players;
begin
  if not is_host() then
    raise exception 'only the host can restore a player';
  end if;
  update players set status = 'active' where id = p_player_id returning * into v_row;
  return v_row;
end;
$$;

-- ── Chips / XP ────────────────────────────────────────────────────────────────
create or replace function adjust_chips(p_game_id uuid, p_player_id uuid, p_amount int, p_reason text, p_hand_id uuid default null)
returns chip_transactions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row chip_transactions;
  v_new_balance int;
  v_name text;
begin
  if not is_host() then
    raise exception 'only the host can adjust chips';
  end if;
  if p_amount = 0 then
    raise exception 'amount must be non-zero';
  end if;

  insert into chip_transactions (game_id, player_id, hand_id, type, amount, reason, created_by)
  values (p_game_id, p_player_id, p_hand_id, 'manual_adjustment', p_amount, p_reason, auth.uid())
  returning * into v_row;

  select chip_count, display_name into v_new_balance, v_name from players where id = p_player_id;
  if v_new_balance < 0 then
    raise exception 'this adjustment would take % below zero chips', v_name;
  end if;

  return v_row;
end;
$$;

create or replace function award_xp(
  p_game_id uuid,
  p_player_id uuid,
  p_amount int,
  p_reason text,
  p_source text default 'host_manual',
  p_hand_id uuid default null
)
returns xp_transactions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row xp_transactions;
begin
  if not is_host() then
    raise exception 'only the host can award xp';
  end if;
  if p_amount = 0 then
    raise exception 'amount must be non-zero';
  end if;

  insert into xp_transactions (game_id, player_id, hand_id, amount, reason, source, created_by)
  values (p_game_id, p_player_id, p_hand_id, p_amount, p_reason, p_source, auth.uid())
  returning * into v_row;

  return v_row;
end;
$$;

-- ── Chaos cards ───────────────────────────────────────────────────────────────
create or replace function trigger_chaos_event(p_game_id uuid, p_chaos_code text, p_hand_id uuid default null)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_action_id uuid := gen_random_uuid();
  r record;
  v_debit int;
begin
  if not is_host() then
    raise exception 'only the host can trigger a chaos card';
  end if;

  insert into chaos_events (game_id, hand_id, chaos_code, action_id, triggered_by)
  values (p_game_id, p_hand_id, p_chaos_code, v_action_id, auth.uid());

  if p_chaos_code = 'BULL_MARKET' then
    for r in select id from players where game_id = p_game_id and status <> 'eliminated' loop
      insert into chip_transactions (game_id, player_id, hand_id, action_id, type, amount, reason, created_by)
      values (p_game_id, r.id, p_hand_id, v_action_id, 'chaos_event', 50, 'Bull Market', auth.uid());
    end loop;
  elsif p_chaos_code = 'MARKET_CRASH' then
    for r in select id, chip_count from players where game_id = p_game_id and status <> 'eliminated' loop
      v_debit := least(25, r.chip_count);
      if v_debit > 0 then
        insert into chip_transactions (game_id, player_id, hand_id, action_id, type, amount, reason, created_by)
        values (p_game_id, r.id, p_hand_id, v_action_id, 'chaos_event', -v_debit, 'Market Crash', auth.uid());
      end if;
    end loop;
  end if;
  -- SILENT_ROUND has no chip effect by default; it's a social rule. The host
  -- applies the 10-chip talking penalty to individual offenders via
  -- adjust_chips() as it happens during the hand.
end;
$$;

-- ── Power-ups ─────────────────────────────────────────────────────────────────
create or replace function award_powerup(p_game_id uuid, p_player_id uuid, p_powerup_code text)
returns player_powerups
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row player_powerups;
begin
  if not is_host() then
    raise exception 'only the host can award a power-up';
  end if;
  insert into player_powerups (game_id, player_id, powerup_code)
  values (p_game_id, p_player_id, p_powerup_code)
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function use_powerup(p_player_powerup_id uuid, p_used_in_hand_id uuid default null)
returns player_powerups
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row player_powerups;
begin
  if not is_host() then
    raise exception 'only the host can mark a power-up as used';
  end if;
  update player_powerups
  set status = 'used', used_at = now(), used_in_hand_id = p_used_in_hand_id
  where id = p_player_powerup_id and status = 'available'
  returning * into v_row;
  if v_row.id is null then
    raise exception 'power-up not found, or already used/locked';
  end if;
  return v_row;
end;
$$;

-- ── Achievements ───────────────────────────────────────────────────────────────
-- Awards a preset achievement (pass p_code) or creates a brand new one on the
-- fly (pass a new p_name/p_xp_reward, code is auto-slugified).
create or replace function award_achievement(
  p_game_id uuid,
  p_player_id uuid,
  p_name text,
  p_xp_reward int,
  p_description text default null,
  p_hand_id uuid default null,
  p_code text default null
)
returns player_achievements
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_code text;
  v_row player_achievements;
begin
  if not is_host() then
    raise exception 'only the host can award an achievement';
  end if;
  if p_xp_reward < 0 then
    raise exception 'xp reward must be zero or positive';
  end if;

  v_code := coalesce(p_code, upper(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '_', 'g')));

  insert into achievements (code, name, description, xp_reward, is_preset, created_by)
  values (v_code, p_name, p_description, p_xp_reward, false, auth.uid())
  on conflict (code) do nothing;

  insert into player_achievements (game_id, player_id, achievement_code, xp_awarded, hand_id, awarded_by)
  values (p_game_id, p_player_id, v_code, p_xp_reward, p_hand_id, auth.uid())
  returning * into v_row;

  return v_row;
end;
$$;

-- ── Undo ──────────────────────────────────────────────────────────────────────
-- Reverses the most recent not-yet-undone action for this game, across every
-- ledger/side-effect table, grouped by action_id. Single-level only: a
-- reversal (reverses_transaction_id is not null) is never itself an undo
-- target, so there is no undo-of-undo chain.
create or replace function undo_last_action(p_game_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_action_id uuid;
  v_reversal_action_id uuid := gen_random_uuid();
  r record;
  v_new_id uuid;
begin
  if not is_host() then
    raise exception 'only the host can undo an action';
  end if;

  select action_id into v_action_id
  from (
    select action_id, created_at from chip_transactions
      where game_id = p_game_id and undone_at is null and reverses_transaction_id is null
    union all
    select action_id, created_at from xp_transactions
      where game_id = p_game_id and undone_at is null and reverses_transaction_id is null
    union all
    select action_id, acquired_at as created_at from player_powerups
      where game_id = p_game_id and revoked_at is null
    union all
    select action_id, triggered_at as created_at from chaos_events
      where game_id = p_game_id and reverted_at is null
    union all
    select action_id, earned_at as created_at from player_achievements
      where game_id = p_game_id and revoked_at is null
  ) actions
  order by created_at desc
  limit 1;

  if v_action_id is null then
    raise exception 'nothing to undo';
  end if;

  for r in select * from chip_transactions
    where action_id = v_action_id and game_id = p_game_id and undone_at is null and reverses_transaction_id is null
  loop
    insert into chip_transactions (game_id, player_id, hand_id, action_id, type, amount, reason, created_by, reverses_transaction_id)
    values (r.game_id, r.player_id, r.hand_id, v_reversal_action_id, 'reversal', -r.amount, 'Undo: ' || coalesce(r.reason, r.type), auth.uid(), r.id)
    returning id into v_new_id;
    update chip_transactions set undone_at = now(), reversed_by_transaction_id = v_new_id where id = r.id;
  end loop;

  for r in select * from xp_transactions
    where action_id = v_action_id and game_id = p_game_id and undone_at is null and reverses_transaction_id is null
  loop
    insert into xp_transactions (game_id, player_id, hand_id, action_id, amount, reason, source, created_by, reverses_transaction_id)
    values (r.game_id, r.player_id, r.hand_id, v_reversal_action_id, -r.amount, 'Undo: ' || r.reason, 'undo', auth.uid(), r.id)
    returning id into v_new_id;
    update xp_transactions set undone_at = now(), reversed_by_transaction_id = v_new_id where id = r.id;
  end loop;

  update player_powerups set revoked_at = now() where action_id = v_action_id and game_id = p_game_id and revoked_at is null;
  update chaos_events set reverted_at = now() where action_id = v_action_id and game_id = p_game_id and reverted_at is null;
  update player_achievements set revoked_at = now() where action_id = v_action_id and game_id = p_game_id and revoked_at is null;
end;
$$;

-- ── game_events auto-logging ─────────────────────────────────────────────────
-- Plain SECURITY INVOKER: every action that fires these triggers was already
-- gated by is_host() upstream (the host is always the invoker in practice),
-- so no elevated privilege is needed here.
create or replace function log_hand_started()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into game_events (game_id, hand_id, event_type, payload, created_by)
  values (new.game_id, new.id, 'hand_started', jsonb_build_object('hand_number', new.hand_number), auth.uid());
  return new;
end;
$$;

create trigger hands_after_insert_log
  after insert on hands
  for each row execute function log_hand_started();

create or replace function log_hand_ended()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.phase = 'complete' and old.phase is distinct from 'complete' then
    insert into game_events (game_id, hand_id, event_type, payload, created_by)
    values (new.game_id, new.id, 'hand_ended', jsonb_build_object(
      'hand_number', new.hand_number,
      'winner_player_id', new.winner_player_id,
      'winning_hand_name', new.winning_hand_name,
      'pot_total', new.pot_total
    ), auth.uid());
  end if;
  return new;
end;
$$;

create trigger hands_after_update_log
  after update on hands
  for each row execute function log_hand_ended();

create or replace function log_chaos_triggered()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_name text;
begin
  select name into v_name from chaos_cards where code = new.chaos_code;
  insert into game_events (game_id, hand_id, event_type, payload, created_by)
  values (new.game_id, new.hand_id, 'chaos_triggered', jsonb_build_object(
    'chaos_code', new.chaos_code, 'name', v_name, 'affected_player_id', new.affected_player_id
  ), new.triggered_by);
  return new;
end;
$$;

create trigger chaos_events_after_insert_log
  after insert on chaos_events
  for each row execute function log_chaos_triggered();

create or replace function log_achievement_earned()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_name text;
begin
  select name into v_name from achievements where code = new.achievement_code;
  insert into game_events (game_id, hand_id, event_type, payload, created_by)
  values (new.game_id, new.hand_id, 'achievement_earned', jsonb_build_object(
    'player_id', new.player_id, 'achievement_code', new.achievement_code, 'name', v_name, 'xp_awarded', new.xp_awarded
  ), new.awarded_by);
  return new;
end;
$$;

create trigger player_achievements_after_insert_log
  after insert on player_achievements
  for each row execute function log_achievement_earned();

create or replace function log_player_status_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'eliminated' then
      insert into game_events (game_id, event_type, payload)
      values (new.game_id, 'player_eliminated', jsonb_build_object('player_id', new.id, 'display_name', new.display_name));
    elsif old.status = 'eliminated' and new.status = 'active' then
      insert into game_events (game_id, event_type, payload)
      values (new.game_id, 'player_restored', jsonb_build_object('player_id', new.id, 'display_name', new.display_name));
    end if;
  end if;
  return new;
end;
$$;

create trigger players_after_update_status_log
  after update on players
  for each row execute function log_player_status_change();
