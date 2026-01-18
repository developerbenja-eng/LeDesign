# LeDesign Quick Start Guide

**One-command setup for Google Cloud & Vercel integration**

---

## 🚀 First Time Setup

```bash
# 1. Clone the repository
git clone https://github.com/developerbenja-eng/LeDesign.git
cd LeDesign

# 2. Run automated setup (gets ALL credentials)
npm run setup

# 3. Install dependencies
npm install

# 4. Start development (opens on port 4000)
npm run dev
# → http://localhost:4000
```

That's it! The `npm run setup` command automatically retrieves:
- ✅ Google Gemini API key (from Google Cloud)
- ✅ Vercel deployment token
- ✅ All project configuration

---

## 📦 What You Get

### Google Gemini AI
- **Satellite feature detection** - Detect buildings, roads, fences from imagery
- **Terrain classification** - AI-powered terrain analysis
- **Smart surface generation** - Intelligent 3D modeling

### Vercel Deployment
- **One-command deployment** to preview or production
- **Automatic builds** and optimization
- **Global CDN** distribution

---

## 🛠️ Development Commands

```bash
npm run dev            # Start development server (port 4000)
npm run build          # Build all packages
npm run test           # Run tests
npm run lint           # Lint code
npm run format         # Format code
```

---

## 🌐 Deployment Commands

```bash
# First time only: Link to Vercel
npm run vercel:setup

# Deploy preview (for testing)
npm run deploy:preview

# Deploy to production
npm run deploy:prod

# Check status
npm run vercel:status
```

---

## 📋 How It Works

### Behind the Scenes

When you run `npm run setup`:

1. **Connects to Google Cloud CLI** (uses your authenticated account)
2. **Retrieves Google Gemini API key** from your GCP project
3. **Adds Vercel deployment token** from global configuration
4. **Creates `.env` file** with all credentials (gitignored)

The `.env` file contains:
```bash
GOOGLE_GEMINI_API_KEY=AIzaSy...     # For AI features
GCP_PROJECT_ID=ledesign      # Google Cloud project
VERCEL_TOKEN=us3Zi...                # For deployment
VERCEL_ORG_ID=benjas-projects-...    # Vercel organization
VERCEL_PROJECT_ID=ledesign           # Project name
NODE_ENV=development                  # Environment
```

### Security

- ✅ `.env` is **gitignored** (never committed to GitHub)
- ✅ Credentials retrieved **on-demand** from secure sources
- ✅ Each developer gets their **own local credentials**
- ✅ No secrets in the repository

---

## 🎯 Deployment Workflow

```bash
# 1. Make your changes
# ... edit code ...

# 2. Test locally
npm run dev
npm run test

# 3. Deploy preview
npm run deploy:preview
# → Get preview URL: https://ledesign-abc123.vercel.app

# 4. Verify preview works

# 5. Deploy to production
npm run deploy:prod
# → Live at production URL
```

---

## 🔧 Project Structure

```
LeDesign/
├── packages/
│   ├── terrain/          # AI-powered terrain analysis
│   ├── structural/       # Structural engineering
│   ├── hydraulics/       # Hydraulic design
│   ├── pavement/         # Pavement design
│   ├── road/            # Road geometry
│   └── chilean-codes/   # NCh standards
├── scripts/
│   ├── setup-env.js     # Automated credential setup
│   ├── vercel-*.sh      # Deployment scripts
├── .env                 # Your credentials (gitignored)
├── .env.example         # Template (committed)
└── CLAUDE.md           # Full instructions
```

---

## 📚 Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Complete instructions for Claude Code agent
- **[CLAUDE_CODE_WEB.md](./CLAUDE_CODE_WEB.md)** - Using in Claude Code web
- **[README_SETUP.md](./README_SETUP.md)** - Detailed setup guide
- **[README.md](./README.md)** - Project overview

---

## 🆘 Troubleshooting

### "API key not found"
```bash
# Re-authenticate with Google Cloud
gcloud auth login
gcloud config set project ledesign

# Re-run setup
npm run setup
```

### "Vercel deployment failed"
```bash
# Check Vercel status
npm run vercel:status

# Re-link project
npm run vercel:setup
```

### ".env file missing"
```bash
# Just run setup again
npm run setup
```

---

## ✨ Key Features

- 🤖 **Google Gemini AI** - Satellite imagery analysis, terrain classification
- 🏗️ **Structural Analysis** - FEA, seismic design (NCh433), steel/concrete
- 💧 **Hydraulic Design** - Water networks, sewers, stormwater
- 🛣️ **Road Design** - Alignment, superelevation, sight distance
- 📊 **Pavement Design** - AASHTO, CBR-based methods
- 🌍 **Terrain Analysis** - DEM processing, volume calculations
- 🇨🇱 **Chilean Standards** - Full NCh code implementation

---

## 🔗 Links

- **GitHub**: https://github.com/developerbenja-eng/LeDesign
- **Google Cloud**: ledesign project
- **Vercel**: benjas-projects-3ad07b52 organization

---

**Made with Claude Code** 🤖
