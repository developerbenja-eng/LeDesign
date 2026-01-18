#!/usr/bin/env node
const fs = require('fs');

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
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove double wrapping pattern
  content = content.replace(/(\s+return withAuth\(request, async \(req: AuthenticatedRequest\) => \{\s+return withAuth\(request, async \(req: AuthenticatedRequest\) => \{)/g,
    '  return withAuth(request, async (req: AuthenticatedRequest) => {');

  // Also remove the extra closing braces
  content = content.replace(/(\s+\}\);\s+\}\);\s+\})/g, '  });\n}');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Fixed: ${filePath}`);
});

console.log('\n✅ All double wrapping fixed!');
