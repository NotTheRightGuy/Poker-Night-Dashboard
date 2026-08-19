import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Server-side auth guard for everything under /host except /host/login
// (which lives as a sibling outside this route group, so it's never
// wrapped by this layout). Never rely on frontend state alone for this —
// the real enforcement is Supabase RLS's is_host() checks on every write,
// this guard just keeps an unauthorized visitor from loading the dashboard
// UI at all.
export default async function HostDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/host/login");
  }

  const { data: hostProfile } = await supabase
    .from("host_profiles")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!hostProfile) {
    redirect("/host/login");
  }

  return <>{children}</>;
}
