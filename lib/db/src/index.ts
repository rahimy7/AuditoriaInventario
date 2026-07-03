import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const connectionString = process.env.DATABASE_URL;

// Hosted Postgres (Neon, Replit, most managed providers) requires TLS. Enable it
// when the URL asks for it or points at a known managed host.
const needsSsl = /sslmode=require|neon\.tech|\.aws\.|render\.com|supabase\.co/.test(connectionString);

export const pool = new Pool({
  connectionString,
  ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});
export const db = drizzle(pool, { schema });

export * from "./schema";
