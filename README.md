# LeDesign

Unified engineering design platform for Chilean engineering professionals.

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

# Start development server
npm run dev

# Build all packages
npm run build

# Run tests
npm run test

# Lint code
npm run lint
```

## Technology Stack

- **Framework**: Next.js 16+ with Turbopack
- **Database**: Turso (libSQL)
- **3D Rendering**: React Three Fiber
- **Authentication**: JWT
- **Monorepo**: Turborepo
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
