# @ledesign/db

Shared database utilities and schema for the LeDesign platform.

## Overview

This package provides:
- **Drizzle ORM schema** - TypeScript-first ORM definitions
- **Database migrations** - SQLite schema initialization
- **Database client** - Connection utilities for Turso/LibSQL
- **Schema validation** - Automated checking to keep schemas in sync
- **Query helpers** - Type-safe query utilities

## Installation

```bash
npm install @ledesign/db
```

## Usage

### Database Client

```typescript
import { getDb, queryOne, queryMany, execute } from '@ledesign/db';
import { users, projects } from '@ledesign/db/schema';

// Query using helper functions
const user = await queryOne(getDb(), 'SELECT * FROM users WHERE id = ?', [userId]);

// Or use Drizzle ORM directly
import { eq } from 'drizzle-orm';
const db = getDb();
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
});
```

### Schema Types

```typescript
import type { User, Project } from '@ledesign/db/schema';

const user: User = {
  id: 'user_123',
  email: 'user@example.com',
  name: 'John Doe',
  password_hash: '...',
  role: 'user',
  email_verified: false,
  avatar_url: null,
  google_id: null,
  company: null,
  last_login: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
```

## Scripts

### Run Migrations

Set up the database schema:

```bash
npm run migrate
```

This will:
1. Create all tables if they don't exist
2. Run additional migrations for existing databases (ALTER TABLE)
3. Add any missing columns automatically

### Validate Schema

Check that Drizzle schema matches the actual database structure:

```bash
npm run validate-schema
```

This will:
- Compare `schema.ts` (Drizzle ORM) against expected database columns
- Report any missing or extra columns
- Exit with error code if mismatches are found

**Run this before deploying** to catch schema inconsistencies early!

## Schema Synchronization

### The Problem

We maintain two representations of the database schema:

1. **`migrate.ts`** - Actual database (CREATE TABLE statements)
2. **`schema.ts`** - Drizzle ORM schema (TypeScript definitions)

These must stay in sync, but it's easy to update one without the other.

### The Solution

#### 1. Update Both Files Together

When adding a new column:

**Step 1: Update `migrate.ts`**
```typescript
await db.execute(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    new_column TEXT,  -- ✅ Add here first
    ...
  )
`);
```

**Step 2: Update `schema.ts`**
```typescript
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  new_column: text('new_column'),  // ✅ Add here second
  ...
});
```

**Step 3: Create migration** (if column is new)
```typescript
// migrations/add-new-feature.ts
export async function addNewFeature(db: Client) {
  try {
    await db.execute(`ALTER TABLE projects ADD COLUMN new_column TEXT`);
  } catch (error: any) {
    if (error.message?.includes('duplicate column name')) {
      console.log('Column already exists, skipping');
    } else {
      throw error;
    }
  }
}
```

**Step 4: Call migration in `migrate.ts`**
```typescript
import { addNewFeature } from './migrations/add-new-feature';

// At end of runMigrations():
await addNewFeature(db);
```

#### 2. Update Validation Script

Edit [`validate-schema.ts`](./src/validate-schema.ts) to include the new column in expected schemas:

```typescript
const EXPECTED_SCHEMAS = {
  projects: new Set([
    'id',
    'name',
    'new_column',  // ✅ Add here
    // ... other columns
  ]),
};
```

#### 3. Run Validation

```bash
npm run validate-schema
```

If it passes ✅, your schemas are in sync!

## Database Schema

### Core Tables

#### `users`
User accounts with role-based access control.

**Columns:**
- `id` - Primary key
- `email` - Unique email address
- `name` - Display name
- `password_hash` - Bcrypt hash
- `avatar_url` - Profile image URL
- `role` - 'user' | 'admin' | 'owner'
- `email_verified` - Email verification status
- `google_id` - Google OAuth ID
- `company` - Company name
- `last_login` - Last login timestamp
- `created_at`, `updated_at` - Timestamps

#### `projects`
Engineering projects with multi-discipline support.

**Columns:**
- `id`, `user_id`, `name`, `description` - Basic info
- `bounds_south`, `bounds_north`, `bounds_west`, `bounds_east` - Geographic bounds
- `center_lat`, `center_lon` - Map center
- `region`, `comuna` - Chilean location
- `project_type` - Project classification
- `status` - 'draft' | 'active' | 'completed' | 'archived'

**Module Access Flags:**
- `module_structural` - Structural design access
- `module_hydraulic` - Water/sewer network access
- `module_pavement` - Pavement design access
- `module_road` - Road alignment access
- `module_terrain` - Terrain/topography access

**Module Usage Tracking:**
- `module_structural_last_used` - Last used timestamp
- `module_hydraulic_last_used` - Last used timestamp
- `module_pavement_last_used` - Last used timestamp
- `module_road_last_used` - Last used timestamp
- `module_terrain_last_used` - Last used timestamp

### Module Tables

Each discipline has dedicated tables:
- **Structural**: `structural_nodes`, `structural_materials`
- **Hydraulic**: `hydraulic_pipes`
- **Pavement**: `pavement_sections`
- **Road**: `road_alignments`
- **Terrain**: `terrain_surfaces`, `survey_datasets`, `generated_surfaces`

### Design Tables

Specialized tables for specific designs:
- `water_network_designs` - EPANET-style water networks
- `sewer_designs` - Sewer system designs
- `stormwater_designs` - Stormwater management
- `channel_designs` - Open channel hydraulics
- `cubicaciones` - Cost estimation (Chilean standard)

## Module Access Control

Projects use boolean flags to control which modules users can access:

```typescript
import { hasModuleAccess } from '@ledesign/db';

const canUseStructural = await hasModuleAccess(projectId, 'structural');
```

## Module Usage Tracking

Track when modules are actively used for reporting:

```typescript
import { trackModuleUsage, getActiveModulesForReport } from '@ledesign/db';

// Track usage
await trackModuleUsage(projectId, 'hydraulic');

// Get modules for report generation
const activeModules = await getActiveModulesForReport(projectId);
// Returns: ['structural', 'hydraulic'] (only modules that were used)
```

## Development

### Adding a New Table

1. Add CREATE TABLE statement to [`migrate.ts`](./src/migrate.ts)
2. Add Drizzle definition to [`schema.ts`](./src/schema.ts)
3. Export table in schema export
4. Update [`validate-schema.ts`](./src/validate-schema.ts) expected schemas
5. Run `npm run validate-schema` to verify

### Adding a New Column

1. Add column to CREATE TABLE in [`migrate.ts`](./src/migrate.ts)
2. Add column to Drizzle schema in [`schema.ts`](./src/schema.ts)
3. Create migration file in [`migrations/`](./src/migrations/)
4. Import and call migration in [`migrate.ts`](./src/migrate.ts)
5. Update [`validate-schema.ts`](./src/validate-schema.ts) expected schemas
6. Run `npm run validate-schema` to verify

## Database Configuration

Set environment variables:

```bash
# Turso Database
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token

# Or local SQLite
DATABASE_URL=file:./local.db
```

## Building

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

Outputs to `dist/` with CommonJS, ESM, and TypeScript definitions.

## License

Proprietary - All rights reserved
