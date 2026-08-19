import { cardRankLabel, cardSuitSymbol, isRedSuit, parseCard } from "@/lib/poker/cards";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  sm: "w-8 h-11 text-xs rounded-md",
  md: "w-12 h-16 text-base rounded-lg",
  lg: "w-16 h-[5.5rem] text-xl rounded-xl",
  xl: "w-24 h-[8.25rem] text-3xl rounded-2xl",
} as const;

export type PlayingCardSize = keyof typeof SIZE_CLASSES;

interface PlayingCardProps {
  card: string; // e.g. "As", "Td"
  size?: PlayingCardSize;
  highlighted?: boolean; // contributing to the current best hand
  animateIn?: boolean;
  className?: string;
}

export function PlayingCard({ card, size = "md", highlighted, animateIn, className }: PlayingCardProps) {
  const parsed = parseCard(card);
  const red = isRedSuit(parsed.suit);
  const rank = cardRankLabel(parsed.rank);
  const suit = cardSuitSymbol(parsed);

  return (
    <div
      className={cn(
        "relative flex select-none flex-col justify-between border border-black/10 bg-cream font-mono font-bold shadow-[0_2px_6px_rgb(0,0,0,0.35)]",
        SIZE_CLASSES[size],
        red ? "text-suit-red" : "text-ink",
        highlighted && "ring-2 ring-gold shadow-[0_0_16px_2px_rgba(212,175,55,0.55)]",
        animateIn && "animate-deal-in",
        className,
      )}
    >
      <span className="px-[0.15em] pt-[0.1em] leading-none">{rank}</span>
      <span className="self-center text-[1.4em] leading-none">{suit}</span>
      <span className="self-end rotate-180 px-[0.15em] pb-[0.1em] leading-none">{rank}</span>
    </div>
  );
}

export function CardBack({ size = "md", className }: { size?: PlayingCardSize; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center border border-gold/40 bg-gradient-to-br from-[#3a0d16] via-[#5c1220] to-[#2a0a10]",
        SIZE_CLASSES[size],
        className,
      )}
    >
      <span className="text-gold/70" style={{ fontSize: "0.6em" }}>
        ♠♥
      </span>
    </div>
  );
}

export function EmptyCardSlot({ size = "md", className }: { size?: PlayingCardSize; className?: string }) {
  return (
    <div
      className={cn(
        "border-2 border-dashed border-white/15 bg-white/[0.02]",
        SIZE_CLASSES[size],
        className,
      )}
    />
  );
}
