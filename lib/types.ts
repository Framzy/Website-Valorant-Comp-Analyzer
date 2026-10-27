export type AgentRole = "duelist" | "initiator" | "controller" | "sentinel";

export type AgentCode = "D" | "I" | "C" | "S";

export interface AgentCatalogEntry {
  name: string;
  role: AgentRole;
  imageUrl: string;
}

export interface Playstyle {
  name: string;
  description: string;
  pattern: string;
}

export interface GeneralInput {
  map: string;
  year: number;
  agents: string[];
}

export interface GeneralHistoricalFound {
  found: true;
  map: string;
  year: number;
  agents: string[];
  role_pattern: string;
  playstyle: string;
  total_maps: number;
  winrate: number;
  pick_rate: number;
}

export interface GeneralHistoricalMissing {
  found: false;
  map: string;
  year: number;
  agents: string[];
}

export type GeneralHistorical = GeneralHistoricalFound | GeneralHistoricalMissing;

export interface GeneralRecommendation {
  rank: number;
  map: string;
  year: number;
  agents: string[];
  role_pattern: string;
  playstyle: string;
  total_maps: number;
  pick_rate: number;
  winrate: number;
}

export type FallbackSource = "MAP_YEAR_PLAYSTYLE" | "MAP_YEAR" | "MAP" | "GLOBAL" | null;

export interface GeneralAnalyzeResponse {
  input: GeneralInput;
  playstyle: Playstyle;
  historical: GeneralHistorical;
  recommendations: GeneralRecommendation[];
  fallback: boolean;
  fallback_source: FallbackSource;
}

export interface TeamInput {
  team: string;
  map: string;
  year: number;
  agents: string[];
}

export type ConfidenceLevel = "low" | "medium" | "high";

export interface PatternAdjustment {
  points: number;
  tier: string;
  reason: string;
}

export interface MetaPrevalence {
  role_pattern_share_pct: number;
  label: string;
  rank: number | null;
  n_patterns: number;
  team_maps_with_pattern: number;
}

export interface TeamConfidence {
  level: ConfidenceLevel;
  team_map_played: number;
  context_played: number;
  composition_played: number;
  team_pattern_played: number;
  role_pattern_played: number;
  role_pattern_never_observed: boolean;
  role_pattern_rarity_discount: number;
  meta_prevalence: MetaPrevalence;
  note: string;
}

export interface TeamCompositionInfo {
  role_pattern: string;
  duelist_count: number;
  initiator_count: number;
  controller_count: number;
  sentinel_count: number;
  playstyle: Playstyle;
}

export interface TeamHistorical {
  found: boolean;
  winrate: number | null;
  composition_strength: number | null;
}

export interface BestCompositionFound {
  found: true;
  agents: string[];
  role_pattern: string;
  playstyle: Playstyle;
  maps_played: number;
  winrate: number;
  percentage: number;
  composition_strength: number;
}

export interface BestCompositionMissing {
  found: false;
}

export type BestComposition = BestCompositionFound | BestCompositionMissing;

export interface TeamPrediction {
  winrate: number;
  percentage: number;
  model_winrate: number;
  prior_winrate: number;
  range: { low: number; high: number; level: number };
  winrate_before_adjustment: number;
  pattern_adjustment: PatternAdjustment;
}

export interface TeamPredictResponse {
  input: TeamInput;
  prediction: TeamPrediction;
  confidence: TeamConfidence;
  composition: TeamCompositionInfo;
  historical: TeamHistorical;
  best_composition: BestComposition;
  inference: { feature_count: number };
}

// ---------------------------------------------------------------
// Options endpoints
// ---------------------------------------------------------------

export interface YearsResponse {
  years: number[];
}

export interface MapsResponse {
  year: number;
  maps: string[];
}

export interface TeamsResponse {
  year: number;
  map: string;
  teams: string[];
}

export interface DatasetMeta {
  seededAt: string;
  generalRows: number;
  teamRows: number;
}

export interface ApiErrorBody {
  error: string;
}
