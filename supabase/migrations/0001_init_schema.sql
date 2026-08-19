-- Inventory Pod Poker Night — initial schema
-- Card string format used throughout: rank char [2-9TJQKA] + suit char [shdc], e.g. "As", "Td".

create extension if not exists pgcrypto;

-- ── Hosts ───────────────────────────────────────────────────────────────────
-- Explicit allow-list, NOT auto-populated on auth.users insert (anonymous
-- player sessions also create auth.users rows). Hosts are provisioned only by
-- scripts/create-host.ts using the service-role key.
create table host_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

-- ── Games ───────────────────────────────────────────────────────────────────
create table games (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Inventory Pod Poker Night',
  status text not null default 'not_started'
    check (status in ('not_started', 'registration', 'live', 'break', 'final_table', 'finished')),
  current_hand_number int not null default 0,
  current_phase text not null default 'preflop'
    check (current_phase in ('preflop', 'flop', 'turn', 'river', 'showdown')),
  small_blind int not null default 5,
  big_blind int not null default 10,
  starting_chips int not null default 1000,
  created_by uuid references host_profiles(user_id),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz
);

-- ── Players ─────────────────────────────────────────────────────────────────
-- chip_count / xp_total / hands_won / hands_played / eliminations are caches
-- derived from the append-only ledgers below. They are never writable
-- directly by clients (see column-level grants in 0002) — only by the
-- SECURITY DEFINER triggers/functions in 0004.
create table players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  display_name text not null,
  seat_number int,
  status text not null default 'active'
    check (status in ('active', 'folded', 'all_in', 'eliminated', 'away')),
  starting_chips int not null,
  chip_count int not null default 0,
  xp_total int not null default 0,
  hands_won int not null default 0,
  hands_played int not null default 0,
  eliminations int not null default 0,
  created_at timestamptz not null default now(),
  unique (game_id, display_name)
);

create index players_game_id_idx on players(game_id);

-- ── Player claims (anonymous-auth player identity) ─────────────────────────
-- A player picks their name -> supabase.auth.signInAnonymously() -> a row
-- here binds that session's auth.uid() to the chosen player_id. The two
-- partial unique indexes are what actually adjudicate the "two devices claim
-- the same player" race — RLS's WITH CHECK only proves "claiming for myself",
-- not "nobody else got there first".
create table player_claims (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  released_at timestamptz
);

create unique index player_claims_active_player_uidx on player_claims(player_id) where released_at is null;
create unique index player_claims_active_user_uidx on player_claims(user_id) where released_at is null;
create index player_claims_game_id_idx on player_claims(game_id);

-- ── Hands ───────────────────────────────────────────────────────────────────
create table hands (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  hand_number int not null,
  phase text not null default 'preflop'
    check (phase in ('preflop', 'flop', 'turn', 'river', 'showdown', 'complete')),
  pot_total int not null default 0,
  dealer_player_id uuid references players(id),
  winner_player_id uuid references players(id),
  winning_hand_name text,
  winning_hand_score int,
  notes text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  unique (game_id, hand_number)
);

create index hands_game_id_idx on hands(game_id);

-- ── Community cards ─────────────────────────────────────────────────────────
-- game_id is denormalized (also derivable via hand_id -> hands.game_id)
-- because Supabase Realtime's postgres_changes filter only supports equality
-- on a column of the changed table itself — it cannot join.
create table community_cards (
  id uuid primary key default gen_random_uuid(),
  hand_id uuid not null references hands(id) on delete cascade,
  game_id uuid not null references games(id) on delete cascade,
  street text not null check (street in ('flop', 'turn', 'river')),
  card_index int not null check (card_index between 0 and 4),
  card text not null check (card ~ '^[2-9TJQKA][shdc]$'),
  created_at timestamptz not null default now(),
  unique (hand_id, card_index),
  unique (hand_id, card)
);

create index community_cards_game_id_idx on community_cards(game_id);

-- ── Player hole cards ────────────────────────────────────────────────────────
-- The single most security-critical table in the schema — see RLS in 0002.
create table player_hole_cards (
  id uuid primary key default gen_random_uuid(),
  hand_id uuid not null references hands(id) on delete cascade,
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  card_index int not null check (card_index in (0, 1)),
  card text not null check (card ~ '^[2-9TJQKA][shdc]$'),
  created_at timestamptz not null default now(),
  unique (hand_id, player_id, card_index),
  unique (hand_id, card)
);

create index player_hole_cards_game_id_idx on player_hole_cards(game_id);

-- ── Chip ledger (append-only) ────────────────────────────────────────────────
-- action_id groups multi-row compound actions (e.g. a Chaos Card debiting
-- every player at once) so undo_last_action() can reverse them atomically.
create table chip_transactions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  hand_id uuid references hands(id) on delete set null,
  action_id uuid not null default gen_random_uuid(),
  type text not null check (type in ('buy_in', 'pot_award', 'manual_adjustment', 'chaos_event', 'reversal')),
  amount int not null check (amount <> 0),
  reason text,
  created_by uuid references host_profiles(user_id),
  created_at timestamptz not null default now(),
  undone_at timestamptz,
  reversed_by_transaction_id uuid references chip_transactions(id),
  reverses_transaction_id uuid references chip_transactions(id)
);

create index chip_transactions_game_id_idx on chip_transactions(game_id);
create index chip_transactions_player_id_idx on chip_transactions(player_id);
create index chip_transactions_action_id_idx on chip_transactions(action_id);

-- ── XP ledger (append-only) ──────────────────────────────────────────────────
create table xp_transactions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  hand_id uuid references hands(id) on delete set null,
  action_id uuid not null default gen_random_uuid(),
  amount int not null check (amount <> 0),
  reason text not null,
  source text not null default 'host_manual'
    check (source in ('poker_rule', 'host_achievement', 'host_manual', 'undo')),
  created_by uuid references host_profiles(user_id),
  created_at timestamptz not null default now(),
  undone_at timestamptz,
  reversed_by_transaction_id uuid references xp_transactions(id),
  reverses_transaction_id uuid references xp_transactions(id)
);

create index xp_transactions_game_id_idx on xp_transactions(game_id);
create index xp_transactions_player_id_idx on xp_transactions(player_id);
create index xp_transactions_action_id_idx on xp_transactions(action_id);

-- ── Power-ups ─────────────────────────────────────────────────────────────────
-- Exactly 3, host-awarded (never player-purchased — no cost/XP field here).
create table powerups (
  code text primary key,
  name text not null,
  description text not null,
  sort_order int not null default 0
);

create table player_powerups (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  powerup_code text not null references powerups(code),
  action_id uuid not null default gen_random_uuid(),
  status text not null default 'available' check (status in ('available', 'used', 'locked')),
  acquired_at timestamptz not null default now(),
  used_at timestamptz,
  used_in_hand_id uuid references hands(id),
  revoked_at timestamptz
);

create index player_powerups_game_id_idx on player_powerups(game_id);

-- ── Chaos cards ───────────────────────────────────────────────────────────────
create table chaos_cards (
  code text primary key,
  name text not null,
  description text not null,
  sort_order int not null default 0
);

create table chaos_events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  hand_id uuid references hands(id),
  chaos_code text not null references chaos_cards(code),
  action_id uuid not null default gen_random_uuid(),
  affected_player_id uuid references players(id),
  triggered_by uuid references host_profiles(user_id),
  triggered_at timestamptz not null default now(),
  reverted_at timestamptz
);

create index chaos_events_game_id_idx on chaos_events(game_id);

-- ── Achievements (host-awarded flavor XP, distinct from the static Poker XP
-- table which lives in the frontend as it never changes) ────────────────────
-- Seeded with the spec's example names; the host can also create brand new
-- ones on the fly (see award_achievement() in 0004). xp_reward here is only a
-- UI-suggested default — the actual amount given is snapshotted per-award on
-- player_achievements.xp_awarded, since the spec allows 20-50 XP to vary each
-- time even for the same named achievement.
create table achievements (
  code text primary key,
  name text not null,
  description text,
  xp_reward int not null default 30,
  is_preset boolean not null default true,
  created_by uuid references host_profiles(user_id),
  created_at timestamptz not null default now()
);

create table player_achievements (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  achievement_code text not null references achievements(code),
  xp_awarded int not null default 0,
  hand_id uuid references hands(id),
  action_id uuid not null default gen_random_uuid(),
  awarded_by uuid references host_profiles(user_id),
  earned_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index player_achievements_game_id_idx on player_achievements(game_id);

-- ── Game events (narrative activity feed / audit log) ───────────────────────
-- Populated mostly by SECURITY DEFINER-free triggers in 0004 (the host is
-- always the invoker of whatever caused the event, so no elevated privilege
-- is needed) plus direct host inserts for ad-hoc log entries.
create table game_events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  hand_id uuid references hands(id),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references host_profiles(user_id),
  created_at timestamptz not null default now()
);

create index game_events_game_id_idx on game_events(game_id);
