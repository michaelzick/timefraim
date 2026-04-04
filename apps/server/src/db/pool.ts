import { Pool, type PoolClient } from "pg";
import { env } from "../config/env.js";

export type Queryable = Pick<Pool, "query"> | PoolClient;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();

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
