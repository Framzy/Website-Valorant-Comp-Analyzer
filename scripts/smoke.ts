/**
 * Contract smoke tests for the data layer + option route handlers.
 * Run: bun run scripts/smoke.ts
 *
 * GET /api/options/years calls connection() (it must stay dynamic), so it is
 * covered here through its query function; the full HTTP path is exercised by
 * "curl http://localhost:3000/api/options/years" once the app is running.
 */
import { GET as getMaps } from "../app/api/options/maps/route";
import { GET as getTeams } from "../app/api/team/options/teams/route";
import { getAvailableTeams, getAvailableYears, getDatasetMeta } from "../lib/db/queries";

interface Case {
  name: string;
  run: () => Promise<Response> | Response;
  status: number;
  check: (body: unknown) => boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const years = getAvailableYears();
const meta = getDatasetMeta();
const mapsResponse = await getMaps(new Request("http://local/api/options/maps?year=2024"));
const maps = await mapsResponse.json();
const teamsResponse = await getTeams(new Request("http://local/api/team/options/teams?year=2024&map=Abyss"));
const teams = await teamsResponse.json();

const cases: Case[] = [
  {
    name: "years query [2024,2025,2026]",
    run: () => new Response(JSON.stringify({ years }), { status: 200 }),
    status: 200,
    check: () => JSON.stringify(years) === "[2024,2025,2026]",
  },
  {
    name: "dataset seeded 1090 / 2802",
    run: () => new Response(JSON.stringify(meta), { status: 200 }),
    status: 200,
    check: () => meta !== null && meta.generalRows === 1090 && meta.teamRows === 2802,
  },
  {
    name: "maps 2024 200",
    run: () => getMaps(new Request("http://local/api/options/maps?year=2024")),
    status: 200,
    check: (body) => isRecord(body) && body.year === 2024 && Array.isArray(body.maps) && body.maps.length === 9,
  },
  {
    name: "maps missing year 400",
    run: () => getMaps(new Request("http://local/api/options/maps")),
    status: 400,
    check: (body) => isRecord(body) && body.error === "Year is required.",
  },
  {
    name: "maps invalid year 400",
    run: () => getMaps(new Request("http://local/api/options/maps?year=abc")),
    status: 400,
    check: (body) => isRecord(body) && body.error === "Year must be an integer.",
  },
  {
    name: "teams 2024 Abyss 200",
    run: () => getTeams(new Request("http://local/api/team/options/teams?year=2024&map=Abyss")),
    status: 200,
    check: (body) =>
      isRecord(body) &&
      Array.isArray(body.teams) &&
      body.teams.length === 7 &&
      (body.teams as string[]).includes("Team Heretics"),
  },
  {
    name: "teams missing params 400",
    run: () => getTeams(new Request("http://local/api/team/options/teams?year=2024")),
    status: 400,
    check: (body) => isRecord(body) && body.error === "Missing required query parameters: map",
  },
  {
    name: "teams unknown context 400",
    run: () => getTeams(new Request("http://local/api/team/options/teams?year=2019&map=Abyss")),
    status: 400,
    check: (body) => isRecord(body) && body.error === "No Team V2 data for Abyss / 2019.",
  },
  {
    name: "teams eligibility rule (>= 3 maps)",
    run: () => new Response(JSON.stringify({ teams: getAvailableTeams(2024, "Abyss") }), { status: 200 }),
    status: 200,
    check: () => getAvailableTeams(2024, "Abyss").length === 7,
  },
];

let failed = 0;
for (const testCase of cases) {
  try {
    const response = await testCase.run();
    const body = await response.json();
    const ok = response.status === testCase.status && testCase.check(body);
    if (!ok) failed += 1;
    console.log((ok ? "PASS" : "FAIL") + "  " + testCase.name);
  } catch (error) {
    failed += 1;
    console.log("FAIL  " + testCase.name + " -> " + (error instanceof Error ? error.message : String(error)));
  }
}

console.log(
  "\nsummary: " +
    (cases.length - failed) +
    "/" +
    cases.length +
    " passed | years=" +
    JSON.stringify(years) +
    " | maps(2024)=" +
    (Array.isArray((maps as Record<string, unknown>).maps) ? ((maps as Record<string, unknown>).maps as unknown[]).length : "?") +
    " | teams(2024 Abyss)=" +
    (Array.isArray((teams as Record<string, unknown>).teams) ? ((teams as Record<string, unknown>).teams as unknown[]).length : "?"),
);

if (failed > 0) process.exit(1);
