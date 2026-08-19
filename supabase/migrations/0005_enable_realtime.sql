-- Inventory Pod Poker Night — enable Realtime replication
--
-- RLS and table grants control who can READ a row over the API; they say
-- nothing about whether postgres_changes subscribers get notified when a row
-- changes. That requires the table to be a member of the `supabase_realtime`
-- publication — a separate mechanism entirely. Without this, every
-- `.channel(...).on('postgres_changes', ...)` subscription in
-- lib/game/provider.tsx silently subscribes successfully and simply never
-- receives an event, which is why nothing updated live until a manual
-- refresh.
--
-- Written as a loop with an existence check so it's safe to re-run — a plain
-- `alter publication ... add table` errors if the table is already a member.
do $$
declare
  t text;
begin
  foreach t in array array[
    'games',
    'players',
    'player_claims',
    'hands',
    'community_cards',
    'player_hole_cards',
    'chip_transactions',
    'xp_transactions',
    'player_powerups',
    'chaos_events',
    'player_achievements',
    'game_events',
    'achievements'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
