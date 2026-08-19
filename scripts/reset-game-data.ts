// Wipes all transactional/history data for the current game so you can start
// a fresh event from a clean slate — keeps the `players` roster (and
// `host_profiles`) intact, just resets each player's stats back to their
// starting values, and resets the game's own progress fields.
//
// This is deliberately NOT exposed anywhere in the running app (no RPC, no
// route) — the app's own "Reset Game" button intentionally only changes
// status and never deletes history, because an accidental click during a
// live event should never be able to destroy data. This script is the
// opposite: an explicit, local, destructive action for you to run between
// events or while testing.
//
// Usage:
//   npx tsx scripts/reset-game-data.ts            # dry run — shows what would happen
//   npx tsx scripts/reset-game-data.ts --yes      # actually deletes/resets

import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local on disk — assume the shell already has these vars set.
}

const TRANSACTIONAL_TABLES = [
  "chip_transactions",
  "xp_transactions",
  "player_powerups",
  "chaos_events",
  "player_achievements",
  "game_events",
  "player_hole_cards",
  "community_cards",
  // `hands` last — several of the tables above reference hand_id with no
  // ON DELETE action, so their rows must be gone before a hand can be deleted.
  "hands",
  // Not a "hand" table, but still transactional/session state we want fresh —
  // players re-claim their seats for the new event.
  "player_claims",
] as const;

async function main() {
  const confirmed = process.argv.includes("--yes");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set (see .env.local).");
    process.exit(1);
  }

  const admin = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: game, error: gameError } = await admin
    .from("games")
    .select("id, name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (gameError) {
    console.error(`Failed to look up the current game: ${gameError.message}`);
    process.exit(1);
  }

  if (!game) {
    console.log("No game exists yet — nothing to reset.");
    return;
  }

  const { data: players, error: playersError } = await admin
    .from("players")
    .select("id, display_name, starting_chips")
    .eq("game_id", game.id);

  if (playersError) {
    console.error(`Failed to look up players: ${playersError.message}`);
    process.exit(1);
  }

  console.log(`Game: "${game.name}" (${game.id})`);
  console.log(`Players kept (${players?.length ?? 0}): ${players?.map((p) => p.display_name).join(", ") || "none"}`);
  console.log("Will delete every row in, for this game only:");
  for (const table of TRANSACTIONAL_TABLES) console.log(`  - ${table}`);
  console.log("Will reset each player's chip_count/xp_total/hands_won/hands_played/eliminations/status.");
  console.log("Will reset the game's current_hand_number/current_phase/status/started_at/ended_at.");

  if (!confirmed) {
    console.log("\nDry run only — nothing was changed. Re-run with --yes to actually do this.");
    return;
  }

  for (const table of TRANSACTIONAL_TABLES) {
    const { error } = await admin.from(table).delete().eq("game_id", game.id);
    if (error) {
      console.error(`Failed to clear ${table}: ${error.message}`);
      process.exit(1);
    }
    console.log(`Cleared ${table}.`);
  }

  const { error: resetPlayersError } = await admin
    .from("players")
    .update({
      chip_count: 0, // set per-player below, since starting_chips varies
      xp_total: 0,
      hands_won: 0,
      hands_played: 0,
      eliminations: 0,
      status: "active",
    })
    .eq("game_id", game.id);

  if (resetPlayersError) {
    console.error(`Failed to reset players: ${resetPlayersError.message}`);
    process.exit(1);
  }

  // chip_count needs each player's own starting_chips, not a single shared value.
  for (const player of players ?? []) {
    const { error } = await admin.from("players").update({ chip_count: player.starting_chips }).eq("id", player.id);
    if (error) {
      console.error(`Failed to reset chip_count for ${player.display_name}: ${error.message}`);
      process.exit(1);
    }
  }
  console.log("Reset player stats to starting values.");

  const { error: resetGameError } = await admin
    .from("games")
    .update({
      current_hand_number: 0,
      current_phase: "preflop",
      status: "not_started",
      started_at: null,
      ended_at: null,
    })
    .eq("id", game.id);

  if (resetGameError) {
    console.error(`Failed to reset game state: ${resetGameError.message}`);
    process.exit(1);
  }
  console.log("Reset game status to Not Started.");

  console.log("\nClean slate ready.");
}

main();
