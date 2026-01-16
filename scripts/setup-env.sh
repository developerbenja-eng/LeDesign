#!/bin/bash
# Setup environment variables from Google Cloud
# Run this script when you clone the repo in Claude Code web

echo "🔧 Setting up LeDesign environment..."

# Create .env file if it doesn't exist
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists. Skipping..."
else
    echo "📝 Creating .env file..."

    # Retrieve API key from Google Cloud
    echo "🔑 Retrieving Google Gemini API key from Google Cloud..."
    API_KEY=$(gcloud services api-keys get-key-string projects/949566702282/locations/global/keys/2721dcc2-f040-4c07-ac19-4212ed055854 --format="value(keyString)" 2>/dev/null)

    if [ -z "$API_KEY" ]; then
        echo "❌ Failed to retrieve API key from Google Cloud"
        echo "   Make sure you're authenticated with: gcloud auth login"
        exit 1
    fi

    # Get project ID
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)

    # Create .env file
    cat > .env << EOF
# Google Gemini API Configuration
GOOGLE_GEMINI_API_KEY=${API_KEY}

# Google Cloud Project
GCP_PROJECT_ID=${PROJECT_ID}

# Development
NODE_ENV=development
EOF

    echo "✅ .env file created successfully!"
    echo "   - Google Gemini API Key: ${API_KEY:0:10}...${API_KEY: -4}"
    echo "   - GCP Project: ${PROJECT_ID}"
fi

echo ""
echo "🚀 Environment setup complete! Run: npm install && npm run dev"
