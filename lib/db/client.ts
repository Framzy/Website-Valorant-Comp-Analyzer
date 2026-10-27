import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

/**
 * Lazy singleton. Opening the file only when a query runs keeps next build
 * independent from the seed step.
 */
let sqlite: Database.Database | null = null;

export function getSqlite(): Database.Database {
  if (!sqlite) {
    const file = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "app.db");
    sqlite = new Database(file, { readonly: true, fileMustExist: true });
  }
  return sqlite;
}

export function getDb() {
  return drizzle(getSqlite(), { schema });
}
