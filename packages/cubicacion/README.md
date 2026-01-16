# @ledesign/cubicacion

Cost estimation and quantity takeoff (cubicación) module for Chilean infrastructure projects.

## Overview

This package automatically generates cost estimates from infrastructure entities by:

1. **Extracting quantities** from drawn infrastructure elements (pipes, manholes, etc.)
2. **Mapping to SERVIU itemizado** - Chilean standard construction items
3. **Calculating costs** using regional pricing factors
4. **Generating detailed budgets** with subtotals by category

## Features

- Automatic quantity takeoff from infrastructure entities
- Complete SERVIU itemizado database (2024 prices)
- Regional price adjustments for all Chilean regions
- Detailed calculation traceability
- Support for manual overrides and adjustments
- Export-ready cost estimates

## Installation

```bash
npm install @ledesign/cubicacion
```

## Usage

### Basic Cost Estimation

```typescript
import { generateCubicacion } from '@ledesign/cubicacion';

// Generate cost estimate from infrastructure entities
const cubicacion = generateCubicacion(
  infrastructureEntities, // Map or Array of entities
  'project-123',
  {
    name: 'Presupuesto Proyecto Urbanización',
    region: 'Metropolitana',
    terrainType: 1, // 1=soft, 2=medium, 3=hard/rock
  }
);

console.log('Total Cost:', cubicacion.grandTotal, 'CLP');
console.log('Items:', cubicacion.items.length);
console.log('Subtotals:', cubicacion.subtotals);
```

### Working with SERVIU Items

```typescript
import {
  getServiuItem,
  getPipeItem,
  searchServiuItems,
  getRegionalPriceFactor,
} from '@ledesign/cubicacion';

// Get specific SERVIU item
const excavation = getServiuItem('201.1'); // Excavation Type I
console.log(excavation.description); // "Excavación en zanja para tuberías, en terreno tipo I (blando)"
console.log(excavation.basePrice); // 8500 CLP/m³

// Get pipe item by diameter and type
const pipe = getPipeItem(110, 'water_pvc'); // PVC 110mm water pipe
console.log(pipe.code); // "301.4"

// Search items
const items = searchServiuItems('excavación');
console.log(items.length); // All excavation items

// Regional pricing
const factor = getRegionalPriceFactor('Magallanes'); // 1.25 (25% more expensive)
```

### Manual Adjustments

```typescript
import { addManualItem, updateItem, removeItem } from '@ledesign/cubicacion';

// Add manual item
const updated = addManualItem(cubicacion, {
  serviuCode: '702.1',
  description: 'Limpieza y despeje de terreno',
  category: 'varios',
  unit: 'm2',
  quantity: 1500,
  unitPrice: 1200,
  sourceEntityIds: [],
  calculationDetails: 'Manual entry - site clearing',
});

// Update existing item quantity
const modified = updateItem(cubicacion, 'item-id-123', {
  quantity: 150.5, // Update quantity
  notes: 'Adjusted after site visit',
});

// Remove item
const final = removeItem(cubicacion, 'item-id-456');
```

### Custom Configuration

```typescript
import { generateCubicacion, DEFAULT_GENERATOR_CONFIG } from '@ledesign/cubicacion';

const customConfig = {
  ...DEFAULT_GENERATOR_CONFIG,
  minTrenchWidth: 0.8, // Wider trenches
  defaultOvertapado: 1.2, // More cover depth
  applyContingency: true, // Add 10% contingency
  contingencyPercent: 15, // 15% instead of default 10%
};

const cubicacion = generateCubicacion(entities, projectId, {
  config: customConfig,
  region: 'Valparaíso',
  terrainType: 2,
});
```

## Supported Infrastructure Types

The package automatically generates quantities for:

### Water Network
- **Water pipes** (PVC, HDPE, ductile iron)
- **Valves** (gate, butterfly, check)
- **Hydrants** (pillar type, underground)

### Sewer Network
- **Sewer pipes** (PVC, concrete)
- **Manholes** (Type A, B, drop manholes)
- **House connections** (unión domiciliaria)

### Stormwater
- **Storm collectors** (PVC, concrete)
- **Storm inlets** (S1, S2, combined)
- **Gutters** (curb, valley)

## Generated Quantities

For each infrastructure element, the system calculates:

### Pipes
- Pipe material and installation
- Excavation (based on terrain type)
- Bedding (sand/gravel)
- Backfill (compacted)
- Excess material removal
- Hydraulic testing

### Manholes
- Chamber structure
- Excavation with working space
- Cover and frame (D400, C250, B125)
- Watertightness testing

### Connections
- Connection pipe and fittings
- Excavation
- Backfill

## SERVIU Categories

Cost items are organized into standard categories:

- **excavacion** - Excavations
- **relleno** - Backfills
- **cama** - Bedding layers
- **tuberia** - Pipes
- **camaras** - Manholes and chambers
- **sumideros** - Storm inlets
- **conexiones** - House connections
- **pavimentos** - Pavement restoration
- **obras_civiles** - Civil works (valves, hydrants)
- **varios** - Miscellaneous (testing, site prep)

## Regional Price Factors

Prices are adjusted by region:

| Region | Factor | Notes |
|--------|--------|-------|
| Metropolitana | 1.00 | Base reference |
| Valparaíso | 1.05 | 5% higher |
| Magallanes | 1.25 | 25% higher (remote) |
| Antofagasta | 1.18 | 18% higher (mining region) |
| Aysén | 1.20 | 20% higher (remote) |

See `getRegionalPriceFactor()` for complete list.

## Data Model

### Cubicacion

```typescript
interface Cubicacion {
  id: string;
  projectId: string;
  name: string;
  version: number;
  status: 'draft' | 'review' | 'approved' | 'final';
  items: CubicacionItem[];
  subtotals: CubicacionSubtotal[];
  grandTotal: number;
  priceDate: string;
  priceSource: string;
  currency: 'CLP' | 'UF';
  // ... metadata
}
```

### CubicacionItem

```typescript
interface CubicacionItem {
  id: string;
  serviuCode: string;
  description: string;
  category: CubicacionCategory;
  unit: MeasurementUnit;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sourceEntityIds: string[]; // Traceability
  calculationDetails?: string;
  isManualOverride: boolean;
  autoCalculated: boolean;
  // ... metadata
}
```

## Standards Compliance

This package implements:

- **SERVIU Itemizado** - Official Chilean public works pricing
- **NCh1537** - Live loads (referenced in design)
- **NCh1105** - Sewer systems
- **NCh691** - Water systems

Prices are reference values from SERVIU 2024 and may vary by:
- Region
- Project scale
- Market conditions
- Specific supplier quotes

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Test
npm run test

# Lint
npm run lint
```

## License

MIT

## Related Packages

- `@ledesign/hydraulics` - Hydraulic network analysis
- `@ledesign/chilean-codes` - Chilean engineering standards (NCh)
- `@ledesign/structural` - Structural design and analysis

## Contributing

This package is part of the LeDesign engineering platform. See the main repository for contribution guidelines.
