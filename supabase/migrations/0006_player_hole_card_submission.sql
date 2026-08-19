-- Inventory Pod Poker Night — players enter their own hole cards
--
-- Originally only the host could deal hole cards (deal_hole_cards, is_host()
-- gated). In practice the host is running the whole event and shouldn't also
-- be typing in every player's cards — each player enters their own, the way
-- they'd actually look at their own physical cards. The host keeps
-- deal_hole_cards/clear_hole_cards as a manual override (e.g. someone's phone
-- died, or fat-fingered their own entry and needs the host to fix it).
--
-- SECURITY DEFINER is required here for a reason beyond the usual "column
-- grant bypass" pattern: the cross-table duplicate-card check in
-- check_no_duplicate_card_in_hand() reads player_hole_cards, which is
-- RLS-restricted to "is_host() OR player_id = claimed_player_id()". A
-- non-host player calling this function would, under their own privileges,
-- only ever see their *own* hole cards during that check — never other
-- players' — silently defeating duplicate-card protection. Running as
-- DEFINER makes the whole function body (including the trigger it fires)
-- execute with the elevated owner role, which bypasses RLS and sees every
-- hole card, exactly like the host already could.
create or replace function submit_my_hole_cards(p_hand_id uuid, p_cards text[])
returns setof player_hole_cards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
  v_player_game_id uuid;
  v_hand_game_id uuid;
  v_card text;
  v_index int;
begin
  v_player_id := claimed_player_id();
  if v_player_id is null then
    raise exception 'you need to select your name and claim your seat before entering cards';
  end if;

  if array_length(p_cards, 1) is distinct from 2 then
    raise exception 'exactly 2 hole cards are required';
  end if;

  select game_id into v_hand_game_id from hands where id = p_hand_id;
  if v_hand_game_id is null then
    raise exception 'hand not found';
  end if;

  select game_id into v_player_game_id from players where id = v_player_id;
  if v_player_game_id is distinct from v_hand_game_id then
    raise exception 'this hand does not belong to your game';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_hand_id::text));

  delete from player_hole_cards where hand_id = p_hand_id and player_id = v_player_id;

  v_index := 0;
  foreach v_card in array p_cards loop
    insert into player_hole_cards (hand_id, game_id, player_id, card_index, card)
    values (p_hand_id, v_hand_game_id, v_player_id, v_index, v_card);
    v_index := v_index + 1;
  end loop;

  return query select * from player_hole_cards where hand_id = p_hand_id and player_id = v_player_id order by card_index;
end;
$$;

-- Lets a player clear and re-enter their own cards for the current hand
-- (e.g. they mis-tapped a card) without needing the host.
create or replace function clear_my_hole_cards(p_hand_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
begin
  v_player_id := claimed_player_id();
  if v_player_id is null then
    raise exception 'you need to select your name and claim your seat first';
  end if;

  delete from player_hole_cards where hand_id = p_hand_id and player_id = v_player_id;
end;
$$;
