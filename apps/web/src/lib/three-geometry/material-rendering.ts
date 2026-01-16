// ============================================================
// MATERIAL RENDERING UTILITIES
// ============================================================
// Three.js material generation based on structural material types
// Supports color coding, textures, and visual feedback
// ============================================================

import * as THREE from 'three';
import type { MaterialType, Material } from '@ledesign/structural';

// ============================================================
// COLOR SCHEMES
// ============================================================

export const MATERIAL_COLORS: Record<MaterialType, number> = {
  steel: 0x78909c,           // Blue-gray steel
  concrete: 0xbdbdbd,        // Light gray concrete
  timber: 0xa1887f,          // Brown timber
  masonry: 0xd7ccc8,         // Light brown/beige
  cold_formed_steel: 0x90a4ae, // Lighter steel
  aluminum: 0xb0bec5,        // Silver aluminum
  other: 0x9e9e9e,           // Neutral gray
};

export const ELEMENT_COLORS = {
  node: {
    default: 0x94a3b8,
    selected: 0x3b82f6,
    hovered: 0x60a5fa,
    support: {
      free: 0x94a3b8,
      pinned: 0x22c55e,
      fixed: 0xef4444,
      roller: 0xf59e0b,
      spring: 0x8b5cf6,
    },
  },
  beam: {
    default: 0x64748b,
    selected: 0x3b82f6,
    hovered: 0x60a5fa,
  },
  column: {
    default: 0x8b5cf6,
    selected: 0x3b82f6,
    hovered: 0xa78bfa,
  },
  brace: {
    default: 0xf59e0b,
    selected: 0x3b82f6,
    hovered: 0xfbbf24,
  },
  wall: {
    default: 0x78909c,
    selected: 0x3b82f6,
    hovered: 0x90a4ae,
  },
  slab: {
    default: 0xbdbdbd,
    selected: 0x3b82f6,
    hovered: 0xd5d5d5,
  },
};

// ============================================================
// MATERIAL CACHE
// ============================================================

const materialCache = new Map<string, THREE.Material>();

function getMaterialCacheKey(
  materialType: MaterialType,
  state: 'default' | 'selected' | 'hovered',
  options?: MaterialOptions
): string {
  return `${materialType}:${state}:${JSON.stringify(options ?? {})}`;
}

export function clearMaterialCache(): void {
  materialCache.forEach((material) => material.dispose());
  materialCache.clear();
}

// ============================================================
// MATERIAL OPTIONS
// ============================================================

export interface MaterialOptions {
  transparent?: boolean;
  opacity?: number;
  metalness?: number;
  roughness?: number;
  emissive?: number;
  emissiveIntensity?: number;
  flatShading?: boolean;
  side?: THREE.Side;
  wireframe?: boolean;
}

const DEFAULT_OPTIONS: MaterialOptions = {
  transparent: false,
  opacity: 1,
  metalness: 0.3,
  roughness: 0.7,
  emissive: 0x000000,
  emissiveIntensity: 0,
  flatShading: false,
  side: THREE.FrontSide,
  wireframe: false,
};

// ============================================================
// MATERIAL TYPE SPECIFIC OPTIONS
// ============================================================

const MATERIAL_TYPE_OPTIONS: Record<MaterialType, Partial<MaterialOptions>> = {
  steel: {
    metalness: 0.6,
    roughness: 0.4,
  },
  concrete: {
    metalness: 0.0,
    roughness: 0.9,
    flatShading: true,
  },
  timber: {
    metalness: 0.0,
    roughness: 0.8,
  },
  masonry: {
    metalness: 0.0,
    roughness: 0.95,
    flatShading: true,
  },
  cold_formed_steel: {
    metalness: 0.5,
    roughness: 0.5,
  },
  aluminum: {
    metalness: 0.7,
    roughness: 0.3,
  },
  other: {
    metalness: 0.3,
    roughness: 0.7,
  },
};

// ============================================================
// MATERIAL FACTORIES
// ============================================================

/**
 * Create a standard material for a given material type
 */
export function createMaterialByType(
  materialType: MaterialType,
  state: 'default' | 'selected' | 'hovered' = 'default',
  customOptions?: Partial<MaterialOptions>
): THREE.MeshStandardMaterial {
  const cacheKey = getMaterialCacheKey(materialType, state, customOptions);
  const cached = materialCache.get(cacheKey);
  if (cached) return cached as THREE.MeshStandardMaterial;

  const baseColor = MATERIAL_COLORS[materialType];
  const typeOptions = MATERIAL_TYPE_OPTIONS[materialType];
  const options = { ...DEFAULT_OPTIONS, ...typeOptions, ...customOptions };

  let color = baseColor;
  let emissive = options.emissive ?? 0x000000;
  let emissiveIntensity = options.emissiveIntensity ?? 0;

  // Adjust for selection/hover states
  if (state === 'selected') {
    emissive = 0x3b82f6;
    emissiveIntensity = 0.3;
  } else if (state === 'hovered') {
    emissive = 0x60a5fa;
    emissiveIntensity = 0.2;
  }

  const material = new THREE.MeshStandardMaterial({
    color,
    metalness: options.metalness,
    roughness: options.roughness,
    emissive,
    emissiveIntensity,
    transparent: options.transparent,
    opacity: options.opacity,
    flatShading: options.flatShading,
    side: options.side,
    wireframe: options.wireframe,
  });

  materialCache.set(cacheKey, material);
  return material;
}

/**
 * Create material from a Material entity
 */
export function createMaterialFromEntity(
  material: Material,
  state: 'default' | 'selected' | 'hovered' = 'default'
): THREE.MeshStandardMaterial {
  return createMaterialByType(material.material_type, state);
}

/**
 * Create element-specific material (for when material_id is not set)
 */
export function createElementMaterial(
  elementType: 'beam' | 'column' | 'brace' | 'wall' | 'slab',
  state: 'default' | 'selected' | 'hovered' = 'default',
  customOptions?: Partial<MaterialOptions>
): THREE.MeshStandardMaterial {
  const cacheKey = `element:${elementType}:${state}:${JSON.stringify(customOptions ?? {})}`;
  const cached = materialCache.get(cacheKey);
  if (cached) return cached as THREE.MeshStandardMaterial;

  const colors = ELEMENT_COLORS[elementType];
  const color = colors[state];
  const options = { ...DEFAULT_OPTIONS, ...customOptions };

  let emissive = 0x000000;
  let emissiveIntensity = 0;

  if (state === 'selected') {
    emissive = 0x3b82f6;
    emissiveIntensity = 0.4;
  } else if (state === 'hovered') {
    emissive = 0x60a5fa;
    emissiveIntensity = 0.2;
  }

  const material = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.4,
    roughness: 0.6,
    emissive,
    emissiveIntensity,
    transparent: options.transparent,
    opacity: options.opacity,
    side: options.side,
  });

  materialCache.set(cacheKey, material);
  return material;
}

// ============================================================
// GHOST/PREVIEW MATERIALS
// ============================================================

export function createGhostMaterial(
  elementType: 'node' | 'beam' | 'column' | 'brace'
): THREE.MeshStandardMaterial {
  const cacheKey = `ghost:${elementType}`;
  const cached = materialCache.get(cacheKey);
  if (cached) return cached as THREE.MeshStandardMaterial;

  const material = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    transparent: true,
    opacity: 0.4,
    metalness: 0.0,
    roughness: 1.0,
    emissive: 0x3b82f6,
    emissiveIntensity: 0.3,
  });

  materialCache.set(cacheKey, material);
  return material;
}

// ============================================================
// ANALYSIS RESULT VISUALIZATION
// ============================================================

export interface StressColorMapOptions {
  minValue: number;
  maxValue: number;
  colorScale?: 'rainbow' | 'thermal' | 'diverging';
}

/**
 * Create a color based on a stress/demand ratio
 * Used for visualizing D/C ratios, stresses, etc.
 */
export function getStressColor(
  value: number,
  options: StressColorMapOptions
): THREE.Color {
  const { minValue, maxValue, colorScale = 'rainbow' } = options;

  // Normalize value to 0-1 range
  const t = Math.max(0, Math.min(1, (value - minValue) / (maxValue - minValue)));

  const color = new THREE.Color();

  switch (colorScale) {
    case 'rainbow':
      // Blue (low) -> Green -> Yellow -> Red (high)
      color.setHSL(0.67 * (1 - t), 1, 0.5);
      break;

    case 'thermal':
      // Black -> Red -> Yellow -> White
      if (t < 0.33) {
        color.setRGB(t * 3, 0, 0);
      } else if (t < 0.67) {
        color.setRGB(1, (t - 0.33) * 3, 0);
      } else {
        color.setRGB(1, 1, (t - 0.67) * 3);
      }
      break;

    case 'diverging':
      // Blue -> White -> Red (for +/- values)
      if (t < 0.5) {
        color.setRGB(t * 2, t * 2, 1);
      } else {
        color.setRGB(1, (1 - t) * 2, (1 - t) * 2);
      }
      break;
  }

  return color;
}

/**
 * Create a material for stress visualization
 */
export function createStressMaterial(
  value: number,
  options: StressColorMapOptions
): THREE.MeshStandardMaterial {
  const color = getStressColor(value, options);

  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.2,
    roughness: 0.8,
    emissive: color,
    emissiveIntensity: 0.1,
  });
}

// ============================================================
// D/C RATIO COLORS (Design Check)
// ============================================================

/**
 * Get color for demand/capacity ratio
 * Green (< 0.5) -> Yellow (0.7) -> Orange (0.9) -> Red (> 1.0)
 */
export function getDCRatioColor(dcRatio: number): THREE.Color {
  const color = new THREE.Color();

  if (dcRatio < 0.5) {
    color.setHex(0x22c55e); // Green - very safe
  } else if (dcRatio < 0.7) {
    color.setHex(0x84cc16); // Lime - safe
  } else if (dcRatio < 0.9) {
    color.setHex(0xeab308); // Yellow - caution
  } else if (dcRatio < 1.0) {
    color.setHex(0xf97316); // Orange - near limit
  } else {
    color.setHex(0xef4444); // Red - over capacity
  }

  return color;
}

export function createDCRatioMaterial(dcRatio: number): THREE.MeshStandardMaterial {
  const color = getDCRatioColor(dcRatio);

  const emissiveIntensity = dcRatio > 1.0 ? 0.5 : 0.1;

  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.2,
    roughness: 0.8,
    emissive: color,
    emissiveIntensity,
  });
}

// ============================================================
// WIREFRAME OVERLAY
// ============================================================

export function createWireframeMaterial(color: number = 0x000000): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color,
    linewidth: 1,
    transparent: true,
    opacity: 0.3,
  });
}

// ============================================================
// SUPPORT SYMBOL MATERIALS
// ============================================================

export function createSupportMaterial(
  supportType: 'free' | 'pinned' | 'fixed' | 'roller' | 'spring'
): THREE.MeshStandardMaterial {
  const cacheKey = `support:${supportType}`;
  const cached = materialCache.get(cacheKey);
  if (cached) return cached as THREE.MeshStandardMaterial;

  const color = ELEMENT_COLORS.node.support[supportType];

  const material = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.3,
    roughness: 0.7,
  });

  materialCache.set(cacheKey, material);
  return material;
}
