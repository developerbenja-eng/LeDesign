# @ledesign/db

Shared database utilities and schema types for the LeDesign platform.

## Overview

This package provides:
- **Database Client** - Turso/libSQL connection manager
- **Schema Types** - TypeScript interfaces for all database tables
- **Query Helpers** - Type-safe query utilities

## Installation

```bash
npm install @ledesign/db
```

## Usage

### Database Client

```typescript
import { getDb, query, queryOne, execute } from '@ledesign/db/client';

// Get database instance
const db = getDb();

// Execute a query
const users = await query<User>(db, 'SELECT * FROM users WHERE email = ?', ['user@example.com']);

// Get single row
const user = await queryOne<User>(db, 'SELECT * FROM users WHERE id = ?', ['user_123']);

// Execute mutation
await execute(db, 'INSERT INTO users (id, email, name) VALUES (?, ?, ?)', [
  'user_123',
  'user@example.com',
  'John Doe',
]);

// Batch operations
await batch(db, [
  { sql: 'INSERT INTO ...', args: [...] },
  { sql: 'UPDATE ...', args: [...] },
]);
```

### Schema Types

```typescript
import type { User, Project, StructuralNode, HydraulicPipe } from '@ledesign/db/schema';

const user: User = {
  id: 'user_123',
  email: 'user@example.com',
  name: 'John Doe',
  password_hash: '...',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const project: Project = {
  id: 'proj_123',
  user_id: 'user_123',
  name: 'Building Design',
  description: 'Multi-story office building',
  location_lat: -33.4489,
  location_lng: -70.6693,
  location_address: 'Santiago, Chile',
  module_structural: true,
  module_hydraulic: false,
  module_pavement: false,
  module_road: false,
  module_terrain: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
```

## Module Schemas

Each engineering discipline has its own schema namespace:

- **Structural** - Buildings, nodes, beams, columns, analysis results
- **Hydraulic** - Water networks, sewer systems, channels, stormwater
- **Pavement** - Pavement sections, traffic data, design results
- **Road** - Alignments, curves, cross-sections, stationing
- **Terrain** - Surfaces, survey points, contours, earthwork volumes

## Environment Variables

```bash
# Local development (SQLite)
TURSO_DB_URL=file:local.db

# Production (Turso)
TURSO_DB_URL=libsql://your-database.turso.io
TURSO_DB_TOKEN=your-auth-token
```

## Development

```bash
# Build the package
npm run build

# Watch mode
npm run dev

# Run tests
npm test

# Lint
npm run lint
```

## License

Proprietary - All rights reserved
