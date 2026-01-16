#!/bin/bash
# Deploy LeDesign to Vercel
# Usage: ./scripts/vercel-deploy.sh [production|preview]

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

# Deployment type (production or preview)
DEPLOY_TYPE="${1:-preview}"

echo "🚀 Deploying LeDesign to Vercel ($DEPLOY_TYPE)..."

# Build the project first
echo "📦 Building packages..."
npm run build

# Deploy to Vercel
if [ "$DEPLOY_TYPE" = "production" ]; then
    echo "🌐 Deploying to PRODUCTION..."
    vercel --prod \
        --token "$VERCEL_TOKEN" \
        --scope "$VERCEL_ORG_ID" \
        --yes
else
    echo "🔍 Creating PREVIEW deployment..."
    vercel \
        --token "$VERCEL_TOKEN" \
        --scope "$VERCEL_ORG_ID" \
        --yes
fi

echo "✅ Deployment complete!"
