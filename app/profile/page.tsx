import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Stable link for the bottom-nav "Profile" tab regardless of claim state —
// sends you to your own profile if you've claimed a seat, or back home to
// pick your name otherwise.
export default async function ProfileRedirectPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (userData.user) {
    const { data: claim } = await supabase
      .from("player_claims")
      .select("player_id")
      .eq("user_id", userData.user.id)
      .is("released_at", null)
      .maybeSingle();

    if (claim) redirect(`/players/${claim.player_id}`);
  }

  redirect("/");
}
