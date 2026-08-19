"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Coins, PlayCircle, Sparkles, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChipAdjustForm } from "./chip-adjust-form";
import { XpAwardForm } from "./xp-award-form";
import { startNextHand, undoLastAction } from "@/lib/game/actions";
import { createClient } from "@/lib/supabase/client";
import type { Game } from "@/lib/game/types";

// Persistent, always-reachable control room bar — the handful of
// highest-frequency host actions. Next Hand / Undo fire directly (they're
// fast and reversible-ish via undo); Chips / XP open a compact dialog
// because they need a player + amount picked first.
export function QuickActionBar({ game }: { game: Game }) {
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState<"hand" | "undo" | null>(null);
  const [chipsOpen, setChipsOpen] = useState(false);
  const [xpOpen, setXpOpen] = useState(false);

  async function handleNextHand() {
    setBusy("hand");
    try {
      await startNextHand(supabase, game.id);
      toast.success(`Hand #${game.current_hand_number + 1} started`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start next hand");
    } finally {
      setBusy(null);
    }
  }

  async function handleUndo() {
    setBusy("undo");
    try {
      await undoLastAction(supabase, game.id);
      toast.success("Last action undone");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nothing to undo");
    } finally {
      setBusy(null);
    }
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-5xl items-stretch gap-2">
        <Dialog open={chipsOpen} onOpenChange={setChipsOpen}>
          <DialogTrigger render={<Button type="button" variant="outline" size="lg" className="h-14 flex-1 flex-col gap-0.5" />}>
            <Coins className="size-5 text-gold" />
            <span className="text-xs">Chips</span>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Chips</DialogTitle>
            </DialogHeader>
            <ChipAdjustForm game={game} onDone={() => setChipsOpen(false)} />
          </DialogContent>
        </Dialog>

        <Dialog open={xpOpen} onOpenChange={setXpOpen}>
          <DialogTrigger render={<Button type="button" variant="outline" size="lg" className="h-14 flex-1 flex-col gap-0.5" />}>
            <Sparkles className="size-5 text-chart-4" />
            <span className="text-xs">XP</span>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Award XP</DialogTitle>
            </DialogHeader>
            <XpAwardForm game={game} onDone={() => setXpOpen(false)} />
          </DialogContent>
        </Dialog>

        <Button
          type="button"
          size="lg"
          className="h-14 flex-1 flex-col gap-0.5 bg-gold text-gold-foreground hover:bg-gold/80"
          disabled={busy === "hand"}
          onClick={handleNextHand}
        >
          <PlayCircle className="size-5" />
          <span className="text-xs">Next Hand</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-14 flex-1 flex-col gap-0.5"
          disabled={busy === "undo"}
          onClick={handleUndo}
        >
          <Undo2 className="size-5" />
          <span className="text-xs">Undo</span>
        </Button>
      </div>
    </nav>
  );
}
