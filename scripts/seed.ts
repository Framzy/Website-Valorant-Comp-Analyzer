/**
 * Seed data/app.db from the two CSVs.
 *
 * Run with bun:  bun run db:seed
 * The CSVs are the single source of truth; the database is a read-only
 * projection used by the options endpoints.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { AGENTS, AGENT_ROLE_CODE } from "../lib/catalog/agents";
import { PLAYSTYLE_MAP } from "../lib/catalog/playstyle";
import { DDL } from "../lib/db/ddl";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = process.env.DATABASE_PATH ?? path.join(DATA_DIR, "app.db");

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function parseAgentList(raw: string): string[] {
  const inner = raw.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!inner.trim()) return [];
  return inner
    .split(",")
    .map((part) => part.trim().replace(/^['"]/, "").replace(/['"]$/, ""))
    .filter(Boolean)
    .map((name) => name.toLowerCase());
}

function toNumber(raw: string | undefined): number {
  const value = Number((raw ?? "").trim());
  return Number.isFinite(value) ? value : 0;
}

const ROLE_BY_AGENT = new Map(AGENTS.map((agent) => [agent.name, agent.role]));

function rolePatternFor(agents: string[]): string {
  const counts = { D: 0, I: 0, C: 0, S: 0 };
  for (const agent of agents) {
    const role = ROLE_BY_AGENT.get(agent);
    if (!role) continue;
    counts[AGENT_ROLE_CODE[role]] += 1;
  }
  return counts.D + "D-" + counts.I + "I-" + counts.C + "C-" + counts.S + "S";
}

function main(): void {
  const generalPath = path.join(DATA_DIR, "valorant_dataset_general_v2.csv");
  const teamPath = path.join(DATA_DIR, "valorant_dataset_team_v2.csv");
  const generalText = fs.readFileSync(generalPath, "utf8");
  const teamText = fs.readFileSync(teamPath, "utf8");

  const generalRows = parseCsv(generalText);
  const generalHeader = generalRows.shift();
  if (!generalHeader) throw new Error("general dataset is empty");
  const g = (name: string) => {
    const index = generalHeader.indexOf(name);
    if (index < 0) throw new Error("general dataset is missing column: " + name);
    return index;
  };
  const gMap = g("Map");
  const gYear = g("Year");
  const gKey = g("Composition Key");
  const gAgent = g("Agent");
  const gWins = g("Total Wins By Map");
  const gLoss = g("Total Loss By Map");
  const gMaps = g("Total Maps Played");

  const generalEntries = generalRows.map((row) => {
    const agents = parseAgentList(row[gAgent] ?? "");
    const pattern = rolePatternFor(agents);
    return {
      map: (row[gMap] ?? "").trim(),
      year: Math.trunc(toNumber(row[gYear])),
      compositionKey: (row[gKey] ?? "").trim(),
      agents,
      wins: Math.trunc(toNumber(row[gWins])),
      loss: Math.trunc(toNumber(row[gLoss])),
      maps: Math.trunc(toNumber(row[gMaps])),
      rolePattern: pattern,
      playstyle: PLAYSTYLE_MAP[pattern] ?? "UNCLASSIFIED",
    };
  });

  const bucket = new Map<string, number>();
  for (const entry of generalEntries) {
    const key = entry.map + "|" + entry.year;
    bucket.set(key, (bucket.get(key) ?? 0) + entry.maps);
  }

  const teamRows = parseCsv(teamText);
  const teamHeader = teamRows.shift();
  if (!teamHeader) throw new Error("team dataset is empty");
  const t = (name: string) => {
    const index = teamHeader.indexOf(name);
    if (index < 0) throw new Error("team dataset is missing column: " + name);
    return index;
  };

  const teamEntries = teamRows.map((row) => ({
    team: (row[t("Team")] ?? "").trim(),
    map: (row[t("Map")] ?? "").trim(),
    year: Math.trunc(toNumber(row[t("Year")])),
    compositionKey: (row[t("Composition Key")] ?? "").trim(),
    agents: parseAgentList(row[t("Agent")] ?? ""),
    totalWins: Math.trunc(toNumber(row[t("Total Wins By Map")])),
    totalLoss: Math.trunc(toNumber(row[t("Total Loss By Map")])),
    totalMaps: Math.trunc(toNumber(row[t("Total Maps Played")])),
    winrate: toNumber(row[t("Winrate")]),
    contextPlayed: Math.trunc(toNumber(row[t("Context Played")])),
    usageRatio: toNumber(row[t("Usage Ratio")]),
    reliability: toNumber(row[t("Reliability")]),
    effectiveUsage: toNumber(row[t("Effective Usage")]),
    duelistCount: Math.trunc(toNumber(row[t("Duelist Count")])),
    initiatorCount: Math.trunc(toNumber(row[t("Initiator Count")])),
    controllerCount: Math.trunc(toNumber(row[t("Controller Count")])),
    sentinelCount: Math.trunc(toNumber(row[t("Sentinel Count")])),
    rolePattern: (row[t("Role Pattern")] ?? "").trim(),
    patternPlayed: Math.trunc(toNumber(row[t("Pattern Played")])),
    patternUsage: toNumber(row[t("Pattern Usage")]),
    teamOverallWr: toNumber(row[t("Team Overall WR")]),
    teamMapWr: toNumber(row[t("Team Map WR")]),
    agentUsageMean: toNumber(row[t("Agent Usage Mean")]),
    agentUsageMin: toNumber(row[t("Agent Usage Min")]),
    compositionStrength: toNumber(row[t("Composition Strength")]),
  }));

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  for (const statement of DDL) db.exec(statement);

  const insertGeneral = db.prepare(
    "INSERT OR IGNORE INTO general_compositions " +
      "(map, year, composition_key, agents_json, total_wins, total_loss, total_maps, winrate, pick_rate, role_pattern, playstyle) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const insertTeam = db.prepare(
    "INSERT OR IGNORE INTO team_compositions " +
      "(team, map, year, composition_key, agents_json, total_wins, total_loss, total_maps, winrate, context_played, " +
      "usage_ratio, reliability, effective_usage, duelist_count, initiator_count, controller_count, sentinel_count, " +
      "role_pattern, pattern_played, pattern_usage, team_overall_wr, team_map_wr, agent_usage_mean, agent_usage_min, composition_strength) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );

  db.transaction(() => {
    db.exec("DELETE FROM general_compositions");
    db.exec("DELETE FROM team_compositions");
    db.exec("DELETE FROM dataset_meta");
    for (const entry of generalEntries) {
      const totalMaps = bucket.get(entry.map + "|" + entry.year) ?? entry.maps;
      const winrate = entry.maps > 0 ? entry.wins / entry.maps : 0;
      const pickRate = totalMaps > 0 ? entry.maps / totalMaps : 0;
      insertGeneral.run(
        entry.map,
        entry.year,
        entry.compositionKey,
        JSON.stringify(entry.agents),
        entry.wins,
        entry.loss,
        entry.maps,
        winrate,
        pickRate,
        entry.rolePattern,
        entry.playstyle,
      );
    }
    for (const entry of teamEntries) {
      insertTeam.run(
        entry.team,
        entry.map,
        entry.year,
        entry.compositionKey,
        JSON.stringify(entry.agents),
        entry.totalWins,
        entry.totalLoss,
        entry.totalMaps,
        entry.winrate,
        entry.contextPlayed,
        entry.usageRatio,
        entry.reliability,
        entry.effectiveUsage,
        entry.duelistCount,
        entry.initiatorCount,
        entry.controllerCount,
        entry.sentinelCount,
        entry.rolePattern,
        entry.patternPlayed,
        entry.patternUsage,
        entry.teamOverallWr,
        entry.teamMapWr,
        entry.agentUsageMean,
        entry.agentUsageMin,
        entry.compositionStrength,
      );
    }
    const sourceHash = crypto.createHash("sha1").update(generalText).update(teamText).digest("hex");
    db.prepare(
      "INSERT INTO dataset_meta (id, seeded_at, general_rows, team_rows, source_hash) VALUES (1, ?, ?, ?, ?)",
    ).run(new Date().toISOString(), generalEntries.length, teamEntries.length, sourceHash);
  })();

  const generalCount = db.prepare("SELECT COUNT(*) AS c FROM general_compositions").get() as { c: number };
  const teamCount = db.prepare("SELECT COUNT(*) AS c FROM team_compositions").get() as { c: number };
  const abyss = db
    .prepare(
      "SELECT COUNT(DISTINCT team) AS c FROM team_compositions WHERE year = 2024 AND map = 'Abyss'",
    )
    .get() as { c: number };
  db.close();

  console.log("Seeded " + DB_PATH);
  console.log("  general rows:", generalCount.c, "(parsed", generalEntries.length + ")");
  console.log("  team rows:   ", teamCount.c, "(parsed", teamEntries.length + ")");
  console.log("  2024 Abyss teams:", abyss.c);
  if (generalCount.c !== 1090 || teamCount.c !== 2802) {
    console.warn("WARNING: row counts differ from legacy fixture expectations (1090 / 2802)");
  }
}

main();
