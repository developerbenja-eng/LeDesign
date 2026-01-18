// ============================================================
// MODULE USAGE TRACKING
// ============================================================
// Track which modules are actively being used in projects

import { db } from '@ledesign/db';
import { projects } from '@ledesign/db/schema';
import { eq } from 'drizzle-orm';
import type { ModuleType } from './module-access';

/**
 * Track module usage activity
 * Updates the last_used timestamp for a module in a project
 */
export async function trackModuleUsage(
  projectId: string,
  module: ModuleType
): Promise<boolean> {
  try {
    const updateData: any = {};
    const now = new Date();

    // Set the last_used field based on module type
    switch (module) {
      case 'structural':
        updateData.module_structural_last_used = now;
        break;
      case 'hydraulic':
        updateData.module_hydraulic_last_used = now;
        break;
      case 'pavement':
        updateData.module_pavement_last_used = now;
        break;
      case 'road':
        updateData.module_road_last_used = now;
        break;
      case 'terrain':
        updateData.module_terrain_last_used = now;
        break;
    }

    await db.update(projects)
      .set(updateData)
      .where(eq(projects.id, projectId));

    return true;
  } catch (error) {
    console.error('Error tracking module usage:', error);
    return false;
  }
}

/**
 * Get usage summary for a project
 * Returns which modules have been used and when
 */
export async function getModuleUsageSummary(projectId: string): Promise<{
  module: ModuleType;
  enabled: boolean;
  lastUsed: Date | null;
}[]> {
  try {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
      columns: {
        module_structural: true,
        module_structural_last_used: true,
        module_hydraulic: true,
        module_hydraulic_last_used: true,
        module_pavement: true,
        module_pavement_last_used: true,
        module_road: true,
        module_road_last_used: true,
        module_terrain: true,
        module_terrain_last_used: true,
      },
    });

    if (!project) {
      return [];
    }

    return [
      {
        module: 'structural',
        enabled: project.module_structural,
        lastUsed: project.module_structural_last_used,
      },
      {
        module: 'hydraulic',
        enabled: project.module_hydraulic,
        lastUsed: project.module_hydraulic_last_used,
      },
      {
        module: 'pavement',
        enabled: project.module_pavement,
        lastUsed: project.module_pavement_last_used,
      },
      {
        module: 'road',
        enabled: project.module_road,
        lastUsed: project.module_road_last_used,
      },
      {
        module: 'terrain',
        enabled: project.module_terrain,
        lastUsed: project.module_terrain_last_used,
      },
    ];
  } catch (error) {
    console.error('Error getting module usage summary:', error);
    return [];
  }
}

/**
 * Get active modules for report generation
 * Returns only modules that have been actually used (not just enabled)
 */
export async function getActiveModulesForReport(projectId: string): Promise<ModuleType[]> {
  const summary = await getModuleUsageSummary(projectId);

  return summary
    .filter((item) => item.enabled && item.lastUsed !== null)
    .map((item) => item.module);
}

/**
 * Format usage summary for display
 */
export function formatUsageSummary(summary: {
  module: ModuleType;
  enabled: boolean;
  lastUsed: Date | null;
}[]): string {
  const lines: string[] = ['Module Usage Summary', '='.repeat(40)];

  summary.forEach((item) => {
    const status = item.enabled ? '✓ Enabled' : '✗ Disabled';
    const usage = item.lastUsed
      ? `Last used: ${item.lastUsed.toLocaleDateString()}`
      : 'Never used';

    lines.push(`${item.module.padEnd(15)} ${status.padEnd(12)} ${usage}`);
  });

  return lines.join('\n');
}
