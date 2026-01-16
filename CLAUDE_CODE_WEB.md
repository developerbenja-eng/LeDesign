# Using LeDesign in Claude Code Web

This guide explains how to access API keys and set up the environment when using LeDesign in Claude Code web.

## 🔑 The .env File Problem

The `.env` file containing your API keys is **NOT** committed to GitHub for security reasons. This means when you clone the repository in Claude Code web, you won't have the API keys automatically.

## ✅ Solutions for Claude Code Web

### Option 1: Automatic Setup with Google Cloud CLI (Recommended)

Since you have Google Cloud CLI access configured, you can automatically retrieve your API keys:

```bash
# After cloning the repository, run:
npm run setup
```

This will:
- Connect to Google Cloud using your existing authentication
- Retrieve your Google Gemini API key from the GCP project
- Create the `.env` file automatically

**Manual alternative:**
```bash
node scripts/setup-env.js
# or
bash scripts/setup-env.sh
```

### Option 2: Manual .env Creation

Create the `.env` file manually using the CLI:

```bash
# Get your API key from Google Cloud
gcloud services api-keys get-key-string \
  projects/949566702282/locations/global/keys/2721dcc2-f040-4c07-ac19-4212ed055854 \
  --format="value(keyString)"

# Copy the output and create .env file
cat > .env << 'EOF'
GOOGLE_GEMINI_API_KEY=<paste-your-key-here>
GCP_PROJECT_ID=echo-home-system
NODE_ENV=development
EOF
```

### Option 3: GitHub Secrets (for CI/CD)

If you want to use this in automated workflows:

1. Go to: https://github.com/developerbenja-eng/LeDesign/settings/secrets/actions
2. Add repository secrets:
   - `GOOGLE_GEMINI_API_KEY`: Your Gemini API key
   - `GCP_PROJECT_ID`: echo-home-system

Then in your workflow, these will be available as environment variables.

### Option 4: Direct Retrieval in Code

The terrain package can retrieve the key directly from Google Cloud:

```typescript
import { terrainConfig } from '@ledesign/terrain';

// If .env doesn't exist, retrieve from gcloud
if (!terrainConfig.googleGeminiApiKey) {
  const { execSync } = require('child_process');
  const apiKey = execSync(
    'gcloud services api-keys get-key-string projects/949566702282/locations/global/keys/2721dcc2-f040-4c07-ac19-4212ed055854 --format="value(keyString)"',
    { encoding: 'utf-8' }
  ).trim();

  // Use apiKey directly
  await detectFeaturesFromSatellite(input, apiKey);
}
```

## 🚀 Quick Start in Claude Code Web

1. **Clone the repository**
   ```bash
   git clone https://github.com/developerbenja-eng/LeDesign.git
   cd LeDesign
   ```

2. **Authenticate with Google Cloud** (if not already done)
   ```bash
   gcloud auth login
   gcloud config set project echo-home-system
   ```

3. **Set up environment automatically**
   ```bash
   npm run setup
   ```

4. **Install and run**
   ```bash
   npm install
   npm run dev
   ```

## 🔒 Security Best Practices

### ✅ DO:
- Use `npm run setup` to retrieve keys from Google Cloud
- Keep `.env` in `.gitignore`
- Use GitHub Secrets for CI/CD workflows
- Rotate API keys regularly

### ❌ DON'T:
- Commit `.env` to GitHub
- Share API keys in chat or issues
- Hardcode keys in source files
- Use production keys for development

## 🛠️ Available API Keys

Your project uses:

1. **Google Gemini API**
   - Purpose: AI-powered satellite feature detection and terrain analysis
   - Key ID: `2721dcc2-f040-4c07-ac19-4212ed055854`
   - Retrieve with: `npm run setup`

## 📝 Verification

To verify your environment is set up correctly:

```bash
# Check if .env exists
ls -la .env

# Test configuration
node -e "require('dotenv').config(); console.log('API Key:', process.env.GOOGLE_GEMINI_API_KEY?.substring(0,10) + '...')"

# Or use the built-in config check
node -e "const { terrainConfig } = require('./packages/terrain/dist/index.js'); console.log(terrainConfig.isConfigured() ? '✅ Configured' : '❌ Not configured')"
```

## 🆘 Troubleshooting

### "API key not found"
- Run `gcloud auth login` to authenticate
- Verify project: `gcloud config get-value project`
- Run `npm run setup` again

### "Permission denied"
- Ensure you're using the developer.benja@gmail.com account
- Check API is enabled: `gcloud services list --enabled | grep generativelanguage`

### ".env file not loading"
- Make sure you're in the project root directory
- Check file exists: `ls -la .env`
- Verify file permissions: `chmod 644 .env`

## 📚 Additional Resources

- [Google AI Studio](https://aistudio.google.com/app/apikey) - Manage API keys
- [Google Cloud Console](https://console.cloud.google.com/apis/credentials?project=echo-home-system) - View project credentials
- [Setup Guide](./README_SETUP.md) - Complete setup documentation
