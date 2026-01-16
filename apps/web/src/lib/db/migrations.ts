import { getDb, execute } from './turso';
import { runStructuralMigrations } from './structural-migrations';

/**
 * Create users table
 */
export async function createUsersTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT,
      avatar_url TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      email_verified INTEGER DEFAULT 0,
      google_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login TEXT
    )`
  );

  // Create indexes
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)`);

  console.log('Users table created/verified');
}

/**
 * Create projects table for engineering projects
 */
export async function createProjectsTable() {
  const db = getDb();

  await execute(
    db,
    `CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      project_type TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  // Create indexes
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)`);
  await execute(db, `CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)`);

  console.log('Projects table created/verified');
}

/**
 * Run all migrations
 */
export async function runAllMigrations() {
  console.log('Running database migrations...');

  await createUsersTable();
  await createProjectsTable();
  await runStructuralMigrations();

  console.log('All migrations completed');
}
