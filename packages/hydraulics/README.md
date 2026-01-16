# @ledesign/hydraulics

Hydraulic engineering module for the LeDesign platform.

## Overview

Comprehensive hydraulic analysis and design library with support for Chilean engineering codes (NCh691, NCh1105).

## Features

### Water Network Design (NCh691)
- **Pipe Hydraulics** - Hazen-Williams, Darcy-Weisbach friction calculations
- **Network Solver** - Hardy Cross, Newton-Raphson methods for loop analysis
- **Demand Analysis** - Water demand patterns, peak factors, fire flow requirements
- **Network Elements** - Pumps, valves, tanks, reservoirs
- **Water Quality** - Chlorine decay modeling, water age analysis

### Sewer Systems (NCh1105)
- **Sanitary Sewer** - Wastewater collection system design per NCh1105
- **Storm Sewer** - Stormwater drainage design
- **Pipe Hydraulics** - Manning's equation for gravity flow
- **Pump Stations** - Wet well sizing, pump selection
- **Network Layout** - Pipe routing, manhole spacing

### Stormwater Management
- **Rational Method** - Q = CiA runoff calculations
- **SCS Curve Number** - NRCS runoff method
- **Detention Ponds** - Storage basin design and routing
- **Infiltration Trenches** - LID/SUDS design
- **SUDS Selector** - Best Management Practice selection tool
- **Regional Data** - Chilean rainfall IDF curves by region

### Open Channel Hydraulics
- **Channel Design** - Trapezoidal, rectangular, circular channels
- **Channel Geometry** - Hydraulic radius, wetted perimeter, flow area
- **Channel Hydraulics** - Manning, Chezy equations for uniform flow
- **Gradually Varied Flow** - GVF profiles, backwater analysis
- **Hydraulic Jump** - Jump calculations and energy dissipation
- **Hydraulic Structures** - Weirs, gates, culverts
- **Sediment Transport** - Bed load, suspended load calculations
- **Stream Analysis** - Stream power, bank stability

### Hydrology
- **Rainfall Analysis** - IDF curves, frequency analysis
- **Runoff Calculations** - Rational method, SCS method
- **Flood Frequency** - Statistical analysis of flood flows
- **Copernicus Flood Data** - Integration with global flood models

## Installation

```bash
npm install @ledesign/hydraulics
```

## Usage

### Water Network Analysis

```typescript
import { solveNetworkHardyCross, calculatePipeLoss } from '@ledesign/hydraulics/water-network';

// Calculate pipe friction loss (Hazen-Williams)
const loss = calculatePipeLoss({
  flowRate: 50, // L/s
  diameter: 150, // mm
  length: 100, // m
  roughness: 130, // C factor
});

console.log(`Head loss: ${loss.headLoss} m`);
console.log(`Velocity: ${loss.velocity} m/s`);

// Solve network using Hardy Cross method
const results = solveNetworkHardyCross({
  pipes: [/* pipe data */],
  nodes: [/* node data */],
  loops: [/* loop definitions */],
});
```

### Sewer Design (NCh1105)

```typescript
import { designSanitarySewer, calculatePipeFlow } from '@ledesign/hydraulics/sewer';

// Calculate pipe flow capacity
const flow = calculatePipeFlow({
  diameter: 200, // mm
  slope: 0.5, // %
  manningN: 0.013, // PVC
});

console.log(`Full flow capacity: ${flow.Qfull} L/s`);
console.log(`Velocity at full flow: ${flow.Vfull} m/s`);

// Design sewer pipe
const design = designSanitarySewer({
  designFlow: 15, // L/s
  minDiameter: 150, // mm
  minSlope: 0.5, // %
});

console.log(`Required diameter: ${design.diameter} mm`);
console.log(`Design slope: ${design.slope} %`);
```

### Stormwater Design

```typescript
import { rationalMethod, scsCurveNumber, designDetentionPond } from '@ledesign/hydraulics/stormwater';

// Rational method (Q = CiA)
const runoff = rationalMethod({
  area: 2.5, // hectares
  runoffCoefficient: 0.65,
  intensity: 80, // mm/hr
});

console.log(`Peak runoff: ${runoff.peakFlow} L/s`);

// SCS Curve Number method
const scsPeak = scsCurveNumber({
  area: 2.5, // km²
  curveNumber: 75,
  rainfall: 100, // mm
  timeOfConcentration: 30, // min
});

console.log(`SCS peak flow: ${scsPeak.peakFlow} m³/s`);

// Design detention pond
const pond = designDetentionPond({
  inflowHydrograph: [/* flow vs time data */],
  allowableOutflow: 50, // L/s
});

console.log(`Required storage: ${pond.requiredVolume} m³`);
```

### Open Channel Design

```typescript
import { designRectangularChannel, calculateGVF } from '@ledesign/hydraulics/open-channel';

// Design rectangular channel
const channel = designRectangularChannel({
  flow: 2.5, // m³/s
  slope: 0.002,
  manningN: 0.013,
  maxVelocity: 2.5, // m/s
});

console.log(`Channel width: ${channel.width} m`);
console.log(`Flow depth: ${channel.depth} m`);

// Calculate gradually varied flow profile
const profile = calculateGVF({
  channel: {
    type: 'trapezoidal',
    bottomWidth: 2,
    sideSlope: 2,
    slope: 0.001,
    manningN: 0.025,
  },
  flow: 3.0, // m³/s
  downstreamDepth: 1.5, // m
  profileLength: 1000, // m
});

console.log(profile.depths); // Array of depths along profile
```

### Hydrology

```typescript
import { calculateRunoffSCS, analyzeFloodFrequency } from '@ledesign/hydraulics/hydrology';

// Calculate runoff using SCS method
const runoff = calculateRunoffSCS({
  rainfall: 100, // mm
  curveNumber: 75,
  initialAbstraction: 0.2,
});

console.log(`Runoff depth: ${runoff.depth} mm`);

// Flood frequency analysis
const floodAnalysis = analyzeFloodFrequency({
  annualPeaks: [120, 150, 180, 95, 200, 175, 130], // m³/s
  returnPeriod: 100, // years
  distribution: 'log-pearson-III',
});

console.log(`100-year flood: ${floodAnalysis.discharge} m³/s`);
```

## Module Exports

```typescript
// Full module
import * from '@ledesign/hydraulics';

// Sub-modules
import * from '@ledesign/hydraulics/water-network';
import * from '@ledesign/hydraulics/sewer';
import * from '@ledesign/hydraulics/stormwater';
import * from '@ledesign/hydraulics/open-channel';
import * from '@ledesign/hydraulics/hydrology';
```

## Dependencies

- `@ledesign/chilean-codes` - NCh691, NCh1105 standards

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
