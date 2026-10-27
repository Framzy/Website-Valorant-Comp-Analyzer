import { getAvailableMaps } from "@/lib/db/queries";

export async function GET(request: Request) {
  const rawYear = new URL(request.url).searchParams.get("year");

  if (rawYear === null) {
    return Response.json({ error: "Year is required." }, { status: 400 });
  }

  const year = Number(rawYear);
  if (!Number.isInteger(year)) {
    return Response.json({ error: "Year must be an integer." }, { status: 400 });
  }

  try {
    const maps = getAvailableMaps(year);
    if (maps.length === 0) {
      return Response.json(
        { error: "No shared map data for year " + year + "." },
        { status: 400 },
      );
    }
    return Response.json({ year, maps });
  } catch {
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
