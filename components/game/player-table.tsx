"use client";

import { useGame } from "@/lib/game/provider";
import { useMyPlayer } from "@/lib/game/selectors";
import { PlayerAvatar } from "./player-avatar";
import { PlayerStatusBadge } from "./status-badge";
import { ChipStat, XpStat } from "./stat-pill";
import { SectionHeading } from "./section-heading";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { Player } from "@/lib/game/types";

// Beyond this many players, the oval "physical table" visual stops being
// readable no matter how small we shrink each seat — a wrapped grid (same
// layout already used on mobile) scales to any number of players instead.
const OVAL_TABLE_MAX_PLAYERS = 10;

function seatStyle(index: number, total: number): React.CSSProperties {
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  const rx = 46;
  const ry = 42;
  const left = 50 + rx * Math.cos(angle);
  const top = 50 + ry * Math.sin(angle);
  return { left: `${left}%`, top: `${top}%` };
}

// A small dot on the avatar, like an "online" indicator — green means
// someone has actually claimed this seat and is following along on their
// own device; no dot means the host added them but nobody's claimed it yet.
function ClaimedAvatar({ name, dimmed, claimed, size }: { name: string; dimmed?: boolean; claimed: boolean; size: "sm" | "md" }) {
  return (
    <div className="relative">
      <PlayerAvatar name={name} size={size} dimmed={dimmed} />
      {claimed && (
        <span
          className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-card bg-chart-3"
          title="Claimed"
        />
      )}
    </div>
  );
}

function SeatCard({ player, compact, isMe, claimed }: { player: Player; compact: boolean; isMe: boolean; claimed: boolean }) {
  return (
    <Link
      href={`/players/${player.id}`}
      className={cn(
        "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-xl border border-white/10 bg-card/90 text-center backdrop-blur transition hover:border-gold/50",
        compact ? "p-1.5" : "p-2",
        player.status === "eliminated" && "opacity-50",
        isMe && "ring-2 ring-gold",
      )}
    >
      <ClaimedAvatar name={player.display_name} dimmed={player.status === "eliminated"} claimed={claimed} size="sm" />
      <span className={cn("truncate font-semibold text-foreground", compact ? "max-w-14 text-[0.65rem]" : "max-w-20 text-xs")}>
        {player.display_name}
      </span>
      <PlayerStatusBadge status={player.status} />
      {!compact && <ChipStat value={player.chip_count} size="sm" />}
    </Link>
  );
}

export function PlayerTable() {
  const { players, playerClaims } = useGame();
  const myPlayer = useMyPlayer();

  if (players.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        No players have been added yet.
      </div>
    );
  }

  const claimedPlayerIds = new Set(playerClaims.filter((c) => !c.released_at).map((c) => c.player_id));
  const total = players.length;
  const showOvalTable = total <= OVAL_TABLE_MAX_PLAYERS;
  const compact = total > 6;

  return (
    <div>
      <SectionHeading title="At the Table" className="mb-4" />

      {showOvalTable && (
        <div className="relative mx-auto hidden aspect-[16/11] w-full max-w-2xl rounded-[50%] border-4 border-gold/25 bg-felt shadow-[inset_0_0_60px_rgba(0,0,0,0.5)] sm:block">
          {players.map((p, i) => (
            <div key={p.id} style={seatStyle(i, total)}>
              <SeatCard player={p} compact={compact} isMe={myPlayer?.id === p.id} claimed={claimedPlayerIds.has(p.id)} />
            </div>
          ))}
        </div>
      )}

      {/* Wrapped grid — used on mobile always, and on desktop once there are
          too many players for the oval table to stay readable. Scales to any
          player count by adding rows/columns, never overlapping. */}
      <div
        className={cn(
          "grid grid-cols-2 gap-2",
          showOvalTable ? "sm:hidden" : "sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
        )}
      >
        {players.map((p) => {
          const claimed = claimedPlayerIds.has(p.id);
          return (
            <Link
              href={`/players/${p.id}`}
              key={p.id}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 text-center",
                p.status === "eliminated" && "opacity-50",
                myPlayer?.id === p.id && "ring-2 ring-gold",
              )}
            >
              <ClaimedAvatar name={p.display_name} dimmed={p.status === "eliminated"} claimed={claimed} size="md" />
              <span className="truncate text-sm font-semibold text-foreground">{p.display_name}</span>
              <span className={cn("text-[0.65rem] uppercase tracking-wide", claimed ? "text-chart-3" : "text-muted-foreground")}>
                {claimed ? "Claimed" : "Unclaimed"}
              </span>
              <PlayerStatusBadge status={p.status} />
              <div className="flex flex-wrap justify-center gap-1">
                <ChipStat value={p.chip_count} size="sm" />
                <XpStat value={p.xp_total} size="sm" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
