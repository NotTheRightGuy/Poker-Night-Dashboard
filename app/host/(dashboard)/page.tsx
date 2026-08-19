"use client";

import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HostHeader } from "@/components/host/host-header";
import { NoGameSetup } from "@/components/host/no-game-setup";
import { GameControlPanel } from "@/components/host/game-control-panel";
import { PlayerManager } from "@/components/host/player-manager";
import { HoleCardManager } from "@/components/host/hole-card-manager";
import { CommunityCardManager } from "@/components/host/community-card-manager";
import { SettleHandPanel } from "@/components/host/settle-hand-panel";
import { ChipXpManager } from "@/components/host/chip-xp-manager";
import { AchievementPanel } from "@/components/host/achievement-panel";
import { ChaosPanel } from "@/components/host/chaos-panel";
import { PowerupPanel } from "@/components/host/powerup-panel";
import { UndoResetBar } from "@/components/host/undo-reset-bar";
import { QuickActionBar } from "@/components/host/quick-action-bar";
import { useGame } from "@/lib/game/provider";

// The /host control room. Auth is already enforced server-side by
// app/host/(dashboard)/layout.tsx before this ever renders, so this file is
// pure UI: no game yet -> setup form, otherwise the full dashboard organized
// into tabs (one tap to reach any section) plus a persistent quick action
// bar for the handful of highest-frequency actions.
export default function HostDashboardPage() {
  const { game, loading } = useGame();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <HostHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-3 pb-28 pt-4 sm:px-4">
        {!game ? (
          <NoGameSetup />
        ) : (
          <Tabs defaultValue="control" className="gap-4">
            <TabsList className="flex-wrap">
              <TabsTrigger value="control">Control</TabsTrigger>
              <TabsTrigger value="players">Players</TabsTrigger>
              <TabsTrigger value="cards">Cards</TabsTrigger>
              <TabsTrigger value="ledger">Chips &amp; XP</TabsTrigger>
              <TabsTrigger value="extras">Extras</TabsTrigger>
            </TabsList>

            <TabsContent value="control" className="space-y-4">
              <GameControlPanel game={game} />
              <SettleHandPanel />
              <UndoResetBar game={game} />
            </TabsContent>

            <TabsContent value="players">
              <PlayerManager game={game} />
            </TabsContent>

            <TabsContent value="cards" className="space-y-4">
              <HoleCardManager />
              <CommunityCardManager />
            </TabsContent>

            <TabsContent value="ledger">
              <ChipXpManager game={game} />
            </TabsContent>

            <TabsContent value="extras" className="space-y-4">
              <AchievementPanel game={game} />
              <ChaosPanel game={game} />
              <PowerupPanel game={game} />
            </TabsContent>
          </Tabs>
        )}
      </main>
      {game && <QuickActionBar game={game} />}
    </div>
  );
}
