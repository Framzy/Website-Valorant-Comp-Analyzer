import { Select } from "@/components/ui/select";

export function ContextSelects({
  mode,
  years,
  maps,
  teams,
  year,
  map,
  team,
  onChangeYear,
  onChangeMap,
  onChangeTeam,
}: {
  mode: "general" | "team";
  years: number[];
  maps: string[];
  teams: string[];
  year: number | null;
  map: string;
  team: string;
  onChangeYear: (value: string) => void;
  onChangeMap: (value: string) => void;
  onChangeTeam: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <Select
        label="Pilih Tahun"
        value={year === null ? "" : String(year)}
        onChange={(event) => onChangeYear(event.target.value)}
      >
        <option value="">— Pilih Tahun —</option>
        {years.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>

      <Select
        label="Pilih Map"
        value={map}
        disabled={year === null}
        onChange={(event) => onChangeMap(event.target.value)}
      >
        <option value="">— Pilih Map —</option>
        {maps.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>

      {mode === "team" ? (
        <Select
          label="Pilih Team"
          value={team}
          disabled={map === ""}
          onChange={(event) => onChangeTeam(event.target.value)}
        >
          <option value="">— Pilih Tim —</option>
          {teams.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      ) : null}
    </div>
  );
}
