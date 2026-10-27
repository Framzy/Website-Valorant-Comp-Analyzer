import { getAvailableTeams, hasTeamContext } from "@/lib/db/queries";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const rawYear = params.get("year");
  const rawMap = params.get("map");

  const missing: string[] = [];
  if (rawYear === null) missing.push("year");
  if (rawMap === null) missing.push("map");
  if (missing.length > 0) {
    return Response.json(
      { error: "Missing required query parameters: " + missing.join(", ") },
      { status: 400 },
    );
  }

  const year = Number(rawYear);
  if (!Number.isInteger(year)) {
    return Response.json({ error: "Year must be an integer." }, { status: 400 });
  }

  const mapName = rawMap === null ? "" : rawMap;
  if (!mapName.trim()) {
    return Response.json({ error: "Map is required." }, { status: 400 });
  }

  try {
    if (!hasTeamContext(year, mapName)) {
      return Response.json(
        { error: "No Team V2 data for " + mapName + " / " + year + "." },
        { status: 400 },
      );
    }

    const teams = getAvailableTeams(year, mapName);
    if (teams.length === 0) {
      return Response.json(
        { error: "No eligible teams for " + mapName + " / " + year + "." },
        { status: 400 },
      );
    }

    return Response.json({ year, map: mapName, teams });
  } catch {
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
