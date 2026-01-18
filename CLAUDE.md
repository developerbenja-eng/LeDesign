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

## The Narrative: Understanding LeDesign's Vision

**IMPORTANT**: Before working on marketing, pitch materials, or strategic features, read the complete narrative:

📖 **[docs/LEDESIGN_NARRATIVE.md](docs/LEDESIGN_NARRATIVE.md)** - The definitive story of LeDesign

This document contains:

- The founder's journey (UdeC → LEICO → PhD → Research → LeDesign)
- The problem statement (static content + isolated data)
- The fundamental insight (schema ownership revolution)
- The "Why Now" moment (AI + free infrastructure enables domain experts)
- The three foundations (Contenido Dinámico, Acceso Expedito, DB Centralizada)
- Business opportunity, market analysis, and financial projections
- Team structure, equity model, and go-to-market strategy
- The vision (2026-2030)

**When to reference the narrative**:

- Creating or updating pitch decks
- Writing marketing copy
- Developing investor materials
- Adding strategic features
- Making product decisions

**Quick reference**: See [docs/README.md](docs/README.md) for a complete documentation index.

## Environment Setup

### CRITICAL: Always Run Setup First

When working with this project for the first time or after cloning:

```bash
# 1. Setup environment variables (API keys)
npm run setup

# 2. Download reference materials from GCS
npm run download:refs
```

**Step 1** retrieves API keys from Google Cloud CLI and creates the `.env` file automatically. The `.env` file is gitignored and contains:
- `GOOGLE_GEMINI_API_KEY` - For AI-powered terrain analysis
- `GCP_PROJECT_ID` - Google Cloud project (ledesign)
- `VERCEL_TOKEN` - For deployment to Vercel
- `VERCEL_ORG_ID` - Vercel organization (benjas-projects-3ad07b52)
- `VERCEL_PROJECT_ID` - Project identifier (ledesign)
- `NODE_ENV` - Environment setting

**Step 2** downloads large reference files (PDFs, manuals) from Google Cloud Storage. These files are NOT stored in git to keep the repository lightweight.

### Reference Materials Storage

**Why GCS instead of Git LFS?**
- Cost-effective (~$0.02/month vs $5/month for Git LFS)
- No bandwidth charges for team members
- Keeps git repository fast and small
- Public access, no authentication needed

**GCS Bucket**: `ledesign-reference-materials` (us-central1)

Large files are automatically excluded via `.gitignore`:
```gitignore
docs/reference-software/**/*.pdf
```

See [docs/reference-software/README.md](docs/reference-software/README.md) for details.

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

## Design Standards

**CRITICAL**: LeDesign uses a modern glassmorphism design system. Always follow these standards to maintain visual consistency.

### Framework Versions

- **Next.js**: 16.1+ (always use latest stable)
- **React**: 19.0+ (always use latest stable)
- **ESLint**: 9.0+ (required for Next.js 16+)

**When upgrading**: Update Next.js, React, ESLint, and related types together. Never use outdated versions.

### Design System

LeDesign implements a **glassmorphism design system** with:

- **Semi-transparent backgrounds** with backdrop blur
- **Depth and elevation** using layered shadows
- **Smooth micro-interactions** on hover/active states
- **Professional iconography** via Lucide React
- **Modern color palette** with semantic meaning

### CSS Architecture

All design tokens are defined in `apps/web/src/app/globals.css`:

```css
/* CSS Variables */
--glass-bg: rgba(30, 41, 59, 0.7);
--glass-bg-hover: rgba(30, 41, 59, 0.85);
--glass-border: rgba(148, 163, 184, 0.1);
--glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
--depth-1 through --depth-5: Elevation shadows
```

### Component Classes

**ALWAYS use these glassmorphism classes** instead of basic Tailwind classes:

```css
.glass-card       /* Cards with glassmorphism + hover effects */
.glass-panel      /* Panels with lighter glassmorphism */
.glass-header     /* Headers with sticky glassmorphism */
.interactive-card /* Cards with micro-interactions */
.btn-glass        /* Glassmorphic buttons */
.icon-wrapper     /* Icon containers with hover effects */
.depth-1 to .depth-5  /* Elevation shadows */
```

### Icon Usage

**ALWAYS use Lucide React icons**, NEVER emoji icons.

```tsx
// ✅ CORRECT
import { Building2, Route, Car, Droplet, Mountain } from 'lucide-react';

<Building2 size={28} strokeWidth={2} className="text-blue-400" />

// ❌ WRONG - Don't use emojis
<div>🏗️</div>
```

**Icon Guidelines**:

- Size: 24-32px for module cards, 32-40px for features
- Stroke width: 2 for consistency
- Colors: Use Tailwind color classes with semantic meaning
- Wrapper: Use `.icon-wrapper` class for hover effects

### Animation Standards

All animations are defined in `globals.css`:

```css
.animate-fade-in    /* Fade in effect */
.animate-slide-up   /* Slide up from bottom */
.animate-scale-in   /* Scale in from 95% */
```

**Usage**:

```tsx
<div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
  {/* Content */}
</div>
```

### Design Patterns

**Module Cards**:

```tsx
<Link
  href="/module"
  className="glass-card interactive-card rounded-xl p-6 group"
>
  <div className="icon-wrapper w-14 h-14 rounded-lg bg-slate-800/50 text-blue-400">
    <IconComponent size={28} strokeWidth={2} />
  </div>
  <h3 className="text-xl font-semibold group-hover:text-ledesign-blue-light">
    Module Name
  </h3>
  <p className="text-sm text-slate-400">Description</p>
</Link>
```

**Feature Panels**:

```tsx
<div className="glass-panel rounded-xl p-8 text-center">
  <div className="icon-wrapper w-16 h-16 mx-auto rounded-full bg-blue-500/10 text-blue-400">
    <Zap size={32} strokeWidth={2} />
  </div>
  <h3 className="text-lg font-semibold">Feature Title</h3>
  <p className="text-sm text-slate-400">Feature description</p>
</div>
```

### Typography

- **Headings**: Use gradient text for hero sections

  ```tsx
  <h2 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
    Hero Title
  </h2>
  ```

- **Body**: `text-slate-300` for primary, `text-slate-400` for secondary
- **Font**: Inter (already configured in `globals.css`)

### Color Palette

Use semantic color coding for modules:

- **Structural**: `text-blue-400`
- **Pavement**: `text-purple-400`
- **Road**: `text-green-400`
- **Hydraulic**: `text-cyan-400`
- **Terrain**: `text-amber-400`

### DO's and DON'Ts

**DO**:

- ✅ Use glassmorphism classes (`.glass-card`, `.glass-panel`)
- ✅ Use Lucide React icons with proper sizing
- ✅ Add micro-interactions (`.interactive-card`, `.icon-wrapper`)
- ✅ Use animation classes with staggered delays
- ✅ Apply semantic color coding
- ✅ Use gradient text for hero sections
- ✅ Maintain Next.js 16+ and React 19+

**DON'T**:

- ❌ Use basic `bg-slate-800` or `border-slate-700` for cards
- ❌ Use emoji icons (🏗️ 🛣️ etc.)
- ❌ Skip hover effects on interactive elements
- ❌ Use flat design without depth/shadows
- ❌ Downgrade to older Next.js or React versions
- ❌ Create custom icon components when Lucide has alternatives

### Upgrading Design

If you find components using old design patterns:

1. Replace basic backgrounds with `.glass-card` or `.glass-panel`
2. Replace emoji icons with Lucide React icons
3. Add `.interactive-card` for hover effects
4. Add `.icon-wrapper` for icon containers
5. Apply semantic color coding
6. Add entrance animations

### Testing Design

Before committing UI changes:

```bash
npm run build  # Ensure build succeeds
npm run dev    # Visual inspection at http://localhost:4000
```

Visit all module pages to verify design consistency.

## Marketing & Messaging

### Launch Timeline & Business Strategy

**CRITICAL**: LeDesign launches in two distinct phases. All marketing, pricing, and messaging must align with the current phase.

#### Phase 1: Fundraising (January 19 - May 4, 2026)

**Timeline**:

- **Start**: January 19, 2026
- **Fundraising Goal**: $5,000 by end of February 2026
- **Launch Day**: May 4, 2026

**Target**: 1-2 early adopter companies (small engineering firms/consultoras)

**Early Adopter Tier**:

- **Investment**: $5,000 per company (one-time payment)
- **Limited Availability**: Only 2 spots available
- **Benefits**:
  - Founding Member status
  - Custom system improvements tailored to their workflows (Year 1 priority)
  - Early access to all modules before public launch
  - Lifetime benefits/extended access (define specifics)
  - Direct influence on roadmap and feature prioritization
  - Recognition as platform sponsors

**Messaging for Phase 1**:

- "Conviértete en Miembro Fundador" (Become a Founding Member)
- "Solo 2 Cupos Disponibles" (Only 2 spots available)
- Emphasis on exclusivity and influence
- Highlight that this is pre-launch investment, not subscription
- Position as partnership, not just customer relationship

**What to EXCLUDE in Phase 1**:

- Government partnerships (comes later)
- Large-scale enterprise solutions (not ready yet)
- Integration with existing government systems

**CTA for Phase 1**:

- Primary: "Solicitar Membresía Fundadora" (Apply for Founding Membership)
- Secondary: "Conocer el Programa" (Learn about the program)
- Form: Collect company info, engineering needs, contact details

**Landing Page Adjustments for Phase 1**:

1. Hero section: Add "Programa de Miembros Fundadores - Solo 2 Cupos"
2. Replace pricing section with Early Adopter tier explanation
3. Add "Por qué ser miembro fundador" (Why become a founding member) section
4. Include timeline showing May 4 launch
5. Add FAQ specific to fundraising

#### Phase 2: Public Launch (May 4, 2026 onwards)

**Launch Date**: May 4, 2026

**Public Pricing Tiers** (activated at launch):

```
Gratis         → $0/mes   → 7-day trial, then limited features
Profesional    → $49/mes  → Full access, primary revenue driver
Empresarial    → Custom   → Team features + custom integrations
```

**Launch Promotions**:

- **7-day free trial** for all new signups (May 4-11, 2026)
- All early adopter/donors get immediate online access
- Consider: First 100 signups get extended trial (14 days)

**Messaging for Phase 2**:

- Standard value proposition (Speed, Compliance, Integration)
- Focus on proven platform (tested by founding members)
- Highlight Chilean standards compliance
- Emphasize cloud-based, no installation

**What to ADD in Phase 2**:

- Normal subscription model
- Free trial emphasis
- Case studies from founding members (with permission)
- Social proof from early users
- Government partnerships (post-launch expansion)

**CTA for Phase 2**:

- Primary: "Comenzar Prueba Gratuita" (Start Free Trial)
- Secondary: "Ver Demo"
- Emphasis: "Sin tarjeta de crédito para la prueba"

**Transition Strategy (May 1-4)**:

1. Email all Phase 1 donors/interested parties
2. Give founding members access 3 days early (May 1)
3. Update website from fundraising to public launch
4. Announce launch via social media, email, engineering communities

#### Current Phase Detection

When creating marketing materials, always check the current date:

- **Before May 4, 2026**: Use Phase 1 messaging
- **After May 4, 2026**: Use Phase 2 messaging

### Value Proposition

LeDesign's core value proposition is built on three pillars:

1. **Speed**: "Diseña Más Rápido" - 40% time savings through automation
2. **Compliance**: "Cumple la Normativa" - Guaranteed NCh standards compliance
3. **Integration**: First platform integrating all 5 engineering disciplines in one place

**Unique Selling Points**:
- Only platform with AI-powered terrain analysis (Google Gemini)
- Complete NCh433, NCh432, NCh691 implementation
- 100% cloud-based - no installation required
- Collaboration features for engineering teams
- Professional-grade tools at accessible pricing

### Target Audience

**Primary Segments**:

1. **Individual Engineers** (Plan Gratis/Profesional)
   - Civil engineers doing structural, hydraulic, or road design
   - Need occasional access or starting their practice
   - Price-sensitive, value trial periods

2. **Professional Engineers** (Plan Profesional)
   - Established engineers with steady project flow
   - Need all 5 modules + advanced features
   - Value time savings and compliance guarantees
   - Willing to pay $49/month for complete toolset

3. **Engineering Firms** (Plan Empresarial)
   - Consultoras with 5+ engineers
   - Need collaboration, custom integrations
   - Decision-makers: Engineering Managers, CTOs
   - Budget for custom solutions

**Geographic Focus**: Chile (Chilean standards compliance is core differentiator)

### Pricing Strategy

**Three-Tier Model**:

```
Gratis         → $0/mes   → Acquisition (convert to Profesional)
Profesional    → $49/mes  → Primary revenue driver
Empresarial    → Custom   → High-value contracts
```

**Pricing Psychology**:
- Gratis plan removes friction (no credit card)
- Profesional priced at value (not cost)
- Empresarial "Contactar" creates premium perception

**Key Metrics**:
- Freemium → Pro conversion target: 5-10%
- Average revenue per user (ARPU): $49
- Pro plan highlighted as "Más Popular"

### Messaging Guidelines

**Headline Formulas**:

✅ **DO Use**:
- Action-oriented: "Diseña Más Rápido. Cumple la Normativa."
- Benefit-driven: "Ahorra 40% de Tiempo en Diseño"
- Social proof: "Más de 2,500 Ingenieros Activos"
- Specificity: "Primera plataforma integral con 5 módulos"

❌ **DON'T Use**:
- Generic claims: "La mejor plataforma de ingeniería"
- Technical jargon without context: "Análisis FEA avanzado"
- Vague promises: "Mejora tu productividad"

**Feature Descriptions**:

Always follow: **Feature → Benefit → Outcome**

Example:
- Feature: "Análisis sísmico NCh433 automatizado"
- Benefit: "Ahorra horas de cálculos manuales"
- Outcome: "Diseña más estructuras en menos tiempo"

**Tone & Voice**:
- **Professional but approachable** - Engineers respect competence
- **Spanish-first** - Chilean engineering market
- **Benefit-oriented** - Focus on outcomes, not features
- **Confident** - Guaranteed compliance, proven time savings

### Social Proof Strategy

**Stats to Highlight** (update as real metrics grow):
- "10,000+ Proyectos Completados"
- "2,500+ Ingenieros Activos"
- "99.9% Tiempo de Actividad"
- "40% Ahorro de Tiempo"

**Testimonial Format**:

```tsx
{
  name: string;          // "Carlos Muñoz"
  role: string;          // "Ingeniero Civil Estructural"
  company: string;       // "Constructora del Sur"
  content: string;       // Specific benefit + emotional impact
  rating: 5;             // Always 5 stars (only show best)
}
```

**Testimonial Guidelines**:
- Focus on specific results ("ahorra horas de cálculos")
- Mention module by name ("módulo NCh433")
- Include company size/type for credibility
- Keep under 40 words for scanability

### Conversion Optimization

**Primary CTA**: "Comenzar Gratis"
- Always visible in header
- Repeated every 2-3 sections
- Gradient button (blue → purple)
- Action-oriented language

**Secondary CTAs**:
- "Ver Demo" - For researchers/browsers
- "Hablar con Ventas" - For enterprise leads
- "Contactar Ventas" - For Empresarial tier

**CTA Placement**:
1. Hero section (primary + secondary)
2. After benefits section
3. Pricing cards
4. Final conversion section
5. Sticky header (on scroll)

**Friction Reducers**:
- "Sin tarjeta de crédito" below CTA
- "Prueba de 14 días" for Pro plan
- "Soporte en español" for confidence
- "Cancela cuando quieras" for commitment anxiety

### Landing Page Structure

**Required Sections** (in order):

1. **Hero** - Value prop + primary CTA
2. **Stats** - Social proof numbers
3. **Benefits** - Why choose LeDesign (4 cards)
4. **Modules** - 5 engineering disciplines
5. **Pricing** - 3 tiers with features
6. **Testimonials** - 3 customer stories
7. **FAQ** - Overcome objections
8. **Final CTA** - Last chance to convert

**Section Spacing**:
- `py-20` for main sections
- `py-16` for stats/smaller sections
- `mb-16` between section header and content

### SEO & Content

**Primary Keywords**:
- "diseño estructural chile"
- "software ingeniería civil chile"
- "análisis sísmico nch433"
- "diseño pavimentos aashto"
- "plataforma ingeniería chilena"

**Meta Descriptions** (150-160 chars):

```typescript
title: 'LeDesign - Ingeniería Chilena'
description: 'Plataforma integral de diseño ingenieril para ingeniería estructural, pavimentos, hidráulica y vial. Implementa normas chilenas NCh.'
```

**Content Principles**:
- Chilean standards always mentioned (NCh433, NCh691)
- Benefit-first feature descriptions
- Concrete numbers (40% savings, not "faster")
- Industry-specific language (ingenieros civiles, consultoras)

### Email & Nurture

**Welcome Email Sequence** (for Gratis signups):

1. **Day 0**: Welcome + Quick start guide
2. **Day 3**: Module showcase (pick one to explore)
3. **Day 7**: Pro features teaser
4. **Day 10**: Limited-time Pro trial offer
5. **Day 14**: Case study + upgrade CTA

**Upgrade Triggers**:
- Project limit reached (5 projects in Gratis)
- Export format needed (DWG, Excel)
- Team collaboration requested
- AI features usage

### Competitive Positioning

**Key Differentiators vs. Competitors**:

1. **Integrated Platform** - Not 5 separate software
2. **Chilean Standards** - Built-in NCh compliance
3. **Cloud-Native** - No installation, works anywhere
4. **AI-Powered** - Google Gemini terrain analysis
5. **Accessible Pricing** - $49/month vs. $200+ legacy software

**When Comparing**:
- Focus on LeDesign benefits (not competitor weaknesses)
- Highlight integration advantage
- Emphasize modern tech stack (cloud, AI)

### A/B Testing Priorities

**Test These Elements**:

1. **Hero Headline**:
   - Version A: "Diseña Más Rápido. Cumple la Normativa."
   - Version B: "40% Menos Tiempo. 100% Cumplimiento NCh."

2. **Pricing Display**:
   - Version A: Monthly pricing ($49/mes)
   - Version B: Annual pricing ($490/año - Ahorra $98)

3. **CTA Copy**:
   - Version A: "Comenzar Gratis"
   - Version B: "Probar Gratis 14 Días"

4. **Social Proof**:
   - Version A: Stats grid
   - Version B: Logos + testimonials

### Localization Notes

**Spanish (Chile) Specifics**:
- Use "ingeniero/a" (not "engineer")
- "Normativa chilena" (not "estándares chilenos")
- "Plataforma" (not "aplicación web")
- Vosotros forms NOT used in Chile (use ustedes)

**Currency**: Always CLP ($) in Chilean market

**Support Language**: Spanish-first, English available

## Working with the Codebase

### Development Server

**IMPORTANT**: LeDesign runs on **port 4000** (not 3000) to avoid conflicts with other projects.

```bash
# Start development server
npm run dev
# → Opens at http://localhost:4000
```

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

## Vercel Deployment

### Setup Vercel Project

First time setup (links local project to Vercel):

```bash
npm run vercel:setup
```

This creates a `.vercel` directory (gitignored) with project configuration.

### Deployment Commands

```bash
# Deploy preview (for testing)
npm run deploy:preview

# Deploy to production
npm run deploy:prod

# Check deployment status
npm run vercel:status
```

### Deployment Workflow

1. **Make changes** to the codebase
2. **Test locally**: `npm run dev` and `npm run test`
3. **Build**: `npm run build` (done automatically during deploy)
4. **Preview deploy**: `npm run deploy:preview`
5. **Verify** the preview URL works correctly
6. **Production deploy**: `npm run deploy:prod`

### Vercel Configuration

The project uses these Vercel settings:

- **Organization**: benjas-projects-3ad07b52 (Benja's projects)
- **Project**: ledesign
- **Token**: Auto-configured from `.env` file
- **Framework**: Auto-detected (Next.js when ready)

### Important Notes

- Vercel token is retrieved automatically by `npm run setup`
- `.vercel` directory is gitignored (local only)
- Preview deployments create unique URLs for testing
- Production deployments update the main URL
- Always test with preview before deploying to production

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
# Setup & Development
npm run setup          # Set up environment from Google Cloud
npm install            # Install dependencies
npm run dev            # Start development (watch mode)
npm run build          # Build all packages
npm run test           # Run all tests
npm run lint           # Lint code
npm run format         # Format with Prettier
npm run clean          # Clean build artifacts

# Vercel Deployment
npm run vercel:setup   # Link project to Vercel (first time)
npm run vercel:status  # Check deployment status
npm run deploy:preview # Deploy preview (testing)
npm run deploy:prod    # Deploy to production
```

## When Working with This Project

1. **First time**: Run `npm run setup` to get API keys
2. **Link to Vercel**: Run `npm run vercel:setup` (one time)
3. **Making changes**: Work in relevant package directory
4. **Testing**: Run tests before committing
5. **AI features**: Use `terrainConfig` for API access
6. **Standards**: Reference Chilean codes (NCh) when applicable
7. **Preview deploy**: Test with `npm run deploy:preview` before production
8. **Commit**: Ensure .env and .vercel are not staged

---

**Repository**: https://github.com/developerbenja-eng/LeDesign
**Account**: developer.benja@gmail.com (developerbenja-eng)
**GitHub Token**: Stored in local git remote configuration (not committed)
**GCP Project**: ledesign
**Vercel Org**: benjas-projects-3ad07b52 (Benja's projects)
**Vercel Project**: ledesign

### Git Remote Configuration

The git remote is configured with a GitHub Personal Access Token for authentication.
The token is embedded in the remote URL (local git config only, never committed):

```bash
# Check current remote
git remote -v

# To reconfigure with a new token:
git remote set-url origin https://YOUR_GITHUB_TOKEN@github.com/developerbenja-eng/LeDesign.git
```

**Note**: The GitHub token is already configured in the local repository and should not be committed to version control.
