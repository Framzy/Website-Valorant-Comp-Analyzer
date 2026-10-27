import { integer, real, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const generalCompositions = sqliteTable(
  "general_compositions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    map: text("map").notNull(),
    year: integer("year").notNull(),
    compositionKey: text("composition_key").notNull(),
    agentsJson: text("agents_json").notNull(),
    totalWins: integer("total_wins").notNull(),
    totalLoss: integer("total_loss").notNull(),
    totalMaps: integer("total_maps").notNull(),
    winrate: real("winrate").notNull(),
    pickRate: real("pick_rate").notNull(),
    rolePattern: text("role_pattern").notNull(),
    playstyle: text("playstyle").notNull(),
  },
  (table) => [
    uniqueIndex("general_comp_unique").on(table.map, table.year, table.compositionKey),
  ],
);

export const teamCompositions = sqliteTable(
  "team_compositions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    team: text("team").notNull(),
    map: text("map").notNull(),
    year: integer("year").notNull(),
    compositionKey: text("composition_key").notNull(),
    agentsJson: text("agents_json").notNull(),
    totalWins: integer("total_wins").notNull(),
    totalLoss: integer("total_loss").notNull(),
    totalMaps: integer("total_maps").notNull(),
    winrate: real("winrate").notNull(),
    contextPlayed: integer("context_played").notNull(),
    usageRatio: real("usage_ratio").notNull(),
    reliability: real("reliability").notNull(),
    effectiveUsage: real("effective_usage").notNull(),
    duelistCount: integer("duelist_count").notNull(),
    initiatorCount: integer("initiator_count").notNull(),
    controllerCount: integer("controller_count").notNull(),
    sentinelCount: integer("sentinel_count").notNull(),
    rolePattern: text("role_pattern").notNull(),
    patternPlayed: integer("pattern_played").notNull(),
    patternUsage: real("pattern_usage").notNull(),
    teamOverallWr: real("team_overall_wr").notNull(),
    teamMapWr: real("team_map_wr").notNull(),
    agentUsageMean: real("agent_usage_mean").notNull(),
    agentUsageMin: real("agent_usage_min").notNull(),
    compositionStrength: real("composition_strength").notNull(),
  },
  (table) => [
    uniqueIndex("team_comp_unique").on(table.team, table.map, table.year, table.compositionKey),
    index("team_comp_context").on(table.team, table.map, table.year),
    index("team_comp_year_map").on(table.year, table.map),
  ],
);

export const datasetMeta = sqliteTable("dataset_meta", {
  id: integer("id").primaryKey(),
  seededAt: text("seeded_at").notNull(),
  generalRows: integer("general_rows").notNull(),
  teamRows: integer("team_rows").notNull(),
  sourceHash: text("source_hash").notNull(),
});
