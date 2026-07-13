import { Pool, PoolClient } from 'pg';
import { config } from '../config';

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : undefined,
});

export const db = {
  /**
   * Run a simple query with automatic client release.
   */
  query: async <T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> => {
    const res = await pool.query(text, params);
    return {
      rows: res.rows,
      rowCount: res.rowCount || 0,
    };
  },

  /**
   * Get a client from the pool for transactions.
   */
  getClient: async (): Promise<PoolClient> => {
    const client = await pool.connect();
    return client;
  },

  /**
   * Run operations inside a database transaction.
   */
  transaction: async <T>(callback: (client: PoolClient) => Promise<T>): Promise<T> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Close the database pool.
   */
  close: async (): Promise<void> => {
    await pool.end();
  }
};
