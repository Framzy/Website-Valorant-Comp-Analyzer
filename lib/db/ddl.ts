/**
 * Physical SQLite schema.
 *
 * Kept as explicit DDL (instead of an ORM migration tool) because the database
 * is a read-only projection of the two CSVs: one seed run creates it.
 * Keep in sync with lib/db/schema.ts.
 */
export const DDL: string[] = [
  "CREATE TABLE IF NOT EXISTS general_compositions (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "map TEXT NOT NULL, " +
    "year INTEGER NOT NULL, " +
    "composition_key TEXT NOT NULL, " +
    "agents_json TEXT NOT NULL, " +
    "total_wins INTEGER NOT NULL, " +
    "total_loss INTEGER NOT NULL, " +
    "total_maps INTEGER NOT NULL, " +
    "winrate REAL NOT NULL, " +
    "pick_rate REAL NOT NULL, " +
    "role_pattern TEXT NOT NULL, " +
    "playstyle TEXT NOT NULL)",
  "CREATE UNIQUE INDEX IF NOT EXISTS general_comp_unique ON general_compositions (map, year, composition_key)",
  "CREATE TABLE IF NOT EXISTS team_compositions (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "team TEXT NOT NULL, " +
    "map TEXT NOT NULL, " +
    "year INTEGER NOT NULL, " +
    "composition_key TEXT NOT NULL, " +
    "agents_json TEXT NOT NULL, " +
    "total_wins INTEGER NOT NULL, " +
    "total_loss INTEGER NOT NULL, " +
    "total_maps INTEGER NOT NULL, " +
    "winrate REAL NOT NULL, " +
    "context_played INTEGER NOT NULL, " +
    "usage_ratio REAL NOT NULL, " +
    "reliability REAL NOT NULL, " +
    "effective_usage REAL NOT NULL, " +
    "duelist_count INTEGER NOT NULL, " +
    "initiator_count INTEGER NOT NULL, " +
    "controller_count INTEGER NOT NULL, " +
    "sentinel_count INTEGER NOT NULL, " +
    "role_pattern TEXT NOT NULL, " +
    "pattern_played INTEGER NOT NULL, " +
    "pattern_usage REAL NOT NULL, " +
    "team_overall_wr REAL NOT NULL, " +
    "team_map_wr REAL NOT NULL, " +
    "agent_usage_mean REAL NOT NULL, " +
    "agent_usage_min REAL NOT NULL, " +
    "composition_strength REAL NOT NULL)",
  "CREATE UNIQUE INDEX IF NOT EXISTS team_comp_unique ON team_compositions (team, map, year, composition_key)",
  "CREATE INDEX IF NOT EXISTS team_comp_context ON team_compositions (team, map, year)",
  "CREATE INDEX IF NOT EXISTS team_comp_year_map ON team_compositions (year, map)",
  "CREATE TABLE IF NOT EXISTS dataset_meta (" +
    "id INTEGER PRIMARY KEY CHECK (id = 1), " +
    "seeded_at TEXT NOT NULL, " +
    "general_rows INTEGER NOT NULL, " +
    "team_rows INTEGER NOT NULL, " +
    "source_hash TEXT NOT NULL)",
];
