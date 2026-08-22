// @ts-types="npm:@types/pg@8"
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { env } from "../config/env.ts";

export type DbRow = QueryResultRow;

// Repositories accept either the shared pool or a transaction client. The
// signature is deliberately minimal so both pg types and a future non-pg
// adapter satisfy it.
export type Queryable = {
  query(text: string, values?: unknown[]): Promise<{ rows: DbRow[] }>;
};

const isDeno = "Deno" in globalThis;
let poolInstance: Pool | null = null;

// Connect lazily: edge isolates evaluate this module on every cold start and
// must not open sockets at import time.
export function getPool(): Pool {
  poolInstance ??= new Pool({
    connectionString: env.DATABASE_URL,
    // Many short-lived isolates share the Supabase transaction pooler, so each
    // keeps a tiny footprint; the Node server keeps pg's default sizing.
    max: isDeno ? 2 : 10,
    idleTimeoutMillis: 10_000,
  });
  return poolInstance;
}

export const pool: Queryable = {
  query: (text, values) => getPool().query(text, values),
};

export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();

  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
