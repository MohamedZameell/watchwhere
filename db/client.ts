import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

let db: PostgresJsDatabase<typeof schema> | null | undefined;

export function getDb() {
  if (db !== undefined) return db;
  if (!process.env.DATABASE_URL) {
    console.warn("[stub-disabled] DATABASE_URL missing; feedback writes are acknowledged without insert.");
    db = null;
    return db;
  }
  const client = postgres(process.env.DATABASE_URL, { prepare: false });
  db = drizzle(client, { schema });
  return db;
}
