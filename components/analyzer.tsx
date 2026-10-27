"use client";

import { useEffect, useState } from "react";
import { AGENTS } from "@/lib/catalog/agents";
import type {
  GeneralAnalyzeResponse,
  MapsResponse,
  TeamPredictResponse,
  TeamsResponse,
  YearsResponse,
} from "@/lib/types";
import { ApiError, apiGet, apiPost } from "@/lib/api/client";
import { AgentGrid } from "@/components/agent-picker/agent-grid";
import { PickerHeader } from "@/components/agent-picker/picker-header";
import { RoleFilter, type RoleFilter as RoleFilterValue } from "@/components/agent-picker/role-filter";
import { ContextSelects } from "@/components/inputs/context-selects";
import { SelectionSummary } from "@/components/inputs/selection-summary";
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/feedback/loading-overlay";
import { ErrorDialog } from "@/components/feedback/error-dialog";
import { GeneralResults } from "@/components/results/general/general-results";
import { TeamResults } from "@/components/results/team/team-results";

type Mode = "general" | "team";
type Result = GeneralAnalyzeResponse | TeamPredictResponse;

const AGENT_NAMES = AGENTS.map((agent) => agent.name);
const MAX_AGENTS = 5;

interface DialogState {
  title: string;
  message: string;
  retry?: () => void;
}

function asMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Terjadi kesalahan pada server, silakan coba lagi nanti.";
}

export function Analyzer({ mode }: { mode: Mode }) {
  const [years, setYears] = useState<number[]>([]);
  const [maps, setMaps] = useState<string[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [map, setMap] = useState("");
  const [team, setTeam] = useState("");
  const [agents, setAgents] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState<RoleFilterValue>("all");
  const [loading, setLoading] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading("Memuat...");
      try {
        const data = await apiGet<YearsResponse>("/api/options/years");
        if (!cancelled) setYears(data.years);
      } catch (error) {
        if (!cancelled) {
          setDialog({ title: "Terjadi Kesalahan", message: asMessage(error), retry: () => void loadYears() });
        }
      } finally {
        if (!cancelled) setLoading(null);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadYears(): Promise<void> {
    setLoading("Memuat...");
    try {
      const data = await apiGet<YearsResponse>("/api/options/years");
      setYears(data.years);
      setDialog(null);
    } catch (error) {
      setDialog({ title: "Terjadi Kesalahan", message: asMessage(error), retry: () => void loadYears() });
    } finally {
      setLoading(null);
    }
  }

  async function handleYearChange(value: string): Promise<void> {
    const nextYear = value === "" ? null : Number(value);
    setYear(nextYear);
    setMap("");
    setTeam("");
    setMaps([]);
    setTeams([]);
    setResult(null);

    if (nextYear === null) return;

    setLoading("Memuat...");
    try {
      const data = await apiGet<MapsResponse>("/api/options/maps?year=" + nextYear);
      setMaps(data.maps);
    } catch (error) {
      setMaps([]);
      setDialog({ title: "Terjadi Kesalahan", message: asMessage(error), retry: () => void handleYearChange(value) });
    } finally {
      setLoading(null);
    }
  }

  async function handleMapChange(value: string): Promise<void> {
    setMap(value);
    setTeam("");
    setTeams([]);
    setResult(null);

    if (mode !== "team" || value === "" || year === null) return;

    setLoading("Memuat...");
    try {
      const data = await apiGet<TeamsResponse>(
        "/api/team/options/teams?year=" + year + "&map=" + encodeURIComponent(value),
      );
      setTeams(data.teams);
    } catch (error) {
      setTeams([]);
      setDialog({ title: "Terjadi Kesalahan", message: asMessage(error), retry: () => void handleMapChange(value) });
    } finally {
      setLoading(null);
    }
  }

  function toggleAgent(name: string): void {
    setAgents((current) => {
      if (current.includes(name)) {
        return current.filter((agent) => agent !== name);
      }
      if (current.length >= MAX_AGENTS) {
        return [...current.slice(1), name];
      }
      return [...current, name];
    });
  }

  function validate(): string | null {
    if (agents.length !== MAX_AGENTS) return "Pilih tepat 5 agent terlebih dahulu.";
    if (year === null) return "Pilih tahun terlebih dahulu.";
    if (!map) return "Pilih map terlebih dahulu.";
    if (mode === "team" && !team) return "Pilih team terlebih dahulu.";
    return null;
  }

  async function submit(): Promise<void> {
    const validation = validate();
    if (validation) {
      setDialog({ title: "Terjadi Kesalahan", message: validation });
      return;
    }

    setLoading(mode === "team" ? "Menganalisis komposisi team..." : "Menganalisis komposisi...");
    try {
      if (mode === "team") {
        const data = await apiPost<TeamPredictResponse>("/api/team/predict", {
          team,
          map,
          year,
          agents,
        });
        setResult(data);
      } else {
        const data = await apiPost<GeneralAnalyzeResponse>("/api/general/analyze", {
          map,
          year,
          agents,
        });
        setResult(data);
      }
      setDialog(null);
    } catch (error) {
      setDialog({ title: "Terjadi Kesalahan", message: asMessage(error), retry: () => void submit() });
    } finally {
      setLoading(null);
    }
  }

  function reset(): void {
    setAgents([]);
    setRoleFilter("all");
    setYear(null);
    setMap("");
    setTeam("");
    setMaps([]);
    setTeams([]);
    setResult(null);
    setDialog(null);
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        <section className="rounded-panel border border-line bg-panel-gradient p-4 shadow-card sm:p-5">
          <PickerHeader count={agents.length} max={MAX_AGENTS} />
          <div className="mt-3">
            <RoleFilter value={roleFilter} onChange={setRoleFilter} />
          </div>
          <div className="mt-4">
            <AgentGrid agents={AGENT_NAMES} selected={agents} roleFilter={roleFilter} onToggle={toggleAgent} />
          </div>
        </section>

        <div className="h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />

        <section className="rounded-panel border border-line bg-panel-gradient p-4 shadow-card sm:p-5">
          <ContextSelects
            mode={mode}
            years={years}
            maps={maps}
            teams={teams}
            year={year}
            map={map}
            team={team}
            onChangeYear={(value) => void handleYearChange(value)}
            onChangeMap={(value) => void handleMapChange(value)}
            onChangeTeam={setTeam}
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={() => void submit()} disabled={loading !== null}>
              Analisis
            </Button>
            <Button variant="outline" onClick={reset} disabled={loading !== null}>
              Reset
            </Button>
          </div>

          <div className="mt-4">
            <SelectionSummary mode={mode} year={year} map={map} team={team} agents={agents} />
          </div>
        </section>

        <section className="rounded-panel border border-line bg-panel-gradient p-4 shadow-card sm:p-6">
          {result ? (
            <div className="animate-reveal">
              {mode === "general" ? (
                <GeneralResults data={result as GeneralAnalyzeResponse} />
              ) : (
                <TeamResults data={result as TeamPredictResponse} />
              )}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted">
              Pilih komposisi dan lakukan analisis.
            </p>
          )}
        </section>
      </div>

      {loading ? <LoadingOverlay message={loading} /> : null}

      {dialog ? (
        <ErrorDialog
          title={dialog.title}
          message={dialog.message}
          onRetry={dialog.retry}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </>
  );
}
