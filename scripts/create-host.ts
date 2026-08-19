// One-off host provisioning script. Run locally with:
//   npx tsx scripts/create-host.ts "host@example.com" "a-strong-password" "Host Display Name"
//
// Uses the secret key (Supabase's current name for what used to be the
// service_role key) — never import this file, or anything that imports
// @supabase/supabase-js with the secret key, into app code that ships to the
// browser or a deployed Route Handler. This is deliberately a standalone
// script, not an API route, so no privileged account-creation endpoint ever
// exists on the deployed app.

import { createClient } from "@supabase/supabase-js";

try {
  // Node 20.6+ built-in — avoids adding a dotenv dependency just for this script.
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local on disk — assume the shell already has these vars set.
}

async function main() {
  const [email, password, displayName] = process.argv.slice(2);

  if (!email || !password || !displayName) {
    console.error('Usage: npx tsx scripts/create-host.ts "<email>" "<password>" "<display name>"');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set (see .env.local).");
    process.exit(1);
  }

  const admin = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    console.error(`Failed to create auth user: ${createError.message}`);
    process.exit(1);
  }

  const userId = created.user.id;

  const { error: profileError } = await admin.from("host_profiles").insert({ user_id: userId, display_name: displayName });

  if (profileError) {
    console.error(`Auth user created (id: ${userId}), but failed to insert host_profiles row: ${profileError.message}`);
    console.error("Fix manually with: insert into host_profiles (user_id, display_name) values ('" + userId + "', '" + displayName + "');");
    process.exit(1);
  }

  console.log(`Host account created: ${email} (${displayName}). You can now sign in at /host/login.`);
}

main();
