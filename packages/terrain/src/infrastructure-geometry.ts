/**
 * Infrastructure 3D Geometry Generators
 * Creates Three.js compatible geometries for Chilean urban infrastructure
 */

import * as THREE from 'three';
import {
  CHILEAN_MATERIALS,
  CHILEAN_DESIGN_STANDARDS,
  type SewerPipe,
  type InspectionChamber,
  type StormwaterInlet,
  type AsphaltPavement,
  type ConcretePavement,
  type Curb,
} from '@/types/chile-infrastructure';

// ============================================
// PIPE GEOMETRIES
// ============================================

export interface PipeGeometryOptions {
  innerDiameter: number; // meters
  wallThickness?: number; // meters (default based on material)
  length: number; // meters
  segments?: number;
}

/**
 * Creates a hollow pipe geometry (tube with wall thickness)
 */
export function createPipeGeometry(options: PipeGeometryOptions): THREE.BufferGeometry {
  const { innerDiameter, length, segments = 32 } = options;
  const wallThickness = options.wallThickness ?? innerDiameter * 0.05; // 5% of diameter
  const outerRadius = (innerDiameter / 2) + wallThickness;
  const innerRadius = innerDiameter / 2;

  // Create outer cylinder
  const outerGeometry = new THREE.CylinderGeometry(
    outerRadius, outerRadius, length, segments
  );

  // For a proper hollow pipe, we'd use CSG subtraction
  // Simplified version: return outer cylinder (inner hole shown via material)
  outerGeometry.rotateX(Math.PI / 2); // Align with Z axis
  return outerGeometry;
}

/**
 * Creates a pipe path following points with bends
 */
export function createPipePathGeometry(
  points: THREE.Vector3[],
  diameter: number,
  segments = 32
): THREE.BufferGeometry {
  if (points.length < 2) {
    throw new Error('Need at least 2 points for pipe path');
  }

  const curve = new THREE.CatmullRomCurve3(points);
  const tubeGeometry = new THREE.TubeGeometry(
    curve,
    points.length * 10, // Tube segments
    diameter / 2,
    segments, // Radial segments
    false // Closed
  );

  return tubeGeometry;
}

// ============================================
// CHAMBER GEOMETRIES
// ============================================

export interface ChamberGeometryOptions {
  type: 'A' | 'B';
  depth: number; // meters (total depth from surface)
  rimElevation?: number;
}

/**
 * Creates an inspection chamber (simplified cylindrical)
 */
export function createChamberGeometry(options: ChamberGeometryOptions): THREE.Group {
  const { type, depth } = options;
  const standards = CHILEAN_DESIGN_STANDARDS.chambers;

  const diameter = type === 'A' ? standards.typeADiameter : standards.typeBDiameter;
  const coneHeight = standards.coneHeight;
  const cylinderHeight = depth - coneHeight;
  const coverDiameter = 0.6; // 600mm standard

  const group = new THREE.Group();

  // Main cylinder (shaft)
  const shaftGeometry = new THREE.CylinderGeometry(
    diameter / 2,
    diameter / 2,
    cylinderHeight,
    32
  );
  const shaftMaterial = new THREE.MeshStandardMaterial({
    color: CHILEAN_MATERIALS.concrete_g25.color,
    roughness: CHILEAN_MATERIALS.concrete_g25.roughness,
    metalness: CHILEAN_MATERIALS.concrete_g25.metalness,
  });
  const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
  shaft.position.y = -cylinderHeight / 2 - coneHeight;
  group.add(shaft);

  // Cone (reducer)
  const coneGeometry = new THREE.CylinderGeometry(
    coverDiameter / 2, // Top (smaller)
    diameter / 2, // Bottom (larger)
    coneHeight,
    32
  );
  const cone = new THREE.Mesh(coneGeometry, shaftMaterial);
  cone.position.y = -coneHeight / 2;
  group.add(cone);

  // Cover (tapa)
  const coverGeometry = new THREE.CylinderGeometry(
    coverDiameter / 2,
    coverDiameter / 2,
    0.08, // 8cm thick cover
    32
  );
  const coverMaterial = new THREE.MeshStandardMaterial({
    color: CHILEAN_MATERIALS.cast_iron_cover.color,
    roughness: CHILEAN_MATERIALS.cast_iron_cover.roughness,
    metalness: CHILEAN_MATERIALS.cast_iron_cover.metalness,
  });
  const cover = new THREE.Mesh(coverGeometry, coverMaterial);
  cover.position.y = 0.04;
  group.add(cover);

  // Base slab (radier)
  const baseGeometry = new THREE.CylinderGeometry(
    diameter / 2 + 0.1, // Slightly larger
    diameter / 2 + 0.1,
    0.2, // 20cm thick
    32
  );
  const baseSlab = new THREE.Mesh(baseGeometry, shaftMaterial);
  baseSlab.position.y = -depth + 0.1;
  group.add(baseSlab);

  return group;
}

// ============================================
// INLET GEOMETRIES
// ============================================

export interface InletGeometryOptions {
  type: 'S1' | 'S2';
  depth?: number; // default 0.6m
}

/**
 * Creates a stormwater inlet (sumidero)
 */
export function createInletGeometry(options: InletGeometryOptions): THREE.Group {
  const { type, depth = 0.6 } = options;

  // Dimensions from DOH standards
  const dimensions = type === 'S1'
    ? { width: 0.41, length: 0.98 }
    : { width: 0.41, length: 0.66 };

  const group = new THREE.Group();

  // Box structure
  const wallThickness = 0.1;
  const boxGeometry = new THREE.BoxGeometry(
    dimensions.width + wallThickness * 2,
    depth,
    dimensions.length + wallThickness * 2
  );
  const concreteMaterial = new THREE.MeshStandardMaterial({
    color: CHILEAN_MATERIALS.concrete_g25.color,
    roughness: CHILEAN_MATERIALS.concrete_g25.roughness,
    metalness: CHILEAN_MATERIALS.concrete_g25.metalness,
  });
  const box = new THREE.Mesh(boxGeometry, concreteMaterial);
  box.position.y = -depth / 2;
  group.add(box);

  // Grate (rejilla)
  const grateGeometry = new THREE.BoxGeometry(
    dimensions.width,
    0.03,
    dimensions.length
  );
  const grateMaterial = new THREE.MeshStandardMaterial({
    color: 0x555555,
    roughness: 0.3,
    metalness: 0.9,
  });
  const grate = new THREE.Mesh(grateGeometry, grateMaterial);
  grate.position.y = 0.015;
  group.add(grate);

  // Grate bars (simplified)
  const barCount = Math.floor(dimensions.length / 0.05);
  for (let i = 0; i < barCount; i++) {
    const barGeometry = new THREE.BoxGeometry(dimensions.width, 0.035, 0.015);
    const bar = new THREE.Mesh(barGeometry, grateMaterial);
    bar.position.y = 0.015;
    bar.position.z = -dimensions.length / 2 + 0.025 + i * 0.05;
    group.add(bar);
  }

  return group;
}

// ============================================
// CURB GEOMETRIES
// ============================================

export interface CurbGeometryOptions {
  type: 'A' | 'zarpa' | 'mountable';
  length: number;
}

/**
 * Creates a curb (solera) geometry
 */
export function createCurbGeometry(options: CurbGeometryOptions): THREE.BufferGeometry {
  const { type, length } = options;

  // Type A standard dimensions
  const width = 0.10; // 10cm
  const height = 0.25; // 25cm
  const exposedHeight = 0.15; // 15cm above pavement

  if (type === 'A') {
    // Standard rectangular curb
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(width, 0);
    shape.lineTo(width, height);
    shape.lineTo(0, height);
    shape.lineTo(0, 0);

    const extrudeSettings = {
      steps: 1,
      depth: length,
      bevelEnabled: false,
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  } else if (type === 'zarpa') {
    // Inclined face curb for steep slopes
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(width + 0.05, 0);
    shape.lineTo(width, height);
    shape.lineTo(0, height);
    shape.lineTo(0, 0);

    const extrudeSettings = {
      steps: 1,
      depth: length,
      bevelEnabled: false,
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  } else {
    // Mountable curb (lower profile)
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(width + 0.05, 0);
    shape.lineTo(width, 0.10);
    shape.lineTo(0, 0.10);
    shape.lineTo(0, 0);

    const extrudeSettings = {
      steps: 1,
      depth: length,
      bevelEnabled: false,
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }
}

// ============================================
// PAVEMENT LAYER GEOMETRIES
// ============================================

export interface PavementLayerOptions {
  width: number;
  length: number;
  thickness: number;
  position?: THREE.Vector3;
}

/**
 * Creates a pavement layer as a box geometry
 */
export function createPavementLayer(options: PavementLayerOptions): THREE.BufferGeometry {
  const { width, length, thickness } = options;
  return new THREE.BoxGeometry(width, thickness, length);
}

/**
 * Creates a complete pavement structure with all layers
 */
export function createPavementStructure(
  type: 'asphalt' | 'concrete',
  width: number,
  length: number
): THREE.Group {
  const group = new THREE.Group();

  if (type === 'asphalt') {
    // Asphalt pavement layers
    const layers = [
      { name: 'subbase', thickness: 0.15, color: CHILEAN_MATERIALS.granular_base.color, y: -0.375 },
      { name: 'base', thickness: 0.15, color: CHILEAN_MATERIALS.granular_base.color, y: -0.225 },
      { name: 'binder', thickness: 0.08, color: 0x444444, y: -0.11 },
      { name: 'wearing', thickness: 0.05, color: CHILEAN_MATERIALS.asphalt_wearing.color, y: -0.025 },
    ];

    layers.forEach(layer => {
      const geometry = new THREE.BoxGeometry(width, layer.thickness, length);
      const material = new THREE.MeshStandardMaterial({
        color: layer.color,
        roughness: 0.9,
        metalness: 0,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = layer.y;
      mesh.name = layer.name;
      group.add(mesh);
    });
  } else {
    // Concrete pavement layers
    const layers = [
      { name: 'subbase', thickness: 0.15, color: CHILEAN_MATERIALS.granular_base.color, y: -0.275 },
      { name: 'base', thickness: 0.10, color: CHILEAN_MATERIALS.granular_base.color, y: -0.15 },
      { name: 'slab', thickness: 0.20, color: CHILEAN_MATERIALS.concrete_g25.color, y: 0 },
    ];

    layers.forEach(layer => {
      const geometry = new THREE.BoxGeometry(width, layer.thickness, length);
      const material = new THREE.MeshStandardMaterial({
        color: layer.color,
        roughness: layer.name === 'slab' ? 0.7 : 0.95,
        metalness: 0,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = layer.y;
      mesh.name = layer.name;
      group.add(mesh);
    });

    // Add joints to concrete slab
    const jointSpacing = 4; // 4 meter joint spacing
    const jointCount = Math.floor(length / jointSpacing);
    for (let i = 1; i < jointCount; i++) {
      const jointGeometry = new THREE.BoxGeometry(width, 0.05, 0.01);
      const jointMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.5,
      });
      const joint = new THREE.Mesh(jointGeometry, jointMaterial);
      joint.position.y = 0.075;
      joint.position.z = -length / 2 + i * jointSpacing;
      group.add(joint);
    }
  }

  return group;
}

// ============================================
// GUTTER GEOMETRIES
// ============================================

export interface GutterGeometryOptions {
  length: number;
  width?: number;
  depth?: number;
  type?: 'curb_gutter' | 'valley_gutter' | 'V_channel';
}

/**
 * Creates a gutter geometry
 */
export function createGutterGeometry(options: GutterGeometryOptions): THREE.BufferGeometry {
  const {
    length,
    width = 0.30,
    depth = 0.15,
    type = 'curb_gutter'
  } = options;

  if (type === 'V_channel') {
    // V-shaped channel
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(width / 2, -depth);
    shape.lineTo(width, 0);

    const extrudeSettings = {
      steps: 1,
      depth: length,
      bevelEnabled: false,
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  } else {
    // Rectangular gutter (curb_gutter and valley_gutter)
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(width, 0);
    shape.lineTo(width, -depth);
    shape.lineTo(0, -depth);
    shape.lineTo(0, 0);

    const extrudeSettings = {
      steps: 1,
      depth: length,
      bevelEnabled: false,
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }
}

// ============================================
// TRENCH CROSS-SECTION
// ============================================

export interface TrenchGeometryOptions {
  length: number;
  pipeOuterDiameter: number;
  depth: number;
}

/**
 * Creates a trench cross-section showing pipe installation
 */
export function createTrenchSection(options: TrenchGeometryOptions): THREE.Group {
  const { length, pipeOuterDiameter, depth } = options;
  const group = new THREE.Group();

  const trenchWidth = Math.max(pipeOuterDiameter + 0.4, 0.6); // Min 0.6m or pipe + 0.4m

  // Bedding layer
  const beddingThickness = 0.15;
  const beddingGeometry = new THREE.BoxGeometry(trenchWidth, beddingThickness, length);
  const beddingMaterial = new THREE.MeshStandardMaterial({
    color: 0xC2B280, // Sand color
    roughness: 0.95,
  });
  const bedding = new THREE.Mesh(beddingGeometry, beddingMaterial);
  bedding.position.y = -depth + beddingThickness / 2;
  group.add(bedding);

  // Pipe (simplified as cylinder)
  const pipeGeometry = new THREE.CylinderGeometry(
    pipeOuterDiameter / 2,
    pipeOuterDiameter / 2,
    length,
    32
  );
  pipeGeometry.rotateX(Math.PI / 2);
  const pipeMaterial = new THREE.MeshStandardMaterial({
    color: CHILEAN_MATERIALS.pvc_sewer.color,
    roughness: CHILEAN_MATERIALS.pvc_sewer.roughness,
    metalness: CHILEAN_MATERIALS.pvc_sewer.metalness,
  });
  const pipe = new THREE.Mesh(pipeGeometry, pipeMaterial);
  pipe.position.y = -depth + beddingThickness + pipeOuterDiameter / 2;
  group.add(pipe);

  // Lateral fill (sides of pipe)
  const lateralHeight = pipeOuterDiameter + 0.15;
  const lateralWidth = (trenchWidth - pipeOuterDiameter) / 2 - 0.05;
  const lateralGeometry = new THREE.BoxGeometry(lateralWidth, lateralHeight, length);
  const lateralMaterial = new THREE.MeshStandardMaterial({
    color: 0xA0826D,
    roughness: 0.95,
  });

  const lateralLeft = new THREE.Mesh(lateralGeometry, lateralMaterial);
  lateralLeft.position.x = -trenchWidth / 2 + lateralWidth / 2;
  lateralLeft.position.y = -depth + beddingThickness + lateralHeight / 2;
  group.add(lateralLeft);

  const lateralRight = new THREE.Mesh(lateralGeometry, lateralMaterial);
  lateralRight.position.x = trenchWidth / 2 - lateralWidth / 2;
  lateralRight.position.y = -depth + beddingThickness + lateralHeight / 2;
  group.add(lateralRight);

  // Final backfill
  const backfillHeight = depth - beddingThickness - lateralHeight;
  if (backfillHeight > 0) {
    const backfillGeometry = new THREE.BoxGeometry(trenchWidth, backfillHeight, length);
    const backfillMaterial = new THREE.MeshStandardMaterial({
      color: 0x6B4423, // Natural soil
      roughness: 1.0,
    });
    const backfill = new THREE.Mesh(backfillGeometry, backfillMaterial);
    backfill.position.y = -backfillHeight / 2;
    group.add(backfill);
  }

  return group;
}

// ============================================
// MATERIAL HELPERS
// ============================================

/**
 * Creates a Three.js material from Chilean material specs
 */
export function createMaterialFromSpec(materialKey: keyof typeof CHILEAN_MATERIALS): THREE.MeshStandardMaterial {
  const spec = CHILEAN_MATERIALS[materialKey];
  return new THREE.MeshStandardMaterial({
    color: spec.color,
    roughness: spec.roughness,
    metalness: spec.metalness,
  });
}

/**
 * Get all available materials for a category
 */
export function getMaterialsForCategory(category: 'pavement' | 'pipe' | 'concrete' | 'metal'): Record<string, THREE.MeshStandardMaterial> {
  const materials: Record<string, THREE.MeshStandardMaterial> = {};

  const categoryMapping: Record<string, string[]> = {
    pavement: ['asphalt_wearing', 'granular_base'],
    pipe: ['pvc_sewer', 'hdpe_pe100'],
    concrete: ['concrete_g25'],
    metal: ['cast_iron_cover'],
  };

  const keys = categoryMapping[category] || [];
  keys.forEach(key => {
    if (key in CHILEAN_MATERIALS) {
      materials[key] = createMaterialFromSpec(key as keyof typeof CHILEAN_MATERIALS);
    }
  });

  return materials;
}
