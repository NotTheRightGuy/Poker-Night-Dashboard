"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionHeading } from "@/components/game/section-heading";
import { useGame } from "@/lib/game/provider";
import { useCurrentHand } from "@/lib/game/selectors";
import { awardAchievement } from "@/lib/game/actions";
import { createClient } from "@/lib/supabase/client";
import { HOST_ACHIEVEMENT_XP_RANGE } from "@/lib/game/xpRules";
import type { Game } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export function AchievementPanel({ game }: { game: Game }) {
  const supabase = useMemo(() => createClient(), []);
  const { players, achievements } = useGame();
  const currentHand = useCurrentHand();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [xpReward, setXpReward] = useState<number>(HOST_ACHIEVEMENT_XP_RANGE.min);
  const [submitting, setSubmitting] = useState(false);

  const activePlayers = players.filter((p) => p.status !== "eliminated");
  // Presets are the curated starter achievements — custom ones the host
  // creates on the fly still land in the same table but aren't re-surfaced
  // as quick-pick buttons here to keep this row from growing unbounded.
  const presets = achievements.filter((a) => a.is_preset);

  async function awardPreset(code: string, presetName: string, presetXp: number) {
    if (!playerId) {
      toast.error("Pick a player first");
      return;
    }
    try {
      await awardAchievement(supabase, game.id, playerId, presetName, presetXp, { code, handId: currentHand?.id });
      toast.success(`${presetName} awarded (+${presetXp} XP)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to award achievement");
    }
  }

  async function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!playerId || !name.trim()) return;
    setSubmitting(true);
    try {
      await awardAchievement(supabase, game.id, playerId, name.trim(), xpReward, {
        description: description.trim() || undefined,
        handId: currentHand?.id,
      });
      toast.success(`${name.trim()} awarded (+${xpReward} XP)`);
      setName("");
      setDescription("");
      setXpReward(HOST_ACHIEVEMENT_XP_RANGE.min);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to award achievement");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <SectionHeading eyebrow="Recognition" title="Achievements" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Player</Label>
          <Select value={playerId ?? undefined} onValueChange={(v) => setPlayerId(v)}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Pick a player" />
            </SelectTrigger>
            <SelectContent>
              {activePlayers.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {presets.length > 0 && (
          <div className="space-y-1.5">
            <Label>Presets</Label>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((a) => (
                <Button
                  key={a.code}
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!playerId}
                  onClick={() => awardPreset(a.code, a.name, a.xp_reward)}
                >
                  {a.name} (+{a.xp_reward})
                </Button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleCustomSubmit} className="space-y-3 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Custom achievement</p>
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <div className="space-y-1.5">
              <Label htmlFor="achievement-name">Name</Label>
              <Input
                id="achievement-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Best Bluff of the Night"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="achievement-xp">XP reward</Label>
              <Input
                id="achievement-xp"
                type="number"
                min={0}
                value={xpReward}
                onChange={(e) => setXpReward(Number(e.target.value) || 0)}
              />
              <p
                className={cn(
                  "text-[0.65rem] text-muted-foreground",
                  (xpReward < HOST_ACHIEVEMENT_XP_RANGE.min || xpReward > HOST_ACHIEVEMENT_XP_RANGE.max) && "text-gold",
                )}
              >
                Suggested {HOST_ACHIEVEMENT_XP_RANGE.min}–{HOST_ACHIEVEMENT_XP_RANGE.max}
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="achievement-description">Description (optional)</Label>
            <Textarea id="achievement-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button type="submit" disabled={submitting || !playerId || !name.trim()}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Award Custom Achievement
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
