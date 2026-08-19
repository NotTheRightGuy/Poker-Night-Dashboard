import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-3", className)}>
      <div>
        {eyebrow && <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">{eyebrow}</p>}
        <h2 className="font-heading text-2xl tracking-wide text-foreground sm:text-3xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}
