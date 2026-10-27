function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-white/[0.02] px-3 py-2">
      <p className="font-heading text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-subtle">
        {label}
      </p>
      <p className="mt-1 truncate text-sm text-ink">{value}</p>
    </div>
  );
}

export function SelectionSummary({
  mode,
  year,
  map,
  team,
  agents,
}: {
  mode: "general" | "team";
  year: number | null;
  map: string;
  team: string;
  agents: string[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      <Cell label="Tahun Dipilih" value={year === null ? "—" : String(year)} />
      <Cell label="Map Dipilih" value={map || "—"} />
      {mode === "team" ? <Cell label="Team Dipilih" value={team || "—"} /> : null}
      <Cell
        label="Agent Dipilih"
        value={agents.length === 0 ? "—" : agents.map((agent) => agent.charAt(0).toUpperCase() + agent.slice(1)).join(", ")}
      />
    </div>
  );
}
