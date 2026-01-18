// ============================================================
// API: TRACK MODULE USAGE
// ============================================================
// Track when modules are actively used for reporting

import { NextRequest, NextResponse } from 'next/server';
import { trackModuleUsage, getModuleUsageSummary, getActiveModulesForReport } from '@/lib/modules/module-tracking';
import type { ModuleType } from '@/lib/modules/module-access';

// POST /api/projects/[id]/modules/track - Track module usage
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const body = await request.json();
    const { module } = body;

    if (!module) {
      return NextResponse.json(
        { error: 'Missing module parameter' },
        { status: 400 }
      );
    }

    const validModules: ModuleType[] = ['structural', 'hydraulic', 'pavement', 'road', 'terrain'];
    if (!validModules.includes(module)) {
      return NextResponse.json(
        { error: 'Invalid module type' },
        { status: 400 }
      );
    }

    const success = await trackModuleUsage(projectId, module);

    if (success) {
      return NextResponse.json({ success: true, module, timestamp: new Date() });
    } else {
      return NextResponse.json(
        { error: 'Failed to track module usage' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error tracking module usage:', error);
    return NextResponse.json(
      { error: 'Failed to track module usage' },
      { status: 500 }
    );
  }
}

// GET /api/projects/[id]/modules/track - Get usage summary
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const reportMode = request.nextUrl.searchParams.get('report');

    if (reportMode === 'true') {
      // Return only active modules for report generation
      const activeModules = await getActiveModulesForReport(projectId);
      return NextResponse.json({ activeModules });
    } else {
      // Return full usage summary
      const summary = await getModuleUsageSummary(projectId);
      return NextResponse.json({ summary });
    }
  } catch (error) {
    console.error('Error getting module usage:', error);
    return NextResponse.json(
      { error: 'Failed to get module usage' },
      { status: 500 }
    );
  }
}
