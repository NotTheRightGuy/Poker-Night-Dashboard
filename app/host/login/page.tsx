import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function HostLoginPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (userData.user) {
    const { data: hostProfile } = await supabase
      .from("host_profiles")
      .select("user_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (hostProfile) redirect("/host");
  }

  return <LoginForm />;
}
