"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Spade } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }

    const { data: hostProfile } = await supabase
      .from("host_profiles")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (!hostProfile) {
      setError("That account isn't set up as a host for this game.");
      await supabase.auth.signOut();
      setSubmitting(false);
      return;
    }

    router.push("/host");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-8 shadow-xl felt-panel">
        <div className="flex flex-col items-center gap-2 text-center">
          <Spade className="size-9 text-gold" />
          <h1 className="font-heading text-2xl tracking-wide text-cream">Host Sign In</h1>
          <p className="text-sm text-muted-foreground">Inventory Pod Poker Night</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
}
