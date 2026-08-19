"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useGame } from "@/lib/game/provider";
import { useMyPlayer } from "@/lib/game/selectors";
import { claimPlayer, releaseMyClaim } from "@/lib/game/actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "./player-avatar";
import { cn } from "@/lib/utils";

export function PlayerSelect() {
  const { game, players, playerClaims, myClaim } = useGame();
  const myPlayer = useMyPlayer();
  const supabase = useMemo(() => createClient(), []);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);

  const claimedPlayerIds = useMemo(
    () => new Set(playerClaims.filter((c) => !c.released_at).map((c) => c.player_id)),
    [playerClaims],
  );

  if (!game) return null;

  if (myClaim && myPlayer) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-4">
        <div className="flex items-center gap-3">
          <PlayerAvatar name={myPlayer.display_name} size="md" />
          <div>
            <p className="text-xs text-muted-foreground">Playing as</p>
            <p className="font-heading text-lg tracking-wide text-cream">{myPlayer.display_name}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={releasing}
          onClick={async () => {
            setReleasing(true);
            try {
              await releaseMyClaim(supabase, myClaim.id);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Couldn't release your seat");
            } finally {
              setReleasing(false);
            }
          }}
        >
          {releasing ? <Loader2 className="size-4 animate-spin" /> : "Not you?"}
        </Button>
      </div>
    );
  }

  const selectablePlayers = players.filter((p) => p.status !== "eliminated");

  if (selectablePlayers.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="mb-3 text-sm font-medium text-foreground">Which player are you?</p>
      <div className="flex flex-wrap gap-2">
        {selectablePlayers.map((p) => {
          const claimed = claimedPlayerIds.has(p.id);
          const busy = claimingId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={claimed || busy}
              onClick={async () => {
                setClaimingId(p.id);
                try {
                  await claimPlayer(supabase, game.id, p.id);
                  toast.success(`You're now playing as ${p.display_name}`);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Couldn't claim that seat");
                } finally {
                  setClaimingId(null);
                }
              }}
              className={cn(
                "flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm transition",
                claimed ? "cursor-not-allowed opacity-40" : "hover:border-gold/60 hover:bg-accent",
              )}
            >
              <PlayerAvatar name={p.display_name} size="sm" />
              {p.display_name}
              {claimed && <CheckCircle2 className="size-3.5 text-muted-foreground" />}
              {busy && <Loader2 className="size-3.5 animate-spin" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
