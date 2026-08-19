import type { Metadata } from "next";
import { Crown, Eye, Repeat2, Shield, TrendingDown, TrendingUp, VolumeX } from "lucide-react";
import { SectionHeading } from "@/components/game/section-heading";
import { PlayingCard } from "@/components/game/playing-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  CHAOS_CARDS,
  HAND_RANKINGS,
  HOST_ACHIEVEMENT_XP_RANGE,
  POKER_XP_RULES,
  POWERUPS,
  type ChaosCardInfo,
  type PowerupInfo,
} from "@/lib/game/xpRules";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Guide — Inventory Pod Poker Night",
  description: "Never played poker before? Everything you need to know is on this page.",
};

const POWERUP_ICONS: Record<PowerupInfo["code"], typeof Eye> = {
  PEEK: Eye,
  SWAP: Repeat2,
  SHIELD: Shield,
};

const CHAOS_ICONS: Record<ChaosCardInfo["code"], typeof TrendingUp> = {
  BULL_MARKET: TrendingUp,
  MARKET_CRASH: TrendingDown,
  SILENT_ROUND: VolumeX,
};

export default function GuidePage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-12 px-4 pb-28 pt-8 sm:pb-14">
      <header className="flex flex-col gap-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Inventory Pod Poker Night</p>
        <h1 className="font-heading text-4xl tracking-wide text-foreground sm:text-5xl">Player&apos;s Guide</h1>
        <p className="text-sm text-muted-foreground">
          Never played poker before? Read this — you&apos;ll be fine. Bookmark it, you can check back mid-game.
        </p>
      </header>

      {/* 1. Hand rankings */}
      <section className="flex flex-col gap-4">
        <SectionHeading eyebrow="Reference" title="Poker Hand Rankings" />
        <p className="text-sm text-muted-foreground">
          Strongest at the top, weakest at the bottom. Whoever has the best 5-card hand at showdown wins the pot.
        </p>
        <ol className="flex flex-col gap-3">
          {HAND_RANKINGS.map((hand, i) => {
            const isBest = i === 0;
            return (
              <li key={hand.name}>
                <Card
                  className={cn(
                    "felt-panel animate-rise-fade",
                    isBest && "border-gold/70 ring-2 ring-gold/50 shadow-[0_0_24px_2px_rgba(212,175,55,0.35)]",
                  )}
                >
                  <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">#{i + 1}</span>
                        <h3 className="font-heading text-lg tracking-wide text-foreground">{hand.name}</h3>
                        {isBest && (
                          <Badge variant="outline" className="gap-1 border-gold/60 bg-gold/15 text-gold">
                            <Crown className="size-3" /> Best possible hand
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{hand.explanation}</p>
                    </div>
                    <div className="flex gap-1 self-start sm:self-center">
                      {hand.example.map((card, idx) => (
                        <PlayingCard key={`${hand.name}-${idx}-${card}`} card={card} size="sm" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
      </section>

      {/* 2. How Texas Hold'em works */}
      <section className="flex flex-col gap-4">
        <SectionHeading eyebrow="Basics" title="How Texas Hold&apos;em Works" />
        <Card>
          <CardContent className="flex flex-col gap-4 text-sm leading-relaxed text-foreground/90">
            <p>Texas Hold&apos;em is the poker variant we&apos;re playing tonight. Here&apos;s the whole game, start to finish:</p>
            <ol className="flex flex-col gap-3">
              <li className="flex gap-2">
                <span className="shrink-0 font-heading text-gold">1.</span>
                <span>
                  Everyone at the table is dealt <strong>2 private cards</strong> — your &quot;hole cards&quot;. Only you can see them.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-heading text-gold">2.</span>
                <span>
                  <strong>5 shared &quot;community&quot; cards</strong> get revealed face-up in the middle of the table, in three stages: the{" "}
                  <strong>flop</strong> (3 cards at once), the <strong>turn</strong> (1 more card), and the <strong>river</strong> (the fifth
                  and final card).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-heading text-gold">3.</span>
                <span>
                  There&apos;s a round of betting before the flop and again after each stage. On your turn you can{" "}
                  <strong>check</strong> (bet nothing), <strong>call</strong> (match the current bet), <strong>raise</strong> (increase the
                  bet), or <strong>fold</strong> (give up the hand — and anything you&apos;ve already put in the pot).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-heading text-gold">4.</span>
                <span>
                  Your hand is whatever <strong>best 5-card combination</strong> you can make out of your 2 hole cards plus the 5 community
                  cards (so 7 cards total to pick 5 from). The hand rankings above show what beats what.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-heading text-gold">5.</span>
                <span>
                  If betting goes all the way to the end, everyone still in reveals their cards — this is the <strong>showdown</strong> —
                  and the best 5-card hand takes the whole pot. If everyone else folds before that, the one player left wins the pot
                  immediately, without needing to show anything.
                </span>
              </li>
            </ol>
            <p className="text-muted-foreground">
              That&apos;s standard poker. Everything below — power-ups, chaos cards, XP — is this event&apos;s own twist on top of it.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* 3. Power-ups */}
      <section className="flex flex-col gap-4">
        <SectionHeading eyebrow="Tonight's Twists" title="Power-Ups" />
        <p className="text-sm text-muted-foreground">
          Power-ups are handed out by the host during the game — you can&apos;t buy, earn automatically, or trade for them.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {POWERUPS.map((p) => {
            const Icon = POWERUP_ICONS[p.code];
            return (
              <Card key={p.code} className="felt-panel">
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-gold" />
                    <h3 className="font-heading text-lg tracking-wide text-gold">{p.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{p.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 4. Chaos cards */}
      <section className="flex flex-col gap-4">
        <SectionHeading eyebrow="Tonight's Twists" title="Chaos Cards" />
        <p className="text-sm text-muted-foreground">
          The host can trigger any chaos card manually, at any point in the game, on top of everything else that&apos;s happening.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {CHAOS_CARDS.map((c) => {
            const Icon = CHAOS_ICONS[c.code];
            return (
              <Card key={c.code} className="felt-panel">
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-primary" />
                    <h3 className="font-heading text-lg tracking-wide text-primary">{c.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{c.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 5. XP rules */}
      <section className="flex flex-col gap-4">
        <SectionHeading eyebrow="Scoring" title="XP Rules" />
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">XP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {POKER_XP_RULES.map((rule) => (
                  <TableRow key={rule.reason}>
                    <TableCell className="whitespace-normal">{rule.reason}</TableCell>
                    <TableCell className="text-right font-mono text-gold">+{rule.amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <p className="text-sm text-muted-foreground">
          The host can also award <strong className="text-foreground">{HOST_ACHIEVEMENT_XP_RANGE.min}–{HOST_ACHIEVEMENT_XP_RANGE.max} XP</strong>{" "}
          on the spot for custom &quot;achievement&quot; moments that don&apos;t fit the table above — a huge bluff, a comeback from the felt,
          whatever earns it.
        </p>
        <p className="text-sm text-muted-foreground">
          Chips and XP are two completely separate scores that never convert into each other. Your <strong className="text-foreground">chip
          count</strong> decides the night&apos;s Poker Champion; your <strong className="text-foreground">XP total</strong> decides the XP
          Legend / MVP.
        </p>
      </section>
    </div>
  );
}
