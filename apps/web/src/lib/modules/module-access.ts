// ============================================================
// MODULE ACCESS CONTROL
// ============================================================
// Utilities for checking module subscription access

import { db } from '@ledesign/db';
import { projects } from '@ledesign/db/schema';
import { eq } from 'drizzle-orm';

export type ModuleType =
  | 'structural'
  | 'hydraulic'
  | 'pavement'
  | 'road'
  | 'terrain';

/**
 * Check if a project has access to a specific module
 */
export async function hasModuleAccess(
  projectId: string,
  module: ModuleType
): Promise<boolean> {
  try {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
      columns: {
        module_structural: true,
        module_hydraulic: true,
        module_pavement: true,
        module_road: true,
        module_terrain: true,
      },
    });

    if (!project) {
      return false;
    }

    // Map module type to database column
    const moduleMap: Record<ModuleType, boolean> = {
      structural: project.module_structural,
      hydraulic: project.module_hydraulic,
      pavement: project.module_pavement,
      road: project.module_road,
      terrain: project.module_terrain,
    };

    return moduleMap[module];
  } catch (error) {
    console.error('Error checking module access:', error);
    return false;
  }
}

/**
 * Get all enabled modules for a project
 */
export async function getProjectModules(
  projectId: string
): Promise<ModuleType[]> {
  try {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
      columns: {
        module_structural: true,
        module_hydraulic: true,
        module_pavement: true,
        module_road: true,
        module_terrain: true,
      },
    });

    if (!project) {
      return [];
    }

    const enabledModules: ModuleType[] = [];

    if (project.module_structural) enabledModules.push('structural');
    if (project.module_hydraulic) enabledModules.push('hydraulic');
    if (project.module_pavement) enabledModules.push('pavement');
    if (project.module_road) enabledModules.push('road');
    if (project.module_terrain) enabledModules.push('terrain');

    return enabledModules;
  } catch (error) {
    console.error('Error getting project modules:', error);
    return [];
  }
}

/**
 * Enable a module for a project
 */
export async function enableModule(
  projectId: string,
  module: ModuleType
): Promise<boolean> {
  try {
    const updateData: any = {};

    switch (module) {
      case 'structural':
        updateData.module_structural = true;
        break;
      case 'hydraulic':
        updateData.module_hydraulic = true;
        break;
      case 'pavement':
        updateData.module_pavement = true;
        break;
      case 'road':
        updateData.module_road = true;
        break;
      case 'terrain':
        updateData.module_terrain = true;
        break;
    }

    await db.update(projects)
      .set(updateData)
      .where(eq(projects.id, projectId));

    return true;
  } catch (error) {
    console.error('Error enabling module:', error);
    return false;
  }
}

/**
 * Disable a module for a project
 */
export async function disableModule(
  projectId: string,
  module: ModuleType
): Promise<boolean> {
  try {
    const updateData: any = {};

    switch (module) {
      case 'structural':
        updateData.module_structural = false;
        break;
      case 'hydraulic':
        updateData.module_hydraulic = false;
        break;
      case 'pavement':
        updateData.module_pavement = false;
        break;
      case 'road':
        updateData.module_road = false;
        break;
      case 'terrain':
        updateData.module_terrain = false;
        break;
    }

    await db.update(projects)
      .set(updateData)
      .where(eq(projects.id, projectId));

    return true;
  } catch (error) {
    console.error('Error disabling module:', error);
    return false;
  }
}

/**
 * Module display names for UI
 */
export const MODULE_NAMES: Record<ModuleType, string> = {
  structural: 'Structural Design',
  hydraulic: 'Water Network',
  pavement: 'Pavement',
  road: 'Road Geometry',
  terrain: 'Terrain',
};

/**
 * Module descriptions for UI
 */
export const MODULE_DESCRIPTIONS: Record<ModuleType, string> = {
  structural: 'Structural analysis and design (NCh 430, NCh 433)',
  hydraulic: 'Water network design (NCh 691, EPANET)',
  pavement: 'Pavement design and analysis',
  road: 'Road geometry and alignment',
  terrain: 'Terrain modeling and earthwork',
};
