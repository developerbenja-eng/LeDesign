# LeDesign Setup Guide

This guide will help you set up the LeDesign project with all necessary API keys and environment variables.

## Prerequisites

- Node.js >= 20.0.0
- npm 10.9.2+
- Google Cloud account (for Gemini API)

## Environment Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd LeDesign
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

The project requires a Google Gemini API key for AI-powered terrain analysis features.

#### Option A: Copy from .env.example

```bash
cp .env.example .env
```

Then edit `.env` and add your Google Gemini API key:

```bash
GOOGLE_GEMINI_API_KEY=your_actual_api_key_here
GCP_PROJECT_ID=your_gcp_project_id
NODE_ENV=development
```

#### Option B: Get API Key from Google AI Studio

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env` file

#### Option C: Use Google Cloud CLI

If you have gcloud CLI configured:

```bash
# List existing API keys
gcloud services api-keys list

# Get the key string for a specific key
gcloud services api-keys get-key-string projects/YOUR_PROJECT_ID/locations/global/keys/YOUR_KEY_ID
```

### 4. Verify Configuration

The terrain package will automatically validate configuration on startup. You should see warnings if any required variables are missing.

```bash
npm run dev
```

## Project Structure

```
LeDesign/
├── packages/
│   ├── terrain/        # Terrain analysis with AI features
│   ├── structural/     # Structural engineering
│   ├── hydraulics/     # Hydraulic design
│   ├── pavement/       # Pavement design
│   ├── road/          # Road design
│   ├── auth/          # Authentication
│   └── db/            # Database utilities
├── .env               # Local environment variables (not committed)
├── .env.example       # Template for environment variables
└── package.json       # Root package configuration
```

## Using with Claude Code Web

This project is configured to work with Claude Code web. When you push to GitHub:

1. The `.env.example` file will be committed (template only)
2. The actual `.env` file is gitignored (contains your keys)
3. In Claude Code web, you'll need to set up environment variables through the interface or use GitHub Secrets

## Google Gemini API Features

The terrain package uses Google Gemini for:

- **Satellite Feature Detection**: Automatically detect buildings, fences, roads, and other features from satellite imagery
- **Terrain Classification**: AI-powered analysis of terrain characteristics
- **Smart Surface Generation**: Intelligent surface modeling with feature constraints

## Troubleshooting

### API Key Not Working

- Verify the key is correct in your `.env` file
- Ensure the Generative Language API is enabled in your GCP project:
  ```bash
  gcloud services enable generativelanguage.googleapis.com
  ```

### Environment Variables Not Loading

- Make sure you're in the project root directory
- Check that `.env` file exists and is not empty
- Restart your development server after changing `.env`

### Permission Errors

- Verify your Google Cloud account has the necessary permissions
- Check that API quotas are not exceeded

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (all packages)
npm run dev

# Build all packages
npm run build

# Run tests
npm run test

# Lint code
npm run lint

# Format code
npm run format
```

## Support

For issues or questions, please open an issue on GitHub.
