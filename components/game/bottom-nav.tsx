"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Spade, Trophy, Sparkles, BookOpen, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Game", icon: Spade },
  { href: "/#leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/#xp-feed", label: "XP", icon: Sparkles },
  { href: "/guide", label: "Guide", icon: BookOpen },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const base = href.split("#")[0];
        const active = base === "/" ? pathname === "/" && href === "/" : pathname.startsWith(base) && base !== "/";
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
