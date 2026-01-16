# LeDesign - Ingeniería Chilena

Plataforma unificada de diseño ingenieril para profesionales de la ingeniería chilena.

![LeDesign Logo](branding/logo-full.svg)

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/developerbenja-eng/LeDesign.git
cd LeDesign

# Set up environment (retrieves API keys from Google Cloud)
npm run setup

# Install dependencies
npm install

# Start development
npm run dev
```

## 📚 Documentation

- **[Setup Guide](./README_SETUP.md)** - Complete setup instructions for local development
- **[Claude Code Web Guide](./CLAUDE_CODE_WEB.md)** - How to use this project in Claude Code web

## Overview

LeDesign consolidates multiple engineering disciplines into one integrated platform:

- **Structural Engineering** - FEA, seismic analysis (NCh433), steel/concrete design
- **Hydraulic Engineering** - Water networks, sewer systems, open channels, stormwater
- **Pavement Design** - AASHTO flexible/rigid pavement, CBR-based design
- **Road Design** - Horizontal/vertical alignment, superelevation, sight distance
- **Terrain Analysis** - DEM processing, earthwork volumes, surveying

## Architecture

This is a Turborepo monorepo with the following structure:

```
LeDesign/
├── apps/
│   └── web/                    # Main Next.js application
├── packages/
│   ├── structural/             # Structural engineering modules
│   ├── hydraulics/             # Hydraulic engineering modules
│   ├── pavement/               # Pavement design modules
│   ├── road/                   # Road geometry modules
│   ├── terrain/                # Terrain & surveying modules
│   ├── chilean-codes/          # Chilean code implementations (NCh)
│   ├── ui/                     # Shared UI components
│   ├── auth/                   # Authentication utilities
│   └── db/                     # Database utilities
```

## Getting Started

```bash
# Install dependencies
npm install

# Start development server (runs on port 4000)
npm run dev
# → http://localhost:4000

# Build all packages
npm run build

# Run tests
npm run test

# Lint code
npm run lint
```

**Note**: LeDesign runs on **port 4000** by default (not 3000) to avoid conflicts with other projects.

## Technology Stack

- **Framework**: Next.js 16.1+
- **React**: 19.0+
- **Database**: Turso (libSQL)
- **3D Rendering**: React Three Fiber
- **Authentication**: NextAuth.js v5 (beta)
- **Monorepo**: Turborepo
- **Styling**: Tailwind CSS 3.4 + Glassmorphism Design System
- **Icons**: Lucide React
- **TypeScript**: 5.7.3
- **Deployment**: Vercel

## Chilean Engineering Codes

LeDesign implements the following Chilean standards:

- **NCh433** - Seismic design
- **NCh432** - Wind loads
- **NCh431** - Snow loads
- **NCh691** - Water distribution systems
- **NCh1105** - Sewer systems
- **NCh1537** - Structural loads
- **NCh3171** - Structural design provisions
- **Manual de Carreteras** - Road design standards

## License

Proprietary - All rights reserved
