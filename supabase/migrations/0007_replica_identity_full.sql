-- Inventory Pod Poker Night — fix DELETE events never reaching realtime subscribers
--
-- Root cause of "editing a player's hole cards adds new ones without
-- removing the old" (and the equivalent for community cards / removed
-- players): every realtime subscription in lib/game/provider.tsx filters by
-- `game_id=eq.<gameId>`, but `game_id` is not these tables' primary key.
--
-- Postgres's logical replication (what Realtime is built on) only includes a
-- row's PRIMARY KEY columns in the "old row" of a DELETE (or UPDATE) event by
-- default ("REPLICA IDENTITY DEFAULT"). Since `game_id` isn't part of the
-- primary key, it's simply absent from the old-row payload — so Realtime has
-- no value to test the `game_id=eq.<gameId>` filter against, and silently
-- never delivers the DELETE event to filtered subscribers at all.
--
-- The DELETE itself always succeeds correctly in Postgres (confirmed: the
-- database ends up with exactly the right rows) — this was purely a client
-- state bug. The client's local cache only ever received the *new* rows via
-- INSERT and never got told the *old* rows were gone, so they piled up on
-- screen until a full refresh re-fetched the true state from the database.
--
-- REPLICA IDENTITY FULL makes Postgres include every column of the old row
-- in the WAL record, so the game_id filter can actually be evaluated and the
-- DELETE event gets delivered. Scoped only to the tables that (a) actually
-- have rows deleted from them and (b) are filtered on a non-primary-key
-- column — the append-only ledger tables never have deletes at all, so they
-- don't need this.
alter table players replica identity full;
alter table player_hole_cards replica identity full;
alter table community_cards replica identity full;
