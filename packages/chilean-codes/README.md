# @ledesign/chilean-codes

Chilean engineering code implementations for structural, hydraulic, and infrastructure design.

## Overview

This package provides comprehensive implementations of Chilean engineering standards (NCh - Norma Chilena) used across multiple engineering disciplines.

## Included Standards

### Structural Engineering

- **NCh433** - Seismic Design Code
  - Design spectrum generation
  - Seismic load calculation
  - Base shear and force distribution
  - Accidental torsion

- **NCh432** - Wind Load Design Code
  - Wind pressure calculations
  - Exposure factors
  - Dynamic effects

- **NCh431** - Snow Load Design Code
  - Snow load calculations by zone
  - Drift and sliding effects

- **NCh1537** - Live Load Design Code
  - Occupancy-based live loads
  - Load reduction factors
  - Pattern loading

- **NCh3171** - Structural Design Provisions
  - Load combinations (LRFD/ASD)
  - Load factors and resistance factors
  - Drift limits

### Hydraulic Engineering

- **NCh691** - Water Distribution Systems
  - Demand calculations
  - Pipe sizing criteria
  - Pressure requirements
  - Fire flow requirements

- **NCh1105** - Sewer Systems
  - Wastewater flow calculations
  - Pipe sizing and slopes
  - Velocity limits
  - Manning coefficients

## Installation

```bash
npm install @ledesign/chilean-codes
```

## Usage

### NCh433 - Seismic Design

```typescript
import { generateNCh433DesignSpectrum, generateNCh433SeismicLoads } from '@ledesign/chilean-codes/nch433';

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
  height: 30,
  floors: [/* floor data */],
});
```

### NCh691 - Water Distribution

```typescript
import { NCh691_CONSTANTS, NCh691_FIRE_FLOW } from '@ledesign/chilean-codes/nch691';

// Get velocity limits
const maxVelocity = NCh691_CONSTANTS.MAX_VELOCITY; // 3.0 m/s

// Get fire flow requirement
const fireFlow = NCh691_FIRE_FLOW['commercial']; // 25 L/s
```

### NCh1105 - Sewer Systems

```typescript
import { NCh1105_CONSTANTS, getNCh1105PeakFactor } from '@ledesign/chilean-codes/nch1105';

// Get minimum pipe diameter
const minDiameter = NCh1105_CONSTANTS.MIN_DIAMETER_SANITARY; // 150 mm

// Calculate peak factor
const peakFactor = getNCh1105PeakFactor(5000); // 3.5 for 5000 population
```

## Module Exports

Each code has its own entry point for tree-shaking:

```typescript
// Import specific codes
import {} from '@ledesign/chilean-codes/nch433';
import {} from '@ledesign/chilean-codes/nch432';
import {} from '@ledesign/chilean-codes/nch691';

// Or import everything
import {} from '@ledesign/chilean-codes';
```

## Development

```bash
# Build the package
npm run build

# Watch mode
npm run dev

# Run tests
npm test

# Lint
npm run lint
```

## License

Proprietary - All rights reserved
