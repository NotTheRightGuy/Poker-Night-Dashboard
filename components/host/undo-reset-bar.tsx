"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeading } from "@/components/game/section-heading";
import { setGameStatus, undoLastAction } from "@/lib/game/actions";
import { createClient } from "@/lib/supabase/client";
import type { Game } from "@/lib/game/types";

// "Reset" here only ever means "set status back to not_started" — there is
// no destructive DB wipe RPC, and history (players, hands, transactions)
// must be preserved, so this is a soft reset of the game flow, gated behind
// a type-the-game-name confirmation rather than a single click.
export function UndoResetBar({ game }: { game: Game }) {
  const supabase = useMemo(() => createClient(), []);
  const [undoing, setUndoing] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);

  async function handleUndo() {
    setUndoing(true);
    try {
      await undoLastAction(supabase, game.id);
      toast.success("Last action undone");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nothing to undo");
    } finally {
      setUndoing(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      await setGameStatus(supabase, game.id, "not_started");
      toast.success("Game reset to Not Started");
      setResetOpen(false);
      setConfirmText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset game");
    } finally {
      setResetting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <SectionHeading eyebrow="Safety" title="Undo & Reset" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium">Undo Last Action</p>
            <p className="text-xs text-muted-foreground">
              Reverses the most recent chip, XP, chaos, power-up, or achievement action. Single level only — an undo can&apos;t
              itself be undone.
            </p>
          </div>
          <Button type="button" variant="outline" disabled={undoing} onClick={handleUndo}>
            <Undo2 className="size-4" />
            Undo Last Action
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
          <div>
            <p className="text-sm font-medium text-destructive">Reset Game</p>
            <p className="text-xs text-muted-foreground">
              Sets status back to Not Started. Players, hands, chips, XP, and all history stay intact — there is no wipe. Use
              this for a soft restart of the game flow only.
            </p>
          </div>
          <Dialog
            open={resetOpen}
            onOpenChange={(next) => {
              setResetOpen(next);
              if (!next) setConfirmText("");
            }}
          >
            <DialogTrigger render={<Button type="button" variant="destructive" />}>
              <AlertTriangle className="size-4" />
              Reset Game
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset “{game.name}”?</DialogTitle>
                <DialogDescription>
                  Type the game name below to confirm. This only changes status to Not Started — no data is deleted.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-reset">Type “{game.name}” to confirm</Label>
                <Input id="confirm-reset" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setResetOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={confirmText !== game.name || resetting}
                  onClick={handleReset}
                >
                  Confirm Reset
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
