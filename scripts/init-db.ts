/**
 * Database initialization script
 * Run with: npx tsx scripts/init-db.ts
 */

import { createClient } from '@libsql/client';

async function initDatabase() {
  console.log('Initializing local SQLite database...');

  const db = createClient({
    url: 'file:local.db',
  });

  // Create users table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
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
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)`);
  console.log('✓ Users table created');

  // Create projects table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      bounds_south REAL,
      bounds_north REAL,
      bounds_west REAL,
      bounds_east REAL,
      center_lat REAL,
      center_lon REAL,
      region TEXT,
      comuna TEXT,
      project_type TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_projects_region ON projects(region)`);
  console.log('✓ Projects table created');

  // Create project_elements table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS project_elements (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      element_type TEXT NOT NULL,
      layer TEXT NOT NULL DEFAULT '0',
      geometry TEXT NOT NULL,
      properties TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_elements_project_id ON project_elements(project_id)`);
  console.log('✓ Project elements table created');

  // Create project_topography table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS project_topography (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      source TEXT NOT NULL,
      dem_path TEXT,
      bounds_south REAL NOT NULL,
      bounds_north REAL NOT NULL,
      bounds_west REAL NOT NULL,
      bounds_east REAL NOT NULL,
      resolution REAL NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_topo_project_id ON project_topography(project_id)`);
  console.log('✓ Project topography table created');

  // Create manuals table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS manuals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      file_url TEXT,
      thumbnail_url TEXT,
      source TEXT,
      year INTEGER,
      created_at TEXT NOT NULL
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_manuals_category ON manuals(category)`);
  console.log('✓ Manuals table created');

  // Create weather_data table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS weather_data (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      temperature REAL,
      humidity REAL,
      precipitation REAL,
      wind_speed REAL,
      wind_direction REAL,
      source TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_weather_project_id ON weather_data(project_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_weather_timestamp ON weather_data(timestamp)`);
  console.log('✓ Weather data table created');

  // Seed some Chilean infrastructure manuals
  const manuals = [
    {
      id: 'manual-1',
      title: 'Manual de Carreteras - Volumen 3: Instrucciones y Criterios de Diseño',
      description: 'Especificaciones técnicas del MOP para diseño de carreteras y pavimentos',
      category: 'pavement',
      source: 'MOP',
      year: 2023,
    },
    {
      id: 'manual-2',
      title: 'Manual de Drenaje Urbano',
      description: 'Guía para el diseño de sistemas de drenaje en áreas urbanas',
      category: 'drainage',
      source: 'MINVU',
      year: 2021,
    },
    {
      id: 'manual-3',
      title: 'Norma Chilena NCh 2472 - Aguas Residuales',
      description: 'Normas para diseño de sistemas de alcantarillado',
      category: 'sewer',
      source: 'INN',
      year: 2020,
    },
    {
      id: 'manual-4',
      title: 'Manual de Pavimentación y Aguas Lluvias SERVIU',
      description: 'Especificaciones para proyectos de pavimentación urbana',
      category: 'pavement',
      source: 'SERVIU',
      year: 2022,
    },
  ];

  for (const manual of manuals) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO manuals (id, title, description, category, source, year, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        manual.id,
        manual.title,
        manual.description,
        manual.category,
        manual.source,
        manual.year,
        new Date().toISOString(),
      ],
    });
  }
  console.log('✓ Seeded Chilean infrastructure manuals');

  console.log('\n✅ Database initialization complete!');
  console.log('Database file: local.db');
}

initDatabase().catch(console.error);
