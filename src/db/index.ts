import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

function createDb() {
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const sqlite = new Database(path.join(dir, "fluent.db"));
  sqlite.pragma("journal_mode = WAL");
  return drizzle(sqlite, { schema });
}

// Survive Next.js dev hot-reload without leaking connections
const globalForDb = globalThis as unknown as {
  __fluentDb?: BetterSQLite3Database<typeof schema>;
};

export const db = globalForDb.__fluentDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.__fluentDb = db;

export { schema };
