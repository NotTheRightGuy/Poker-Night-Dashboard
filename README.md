# Inventory Pod Poker Night

A live Texas Hold'em tracker for a one-night office poker event, built on Next.js (App Router) and Supabase (Postgres, Auth, Realtime, RLS).

- **Public view** (`/`) — no login. Live status, community cards, the table, leaderboards, and a per-player "select your name" flow that unlocks a private hand-guidance panel.
- **Host dashboard** (`/host`) — Supabase-authenticated. Runs the entire game: dealing, chips, XP, chaos cards, power-ups, undo.
- **Display mode** (`/display`) — large-type, minimal-interaction view meant for a TV/projector.
- **Guide** (`/guide`) and **History** (`/history`) — public reference and recap pages.

## 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com) (or point at an existing one). You'll need three values from **Project Settings → API**:

- Project URL
- **Publishable key** (Supabase's current name for what used to be the `anon` key)
- **Secret key** (current name for what used to be the `service_role` key — only ever used locally by `scripts/create-host.ts`, never shipped to the browser or a deployed route)

Copy `.env.example` to `.env.local` and fill these in:

```bash
cp .env.example .env.local
```

In **Authentication → Providers**, enable **Anonymous sign-ins** — this is how a player privately claims their own hole cards without a real account (see `player_claims` in the schema and `USE OF Anonymous Auth` note below).

## 2. Run the database migrations

Apply the five files in `supabase/migrations/` **in order** — either paste each into the Supabase SQL Editor, or with the Supabase CLI:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

- `0001_init_schema.sql` — every table.
- `0002_rls_policies.sql` — Row Level Security. This is the actual security boundary: hole cards are only ever readable by the host or the session that claimed that specific player — never by the public API, and never by frontend filtering.
- `0003_seed_catalogs.sql` — the 3 power-ups, 3 chaos cards, and the 7 preset "host achievement" flavor names.
- `0004_functions_triggers.sql` — every RPC the app calls (dealing cards, awarding pots/chips/XP, triggering chaos, undo) plus the triggers that maintain cached chip/XP balances and the activity-feed log.
- `0005_enable_realtime.sql` — **easy to forget, and the app looks broken without it**: RLS controls who can *read* a row, but a `postgres_changes` subscription only fires for tables added to the `supabase_realtime` publication, which is a separate step. Without this migration, every screen only ever shows what was on the page at load — nothing updates live until you refresh.

## 3. Create the host account

There is no sign-up page — hosts are provisioned once, locally, with the secret key:

```bash
npm install
npx tsx scripts/create-host.ts "you@example.com" "a-strong-password" "Your Name"
```

Sign in at `/host/login` with that email/password afterward.

## 4. Run the app

```bash
npm run dev
```

Open `/host`, create the game (name, starting chips, blinds), add players, and you're live. Everyone else opens `/` (or `/display` on the projector) and watches it update in real time — no refresh needed.

## Project structure

```
app/                  routes (public pages, /host/*, /display, /guide, /history, /players/[id])
components/game/      shared public-facing UI (playing cards, leaderboard, hand guidance, ...)
components/host/      host-dashboard-only UI
components/ui/        shadcn components (built on @base-ui/react, not Radix — see note below)
lib/poker/            deterministic hand evaluator + plain-language hand explanations
lib/game/             domain types, the realtime GameProvider, RPC action wrappers, static XP/rules content
lib/supabase/         browser + server Supabase clients
supabase/migrations/  the whole schema, RLS policies, and RPCs
scripts/create-host.ts  one-off host account provisioning (secret key, never deployed as an endpoint)
```

## Notable design decisions

- **Player identity is Supabase Anonymous Auth, not a name in the URL.** Selecting your name calls `signInAnonymously()`, which creates a real auth session; a `player_claims` row binds that session to the chosen player. RLS checks that claim on every read of `player_hole_cards` — an unclaimed or wrong session gets zero rows from Postgres itself, not from client-side hiding.
- **Chips and XP are append-only ledgers** (`chip_transactions` / `xp_transactions`), not columns you can overwrite. `players.chip_count` / `xp_total` are caches maintained only by database triggers; direct client writes to those columns are revoked at the SQL grant level, so the only way to change a balance is to insert a ledger row. "Undo Last Action" works by inserting an equal-and-opposite reversal row grouped by the original action's `action_id`, never by deleting history.
- **The poker hand evaluator is hand-written, deterministic TypeScript** (`lib/poker/evaluator.ts`) — no external poker library, no LLM involvement in scoring. See its test suite for the edge cases it covers (wheel straights, kicker ties, category ordering).
- **UI components are `@base-ui/react`-based** (via shadcn's `base-nova` preset), not Radix. There's no `asChild` prop — use the `render` prop instead (e.g. `<DialogTrigger render={<Button/>}>Open</DialogTrigger>`), and component state is exposed via `data-open`/`data-checked` attributes rather than Radix's `data-state`.
- **The app is a single, fixed dark "premium casino" theme** — there's no light/dark toggle, by design; it's meant to look like a purpose-built event screen, not a themeable dashboard.
