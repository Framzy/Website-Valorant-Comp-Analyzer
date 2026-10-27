import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeTone =
  | "default"
  | "brand"
  | "muted"
  | "role-d"
  | "role-i"
  | "role-c"
  | "role-s"
  | "playstyle-standard"
  | "playstyle-control"
  | "playstyle-aggressive"
  | "playstyle-utility"
  | "playstyle-unclassified"
  | "conclusion-potential"
  | "conclusion-stable"
  | "conclusion-risky";

const TONES: Record<BadgeTone, string> = {
  default: "border-line-strong bg-white/[0.04] text-ink",
  brand: "border-brand/40 bg-brand/15 text-brand-light",
  muted: "border-line bg-white/[0.02] text-muted",
  "role-d": "border-role-d/40 bg-role-d/10 text-role-d",
  "role-i": "border-role-i/40 bg-role-i/10 text-role-i",
  "role-c": "border-role-c/40 bg-role-c/10 text-role-c",
  "role-s": "border-role-s/40 bg-role-s/10 text-role-s",
  "playstyle-standard": "border-playstyle-standard/40 bg-playstyle-standard/10 text-playstyle-standard",
  "playstyle-control": "border-playstyle-control/40 bg-playstyle-control/10 text-playstyle-control",
  "playstyle-aggressive": "border-playstyle-aggressive/40 bg-playstyle-aggressive/10 text-playstyle-aggressive",
  "playstyle-utility": "border-playstyle-utility/40 bg-playstyle-utility/10 text-playstyle-utility",
  "playstyle-unclassified": "border-line-strong bg-white/[0.04] text-muted",
  "conclusion-potential": "border-conclusion-potential/40 bg-conclusion-potential/10 text-conclusion-potential",
  "conclusion-stable": "border-conclusion-stable/40 bg-conclusion-stable/10 text-conclusion-stable",
  "conclusion-risky": "border-conclusion-risky/40 bg-conclusion-risky/10 text-conclusion-risky",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em]",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

export function playstyleTone(name: string): BadgeTone {
  switch (name) {
    case "STANDARD":
      return "playstyle-standard";
    case "CONTROL":
      return "playstyle-control";
    case "AGGRESSIVE":
      return "playstyle-aggressive";
    case "UTILITY_HEAVY":
      return "playstyle-utility";
    default:
      return "playstyle-unclassified";
  }
}
