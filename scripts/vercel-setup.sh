#!/bin/bash
# Link LeDesign to Vercel project
# Run this once to set up Vercel project configuration

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

echo "🔗 Linking LeDesign to Vercel..."

# Link to Vercel project (or create if doesn't exist)
vercel link \
    --token "$VERCEL_TOKEN" \
    --scope "$VERCEL_ORG_ID" \
    --yes

echo "✅ Vercel project linked successfully!"
echo ""
echo "📝 Project configuration saved to .vercel/"
echo "   (This directory is gitignored)"
echo ""
echo "🚀 Ready to deploy!"
echo "   - Preview: npm run deploy:preview"
echo "   - Production: npm run deploy:prod"
