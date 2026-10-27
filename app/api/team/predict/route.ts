import { postAnalyzer } from "@/lib/api/analyzer";
import type { TeamPredictResponse } from "@/lib/types";

const FIELDS = ["team", "map", "year", "agents"] as const;

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return Response.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const missing = FIELDS.filter((field) => !(field in body));
  if (missing.length > 0) {
    return Response.json(
      { error: "Missing required fields: " + missing.join(", ") },
      { status: 400 },
    );
  }

  const result = await postAnalyzer<TeamPredictResponse>("/v1/team/predict", {
    team: body.team,
    map: body.map,
    year: body.year,
    agents: body.agents,
  });

  if (!result.ok) {
    return Response.json({ error: result.message }, { status: result.status });
  }

  return Response.json(result.data);
}
