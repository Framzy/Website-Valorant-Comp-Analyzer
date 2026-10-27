export function PickerHeader({ count, max }: { count: number; max: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-heading text-sm font-semibold uppercase tracking-[0.2em] text-ink">
        Pilih Agent
      </h2>
      <span className="rounded-full border border-line bg-white/[0.03] px-3 py-1 text-xs text-muted">
        {count + " / " + max + " Agent Dipilih"}
      </span>
    </div>
  );
}
