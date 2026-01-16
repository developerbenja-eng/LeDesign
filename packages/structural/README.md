# @ledesign/structural

Structural engineering module for the LeDesign platform.

## Overview

Comprehensive structural analysis and design library with support for Chilean engineering codes (NCh433, NCh432, NCh431, NCh1537, NCh3171).

## Features

### Analysis
- **Static Analysis** - Linear and nonlinear static analysis using Direct Stiffness Method
- **Modal Analysis** - Natural frequencies and mode shapes
- **Response Spectrum Analysis** - Seismic response with CQC and SRSS modal combination
- **P-Delta Analysis** - Second-order geometric effects

### Design
- **AISC Steel Design** - LRFD and ASD provisions per AISC 360-22
- **Concrete Design** - ACI 318 provisions for beams, columns, walls, slabs
- **Wood Design** - NDS provisions for timber structures
- **Masonry Design** - TMS 402 provisions
- **Cold-Formed Steel** - AISI S100 provisions
- **Foundation Design** - Spread footings, pile caps

### Chilean Codes (via @ledesign/chilean-codes)
- **NCh433** - Seismic design with spectrum generation and load distribution
- **NCh432** - Wind load calculations
- **NCh431** - Snow load calculations
- **NCh1537** - Live load requirements
- **NCh3171** - Load combinations and structural design provisions

### Geolocation
- Automatic seismic zone determination from coordinates
- Wind zone determination
- Soil type estimation
- Chilean region data

### Geotechnical
- Soil classification
- Bearing capacity calculations
- Settlement analysis
- Lateral earth pressure

## Installation

```bash
npm install @ledesign/structural
```

## Usage

### Static Analysis

```typescript
import { runStaticAnalysis, createNode, createBeam } from '@ledesign/structural';

// Create model
const node1 = createNode({ x: 0, y: 0, z: 0 });
const node2 = createNode({ x: 5000, y: 0, z: 0 });
const beam = createBeam({ nodeI: node1.id, nodeJ: node2.id, sectionId: 'W12x26' });

// Run analysis
const results = await runStaticAnalysis(projectId, runId);
console.log(results.displacements);
console.log(results.reactions);
```

### Seismic Design (NCh433)

```typescript
import { generateNCh433SeismicLoads, generateNCh433DesignSpectrum } from '@ledesign/structural';

// Generate design spectrum
const spectrum = generateNCh433DesignSpectrum({
  zone: 2,
  soilType: 'C',
  occupancy: 'II',
  structuralSystem: 'special-moment-frame-steel',
});

// Generate seismic loads
const loads = generateNCh433SeismicLoads({
  zone: 2,
  soilType: 'C',
  occupancy: 'II',
  structuralSystem: 'special-moment-frame-steel',
  height: 30000,
  floors: [
    { story_id: 'story_1', elevation: 0, seismic_mass: 1000 },
    { story_id: 'story_2', elevation: 4000, seismic_mass: 1000 },
    // ...
  ],
});

console.log(`Base shear: ${loads.base_shear} kN`);
console.log(`Fundamental period: ${loads.fundamental_period} s`);
```

### Steel Design (AISC)

```typescript
import { designSteelBeam, designSteelColumn } from '@ledesign/structural/design';

// Design beam for flexure
const beamDesign = designSteelBeam({
  section: 'W21x44',
  steel: 'A992',
  Mu: 250, // kN·m
  method: 'LRFD',
});

console.log(`φMn = ${beamDesign.phi_Mn} kN·m`);
console.log(`D/C ratio = ${beamDesign.demand_capacity_ratio}`);
console.log(`Status: ${beamDesign.status}`); // 'pass' or 'fail'
```

### Geolocation

```typescript
import { determineSeismicZone, determineWindZone } from '@ledesign/structural/geolocation';

// Determine zones from coordinates
const seismicZone = determineSeismicZone(-33.4489, -70.6693); // Santiago
console.log(`Seismic zone: ${seismicZone.zone}`); // 2

const windZone = determineWindZone(-33.4489, -70.6693);
console.log(`Wind zone: ${windZone.zone}`); // 3
```

## Module Exports

```typescript
// Full module
import * from '@ledesign/structural';

// Sub-modules
import * from '@ledesign/structural/analysis';
import * from '@ledesign/structural/design';
import * from '@ledesign/structural/factories';
import * from '@ledesign/structural/loads';
import * from '@ledesign/structural/geolocation';
import * from '@ledesign/structural/geotechnical';
```

## Dependencies

- `@ledesign/chilean-codes` - Chilean engineering code implementations

## Development

```bash
# Build
npm run build

# Watch mode
npm run dev

# Test
npm test

# Lint
npm run lint
```

## License

Proprietary - All rights reserved
