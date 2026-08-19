"use client";

import { useEffect, useRef, useState } from "react";
import { Coins, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

function useFlashOnChange(value: number) {
  const [flash, setFlash] = useState(false);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) {
      setFlash(true);
      prev.current = value;
      const t = setTimeout(() => setFlash(false), 900);
      return () => clearTimeout(t);
    }
  }, [value]);
  return flash;
}

export function ChipStat({ value, size = "md", className }: { value: number; size?: "sm" | "md" | "lg"; className?: string }) {
  const flash = useFlashOnChange(value);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 font-mono font-semibold text-gold transition-colors",
        size === "sm" && "px-1.5 py-0.5 text-xs",
        size === "md" && "px-2.5 py-1 text-sm",
        size === "lg" && "px-3.5 py-1.5 text-lg",
        flash && "animate-flash-gold",
        className,
      )}
    >
      <Coins className={cn(size === "sm" ? "size-3" : size === "md" ? "size-3.5" : "size-4.5")} />
      {value.toLocaleString()}
    </span>
  );
}

export function XpStat({ value, size = "md", className }: { value: number; size?: "sm" | "md" | "lg"; className?: string }) {
  const flash = useFlashOnChange(value);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-chart-4/40 bg-chart-4/10 font-mono font-semibold text-chart-4 transition-colors",
        size === "sm" && "px-1.5 py-0.5 text-xs",
        size === "md" && "px-2.5 py-1 text-sm",
        size === "lg" && "px-3.5 py-1.5 text-lg",
        flash && "animate-flash-gold",
        className,
      )}
    >
      <Sparkles className={cn(size === "sm" ? "size-3" : size === "md" ? "size-3.5" : "size-4.5")} />
      {value.toLocaleString()} XP
    </span>
  );
}
