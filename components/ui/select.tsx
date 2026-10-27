import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
}

export function Select({ label, hint, className, id, children, ...props }: SelectProps) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-2">
      <span className="font-heading text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted">
        {label}
      </span>
      <select
        id={id}
        className={cn(
          "h-11 w-full cursor-pointer rounded-xl border border-line bg-card-dark/80 px-3 text-sm text-ink outline-none transition-colors hover:border-line-strong focus:border-brand disabled:cursor-not-allowed disabled:opacity-40",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {hint ? <span className="text-xs text-subtle">{hint}</span> : null}
    </label>
  );
}
