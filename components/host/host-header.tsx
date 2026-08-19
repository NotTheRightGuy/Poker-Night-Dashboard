"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Spade } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectionStatus } from "@/components/game/connection-status";
import { GameStatusBadge } from "@/components/game/status-badge";
import { useGame } from "@/lib/game/provider";
import { createClient } from "@/lib/supabase/client";

// Persistent top bar for the host area — game identity, live connection
// state, and sign-out. Mounted once above the tab content in the dashboard
// page, not tied to whether a game exists yet.
export function HostHeader() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { game } = useGame();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/host/login");
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center gap-3">
        <Spade className="size-6 text-gold" />
        <div>
          <p className="font-heading text-lg leading-tight tracking-wide text-foreground">
            {game?.name ?? "Host Dashboard"}
          </p>
          <ConnectionStatus />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {game && <GameStatusBadge status={game.status} />}
        <Button type="button" variant="outline" size="sm" onClick={handleSignOut}>
          <LogOut className="size-3.5" />
          Sign Out
        </Button>
      </div>
    </header>
  );
}
