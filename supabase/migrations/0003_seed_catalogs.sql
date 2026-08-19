-- Inventory Pod Poker Night — fixed catalog seed data
-- The §13 "Poker XP" table (Win a hand +10, etc.) is intentionally NOT a
-- database table — it never changes, so it lives as a static constant in
-- lib/game/xpRules.ts and is only ever used to pre-fill the host's "Award XP"
-- quick-pick buttons. What's seeded here are the three catalogs that the app
-- actually needs to reference by foreign key.

insert into powerups (code, name, description, sort_order) values
  ('PEEK', 'Peek', 'Privately look at one random card from the top of the deck before the next community card is dealt. The card is returned and the deck is reshuffled.', 1),
  ('SWAP', 'Swap', 'Discard one hole card and receive one random replacement. Only available before the flop.', 2),
  ('SHIELD', 'Shield', 'If you lose the current hand, recover 50% of the chips you personally put into the pot during that hand. Must be declared before showdown.', 3)
on conflict (code) do nothing;

insert into chaos_cards (code, name, description, sort_order) values
  ('BULL_MARKET', 'Bull Market', 'Everyone receives +50 chips before the next hand.', 1),
  ('MARKET_CRASH', 'Market Crash', 'Everyone pays 25 chips into the central pot before the next hand.', 2),
  ('SILENT_ROUND', 'Silent Round', 'Nobody may speak during the next hand. Talking results in a 10-chip penalty.', 3)
on conflict (code) do nothing;

-- Host Achievement XP presets (§13) — flavor names the host can award with a
-- custom 20-50 XP amount and reason. The host can also type an entirely new
-- name at the table; award_achievement() in 0004 creates it on the fly.
insert into achievements (code, name, description, xp_reward, is_preset) values
  ('COMEBACK_KID', 'Comeback Kid', 'Fought back from the brink and turned the game around.', 30, true),
  ('ABSOLUTE_MENACE', 'Absolute Menace', 'Been an unstoppable force at the table.', 30, true),
  ('FEARLESS', 'Fearless', 'Made a bold move nobody else would dare.', 30, true),
  ('PLOT_TWIST', 'Plot Twist', 'Pulled off a completely unexpected turn of events.', 30, true),
  ('LUCKY_BASTARD', 'Lucky Bastard', 'Got away with an absurdly lucky card.', 30, true),
  ('DRAMA_QUEEN', 'Drama Queen', 'Brought maximum drama to the table.', 30, true),
  ('UNO_REVERSE', 'UNO Reverse', 'Turned someone else''s move completely against them.', 30, true)
on conflict (code) do nothing;
