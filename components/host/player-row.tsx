"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, ShieldOff, Undo2, UserMinus, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayerAvatar } from "@/components/game/player-avatar";
import { PlayerStatusBadge } from "@/components/game/status-badge";
import { ChipStat, XpStat } from "@/components/game/stat-pill";
import { useGame } from "@/lib/game/provider";
import { eliminatePlayer, hostReleaseClaim, removePlayer, restorePlayer, updatePlayer } from "@/lib/game/actions";
import { createClient } from "@/lib/supabase/client";
import type { Player, PlayerStatus } from "@/lib/game/types";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: PlayerStatus[] = ["active", "folded", "all_in", "away"];
const STATUS_LABEL: Record<PlayerStatus, string> = {
  active: "Active",
  folded: "Folded",
  all_in: "All-In",
  eliminated: "Eliminated",
  away: "Away",
};

// One row in the roster — everything the host needs to do to a single
// player, inline, with the destructive/rarer actions tucked behind a small
// confirm dialog rather than a fully separate screen.
export function PlayerRow({ player }: { player: Player }) {
  const supabase = useMemo(() => createClient(), []);
  const { players, playerClaims } = useGame();
  const [editOpen, setEditOpen] = useState(false);
  const [eliminateOpen, setEliminateOpen] = useState(false);
  const [editName, setEditName] = useState(player.display_name);
  const [editChips, setEditChips] = useState(player.starting_chips);
  const [eliminatorId, setEliminatorId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const claim = playerClaims.find((c) => c.player_id === player.id && !c.released_at) ?? null;
  const otherActivePlayers = players.filter((p) => p.id !== player.id && p.status !== "eliminated");

  async function run(action: () => Promise<unknown>, successMessage?: string) {
    setBusy(true);
    try {
      await action();
      if (successMessage) toast.success(successMessage);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    await run(() => updatePlayer(supabase, player.id, { display_name: editName.trim(), starting_chips: editChips }));
    setEditOpen(false);
  }

  async function handleEliminate(e: React.FormEvent) {
    e.preventDefault();
    await run(
      () => eliminatePlayer(supabase, player.id, eliminatorId ?? undefined),
      `${player.display_name} eliminated`,
    );
    setEliminateOpen(false);
  }

  return (
    <Card size="sm" className={cn(player.status === "eliminated" && "opacity-60")}>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <PlayerAvatar name={player.display_name} dimmed={player.status === "eliminated"} />
          <div>
            <div className="flex items-center gap-2">
              <p className="font-heading text-lg leading-tight tracking-wide">{player.display_name}</p>
              {player.seat_number != null && (
                <span className="text-xs text-muted-foreground">Seat {player.seat_number}</span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <PlayerStatusBadge status={player.status} />
              <span className={cn("text-[0.65rem] uppercase tracking-wide", claim ? "text-chart-3" : "text-muted-foreground")}>
                {claim ? "Claimed" : "Unclaimed"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ChipStat value={player.chip_count} size="sm" />
          <XpStat value={player.xp_total} size="sm" />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_OPTIONS.map((status) => (
            <Button
              key={status}
              type="button"
              size="xs"
              variant={player.status === status ? "default" : "outline"}
              disabled={busy || player.status === "eliminated"}
              onClick={() => run(() => updatePlayer(supabase, player.id, { status }))}
            >
              {STATUS_LABEL[status]}
            </Button>
          ))}

          {player.status === "eliminated" ? (
            <Button
              type="button"
              size="xs"
              variant="outline"
              disabled={busy}
              onClick={() => run(() => restorePlayer(supabase, player.id), `${player.display_name} restored`)}
            >
              <Undo2 className="size-3" />
              Restore
            </Button>
          ) : (
            <Dialog open={eliminateOpen} onOpenChange={setEliminateOpen}>
              <DialogTrigger render={<Button type="button" size="xs" variant="destructive" disabled={busy} />}>
                <UserX className="size-3" />
                Eliminate
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Eliminate {player.display_name}?</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleEliminate} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Eliminated by (optional)</Label>
                    <Select value={eliminatorId ?? ""} onValueChange={(v) => setEliminatorId(v || null)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="No credit" />
                      </SelectTrigger>
                      <SelectContent>
                        {otherActivePlayers.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setEliminateOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="destructive" disabled={busy}>
                      {busy && <Loader2 className="size-3.5 animate-spin" />}
                      Confirm Elimination
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {claim && (
            <Button
              type="button"
              size="xs"
              variant="outline"
              disabled={busy}
              onClick={() => run(() => hostReleaseClaim(supabase, player.id), "Claim released")}
            >
              <ShieldOff className="size-3" />
              Release Claim
            </Button>
          )}

          <Dialog
            open={editOpen}
            onOpenChange={(next) => {
              setEditOpen(next);
              if (next) {
                setEditName(player.display_name);
                setEditChips(player.starting_chips);
              }
            }}
          >
            <DialogTrigger render={<Button type="button" size="xs" variant="outline" disabled={busy} />}>
              <Pencil className="size-3" />
              Edit
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit {player.display_name}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveEdit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`name-${player.id}`}>Name</Label>
                  <Input id={`name-${player.id}`} value={editName} onChange={(e) => setEditName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`chips-${player.id}`}>Starting chips</Label>
                  <Input
                    id={`chips-${player.id}`}
                    type="number"
                    min={0}
                    value={editChips}
                    onChange={(e) => setEditChips(Number(e.target.value) || 0)}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={busy}>
                    Save
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Button
            type="button"
            size="xs"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (!window.confirm(`Remove ${player.display_name}? This only works if they have no recorded transactions or hands.`)) {
                return;
              }
              run(() => removePlayer(supabase, player.id), `${player.display_name} removed`);
            }}
          >
            <UserMinus className="size-3" />
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
