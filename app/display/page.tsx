"use client";

import { useGame } from "@/lib/game/provider";
import { HeroStatus } from "@/components/game/hero-status";
import { ChaosBanner } from "@/components/game/chaos-banner";
import { CommunityBoard } from "@/components/game/community-board";
import { PlayerTable } from "@/components/game/player-table";
import { Leaderboard } from "@/components/game/leaderboard";
import { XpFeed } from "@/components/game/xp-feed";
import { WinnerReveal } from "@/components/game/winner-reveal";

// TV/projector mode — large type, minimal interaction, meant to be left open
// on a big screen while the host runs /host from another device.
export default function DisplayPage() {
  const { game } = useGame();

  if (game?.status === "finished") {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-8">
        <WinnerReveal />
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-8 py-10">
      <HeroStatus />
      <ChaosBanner />
      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-8">
          <CommunityBoard />
          <PlayerTable />
        </div>
        <div className="space-y-8">
          <Leaderboard />
          <XpFeed />
        </div>
      </div>
    </main>
  );
}
