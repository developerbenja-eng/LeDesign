#!/bin/bash

# Fix authentication imports in all structural API routes
find /Users/benjaledesma/Benja/LeDesign/apps/web/src/app/api/structural -name "route.ts" -type f | while read file; do
  echo "Processing: $file"

  # Replace import statement
  sed -i '' "s|import { verifyAuth } from '@/lib/auth/jwt';|import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';|g" "$file"

  # Note: Function wrapping and user.id replacement need manual review due to complexity
done

echo "✅ Import statements updated. Manual review needed for handler function wrapping."
