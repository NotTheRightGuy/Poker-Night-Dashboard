"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./bottom-nav";
import { GuideFab } from "./guide-fab";

// Hides the mobile bottom nav on /host (has its own chrome) and /display
// (full-screen TV mode, minimal interaction per spec).
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = !pathname.startsWith("/host") && !pathname.startsWith("/display");
  const showGuideFab = showNav && pathname !== "/guide";

  return (
    <>
      <div className={showNav ? "pb-14 md:pb-0" : ""}>{children}</div>
      {showNav && <BottomNav />}
      {showGuideFab && <GuideFab />}
    </>
  );
}
