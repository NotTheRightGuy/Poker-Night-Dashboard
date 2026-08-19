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

function SeatCard({ player, compact, isMe }: { player: Player; compact: boolean; isMe: boolean }) {
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
      <PlayerAvatar name={player.display_name} size="sm" dimmed={player.status === "eliminated"} />
      <span className={cn("truncate font-semibold text-foreground", compact ? "max-w-14 text-[0.65rem]" : "max-w-20 text-xs")}>
        {player.display_name}
      </span>
      <PlayerStatusBadge status={player.status} />
      {!compact && <ChipStat value={player.chip_count} size="sm" />}
    </Link>
  );
}

export function PlayerTable() {
  const { players } = useGame();
  const myPlayer = useMyPlayer();

  if (players.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        No players have been added yet.
      </div>
    );
  }

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
              <SeatCard player={p} compact={compact} isMe={myPlayer?.id === p.id} />
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
        {players.map((p) => (
          <Link
            href={`/players/${p.id}`}
            key={p.id}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 text-center",
              p.status === "eliminated" && "opacity-50",
              myPlayer?.id === p.id && "ring-2 ring-gold",
            )}
          >
            <PlayerAvatar name={p.display_name} size="md" dimmed={p.status === "eliminated"} />
            <span className="truncate text-sm font-semibold text-foreground">{p.display_name}</span>
            <PlayerStatusBadge status={p.status} />
            <div className="flex flex-wrap justify-center gap-1">
              <ChipStat value={p.chip_count} size="sm" />
              <XpStat value={p.xp_total} size="sm" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
