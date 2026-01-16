import { createClient, Client } from '@libsql/client';

// Lazy initialization - clients are created on first access
let _db: Client | null = null;

// Main Database
// Supports both local SQLite (development) and remote Turso (production)
export function getDb(): Client {
  if (!_db) {
    const url = process.env.TURSO_DB_URL;
    const authToken = process.env.TURSO_DB_TOKEN;

    // For local development, use file-based SQLite
    if (!url || url === 'file:local.db') {
      console.log('Using local SQLite database: ./local.db');
      _db = createClient({
        url: 'file:local.db',
      });
    } else {
      // For production, use remote Turso
      if (!authToken) {
        throw new Error('Missing TURSO_DB_TOKEN for remote database');
      }
      _db = createClient({ url, authToken });
    }
  }
  return _db;
}

// Type-safe query helper
export async function query<T>(
  db: Client,
  sql: string,
  args: (string | number | null | boolean)[] = []
): Promise<T[]> {
  const result = await db.execute({ sql, args });
  return result.rows as T[];
}

// Single row query helper
export async function queryOne<T>(
  db: Client,
  sql: string,
  args: (string | number | null | boolean)[] = []
): Promise<T | null> {
  const rows = await query<T>(db, sql, args);
  return rows[0] || null;
}

// Execute mutation (insert, update, delete)
export async function execute(
  db: Client,
  sql: string,
  args: (string | number | null | boolean)[] = []
) {
  return await db.execute({ sql, args });
}
