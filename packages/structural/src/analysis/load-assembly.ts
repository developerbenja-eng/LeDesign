// ============================================================
// LOAD ASSEMBLY
// Convert area loads and member loads to nodal forces for FEM analysis
// ============================================================

import type {
  MemberLoad,
  PointLoad,
  AreaLoad,
} from '../types/loads';
import type { LoadDirection } from '@/types/structural/core';
import type { StructuralNode } from '@/types/structural/elements';

// ============================================================
// TYPES
// ============================================================

interface NodeCoords {
  x: number;
  y: number;
  z: number;
}

export interface NodalForce {
  nodeId: string;
  fx: number;
  fy: number;
  fz: number;
  mx: number;
  my: number;
  mz: number;
}

interface ShellElementData {
  id: string;
  nodeIds: string[]; // 3 or 4 node IDs
  thickness: number;
  materialId: string;
  elementType: 'tri3' | 'quad4';
  parentId?: string; // ID of parent wall or slab (for matching area loads)
}

// ============================================================
// VECTOR UTILITIES
// ============================================================

function vectorSubtract(v1: NodeCoords, v2: NodeCoords): NodeCoords {
  return {
    x: v1.x - v2.x,
    y: v1.y - v2.y,
    z: v1.z - v2.z,
  };
}

function vectorCross(v1: NodeCoords, v2: NodeCoords): NodeCoords {
  return {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x,
  };
}

function vectorLength(v: NodeCoords): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function vectorNormalize(v: NodeCoords): NodeCoords {
  const len = vectorLength(v);
  if (len < 1e-10) return { x: 0, y: 0, z: 1 };
  return {
    x: v.x / len,
    y: v.y / len,
    z: v.z / len,
  };
}

// ============================================================
// AREA CALCULATION
// ============================================================

/**
 * Calculate area of quadrilateral using cross product method
 */
function calculateQuadArea(coords: [NodeCoords, NodeCoords, NodeCoords, NodeCoords]): number {
  const [n1, n2, n3, n4] = coords;

  // Split quad into two triangles: (1,2,3) and (1,3,4)
  const v12 = vectorSubtract(n2, n1);
  const v13 = vectorSubtract(n3, n1);
  const cross1 = vectorCross(v12, v13);
  const area1 = vectorLength(cross1) / 2;

  const v34 = vectorSubtract(n4, n3);
  const v31 = vectorSubtract(n1, n3);
  const cross2 = vectorCross(v34, v31);
  const area2 = vectorLength(cross2) / 2;

  return area1 + area2;
}

/**
 * Calculate area of triangle
 */
function calculateTriArea(coords: [NodeCoords, NodeCoords, NodeCoords]): number {
  const [n1, n2, n3] = coords;

  const v12 = vectorSubtract(n2, n1);
  const v13 = vectorSubtract(n3, n1);
  const cross = vectorCross(v12, v13);

  return vectorLength(cross) / 2;
}

// ============================================================
// LOAD DIRECTION CONVERSION
// ============================================================

/**
 * Get load direction vector from LoadDirection enum
 */
function getDirectionVector(direction: LoadDirection, isGlobal: boolean): NodeCoords {
  switch (direction) {
    case 'x':
    case 'local_x':
      return { x: 1, y: 0, z: 0 };
    case 'y':
    case 'local_y':
      return { x: 0, y: 1, z: 0 };
    case 'z':
    case 'local_z':
      return { x: 0, y: 0, z: 1 };
    case 'gravity':
      return { x: 0, y: 0, z: -1 }; // Downward
    default:
      return { x: 0, y: 0, z: -1 }; // Default to gravity
  }
}

/**
 * Get element normal vector (average of corner normals)
 */
function getElementNormal(coords: NodeCoords[]): NodeCoords {
  if (coords.length === 4) {
    // Quad: use two diagonals
    const v13 = vectorSubtract(coords[2], coords[0]);
    const v24 = vectorSubtract(coords[3], coords[1]);
    const normal = vectorCross(v13, v24);
    return vectorNormalize(normal);
  } else if (coords.length === 3) {
    // Triangle: use two edges
    const v12 = vectorSubtract(coords[1], coords[0]);
    const v13 = vectorSubtract(coords[2], coords[0]);
    const normal = vectorCross(v12, v13);
    return vectorNormalize(normal);
  }

  return { x: 0, y: 0, z: 1 }; // Default upward
}

// ============================================================
// AREA LOAD DISTRIBUTION
// ============================================================

/**
 * Distribute uniform area load to shell element nodes
 *
 * Simple approach: Total force = load intensity × area, distribute equally to nodes
 *
 * @param shellElement - Shell element to apply load to
 * @param nodeCoords - Node coordinates in order [n1, n2, n3, n4?]
 * @param loadIntensity - Load intensity (force per unit area), positive = in direction
 * @param direction - Load direction
 * @param isGlobal - Whether direction is in global coordinates
 * @returns Map of node ID to force components
 */
export function distributeAreaLoad(
  shellElement: ShellElementData,
  nodeCoords: NodeCoords[],
  loadIntensity: number,
  direction: LoadDirection,
  isGlobal: boolean
): Map<string, NodalForce> {
  const { nodeIds, elementType } = shellElement;

  // Calculate element area
  let area: number;
  if (elementType === 'quad4' && nodeCoords.length === 4) {
    area = calculateQuadArea(nodeCoords as [NodeCoords, NodeCoords, NodeCoords, NodeCoords]);
  } else if (elementType === 'tri3' && nodeCoords.length === 3) {
    area = calculateTriArea(nodeCoords as [NodeCoords, NodeCoords, NodeCoords]);
  } else {
    throw new Error(`Invalid element type or node count: ${elementType}, ${nodeCoords.length} nodes`);
  }

  // Total force on element
  const totalForce = Math.abs(loadIntensity) * area;

  // Get load direction vector
  let directionVector: NodeCoords;
  if (isGlobal) {
    directionVector = getDirectionVector(direction, true);
  } else {
    // Local direction: normal to element
    directionVector = getElementNormal(nodeCoords);
  }

  // Apply load sign
  if (loadIntensity < 0) {
    directionVector = {
      x: -directionVector.x,
      y: -directionVector.y,
      z: -directionVector.z,
    };
  }

  // Distribute force equally to nodes (simple approach)
  // TODO: Use consistent load vector (shape function integration) for more accuracy
  const forcePerNode = totalForce / nodeIds.length;
  const fx = forcePerNode * directionVector.x;
  const fy = forcePerNode * directionVector.y;
  const fz = forcePerNode * directionVector.z;

  const nodalForces = new Map<string, NodalForce>();
  for (const nodeId of nodeIds) {
    nodalForces.set(nodeId, {
      nodeId,
      fx,
      fy,
      fz,
      mx: 0, // No moments from area load (simple approach)
      my: 0,
      mz: 0,
    });
  }

  return nodalForces;
}

// ============================================================
// LOAD VECTOR ASSEMBLY
// ============================================================

/**
 * Build global load vector from all loads in a load case
 *
 * @param nodalLoads - Direct nodal loads
 * @param areaLoads - Area loads on shell elements
 * @param memberLoads - Distributed loads on frame elements (not implemented yet)
 * @param shellElements - Shell element data
 * @param nodes - Map of all nodes
 * @param nodeIndexMap - Map of node ID to global DOF index
 * @param factor - Load case factor from combination
 * @returns Global load vector
 */
export function buildLoadVector(
  nodalLoads: PointLoad[],
  areaLoads: AreaLoad[],
  memberLoads: MemberLoad[],
  shellElements: ShellElementData[],
  nodes: Map<string, StructuralNode>,
  nodeIndexMap: Map<string, number>,
  factor: number = 1.0
): number[] {
  const DOF_PER_NODE = 6;
  const totalDOF = nodes.size * DOF_PER_NODE;
  const F = new Array(totalDOF).fill(0);

  // 1. Apply nodal loads directly
  for (const nodalLoad of nodalLoads) {
    const nodeIndex = nodeIndexMap.get(nodalLoad.node_id);
    if (nodeIndex === undefined) continue;

    const baseIndex = nodeIndex * DOF_PER_NODE;

    F[baseIndex + 0] += (nodalLoad.fx ?? 0) * factor;
    F[baseIndex + 1] += (nodalLoad.fy ?? 0) * factor;
    F[baseIndex + 2] += (nodalLoad.fz ?? 0) * factor;
    F[baseIndex + 3] += (nodalLoad.mx ?? 0) * factor;
    F[baseIndex + 4] += (nodalLoad.my ?? 0) * factor;
    F[baseIndex + 5] += (nodalLoad.mz ?? 0) * factor;
  }

  // 2. Apply area loads to shell elements
  for (const areaLoad of areaLoads) {
    // Find all shell elements belonging to this wall/slab
    // AreaLoad.element_id is the wall/slab ID
    // ShellElement.parentId should match this
    const elementsForLoad = shellElements.filter(
      se => se.parentId === areaLoad.element_id
    );

    for (const shell of elementsForLoad) {
      // Get node coordinates
      const nodeCoords = shell.nodeIds
        .map(id => {
          const node = nodes.get(id);
          if (!node) return null;
          return { x: node.x, y: node.y, z: node.z };
        })
        .filter((c): c is NodeCoords => c !== null);

      if (nodeCoords.length !== shell.nodeIds.length) {
        continue; // Skip if any nodes are missing
      }

      // Distribute area load to nodes
      const nodalForces = distributeAreaLoad(
        shell,
        nodeCoords,
        areaLoad.value,
        areaLoad.direction,
        areaLoad.is_global
      );

      // Add to global load vector
      for (const [nodeId, forces] of nodalForces) {
        const nodeIndex = nodeIndexMap.get(nodeId);
        if (nodeIndex === undefined) continue;

        const baseIndex = nodeIndex * DOF_PER_NODE;

        F[baseIndex + 0] += forces.fx * factor;
        F[baseIndex + 1] += forces.fy * factor;
        F[baseIndex + 2] += forces.fz * factor;
        F[baseIndex + 3] += forces.mx * factor;
        F[baseIndex + 4] += forces.my * factor;
        F[baseIndex + 5] += forces.mz * factor;
      }
    }
  }

  // 3. Apply member loads to frame elements (TODO)
  // This requires converting distributed loads to equivalent nodal loads
  // using fixed-end force calculations

  return F;
}

/**
 * Accumulate nodal forces from multiple sources
 * Helper function to sum forces on the same node
 */
export function accumulateNodalForces(
  existingForces: Map<string, NodalForce>,
  newForces: Map<string, NodalForce>
): Map<string, NodalForce> {
  const result = new Map(existingForces);

  for (const [nodeId, forces] of newForces) {
    const existing = result.get(nodeId);
    if (existing) {
      result.set(nodeId, {
        nodeId,
        fx: existing.fx + forces.fx,
        fy: existing.fy + forces.fy,
        fz: existing.fz + forces.fz,
        mx: existing.mx + forces.mx,
        my: existing.my + forces.my,
        mz: existing.mz + forces.mz,
      });
    } else {
      result.set(nodeId, forces);
    }
  }

  return result;
}
