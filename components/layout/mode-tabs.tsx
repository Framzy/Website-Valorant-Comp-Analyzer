"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", mode: "general", icon: "🎯", label: "Casual", description: "Map + Year + Agents" },
  { href: "/pro", mode: "team", icon: "🏆", label: "Pro Team", description: "Team + Map + Year + Agents" },
] as const;

export function ModeTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Analysis mode"
      className="grid grid-cols-1 overflow-hidden rounded-panel border border-line bg-card/60 sm:grid-cols-2"
    >
      {TABS.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center justify-center gap-3 border-b border-line px-4 py-4 transition-colors last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0",
              active ? "bg-brand/10" : "hover:bg-white/[0.03]",
            )}
          >
            <span className="text-xl" aria-hidden>
              {tab.icon}
            </span>
            <span className="flex flex-col text-left">
              <span
                className={cn(
                  "font-heading text-sm font-bold uppercase tracking-[0.24em]",
                  active ? "text-brand-light" : "text-ink",
                )}
              >
                {tab.label}
              </span>
              <span className="text-[0.68rem] uppercase tracking-[0.14em] text-subtle">
                {tab.description}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
