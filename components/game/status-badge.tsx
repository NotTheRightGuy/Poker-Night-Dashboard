import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { GameStatus, PlayerStatus } from "@/lib/game/types";

const GAME_STATUS_LABEL: Record<GameStatus, string> = {
  not_started: "Not Started",
  registration: "Registration",
  live: "Live",
  break: "Break",
  final_table: "Final Table",
  finished: "Finished",
};

const GAME_STATUS_CLASSES: Record<GameStatus, string> = {
  not_started: "bg-muted text-muted-foreground border-border",
  registration: "bg-accent text-accent-foreground border-gold/40",
  live: "bg-primary/20 text-primary border-primary/50",
  break: "bg-accent text-accent-foreground border-gold/40",
  final_table: "bg-gold/20 text-gold border-gold/50",
  finished: "bg-muted text-muted-foreground border-border",
};

export function GameStatusBadge({ status, className }: { status: GameStatus; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 border px-3 py-1 font-heading text-sm tracking-wide uppercase", GAME_STATUS_CLASSES[status], className)}
    >
      {status === "live" && <span className="size-2 rounded-full bg-primary animate-pulse-live" />}
      {GAME_STATUS_LABEL[status]}
    </Badge>
  );
}

const PLAYER_STATUS_LABEL: Record<PlayerStatus, string> = {
  active: "Active",
  folded: "Folded",
  all_in: "All-In",
  eliminated: "Eliminated",
  away: "Away",
};

const PLAYER_STATUS_CLASSES: Record<PlayerStatus, string> = {
  active: "bg-chart-3/20 text-chart-3 border-chart-3/40",
  folded: "bg-muted text-muted-foreground border-border",
  all_in: "bg-gold/20 text-gold border-gold/50",
  eliminated: "bg-destructive/20 text-destructive border-destructive/40",
  away: "bg-accent text-accent-foreground border-border",
};

export function PlayerStatusBadge({ status, className }: { status: PlayerStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("border px-2 py-0.5 text-[0.65rem] tracking-wide uppercase", PLAYER_STATUS_CLASSES[status], className)}>
      {PLAYER_STATUS_LABEL[status]}
    </Badge>
  );
}
