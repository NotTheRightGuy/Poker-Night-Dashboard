-- Inventory Pod Poker Night — Row Level Security
--
-- Security model:
--   * Public (anon key, no session) and claimed players read almost everything.
--   * Hole cards are the one exception: SELECT is restricted to the host or
--     the session that has actively claimed that specific player.
--   * All writes require is_host(), except a player claiming/releasing their
--     own seat.
--   * chip_count / xp_total / hands_won / hands_played / eliminations on
--     `players`, and every column on the ledgers besides the undo-bookkeeping
--     ones, are additionally locked down with column-level GRANTs — Supabase
--     grants broad table privileges to `anon`/`authenticated` by default, so
--     RLS alone does not stop a host from directly overwriting a cached
--     balance and silently breaking the audit trail. The GRANT/REVOKE pairs
--     below force every balance change through the ledger tables and their
--     SECURITY DEFINER triggers/functions in 0004.

alter table host_profiles enable row level security;
alter table games enable row level security;
alter table players enable row level security;
alter table player_claims enable row level security;
alter table hands enable row level security;
alter table community_cards enable row level security;
alter table player_hole_cards enable row level security;
alter table chip_transactions enable row level security;
alter table xp_transactions enable row level security;
alter table powerups enable row level security;
alter table player_powerups enable row level security;
alter table chaos_cards enable row level security;
alter table chaos_events enable row level security;
alter table achievements enable row level security;
alter table player_achievements enable row level security;
alter table game_events enable row level security;

-- ── Helper functions ─────────────────────────────────────────────────────────
-- SECURITY DEFINER so they bypass RLS on host_profiles / player_claims when
-- evaluating — without this, is_host() referencing host_profiles (whose own
-- SELECT policy is `is_host()`) would recurse.
create or replace function is_host()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from host_profiles where user_id = auth.uid());
$$;

create or replace function claimed_player_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select player_id from player_claims
  where user_id = auth.uid() and released_at is null
  limit 1;
$$;

-- ── host_profiles ────────────────────────────────────────────────────────────
create policy host_profiles_select_host on host_profiles for select using (is_host());
-- No INSERT/UPDATE/DELETE policy: hosts are provisioned only via
-- scripts/create-host.ts using the service-role key.

-- ── games ─────────────────────────────────────────────────────────────────────
create policy games_select_public on games for select using (true);
create policy games_write_host on games for all using (is_host()) with check (is_host());

-- ── players ───────────────────────────────────────────────────────────────────
create policy players_select_public on players for select using (true);
create policy players_insert_host on players for insert with check (is_host());
create policy players_update_host on players for update using (is_host()) with check (is_host());
create policy players_delete_host on players for delete using (is_host());

-- Lock the derived/cached columns: only SECURITY DEFINER functions (running
-- as the table owner, unaffected by these grants) may write them.
revoke update on players from authenticated, anon;
grant update (display_name, seat_number, status, starting_chips) on players to authenticated;

-- ── player_claims ─────────────────────────────────────────────────────────────
create policy player_claims_select_public on player_claims for select using (true);
-- Anyone (any signed-in session, including a fresh anonymous one) may claim
-- an unclaimed player for themselves — the race between two devices claiming
-- the same player is adjudicated by the partial unique index, not by RLS.
create policy player_claims_insert_self on player_claims for insert with check (user_id = auth.uid());
-- A player may release (only) their own claim; the host may release/reassign
-- anyone's. The trigger below stops a non-host from changing anything besides
-- released_at on their own row (e.g. hijacking someone else's claim).
create policy player_claims_update on player_claims for update
  using (is_host() or user_id = auth.uid())
  with check (is_host() or user_id = auth.uid());

create or replace function enforce_claim_self_release()
returns trigger
language plpgsql
as $$
begin
  if not is_host() then
    if old.user_id <> auth.uid() then
      raise exception 'not your claim';
    end if;
    if new.user_id <> old.user_id or new.player_id <> old.player_id or new.game_id <> old.game_id then
      raise exception 'players may only release their own claim, not reassign it';
    end if;
    if new.released_at is null then
      raise exception 'players may only set released_at on their own claim';
    end if;
  end if;
  return new;
end;
$$;

create trigger player_claims_before_update
  before update on player_claims
  for each row execute function enforce_claim_self_release();

-- ── hands ─────────────────────────────────────────────────────────────────────
create policy hands_select_public on hands for select using (true);
create policy hands_insert_host on hands for insert with check (is_host());
create policy hands_update_host on hands for update using (is_host()) with check (is_host());
-- No DELETE policy: hands are never deleted, only completed/reset in place.

-- ── community_cards ───────────────────────────────────────────────────────────
create policy community_cards_select_public on community_cards for select using (true);
create policy community_cards_insert_host on community_cards for insert with check (is_host());
create policy community_cards_delete_host on community_cards for delete using (is_host());

-- ── player_hole_cards — the policy the whole security model hinges on ───────
create policy player_hole_cards_select on player_hole_cards for select
  using (is_host() or player_id = claimed_player_id());
create policy player_hole_cards_insert_host on player_hole_cards for insert with check (is_host());
create policy player_hole_cards_delete_host on player_hole_cards for delete using (is_host());

-- ── chip_transactions / xp_transactions ──────────────────────────────────────
-- Public-readable (transparent scoreboard — §12/§27 show these histories
-- publicly). INSERT is host-only. UPDATE is restricted to the two
-- undo-bookkeeping columns; every other column is immutable once written.
-- DELETE has no policy at all: rows are permanent, forever.
create policy chip_transactions_select_public on chip_transactions for select using (true);
create policy chip_transactions_insert_host on chip_transactions for insert with check (is_host());
create policy chip_transactions_update_host on chip_transactions for update using (is_host()) with check (is_host());
revoke update on chip_transactions from authenticated, anon;
grant update (undone_at, reversed_by_transaction_id) on chip_transactions to authenticated;

create policy xp_transactions_select_public on xp_transactions for select using (true);
create policy xp_transactions_insert_host on xp_transactions for insert with check (is_host());
create policy xp_transactions_update_host on xp_transactions for update using (is_host()) with check (is_host());
revoke update on xp_transactions from authenticated, anon;
grant update (undone_at, reversed_by_transaction_id) on xp_transactions to authenticated;

-- ── powerups / chaos_cards (static catalogs, seeded by migration only) ──────
create policy powerups_select_public on powerups for select using (true);
create policy chaos_cards_select_public on chaos_cards for select using (true);

-- ── player_powerups ───────────────────────────────────────────────────────────
create policy player_powerups_select_public on player_powerups for select using (true);
create policy player_powerups_insert_host on player_powerups for insert with check (is_host());
create policy player_powerups_update_host on player_powerups for update using (is_host()) with check (is_host());

-- ── chaos_events ───────────────────────────────────────────────────────────────
create policy chaos_events_select_public on chaos_events for select using (true);
create policy chaos_events_insert_host on chaos_events for insert with check (is_host());
create policy chaos_events_update_host on chaos_events for update using (is_host()) with check (is_host());

-- ── achievements ───────────────────────────────────────────────────────────────
create policy achievements_select_public on achievements for select using (true);
create policy achievements_insert_host on achievements for insert with check (is_host());

-- ── player_achievements ─────────────────────────────────────────────────────
create policy player_achievements_select_public on player_achievements for select using (true);
create policy player_achievements_insert_host on player_achievements for insert with check (is_host());
create policy player_achievements_update_host on player_achievements for update using (is_host()) with check (is_host());

-- ── game_events ────────────────────────────────────────────────────────────────
create policy game_events_select_public on game_events for select using (true);
create policy game_events_insert_host on game_events for insert with check (is_host());
