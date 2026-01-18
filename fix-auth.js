#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const files = [
  '/Users/benjaledesma/Benja/LeDesign/apps/web/src/app/api/structural/materials/route.ts',
  '/Users/benjaledesma/Benja/LeDesign/apps/web/src/app/api/structural/projects/[id]/analysis/[runId]/route.ts',
  '/Users/benjaledesma/Benja/LeDesign/apps/web/src/app/api/structural/projects/[id]/analysis/[runId]/run/route.ts',
  '/Users/benjaledesma/Benja/LeDesign/apps/web/src/app/api/structural/projects/[id]/analysis/route.ts',
  '/Users/benjaledesma/Benja/LeDesign/apps/web/src/app/api/structural/projects/[id]/beams/route.ts',
  '/Users/benjaledesma/Benja/LeDesign/apps/web/src/app/api/structural/projects/[id]/braces/route.ts',
  '/Users/benjaledesma/Benja/LeDesign/apps/web/src/app/api/structural/projects/[id]/buildings/[buildingId]/stories/route.ts',
  '/Users/benjaledesma/Benja/LeDesign/apps/web/src/app/api/structural/projects/[id]/buildings/route.ts',
  '/Users/benjaledesma/Benja/LeDesign/apps/web/src/app/api/structural/projects/[id]/columns/route.ts',
  '/Users/benjaledesma/Benja/LeDesign/apps/web/src/app/api/structural/projects/[id]/design/route.ts',
  '/Users/benjaledesma/Benja/LeDesign/apps/web/src/app/api/structural/projects/[id]/load-cases/route.ts',
  '/Users/benjaledesma/Benja/LeDesign/apps/web/src/app/api/structural/projects/[id]/load-combinations/route.ts',
  '/Users/benjaledesma/Benja/LeDesign/apps/web/src/app/api/structural/projects/[id]/nodes/route.ts',
  '/Users/benjaledesma/Benja/LeDesign/apps/web/src/app/api/structural/projects/[id]/route.ts',
  '/Users/benjaledesma/Benja/LeDesign/apps/web/src/app/api/structural/projects/[id]/seismic-loads/generate/route.ts',
  '/Users/benjaledesma/Benja/LeDesign/apps/web/src/app/api/structural/projects/[id]/slabs/route.ts',
  '/Users/benjaledesma/Benja/LeDesign/apps/web/src/app/api/structural/projects/[id]/walls/route.ts',
  '/Users/benjaledesma/Benja/LeDesign/apps/web/src/app/api/structural/sections/route.ts',
];

files.forEach(filePath => {
  console.log(`Processing: ${path.basename(path.dirname(filePath))}/${path.basename(filePath)}`);

  let content = fs.readFileSync(filePath, 'utf8');

  // Step 1: Replace import
  content = content.replace(
    /import { verifyAuth } from '@\/lib\/auth\/jwt';/g,
    "import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';"
  );

  // Step 2: Replace user.id with req.user.userId
  content = content.replace(/user\.id/g, 'req.user.userId');

  // Step 3: Wrap handler functions
  // Match: export async function METHOD(request: NextRequest) {
  // Capture everything inside the function
  const methodPattern = /export async function (GET|POST|PUT|DELETE|PATCH)\(request: NextRequest\) \{([\s\S]*?)\n\}/g;

  content = content.replace(methodPattern, (match, method, body) => {
    // Remove the verifyAuth check lines
    let cleanBody = body.replace(/\s*const user = await verifyAuth\(request\);[\s\S]*?return NextResponse\.json\({ error: 'Unauthorized' }, { status: 401 }\);\s*\}/gm, '');

    // Wrap with withAuth
    return `export async function ${method}(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {${cleanBody}
  });
}`;
  });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  ✅ Fixed`);
});

console.log('\n✅ All files processed!');
