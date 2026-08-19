"use client";

import Link from "next/link";
import { BookOpen, History } from "lucide-react";
import { useGame } from "@/lib/game/provider";
import { HeroStatus } from "@/components/game/hero-status";
import { ChaosBanner } from "@/components/game/chaos-banner";
import { CommunityBoard } from "@/components/game/community-board";
import { PlayerSelect } from "@/components/game/player-select";
import { MyHandPanel } from "@/components/game/my-hand-panel";
import { PlayerTable } from "@/components/game/player-table";
import { Leaderboard } from "@/components/game/leaderboard";
import { XpFeed } from "@/components/game/xp-feed";
import { WinnerReveal } from "@/components/game/winner-reveal";

export default function Home() {
  const { myClaim, game } = useGame();
  const finished = game?.status === "finished";

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:py-10">
      <div id="game-top">
        <HeroStatus />
      </div>
      {finished ? (
        <WinnerReveal />
      ) : (
        <>
          <ChaosBanner />
          <PlayerSelect />
          {myClaim && <MyHandPanel />}
          <CommunityBoard />
        </>
      )}
      <PlayerTable />
      <Leaderboard />
      <XpFeed />

      <div className="flex flex-wrap justify-center gap-3 pb-4 text-sm">
        <Link href="/guide" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-gold">
          <BookOpen className="size-4" />
          How poker hands work
        </Link>
        <Link href="/history" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-gold">
          <History className="size-4" />
          Game history
        </Link>
      </div>
    </main>
  );
}
