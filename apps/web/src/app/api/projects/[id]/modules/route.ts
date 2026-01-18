// ============================================================
// API: PROJECT MODULES
// ============================================================
// Get and manage project module access

import { NextRequest, NextResponse } from 'next/server';
import { getProjectModules, hasModuleAccess, enableModule, disableModule, type ModuleType } from '@/lib/modules/module-access';

// GET /api/projects/[id]/modules - Get all enabled modules for a project
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    // Optional query param to check a specific module
    const moduleParam = request.nextUrl.searchParams.get('module');

    if (moduleParam) {
      // Check specific module access
      const hasAccess = await hasModuleAccess(projectId, moduleParam as ModuleType);
      return NextResponse.json({ module: moduleParam, hasAccess });
    }

    // Get all enabled modules
    const modules = await getProjectModules(projectId);
    return NextResponse.json({ modules });
  } catch (error) {
    console.error('Error fetching project modules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project modules' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/modules - Enable/disable a module
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const body = await request.json();
    const { module, action } = body;

    if (!module || !action) {
      return NextResponse.json(
        { error: 'Missing module or action' },
        { status: 400 }
      );
    }

    if (action !== 'enable' && action !== 'disable') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "enable" or "disable"' },
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

    let success = false;
    if (action === 'enable') {
      success = await enableModule(projectId, module);
    } else {
      success = await disableModule(projectId, module);
    }

    if (success) {
      return NextResponse.json({ success: true, module, action });
    } else {
      return NextResponse.json(
        { error: 'Failed to update module' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating project module:', error);
    return NextResponse.json(
      { error: 'Failed to update project module' },
      { status: 500 }
    );
  }
}
