"use client";

import { useGame } from "@/lib/game/provider";
import { useMyPlayer } from "@/lib/game/selectors";
import { PlayerAvatar } from "./player-avatar";
import { PlayerStatusBadge } from "./status-badge";
import { ChipStat, XpStat } from "./stat-pill";
import { SectionHeading } from "./section-heading";
import { cn } from "@/lib/utils";
import Link from "next/link";

function seatStyle(index: number, total: number): React.CSSProperties {
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  const rx = 46;
  const ry = 42;
  const left = 50 + rx * Math.cos(angle);
  const top = 50 + ry * Math.sin(angle);
  return { left: `${left}%`, top: `${top}%` };
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

  return (
    <div>
      <SectionHeading title="At the Table" className="mb-4" />
      <div className="relative mx-auto aspect-[16/11] w-full max-w-2xl rounded-[50%] border-4 border-gold/25 bg-felt shadow-[inset_0_0_60px_rgba(0,0,0,0.5)] sm:block hidden">
        {players.map((p, i) => (
          <Link
            href={`/players/${p.id}`}
            key={p.id}
            style={seatStyle(i, players.length)}
            className={cn(
              "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-xl border border-white/10 bg-card/90 p-2 text-center backdrop-blur transition hover:border-gold/50",
              p.status === "eliminated" && "opacity-50",
              myPlayer?.id === p.id && "ring-2 ring-gold",
            )}
          >
            <PlayerAvatar name={p.display_name} size="sm" dimmed={p.status === "eliminated"} />
            <span className="max-w-20 truncate text-xs font-semibold text-foreground">{p.display_name}</span>
            <PlayerStatusBadge status={p.status} />
            <ChipStat value={p.chip_count} size="sm" />
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:hidden">
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
