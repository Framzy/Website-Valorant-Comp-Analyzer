import { ROLE_LABEL, ROLE_ORDER } from "@/lib/catalog/agents";
import type { AgentRole } from "@/lib/types";
import { cn } from "@/lib/utils";

export type RoleFilter = AgentRole | "all";

const OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: "all", label: "Semua" },
  ...ROLE_ORDER.map((role) => ({ value: role, label: ROLE_LABEL[role] })),
];

export function RoleFilter({
  value,
  onChange,
}: {
  value: RoleFilter;
  onChange: (value: RoleFilter) => void;
}) {
  return (
    <div role="tablist" aria-label="Filter role" className="flex flex-wrap gap-2">
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors",
              active
                ? "border-brand bg-brand/15 text-brand-light"
                : "border-line bg-white/[0.02] text-muted hover:border-line-strong hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
