// ============================================================
// DRIZZLE ORM SCHEMA - UNIFIED DATABASE
// ============================================================
// Complete database schema for all LeDesign modules using Drizzle ORM

import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ============================================================
// CORE TABLES (Shared)
// ============================================================

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  password_hash: text('password_hash').notNull(),
  avatar_url: text('avatar_url'),
  role: text('role', { enum: ['user', 'admin', 'owner'] })
    .notNull()
    .default('user'),
  email_verified: integer('email_verified', { mode: 'boolean' })
    .notNull()
    .default(false),
  google_id: text('google_id'),
  company: text('company'),
  last_login: text('last_login'),
  created_at: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  // Geographic bounds (from migrate.ts - actual database schema)
  bounds_south: real('bounds_south'),
  bounds_north: real('bounds_north'),
  bounds_west: real('bounds_west'),
  bounds_east: real('bounds_east'),
  center_lat: real('center_lat'),
  center_lon: real('center_lon'),
  region: text('region'),
  comuna: text('comuna'),
  project_type: text('project_type'),
  status: text('status', { enum: ['draft', 'active', 'completed', 'archived'] })
    .notNull()
    .default('draft'),
  // Module access flags
  module_structural: integer('module_structural', { mode: 'boolean' })
    .notNull()
    .default(false),
  module_hydraulic: integer('module_hydraulic', { mode: 'boolean' })
    .notNull()
    .default(false),
  module_pavement: integer('module_pavement', { mode: 'boolean' })
    .notNull()
    .default(false),
  module_road: integer('module_road', { mode: 'boolean' })
    .notNull()
    .default(false),
  module_terrain: integer('module_terrain', { mode: 'boolean' })
    .notNull()
    .default(false),
  // Module usage tracking - last used timestamps
  module_structural_last_used: text('module_structural_last_used'),
  module_hydraulic_last_used: text('module_hydraulic_last_used'),
  module_pavement_last_used: text('module_pavement_last_used'),
  module_road_last_used: text('module_road_last_used'),
  module_terrain_last_used: text('module_terrain_last_used'),
  created_at: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================
// STRUCTURAL MODULE TABLES
// ============================================================

export const structural_nodes = sqliteTable('structural_nodes', {
  id: text('id').primaryKey(),
  project_id: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  story_id: text('story_id'),
  name: text('name'),
  x: real('x').notNull(),
  y: real('y').notNull(),
  z: real('z').notNull(),
  support_type: text('support_type').notNull().default('free'),
  restraints: text('restraints', { mode: 'json' }).notNull(),
  spring_stiffness: text('spring_stiffness', { mode: 'json' }),
  prescribed_displacements: text('prescribed_displacements', { mode: 'json' }),
  mass: text('mass', { mode: 'json' }),
  created_at: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const structural_materials = sqliteTable('structural_materials', {
  id: text('id').primaryKey(),
  project_id: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  material_type: text('material_type').notNull(),
  grade: text('grade'),
  elastic_modulus: real('elastic_modulus').notNull(),
  shear_modulus: real('shear_modulus'),
  poissons_ratio: real('poissons_ratio').notNull(),
  yield_strength: real('yield_strength'),
  ultimate_strength: real('ultimate_strength'),
  density: real('density'),
  created_at: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Additional structural tables (sections, beams, columns, etc.) would go here
// For brevity, showing core pattern

// ============================================================
// HYDRAULIC MODULE TABLES
// ============================================================

export const hydraulic_pipes = sqliteTable('hydraulic_pipes', {
  id: text('id').primaryKey(),
  project_id: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name'),
  from_node_id: text('from_node_id').notNull(),
  to_node_id: text('to_node_id').notNull(),
  diameter: real('diameter').notNull(),
  length: real('length').notNull(),
  roughness: real('roughness').notNull(),
  created_at: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================
// PAVEMENT MODULE TABLES
// ============================================================

export const pavement_sections = sqliteTable('pavement_sections', {
  id: text('id').primaryKey(),
  project_id: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  pavement_type: text('pavement_type').notNull(),
  design_method: text('design_method').notNull(),
  created_at: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================
// ROAD MODULE TABLES
// ============================================================

export const road_alignments = sqliteTable('road_alignments', {
  id: text('id').primaryKey(),
  project_id: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  alignment_type: text('alignment_type').notNull(),
  design_speed: real('design_speed').notNull(),
  created_at: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================
// TERRAIN MODULE TABLES
// ============================================================

export const terrain_surfaces = sqliteTable('terrain_surfaces', {
  id: text('id').primaryKey(),
  project_id: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  source_file: text('source_file'),
  min_elevation: real('min_elevation'),
  max_elevation: real('max_elevation'),
  created_at: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================
// EXPORT ALL TABLES
// ============================================================

export const schema = {
  users,
  projects,
  structural_nodes,
  structural_materials,
  hydraulic_pipes,
  pavement_sections,
  road_alignments,
  terrain_surfaces,
};
