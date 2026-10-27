import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { datasetMeta, generalCompositions, teamCompositions } from "./schema";
import type { DatasetMeta } from "@/lib/types";

/** Years present in BOTH datasets, ascending (legacy intersection rule). */
export function getAvailableYears(): number[] {
  const db = getDb();
  const generalYears = new Set(
    db
      .select({ year: generalCompositions.year })
      .from(generalCompositions)
      .groupBy(generalCompositions.year)
      .all()
      .map((row) => row.year),
  );
  const teamYears = db
    .select({ year: teamCompositions.year })
    .from(teamCompositions)
    .groupBy(teamCompositions.year)
    .all()
    .map((row) => row.year);

  return Array.from(new Set(teamYears.filter((year) => generalYears.has(year)))).sort(
    (a, b) => a - b,
  );
}

/** Maps present in BOTH datasets for a year, ascending (legacy intersection rule). */
export function getAvailableMaps(year: number): string[] {
  const db = getDb();
  const generalMaps = new Set(
    db
      .select({ map: generalCompositions.map })
      .from(generalCompositions)
      .where(eq(generalCompositions.year, year))
      .groupBy(generalCompositions.map)
      .all()
      .map((row) => row.map),
  );
  const teamMaps = db
    .select({ map: teamCompositions.map })
    .from(teamCompositions)
    .where(eq(teamCompositions.year, year))
    .groupBy(teamCompositions.map)
    .all()
    .map((row) => row.map);

  return Array.from(new Set(teamMaps.filter((map) => generalMaps.has(map)))).sort();
}

/**
 * Teams with at least 3 maps played in a Year + Map context.
 * Map matching is case-insensitive, mirroring the legacy pandas filter.
 */
export function getAvailableTeams(year: number, mapName: string): string[] {
  const db = getDb();
  const wanted = mapName.trim().toLowerCase();
  const rows = db
    .select({ team: teamCompositions.team, map: teamCompositions.map, maps: teamCompositions.totalMaps })
    .from(teamCompositions)
    .where(eq(teamCompositions.year, year))
    .all()
    .filter((row) => row.map.trim().toLowerCase() === wanted);

  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.team, (totals.get(row.team) ?? 0) + row.maps);
  }

  return Array.from(totals.entries())
    .filter(([, maps]) => maps >= 3)
    .map(([team]) => team)
    .sort();
}

/** True when the (year, map) context exists in the team dataset at all. */
export function hasTeamContext(year: number, mapName: string): boolean {
  const db = getDb();
  const wanted = mapName.trim().toLowerCase();
  return (
    db
      .select({ map: teamCompositions.map })
      .from(teamCompositions)
      .where(eq(teamCompositions.year, year))
      .all()
      .filter((row) => row.map.trim().toLowerCase() === wanted).length > 0
  );
}

export function getDatasetMeta(): DatasetMeta | null {
  const db = getDb();
  const row = db.select().from(datasetMeta).limit(1).get();
  if (!row) return null;
  return {
    seededAt: row.seededAt,
    generalRows: row.generalRows,
    teamRows: row.teamRows,
  };
}