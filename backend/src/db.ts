import { Pool, PoolClient, types } from 'pg';
import { config } from './config';
import { schema } from './schema';

types.setTypeParser(1082, (v: string) => v);
export const pool = new Pool({ connectionString: config.databaseUrl });

export async function query<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool.query(text, params as any[]);
  return res.rows as T[];
}

export async function tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export const migrate = () => pool.query(schema);
