import { connection } from "next/server";
import { getAvailableYears } from "@/lib/db/queries";

export async function GET() {
  // better-sqlite3 is synchronous: without this the handler would be
  // prerendered at build time and require a seeded DB during next build.
  await connection();

  try {
    return Response.json({ years: getAvailableYears() });
  } catch {
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
