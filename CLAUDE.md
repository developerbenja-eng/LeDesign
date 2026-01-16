# Claude Code Instructions for LeDesign

*Instructions for Claude Code agent when working with the LeDesign engineering platform*

---

## Project Overview

LeDesign is a unified engineering design platform for Chilean engineering professionals, built as a monorepo using Turborepo. It includes modules for:

- **Structural Engineering** (FEA, seismic analysis, steel/concrete design)
- **Hydraulic Engineering** (water networks, sewers, open channels, stormwater)
- **Pavement Design** (AASHTO, CBR-based design)
- **Road Design** (alignment, superelevation, sight distance)
- **Terrain Analysis** (DEM processing, AI-powered satellite feature detection)

## Environment Setup

### CRITICAL: Always Run Setup First

When working with this project for the first time or after cloning:

```bash
npm run setup
```

This retrieves API keys from Google Cloud CLI and creates the `.env` file automatically. The `.env` file is gitignored and contains:
- `GOOGLE_GEMINI_API_KEY` - For AI-powered terrain analysis
- `GCP_PROJECT_ID` - Google Cloud project (echo-home-system)
- `NODE_ENV` - Environment setting

### Verification

After setup, verify configuration:

```bash
node -e "require('dotenv').config(); console.log('API Key:', process.env.GOOGLE_GEMINI_API_KEY ? '✅ Configured' : '❌ Missing')"
```

## Project Structure

```
LeDesign/
├── packages/
│   ├── terrain/              # Terrain analysis with Google Gemini AI
│   │   ├── src/
│   │   │   ├── config.ts            # Environment config (exports terrainConfig)
│   │   │   ├── surface-ai/          # AI-powered surface generation
│   │   │   │   └── satellite-feature-detector.ts  # Uses Gemini API
│   │   │   ├── geotiff-terrain.ts   # DEM processing
│   │   │   ├── dwg/                 # AutoCAD file parsing
│   │   │   └── index.ts             # Main exports
│   │   └── package.json
│   ├── structural/           # Structural engineering
│   ├── hydraulics/           # Hydraulic engineering
│   ├── pavement/            # Pavement design
│   ├── road/                # Road design
│   ├── chilean-codes/       # NCh standards (433, 432, 431, etc.)
│   ├── auth/                # Authentication utilities
│   └── db/                  # Database (Turso/libSQL)
├── apps/
│   └── web/                 # Next.js application (future)
├── scripts/
│   ├── setup-env.js         # Automated environment setup
│   └── setup-env.sh         # Bash alternative
├── .env                     # Local environment (GITIGNORED)
├── .env.example             # Template (committed)
└── package.json
```

## Key Technologies

- **Monorepo**: Turborepo
- **Language**: TypeScript 5.7+
- **Build Tool**: tsup
- **Testing**: Vitest
- **AI Integration**: Google Gemini 2.0 Flash
- **3D**: Three.js (terrain visualization)
- **Package Manager**: npm 10.9.2+
- **Node**: >= 20.0.0

## Working with the Codebase

### Building Packages

```bash
# Build all packages
npm run build

# Build specific package
cd packages/terrain && npm run build

# Watch mode for development
cd packages/terrain && npm run dev
```

### Testing

```bash
# Run all tests
npm run test

# Test specific package
cd packages/structural && npm run test
```

### Adding New Features

1. **Terrain Package** - Uses Google Gemini API
   - Import config: `import { terrainConfig } from './config'`
   - Check if configured: `terrainConfig.isConfigured()`
   - Access API key: `terrainConfig.googleGeminiApiKey`
   - AI features are in `src/surface-ai/`

2. **Chilean Codes** - Standards implementations
   - Located in `packages/chilean-codes/`
   - Includes NCh433 (seismic), NCh432 (wind), NCh431 (snow), etc.
   - Used by structural package

3. **Structural Analysis** - FEA and design
   - Shell elements, modal analysis, response spectrum
   - Integrates with Chilean codes
   - Design modules for concrete, steel, timber, masonry

### Code Style

- Use TypeScript strict mode
- Export types from index files
- Document complex algorithms
- Follow existing naming conventions
- Use descriptive variable names (e.g., `seismicZone`, `designSpectrum`)

## Google Gemini API Integration

### Location
- Main implementation: `packages/terrain/src/surface-ai/satellite-feature-detector.ts`
- Configuration: `packages/terrain/src/config.ts`
- Model: `gemini-2.0-flash`

### Usage Pattern

```typescript
import { detectFeaturesFromSatellite, terrainConfig } from '@ledesign/terrain';

// API key is loaded automatically from .env
const result = await detectFeaturesFromSatellite({
  imageryTile: base64ImageData,
  bounds: { minX, maxX, minY, maxY },
  options: { detectBuildings: true, detectFences: true }
});

// Or pass key explicitly
const result = await detectFeaturesFromSatellite(input, customApiKey);
```

### Features
- Satellite imagery feature detection (buildings, fences, roads, water)
- Terrain classification
- Smart surface generation with constraints
- Quality validation

## Common Tasks

### Adding a New Package

```bash
# Create package directory
mkdir -p packages/new-package/src
cd packages/new-package

# Initialize package.json
npm init -y

# Add to workspace (already configured in root package.json)
# Add tsconfig.json, tsup.config.ts following existing patterns
```

### Working with Environment Variables

**DO:**
- Use `terrainConfig` for accessing Google Gemini API key
- Check configuration before using: `terrainConfig.isConfigured()`
- Run `npm run setup` when .env is missing

**DON'T:**
- Commit `.env` file
- Hardcode API keys
- Assume .env exists (check first)

### Chilean Engineering Standards

The project implements Chilean standards (NCh):
- **NCh433**: Seismic design (response spectra, design categories)
- **NCh432**: Wind loads
- **NCh431**: Snow loads
- **NCh1537**: Live loads
- **NCh3171**: Load combinations
- **NCh691**: Water systems
- **NCh1105**: Sewer systems

When adding code-related features, reference the appropriate standard in comments.

## Git Workflow

### Before Committing

```bash
# Verify .env is not staged
git status | grep "\.env$" && echo "❌ Remove .env!" || echo "✅ Safe to commit"

# Run tests
npm run test

# Format code
npm run format

# Lint
npm run lint
```

### Commit Message Format

```
<type>: <short description>

<detailed description if needed>

- Bullet points for changes
- Reference issues/standards

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

## Troubleshooting

### "API key not found"
```bash
# Re-run setup
npm run setup

# Or manually check
gcloud auth list
gcloud config get-value project
```

### "Module not found"
```bash
# Rebuild packages
npm run build

# Clean and reinstall
npm run clean
npm install
```

### "Type errors"
```bash
# Ensure all packages are built
npm run build

# Check tsconfig.json references are correct
```

## Performance Considerations

- **Terrain package**: Large DEM files should be streamed, not loaded entirely
- **AI calls**: Cache satellite imagery results when possible
- **FEA**: Use sparse matrix solvers for large models
- **Build**: Use Turborepo caching (already configured)

## Security Notes

- `.env` file is gitignored - never commit it
- Google Gemini API key retrieved from Google Cloud CLI
- GitHub Personal Access Token in git remote (local only)
- Use environment variables for all secrets

## Resources

- [Setup Guide](./README_SETUP.md) - Local development setup
- [Claude Code Web Guide](./CLAUDE_CODE_WEB.md) - Using in Claude Code web
- [Google AI Studio](https://aistudio.google.com/app/apikey) - API key management
- [Turborepo Docs](https://turbo.build/repo/docs) - Monorepo tooling

## Quick Reference Commands

```bash
npm run setup          # Set up environment from Google Cloud
npm install            # Install dependencies
npm run dev            # Start development (watch mode)
npm run build          # Build all packages
npm run test           # Run all tests
npm run lint           # Lint code
npm run format         # Format with Prettier
npm run clean          # Clean build artifacts
```

## When Working with This Project

1. **First time**: Run `npm run setup` to get API keys
2. **Making changes**: Work in relevant package directory
3. **Testing**: Run tests before committing
4. **AI features**: Use `terrainConfig` for API access
5. **Standards**: Reference Chilean codes (NCh) when applicable
6. **Commit**: Ensure .env is not staged

---

**Repository**: https://github.com/developerbenja-eng/LeDesign
**Account**: developer.benja@gmail.com (developerbenja-eng)
**GCP Project**: echo-home-system
