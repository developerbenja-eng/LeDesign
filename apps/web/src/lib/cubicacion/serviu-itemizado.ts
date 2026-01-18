/**
 * SERVIU Itemizado - Chilean Standard Infrastructure Items
 *
 * Based on SERVIU itemizado oficial for urbanization projects
 * Prices are reference values in CLP (may vary by region and date)
 *
 * Categories:
 * 100 - Obras Preliminares
 * 200 - Movimiento de Tierras
 * 300 - Agua Potable
 * 400 - Alcantarillado
 * 500 - Aguas Lluvias
 * 600 - Pavimentación
 * 700 - Obras Complementarias
 */

import type { CubicacionCategory, MeasurementUnit } from './types';

export interface ServiuItem {
  code: string;
  description: string;
  shortDescription: string;
  unit: MeasurementUnit;
  category: CubicacionCategory;
  basePrice: number;          // CLP - reference price
  priceRange?: {
    min: number;
    max: number;
  };
  notes?: string;
  nchReference?: string;      // Related NCh standard
}

// ============================================================================
// SERVIU ITEMIZADO DATABASE
// ============================================================================

export const SERVIU_ITEMS: ServiuItem[] = [
  // =========================================================================
  // 200 - MOVIMIENTO DE TIERRAS (Earthworks)
  // =========================================================================
  {
    code: '201.1',
    description: 'Excavación en zanja para tuberías, en terreno tipo I (blando)',
    shortDescription: 'Exc. zanja T-I',
    unit: 'm3',
    category: 'excavacion',
    basePrice: 8500,
    priceRange: { min: 7000, max: 12000 },
    notes: 'Terreno tipo I: material suelto, arena, tierra vegetal',
  },
  {
    code: '201.2',
    description: 'Excavación en zanja para tuberías, en terreno tipo II (semi-duro)',
    shortDescription: 'Exc. zanja T-II',
    unit: 'm3',
    category: 'excavacion',
    basePrice: 12500,
    priceRange: { min: 10000, max: 18000 },
    notes: 'Terreno tipo II: arcilla dura, grava compacta',
  },
  {
    code: '201.3',
    description: 'Excavación en zanja para tuberías, en terreno tipo III (duro/roca)',
    shortDescription: 'Exc. zanja T-III',
    unit: 'm3',
    category: 'excavacion',
    basePrice: 35000,
    priceRange: { min: 25000, max: 50000 },
    notes: 'Terreno tipo III: roca blanda, terreno con bolones',
  },
  {
    code: '202.1',
    description: 'Excavación para cámaras y estructuras, terreno tipo I',
    shortDescription: 'Exc. cámara T-I',
    unit: 'm3',
    category: 'excavacion',
    basePrice: 9500,
    priceRange: { min: 8000, max: 14000 },
  },
  {
    code: '202.2',
    description: 'Excavación para cámaras y estructuras, terreno tipo II',
    shortDescription: 'Exc. cámara T-II',
    unit: 'm3',
    category: 'excavacion',
    basePrice: 14000,
    priceRange: { min: 11000, max: 20000 },
  },
  {
    code: '203.1',
    description: 'Retiro y transporte de excedentes a botadero autorizado',
    shortDescription: 'Retiro excedentes',
    unit: 'm3',
    category: 'excavacion',
    basePrice: 12000,
    priceRange: { min: 9000, max: 18000 },
    notes: 'Incluye carga, transporte y descarga',
  },

  // =========================================================================
  // 210 - RELLENOS (Backfill)
  // =========================================================================
  {
    code: '210.1',
    description: 'Relleno compactado con material seleccionado de la excavación',
    shortDescription: 'Relleno seleccionado',
    unit: 'm3',
    category: 'relleno',
    basePrice: 6500,
    priceRange: { min: 5000, max: 9000 },
    notes: '95% Proctor Modificado',
  },
  {
    code: '210.2',
    description: 'Relleno compactado con material de empréstito',
    shortDescription: 'Relleno empréstito',
    unit: 'm3',
    category: 'relleno',
    basePrice: 18000,
    priceRange: { min: 14000, max: 25000 },
    notes: 'Material importado, 95% Proctor',
  },
  {
    code: '210.3',
    description: 'Relleno con material granular estabilizado',
    shortDescription: 'Relleno estabilizado',
    unit: 'm3',
    category: 'relleno',
    basePrice: 28000,
    priceRange: { min: 22000, max: 35000 },
  },

  // =========================================================================
  // 220 - CAMAS DE APOYO (Bedding)
  // =========================================================================
  {
    code: '220.1',
    description: 'Cama de arena para tuberías, e=0.10m',
    shortDescription: 'Cama arena 10cm',
    unit: 'm3',
    category: 'cama',
    basePrice: 32000,
    priceRange: { min: 25000, max: 40000 },
    notes: 'Arena gruesa limpia',
  },
  {
    code: '220.2',
    description: 'Cama de arena para tuberías, e=0.15m',
    shortDescription: 'Cama arena 15cm',
    unit: 'm3',
    category: 'cama',
    basePrice: 32000,
    priceRange: { min: 25000, max: 40000 },
  },
  {
    code: '220.3',
    description: 'Cama de grava para tuberías',
    shortDescription: 'Cama grava',
    unit: 'm3',
    category: 'cama',
    basePrice: 38000,
    priceRange: { min: 30000, max: 48000 },
  },

  // =========================================================================
  // 300 - AGUA POTABLE (Water Supply)
  // =========================================================================
  {
    code: '301.1',
    description: 'Tubería PVC C-10 Ø63mm para agua potable, incluye fitting',
    shortDescription: 'Tub PVC Ø63mm',
    unit: 'm',
    category: 'tuberia',
    basePrice: 8500,
    priceRange: { min: 7000, max: 11000 },
    nchReference: 'NCh 399',
  },
  {
    code: '301.2',
    description: 'Tubería PVC C-10 Ø75mm para agua potable, incluye fitting',
    shortDescription: 'Tub PVC Ø75mm',
    unit: 'm',
    category: 'tuberia',
    basePrice: 9800,
    priceRange: { min: 8000, max: 13000 },
    nchReference: 'NCh 399',
  },
  {
    code: '301.3',
    description: 'Tubería PVC C-10 Ø90mm para agua potable, incluye fitting',
    shortDescription: 'Tub PVC Ø90mm',
    unit: 'm',
    category: 'tuberia',
    basePrice: 12500,
    priceRange: { min: 10000, max: 16000 },
    nchReference: 'NCh 399',
  },
  {
    code: '301.4',
    description: 'Tubería PVC C-10 Ø110mm para agua potable, incluye fitting',
    shortDescription: 'Tub PVC Ø110mm',
    unit: 'm',
    category: 'tuberia',
    basePrice: 15000,
    priceRange: { min: 12000, max: 19000 },
    nchReference: 'NCh 399',
  },
  {
    code: '301.5',
    description: 'Tubería PVC C-10 Ø160mm para agua potable, incluye fitting',
    shortDescription: 'Tub PVC Ø160mm',
    unit: 'm',
    category: 'tuberia',
    basePrice: 22000,
    priceRange: { min: 18000, max: 28000 },
    nchReference: 'NCh 399',
  },
  {
    code: '301.6',
    description: 'Tubería PVC C-10 Ø200mm para agua potable, incluye fitting',
    shortDescription: 'Tub PVC Ø200mm',
    unit: 'm',
    category: 'tuberia',
    basePrice: 32000,
    priceRange: { min: 26000, max: 40000 },
    nchReference: 'NCh 399',
  },
  {
    code: '302.1',
    description: 'Tubería HDPE PE100 SDR11 Ø63mm para agua potable',
    shortDescription: 'Tub HDPE Ø63mm',
    unit: 'm',
    category: 'tuberia',
    basePrice: 9500,
    priceRange: { min: 8000, max: 12000 },
    nchReference: 'NCh 398',
  },
  {
    code: '302.2',
    description: 'Tubería HDPE PE100 SDR11 Ø90mm para agua potable',
    shortDescription: 'Tub HDPE Ø90mm',
    unit: 'm',
    category: 'tuberia',
    basePrice: 14500,
    priceRange: { min: 12000, max: 18000 },
    nchReference: 'NCh 398',
  },
  {
    code: '302.3',
    description: 'Tubería HDPE PE100 SDR11 Ø110mm para agua potable',
    shortDescription: 'Tub HDPE Ø110mm',
    unit: 'm',
    category: 'tuberia',
    basePrice: 18000,
    priceRange: { min: 15000, max: 23000 },
    nchReference: 'NCh 398',
  },
  {
    code: '303.1',
    description: 'Válvula de compuerta Ø75mm con llave de vereda',
    shortDescription: 'Válv compuerta Ø75',
    unit: 'un',
    category: 'obras_civiles',
    basePrice: 185000,
    priceRange: { min: 150000, max: 230000 },
  },
  {
    code: '303.2',
    description: 'Válvula de compuerta Ø110mm con llave de vereda',
    shortDescription: 'Válv compuerta Ø110',
    unit: 'un',
    category: 'obras_civiles',
    basePrice: 280000,
    priceRange: { min: 220000, max: 350000 },
  },
  {
    code: '304.1',
    description: 'Grifo de incendio tipo tráfico completo',
    shortDescription: 'Grifo incendio',
    unit: 'un',
    category: 'obras_civiles',
    basePrice: 850000,
    priceRange: { min: 700000, max: 1100000 },
  },
  {
    code: '305.1',
    description: 'Arranque domiciliario de agua potable Ø20mm, completo',
    shortDescription: 'Arranque AP Ø20',
    unit: 'un',
    category: 'conexiones',
    basePrice: 320000,
    priceRange: { min: 250000, max: 420000 },
    notes: 'Incluye fitting, llave de paso, medidor, caja',
  },

  // =========================================================================
  // 400 - ALCANTARILLADO (Sewer)
  // =========================================================================
  {
    code: '401.1',
    description: 'Tubería PVC sanitario Ø160mm SN4, incluye uniones',
    shortDescription: 'Tub PVC Ø160mm',
    unit: 'm',
    category: 'tuberia',
    basePrice: 14000,
    priceRange: { min: 11000, max: 18000 },
    nchReference: 'NCh 1779',
  },
  {
    code: '401.2',
    description: 'Tubería PVC sanitario Ø200mm SN4, incluye uniones',
    shortDescription: 'Tub PVC Ø200mm',
    unit: 'm',
    category: 'tuberia',
    basePrice: 20000,
    priceRange: { min: 16000, max: 26000 },
    nchReference: 'NCh 1779',
  },
  {
    code: '401.3',
    description: 'Tubería PVC sanitario Ø250mm SN4, incluye uniones',
    shortDescription: 'Tub PVC Ø250mm',
    unit: 'm',
    category: 'tuberia',
    basePrice: 28000,
    priceRange: { min: 22000, max: 36000 },
    nchReference: 'NCh 1779',
  },
  {
    code: '401.4',
    description: 'Tubería PVC sanitario Ø315mm SN4, incluye uniones',
    shortDescription: 'Tub PVC Ø315mm',
    unit: 'm',
    category: 'tuberia',
    basePrice: 42000,
    priceRange: { min: 34000, max: 54000 },
    nchReference: 'NCh 1779',
  },
  {
    code: '401.5',
    description: 'Tubería PVC sanitario Ø400mm SN4, incluye uniones',
    shortDescription: 'Tub PVC Ø400mm',
    unit: 'm',
    category: 'tuberia',
    basePrice: 68000,
    priceRange: { min: 55000, max: 85000 },
    nchReference: 'NCh 1779',
  },
  {
    code: '402.1',
    description: 'Cámara de inspección tipo A, H≤1.50m, Ø interior 1.20m',
    shortDescription: 'Cámara tipo A H≤1.5',
    unit: 'un',
    category: 'camaras',
    basePrice: 650000,
    priceRange: { min: 520000, max: 800000 },
    nchReference: 'NCh 1623',
  },
  {
    code: '402.2',
    description: 'Cámara de inspección tipo A, 1.50m<H≤2.50m, Ø interior 1.20m',
    shortDescription: 'Cámara tipo A H≤2.5',
    unit: 'un',
    category: 'camaras',
    basePrice: 850000,
    priceRange: { min: 700000, max: 1050000 },
    nchReference: 'NCh 1623',
  },
  {
    code: '402.3',
    description: 'Cámara de inspección tipo A, 2.50m<H≤3.50m, Ø interior 1.20m',
    shortDescription: 'Cámara tipo A H≤3.5',
    unit: 'un',
    category: 'camaras',
    basePrice: 1100000,
    priceRange: { min: 900000, max: 1400000 },
    nchReference: 'NCh 1623',
  },
  {
    code: '402.4',
    description: 'Cámara de inspección tipo B (prefabricada), H≤1.50m',
    shortDescription: 'Cámara tipo B H≤1.5',
    unit: 'un',
    category: 'camaras',
    basePrice: 450000,
    priceRange: { min: 380000, max: 580000 },
  },
  {
    code: '403.1',
    description: 'Unión domiciliaria de alcantarillado Ø110mm, completa',
    shortDescription: 'UD Alc Ø110',
    unit: 'un',
    category: 'conexiones',
    basePrice: 280000,
    priceRange: { min: 220000, max: 360000 },
    notes: 'Incluye cachimba, tubería, cámara domiciliaria',
  },
  {
    code: '404.1',
    description: 'Tapa y cerco de fierro fundido para cámara, D400',
    shortDescription: 'Tapa FF D400',
    unit: 'un',
    category: 'camaras',
    basePrice: 180000,
    priceRange: { min: 140000, max: 230000 },
    notes: 'Capacidad 40 toneladas',
  },

  // =========================================================================
  // 500 - AGUAS LLUVIAS (Stormwater)
  // =========================================================================
  {
    code: '501.1',
    description: 'Colector PVC Ø315mm SN8 para aguas lluvias',
    shortDescription: 'Col PVC Ø315mm',
    unit: 'm',
    category: 'tuberia',
    basePrice: 48000,
    priceRange: { min: 38000, max: 62000 },
  },
  {
    code: '501.2',
    description: 'Colector PVC Ø400mm SN8 para aguas lluvias',
    shortDescription: 'Col PVC Ø400mm',
    unit: 'm',
    category: 'tuberia',
    basePrice: 72000,
    priceRange: { min: 58000, max: 92000 },
  },
  {
    code: '501.3',
    description: 'Colector PVC Ø500mm SN8 para aguas lluvias',
    shortDescription: 'Col PVC Ø500mm',
    unit: 'm',
    category: 'tuberia',
    basePrice: 98000,
    priceRange: { min: 78000, max: 125000 },
  },
  {
    code: '501.4',
    description: 'Colector PVC Ø630mm SN8 para aguas lluvias',
    shortDescription: 'Col PVC Ø630mm',
    unit: 'm',
    category: 'tuberia',
    basePrice: 145000,
    priceRange: { min: 115000, max: 185000 },
  },
  {
    code: '501.5',
    description: 'Colector hormigón armado Ø600mm para aguas lluvias',
    shortDescription: 'Col HA Ø600mm',
    unit: 'm',
    category: 'tuberia',
    basePrice: 125000,
    priceRange: { min: 100000, max: 160000 },
  },
  {
    code: '501.6',
    description: 'Colector hormigón armado Ø800mm para aguas lluvias',
    shortDescription: 'Col HA Ø800mm',
    unit: 'm',
    category: 'tuberia',
    basePrice: 185000,
    priceRange: { min: 150000, max: 240000 },
  },
  {
    code: '501.7',
    description: 'Colector hormigón armado Ø1000mm para aguas lluvias',
    shortDescription: 'Col HA Ø1000mm',
    unit: 'm',
    category: 'tuberia',
    basePrice: 280000,
    priceRange: { min: 225000, max: 360000 },
  },
  {
    code: '502.1',
    description: 'Sumidero tipo rejilla, incluye conexión',
    shortDescription: 'Sumidero rejilla',
    unit: 'un',
    category: 'sumideros',
    basePrice: 380000,
    priceRange: { min: 300000, max: 480000 },
  },
  {
    code: '502.2',
    description: 'Sumidero tipo buzón con rejilla horizontal',
    shortDescription: 'Sumidero buzón',
    unit: 'un',
    category: 'sumideros',
    basePrice: 420000,
    priceRange: { min: 340000, max: 540000 },
  },
  {
    code: '503.1',
    description: 'Cámara de inspección aguas lluvias, H≤2.0m, Ø1.20m',
    shortDescription: 'Cámara ALL H≤2.0',
    unit: 'un',
    category: 'camaras',
    basePrice: 780000,
    priceRange: { min: 620000, max: 980000 },
  },
  {
    code: '504.1',
    description: 'Cuneta hormigón tipo A (30x15cm)',
    shortDescription: 'Cuneta HA tipo A',
    unit: 'm',
    category: 'obras_civiles',
    basePrice: 18000,
    priceRange: { min: 14000, max: 24000 },
  },

  // =========================================================================
  // 600 - PAVIMENTACIÓN (Pavement)
  // =========================================================================
  {
    code: '601.1',
    description: 'Base granular CBR≥80%, e=0.20m, compactada',
    shortDescription: 'Base granular 20cm',
    unit: 'm3',
    category: 'pavimentos',
    basePrice: 38000,
    priceRange: { min: 30000, max: 48000 },
  },
  {
    code: '601.2',
    description: 'Sub-base granular CBR≥40%, e=0.15m, compactada',
    shortDescription: 'Sub-base 15cm',
    unit: 'm3',
    category: 'pavimentos',
    basePrice: 28000,
    priceRange: { min: 22000, max: 36000 },
  },
  {
    code: '602.1',
    description: 'Carpeta asfáltica en caliente, e=0.05m',
    shortDescription: 'Carpeta asfalto 5cm',
    unit: 'm2',
    category: 'pavimentos',
    basePrice: 12500,
    priceRange: { min: 10000, max: 16000 },
  },
  {
    code: '602.2',
    description: 'Carpeta asfáltica en caliente, e=0.07m',
    shortDescription: 'Carpeta asfalto 7cm',
    unit: 'm2',
    category: 'pavimentos',
    basePrice: 16500,
    priceRange: { min: 13000, max: 21000 },
  },
  {
    code: '603.1',
    description: 'Solera tipo A (40x20x50cm), incluye radier',
    shortDescription: 'Solera tipo A',
    unit: 'm',
    category: 'pavimentos',
    basePrice: 22000,
    priceRange: { min: 18000, max: 28000 },
  },
  {
    code: '603.2',
    description: 'Solera tipo C (rebajada, 40x10x50cm)',
    shortDescription: 'Solera tipo C',
    unit: 'm',
    category: 'pavimentos',
    basePrice: 18000,
    priceRange: { min: 14000, max: 24000 },
  },
  {
    code: '604.1',
    description: 'Reposición de pavimento asfáltico, incluye corte',
    shortDescription: 'Repos pav asfalto',
    unit: 'm2',
    category: 'pavimentos',
    basePrice: 28000,
    priceRange: { min: 22000, max: 36000 },
    notes: 'Incluye corte, excavación, base, carpeta',
  },
  {
    code: '604.2',
    description: 'Reposición de vereda de hormigón, e=0.08m',
    shortDescription: 'Repos vereda HA',
    unit: 'm2',
    category: 'pavimentos',
    basePrice: 32000,
    priceRange: { min: 25000, max: 42000 },
  },

  // =========================================================================
  // 700 - VARIOS (Miscellaneous)
  // =========================================================================
  {
    code: '701.1',
    description: 'Entibación de zanja liviana, recuperable',
    shortDescription: 'Entibación liviana',
    unit: 'm2',
    category: 'varios',
    basePrice: 8500,
    priceRange: { min: 6500, max: 12000 },
  },
  {
    code: '701.2',
    description: 'Agotamiento de napas freáticas',
    shortDescription: 'Agotamiento napas',
    unit: 'gl',
    category: 'varios',
    basePrice: 250000,
    priceRange: { min: 150000, max: 500000 },
    notes: 'Precio por día de operación',
  },
  {
    code: '702.1',
    description: 'Limpieza y despeje de terreno',
    shortDescription: 'Limpieza terreno',
    unit: 'm2',
    category: 'varios',
    basePrice: 1200,
    priceRange: { min: 800, max: 2000 },
  },
  {
    code: '702.2',
    description: 'Instalación de faenas',
    shortDescription: 'Instalación faenas',
    unit: 'gl',
    category: 'varios',
    basePrice: 1500000,
    priceRange: { min: 800000, max: 3000000 },
  },
  {
    code: '703.1',
    description: 'Prueba hidráulica de tuberías',
    shortDescription: 'Prueba hidráulica',
    unit: 'm',
    category: 'varios',
    basePrice: 1500,
    priceRange: { min: 1000, max: 2500 },
  },
  {
    code: '703.2',
    description: 'Prueba de estanqueidad cámaras',
    shortDescription: 'Prueba estanqueidad',
    unit: 'un',
    category: 'varios',
    basePrice: 45000,
    priceRange: { min: 30000, max: 65000 },
  },
];

// ============================================================================
// Lookup Functions
// ============================================================================

/**
 * Find SERVIU item by code
 */
export function getServiuItem(code: string): ServiuItem | undefined {
  return SERVIU_ITEMS.find((item) => item.code === code);
}

/**
 * Find SERVIU items by category
 */
export function getServiuItemsByCategory(category: CubicacionCategory): ServiuItem[] {
  return SERVIU_ITEMS.filter((item) => item.category === category);
}

/**
 * Search SERVIU items by description
 */
export function searchServiuItems(query: string): ServiuItem[] {
  const lowerQuery = query.toLowerCase();
  return SERVIU_ITEMS.filter(
    (item) =>
      item.description.toLowerCase().includes(lowerQuery) ||
      item.shortDescription.toLowerCase().includes(lowerQuery) ||
      item.code.includes(query)
  );
}

/**
 * Get pipe item by diameter and type
 */
export function getPipeItem(
  diameter: number,
  type: 'water_pvc' | 'water_hdpe' | 'sewer' | 'storm_pvc' | 'storm_ha'
): ServiuItem | undefined {
  const diameterMm = Math.round(diameter);

  const codeMap: Record<string, Record<number, string>> = {
    water_pvc: {
      63: '301.1',
      75: '301.2',
      90: '301.3',
      110: '301.4',
      160: '301.5',
      200: '301.6',
    },
    water_hdpe: {
      63: '302.1',
      90: '302.2',
      110: '302.3',
    },
    sewer: {
      160: '401.1',
      200: '401.2',
      250: '401.3',
      315: '401.4',
      400: '401.5',
    },
    storm_pvc: {
      315: '501.1',
      400: '501.2',
      500: '501.3',
      630: '501.4',
    },
    storm_ha: {
      600: '501.5',
      800: '501.6',
      1000: '501.7',
    },
  };

  const code = codeMap[type]?.[diameterMm];
  return code ? getServiuItem(code) : undefined;
}

/**
 * Get manhole item by depth range
 */
export function getManholeItem(
  depth: number,
  type: 'A' | 'B' = 'A'
): ServiuItem | undefined {
  if (type === 'B') {
    return getServiuItem('402.4');
  }

  if (depth <= 1.5) return getServiuItem('402.1');
  if (depth <= 2.5) return getServiuItem('402.2');
  if (depth <= 3.5) return getServiuItem('402.3');

  // For deeper manholes, return the deepest and adjust price
  return getServiuItem('402.3');
}

/**
 * Get excavation item by terrain type
 */
export function getExcavationItem(
  terrainType: 1 | 2 | 3,
  forChamber: boolean = false
): ServiuItem | undefined {
  if (forChamber) {
    return getServiuItem(`202.${terrainType}`);
  }
  return getServiuItem(`201.${terrainType}`);
}

// ============================================================================
// Price Adjustment
// ============================================================================

/**
 * Adjust base prices by region and date
 * Returns a multiplier to apply to base prices
 */
export function getRegionalPriceFactor(region: string): number {
  const factors: Record<string, number> = {
    'Metropolitana': 1.0,
    'Valparaíso': 1.05,
    'Biobío': 0.95,
    'Araucanía': 0.92,
    'Los Lagos': 0.93,
    'Magallanes': 1.25,
    'Aysén': 1.20,
    'Arica y Parinacota': 1.15,
    'Tarapacá': 1.12,
    'Antofagasta': 1.18,
    'Atacama': 1.10,
    'Coquimbo': 1.02,
    "O'Higgins": 0.98,
    'Maule': 0.96,
    'Ñuble': 0.95,
    'Los Ríos': 0.94,
  };

  return factors[region] ?? 1.0;
}
