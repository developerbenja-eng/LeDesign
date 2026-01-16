// ============================================================
// MESH GENERATION
// Generate quad4/tri3 meshes from wall and slab boundary definitions
// ============================================================

import { StructuralNode, Wall, Slab, ShellElement, Opening, CreateNodeInput, CreateShellElementInput } from './types';
import { generateNodeId, generateShellElementId } from '@/lib/structural/factories';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

interface Point2D {
  x: number;
  y: number;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface MeshNode extends Point3D {
  id: string;
}

interface QuadElement {
  nodes: [string, string, string, string];
  centroid: Point3D;
  area: number;
}

interface TriElement {
  nodes: [string, string, string];
  centroid: Point3D;
  area: number;
}

// ============================================================
// VECTOR UTILITIES
// ============================================================

function distance3D(a: Point3D, b: Point3D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function distance2D(a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function bilinearInterpolation(
  p00: Point3D,
  p10: Point3D,
  p01: Point3D,
  p11: Point3D,
  u: number,
  v: number
): Point3D {
  // Interpolate along u direction
  const p0 = {
    x: lerp(p00.x, p10.x, u),
    y: lerp(p00.y, p10.y, u),
    z: lerp(p00.z, p10.z, u),
  };
  const p1 = {
    x: lerp(p01.x, p11.x, u),
    y: lerp(p01.y, p11.y, u),
    z: lerp(p01.z, p11.z, u),
  };

  // Interpolate along v direction
  return {
    x: lerp(p0.x, p1.x, v),
    y: lerp(p0.y, p1.y, v),
    z: lerp(p0.z, p1.z, v),
  };
}

// ============================================================
// STRUCTURED QUAD MESHING (RECTANGULAR WALLS)
// ============================================================

/**
 * Generate structured quad mesh for rectangular wall
 * Assumes corner_nodes define a quadrilateral in 3D space
 */
export function generateWallMesh(
  wall: Wall,
  projectId: string,
  meshSize: number
): {
  meshNodes: MeshNode[];
  shellElements: QuadElement[];
} {
  const cornerNodes = wall.corner_nodes as unknown as Point3D[];

  if (cornerNodes.length !== 4) {
    throw new Error('Wall must have exactly 4 corner nodes');
  }

  // Calculate wall dimensions
  const width1 = distance3D(cornerNodes[0], cornerNodes[1]);
  const width2 = distance3D(cornerNodes[2], cornerNodes[3]);
  const height1 = distance3D(cornerNodes[0], cornerNodes[3]);
  const height2 = distance3D(cornerNodes[1], cornerNodes[2]);

  const avgWidth = (width1 + width2) / 2;
  const avgHeight = (height1 + height2) / 2;

  // Calculate mesh divisions
  const nx = Math.max(1, Math.ceil(avgWidth / meshSize));
  const ny = Math.max(1, Math.ceil(avgHeight / meshSize));

  const meshNodes: MeshNode[] = [];
  const shellElements: QuadElement[] = [];

  // Generate grid of nodes
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const u = i / nx;
      const v = j / ny;

      // Bilinear interpolation from corner nodes
      const point = bilinearInterpolation(
        cornerNodes[0], // bottom-left
        cornerNodes[1], // bottom-right
        cornerNodes[3], // top-left
        cornerNodes[2], // top-right
        u,
        v
      );

      meshNodes.push({
        id: generateNodeId(),
        x: point.x,
        y: point.y,
        z: point.z,
      });
    }
  }

  // Generate quad elements
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const n1 = j * (nx + 1) + i;
      const n2 = n1 + 1;
      const n3 = n1 + (nx + 1) + 1;
      const n4 = n1 + (nx + 1);

      const node1 = meshNodes[n1];
      const node2 = meshNodes[n2];
      const node3 = meshNodes[n3];
      const node4 = meshNodes[n4];

      // Calculate element centroid
      const centroid = {
        x: (node1.x + node2.x + node3.x + node4.x) / 4,
        y: (node1.y + node2.y + node3.y + node4.y) / 4,
        z: (node1.z + node2.z + node3.z + node4.z) / 4,
      };

      // Calculate element area (approximate as sum of two triangles)
      const area1 = calculateTriangleArea3D(node1, node2, node3);
      const area2 = calculateTriangleArea3D(node1, node3, node4);
      const area = area1 + area2;

      shellElements.push({
        nodes: [node1.id, node2.id, node3.id, node4.id],
        centroid,
        area,
      });
    }
  }

  return { meshNodes, shellElements };
}

// ============================================================
// UNSTRUCTURED MESHING (ARBITRARY POLYGONS)
// ============================================================

/**
 * Generate unstructured quad/tri mesh for arbitrary slab shapes
 * Uses simple triangulation approach
 */
export function generateSlabMesh(
  slab: Slab,
  projectId: string,
  meshSize: number
): {
  meshNodes: MeshNode[];
  shellElements: (QuadElement | TriElement)[];
} {
  const boundaryNodes = slab.boundary_nodes as unknown as Point3D[];
  const openings = (slab.openings as unknown as Opening[]) || [];

  if (boundaryNodes.length < 3) {
    throw new Error('Slab must have at least 3 boundary nodes');
  }

  // For MVP: Simple triangulation without hole handling
  // TODO: Implement constrained Delaunay triangulation with holes

  // Project to 2D plane (assume horizontal slab in XZ plane)
  const points2D: Point2D[] = boundaryNodes.map(node => ({
    x: node.x,
    y: node.z, // Use Z as Y for horizontal plane
  }));

  // Generate interior points for mesh refinement
  const allPoints = generateInteriorPoints(points2D, meshSize);

  // Add boundary nodes as mesh nodes
  const meshNodes: MeshNode[] = boundaryNodes.map(node => ({
    id: generateNodeId(),
    x: node.x,
    y: node.y,
    z: node.z,
  }));

  // Add interior nodes
  const avgY = boundaryNodes.reduce((sum, n) => sum + n.y, 0) / boundaryNodes.length;
  for (const point of allPoints) {
    if (!isInsideBoundary(point, points2D)) continue;

    // Check if point is inside any opening
    let insideOpening = false;
    for (const opening of openings) {
      // Create corner points from opening dimensions
      const openingPoints = [
        { x: opening.x, y: opening.y },
        { x: opening.x + opening.width, y: opening.y },
        { x: opening.x + opening.width, y: opening.y + opening.height },
        { x: opening.x, y: opening.y + opening.height },
      ];
      if (isInsideBoundary(point, openingPoints)) {
        insideOpening = true;
        break;
      }
    }

    if (!insideOpening) {
      meshNodes.push({
        id: generateNodeId(),
        x: point.x,
        y: avgY,
        z: point.y, // Map back to Z coordinate
      });
    }
  }

  // Simple ear clipping triangulation
  const shellElements: (QuadElement | TriElement)[] = [];
  const triangles = triangulatePolygon(points2D, meshNodes);

  for (const tri of triangles) {
    const node1 = meshNodes.find(n => n.id === tri.nodes[0])!;
    const node2 = meshNodes.find(n => n.id === tri.nodes[1])!;
    const node3 = meshNodes.find(n => n.id === tri.nodes[2])!;

    const centroid = {
      x: (node1.x + node2.x + node3.x) / 3,
      y: (node1.y + node2.y + node3.y) / 3,
      z: (node1.z + node2.z + node3.z) / 3,
    };

    const area = calculateTriangleArea3D(node1, node2, node3);

    shellElements.push({
      nodes: tri.nodes as [string, string, string],
      centroid,
      area,
    });
  }

  return { meshNodes, shellElements };
}

// ============================================================
// TRIANGULATION HELPERS
// ============================================================

/**
 * Generate interior points for mesh refinement
 * Creates a regular grid of points within bounding box
 */
function generateInteriorPoints(boundary: Point2D[], meshSize: number): Point2D[] {
  const points: Point2D[] = [];

  // Find bounding box
  const minX = Math.min(...boundary.map(p => p.x));
  const maxX = Math.max(...boundary.map(p => p.x));
  const minY = Math.min(...boundary.map(p => p.y));
  const maxY = Math.max(...boundary.map(p => p.y));

  // Generate grid
  const nx = Math.ceil((maxX - minX) / meshSize);
  const ny = Math.ceil((maxY - minY) / meshSize);

  for (let j = 1; j < ny; j++) {
    for (let i = 1; i < nx; i++) {
      const x = minX + (i * (maxX - minX)) / nx;
      const y = minY + (j * (maxY - minY)) / ny;
      points.push({ x, y });
    }
  }

  return points;
}

/**
 * Check if point is inside polygon using ray casting algorithm
 */
function isInsideBoundary(point: Point2D, boundary: Point2D[]): boolean {
  let inside = false;
  const n = boundary.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = boundary[i].x;
    const yi = boundary[i].y;
    const xj = boundary[j].x;
    const yj = boundary[j].y;

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Simple ear clipping triangulation
 * Returns array of triangles (indices into boundary points)
 */
function triangulatePolygon(
  boundary: Point2D[],
  meshNodes: MeshNode[]
): TriElement[] {
  // For MVP: Create simple fan triangulation from first vertex
  // TODO: Implement proper ear clipping or Delaunay

  const triangles: TriElement[] = [];
  const n = boundary.length;

  if (n < 3) return triangles;

  // Fan triangulation from vertex 0
  for (let i = 1; i < n - 1; i++) {
    triangles.push({
      nodes: [meshNodes[0].id, meshNodes[i].id, meshNodes[i + 1].id],
      centroid: {
        x: (meshNodes[0].x + meshNodes[i].x + meshNodes[i + 1].x) / 3,
        y: (meshNodes[0].y + meshNodes[i].y + meshNodes[i + 1].y) / 3,
        z: (meshNodes[0].z + meshNodes[i].z + meshNodes[i + 1].z) / 3,
      },
      area: calculateTriangleArea3D(meshNodes[0], meshNodes[i], meshNodes[i + 1]),
    });
  }

  return triangles;
}

// ============================================================
// GEOMETRY CALCULATIONS
// ============================================================

/**
 * Calculate area of triangle in 3D space using cross product
 */
function calculateTriangleArea3D(p1: Point3D, p2: Point3D, p3: Point3D): number {
  const v1 = {
    x: p2.x - p1.x,
    y: p2.y - p1.y,
    z: p2.z - p1.z,
  };

  const v2 = {
    x: p3.x - p1.x,
    y: p3.y - p1.y,
    z: p3.z - p1.z,
  };

  // Cross product
  const cross = {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x,
  };

  // Magnitude of cross product / 2
  const magnitude = Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z);
  return magnitude / 2;
}

/**
 * Calculate area of quadrilateral as sum of two triangles
 */
function calculateQuadArea3D(
  p1: Point3D,
  p2: Point3D,
  p3: Point3D,
  p4: Point3D
): number {
  const area1 = calculateTriangleArea3D(p1, p2, p3);
  const area2 = calculateTriangleArea3D(p1, p3, p4);
  return area1 + area2;
}

// ============================================================
// MESH QUALITY VALIDATION
// ============================================================

export interface MeshQuality {
  isValid: boolean;
  warnings: string[];
  aspectRatio: number;
  minAngle: number;
  maxAngle: number;
  jacobianOK: boolean;
}

/**
 * Validate mesh element quality
 * Checks aspect ratio, angles, and ensures no degenerate elements
 */
export function validateElementQuality(
  nodes: [Point3D, Point3D, Point3D, Point3D] | [Point3D, Point3D, Point3D]
): MeshQuality {
  const warnings: string[] = [];
  let isValid = true;

  if (nodes.length === 4) {
    // Quad element
    const [n1, n2, n3, n4] = nodes;

    // Calculate edge lengths
    const edge1 = distance3D(n1, n2);
    const edge2 = distance3D(n2, n3);
    const edge3 = distance3D(n3, n4);
    const edge4 = distance3D(n4, n1);

    const maxEdge = Math.max(edge1, edge2, edge3, edge4);
    const minEdge = Math.min(edge1, edge2, edge3, edge4);

    const aspectRatio = maxEdge / minEdge;

    if (aspectRatio > 10) {
      warnings.push(`High aspect ratio: ${aspectRatio.toFixed(1)}`);
    }

    // Calculate internal angles (approximate)
    const angles = [
      calculateAngle(n4, n1, n2),
      calculateAngle(n1, n2, n3),
      calculateAngle(n2, n3, n4),
      calculateAngle(n3, n4, n1),
    ];

    const minAngle = Math.min(...angles);
    const maxAngle = Math.max(...angles);

    if (minAngle < 30 || maxAngle > 150) {
      warnings.push(`Poor element angles: ${minAngle.toFixed(1)}° - ${maxAngle.toFixed(1)}°`);
    }

    // Check for degenerate element (area near zero)
    const area = calculateQuadArea3D(n1, n2, n3, n4);
    if (area < 1e-6) {
      isValid = false;
      warnings.push('Degenerate element (zero area)');
    }

    return {
      isValid,
      warnings,
      aspectRatio,
      minAngle,
      maxAngle,
      jacobianOK: area > 0,
    };
  } else {
    // Triangle element
    const [n1, n2, n3] = nodes;

    const edge1 = distance3D(n1, n2);
    const edge2 = distance3D(n2, n3);
    const edge3 = distance3D(n3, n1);

    const maxEdge = Math.max(edge1, edge2, edge3);
    const minEdge = Math.min(edge1, edge2, edge3);

    const aspectRatio = maxEdge / minEdge;

    if (aspectRatio > 10) {
      warnings.push(`High aspect ratio: ${aspectRatio.toFixed(1)}`);
    }

    const angles = [
      calculateAngle(n3, n1, n2),
      calculateAngle(n1, n2, n3),
      calculateAngle(n2, n3, n1),
    ];

    const minAngle = Math.min(...angles);
    const maxAngle = Math.max(...angles);

    if (minAngle < 20 || maxAngle > 140) {
      warnings.push(`Poor element angles: ${minAngle.toFixed(1)}° - ${maxAngle.toFixed(1)}°`);
    }

    const area = calculateTriangleArea3D(n1, n2, n3);
    if (area < 1e-6) {
      isValid = false;
      warnings.push('Degenerate element (zero area)');
    }

    return {
      isValid,
      warnings,
      aspectRatio,
      minAngle,
      maxAngle,
      jacobianOK: area > 0,
    };
  }
}

/**
 * Calculate angle at vertex B in triangle ABC
 * Returns angle in degrees
 */
function calculateAngle(a: Point3D, b: Point3D, c: Point3D): number {
  const ba = {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  };

  const bc = {
    x: c.x - b.x,
    y: c.y - b.y,
    z: c.z - b.z,
  };

  const dotProduct = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z;
  const magBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y + ba.z * ba.z);
  const magBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y + bc.z * bc.z);

  const cosAngle = dotProduct / (magBA * magBC);
  const angleRad = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
  return (angleRad * 180) / Math.PI;
}

// ============================================================
// CONVERT TO DATABASE ENTITIES
// ============================================================

/**
 * Convert mesh nodes to Node entities ready for database insertion
 */
export function createNodeEntities(
  meshNodes: MeshNode[],
  projectId: string,
  storyId: string
): CreateNodeInput[] {
  return meshNodes.map(node => ({
    project_id: projectId,
    story_id: storyId,
    x: node.x,
    y: node.y,
    z: node.z,
  }));
}

/**
 * Convert shell elements to ShellElement entities ready for database insertion
 */
export function createShellElementEntities(
  shellElements: (QuadElement | TriElement)[],
  parentId: string,
  parentType: 'wall' | 'slab',
  projectId: string,
  thickness: number,
  materialId: string | null
): CreateShellElementInput[] {
  return shellElements.map(element => {
    const isQuad = element.nodes.length === 4;

    return {
      project_id: projectId,
      parent_id: parentId,
      parent_type: parentType,
      element_type: isQuad ? ('quad' as const) : ('tri' as const),
      node_1_id: element.nodes[0],
      node_2_id: element.nodes[1],
      node_3_id: element.nodes[2],
      node_4_id: isQuad ? element.nodes[3] : undefined,
      thickness,
      material_id: materialId || undefined,
      local_axis_angle: 0,
    };
  });
}
