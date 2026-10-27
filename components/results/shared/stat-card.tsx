import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  empty,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  empty?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-white/[0.03] px-4 py-4 text-center",
        empty && "opacity-60",
        className,
      )}
    >
      <p className="font-heading text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted">
        {label}
      </p>
      <p className="mt-2 font-heading text-2xl font-bold text-ink">{value}</p>
      {hint ? <p className="mt-1 text-[0.7rem] text-subtle">{hint}</p> : null}
    </div>
  );
}
