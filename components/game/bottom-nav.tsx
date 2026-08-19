"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Spade, Trophy, Sparkles, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Game", icon: Spade, sectionId: "game-top" },
  { href: "/#leaderboard", label: "Leaderboard", icon: Trophy, sectionId: "leaderboard" },
  { href: "/#xp-feed", label: "XP", icon: Sparkles, sectionId: "xp-feed" },
  { href: "/guide", label: "Guide", icon: BookOpen, sectionId: null },
] as const;

// On "/", the three home sections are scrolled to, not routed to, so
// pathname alone can't say which tab is "current" — this watches which
// section is actually in view and highlights that tab instead.
function useActiveHomeSection(enabled: boolean): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const ids = ["game-top", "leaderboard", "xp-feed"];
    const elements = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const topMost = visible.reduce((a, b) => (a.boundingClientRect.top <= b.boundingClientRect.top ? a : b));
        setActiveId(topMost.target.id);
      },
      { rootMargin: "-72px 0px -60% 0px", threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [enabled]);

  return activeId;
}

export function BottomNav() {
  const pathname = usePathname();
  const activeSection = useActiveHomeSection(pathname === "/");

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden">
      {ITEMS.map(({ href, label, icon: Icon, sectionId }) => {
        const active =
          sectionId !== null
            ? pathname === "/" && (activeSection === sectionId || (activeSection === null && sectionId === "game-top"))
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[0.65rem] font-medium tracking-wide uppercase transition-colors",
              active ? "text-gold" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
