#!/bin/bash
# Check Vercel deployment status
# Shows recent deployments and project info

set -e

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check Vercel token
if [ -z "$VERCEL_TOKEN" ]; then
    echo "❌ VERCEL_TOKEN not found in .env file"
    echo "   Run 'npm run setup' to configure environment"
    exit 1
fi

echo "📊 Vercel Deployment Status"
echo "============================"
echo ""

# Show whoami
echo "👤 Account:"
vercel whoami --token "$VERCEL_TOKEN" || echo "   Not authenticated"
echo ""

# Show recent deployments (if project is linked)
if [ -d ".vercel" ]; then
    echo "📦 Recent deployments:"
    vercel ls --token "$VERCEL_TOKEN" --scope "$VERCEL_ORG_ID" || echo "   No deployments found"
else
    echo "⚠️  Project not linked yet"
    echo "   Run 'npm run vercel:setup' to link project"
fi
