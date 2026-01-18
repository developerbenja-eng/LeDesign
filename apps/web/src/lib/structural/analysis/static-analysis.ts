/**
 * Static Analysis Engine using Direct Stiffness Method
 *
 * This implements a 3D frame analysis solver for beams, columns, and braces.
 * Uses the direct stiffness method with 6 DOF per node (3 translations, 3 rotations).
 */

import { getDb } from '@/lib/db/turso';
import {
  StructuralNode,
  Beam,
  Column,
  Brace,
  ShellElement,
  Material,
  Section,
  LoadCombination,
  NodeResult,
  MemberResult,
  ShellResult,
  nodeRowToNode,
  NodeRow,
  beamRowToBeam,
  BeamRow,
  columnRowToColumn,
  ColumnRow,
  braceRowToBrace,
  BraceRow,
  materialRowToMaterial,
  MaterialRow,
  sectionRowToSection,
  SectionRow,
  loadCombinationRowToLoadCombination,
  LoadCombinationRow,
} from '@/types/structural';
import { generateNodeResultId, generateMemberResultId } from '../factories';
import { buildShellStiffnessMatrix, recoverShellStresses } from './shell-element';
import { buildLoadVector } from './load-assembly';
import type { PointLoad, AreaLoad, MemberLoad } from '@/types/structural/loads';

// Matrix operations for stiffness method
type Matrix = number[][];
type Vector = number[];

// DOF per node (6 for 3D frame: Ux, Uy, Uz, Rx, Ry, Rz)
const DOF_PER_NODE = 6;

interface FrameElement {
  id: string;
  type: 'beam' | 'column' | 'brace';
  startNodeId: string;
  endNodeId: string;
  sectionId: string;
  materialId: string;
  length: number;
  startReleases: boolean[];
  endReleases: boolean[];
  localX: Vector;
  localY: Vector;
  localZ: Vector;
}

interface ShellElementData {
  id: string;
  nodeIds: string[]; // 3 or 4 node IDs
  thickness: number;
  materialId: string;
  elementType: 'tri3' | 'quad4';
  parentId: string; // ID of parent wall or slab (for matching area loads)
}

interface AnalysisModel {
  nodes: Map<string, StructuralNode>;
  elements: FrameElement[];
  shellElements: ShellElementData[];
  materials: Map<string, Material>;
  sections: Map<string, Section>;
  nodeIndexMap: Map<string, number>;
  totalDOF: number;
}

interface LoadVector {
  combinationId: string;
  forces: Vector;
}

interface AnalysisResults {
  displacements: Map<string, { combinationId: string; nodeId: string; values: Vector }[]>;
  reactions: Map<string, { combinationId: string; nodeId: string; values: Vector }[]>;
  memberForces: Map<string, { combinationId: string; elementId: string; stations: number[]; forces: number[][] }[]>;
}

/**
 * Create a zero matrix of given dimensions
 */
function zeroMatrix(rows: number, cols: number): Matrix {
  return Array(rows).fill(null).map(() => Array(cols).fill(0));
}

/**
 * Create a zero vector of given length
 */
function zeroVector(length: number): Vector {
  return Array(length).fill(0);
}

/**
 * Matrix multiplication
 */
function matMul(A: Matrix, B: Matrix): Matrix {
  const rowsA = A.length;
  const colsA = A[0].length;
  const colsB = B[0].length;
  const result = zeroMatrix(rowsA, colsB);

  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      for (let k = 0; k < colsA; k++) {
        result[i][j] += A[i][k] * B[k][j];
      }
    }
  }

  return result;
}

/**
 * Matrix transpose
 */
function transpose(A: Matrix): Matrix {
  const rows = A.length;
  const cols = A[0].length;
  const result = zeroMatrix(cols, rows);

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j][i] = A[i][j];
    }
  }

  return result;
}

/**
 * Matrix-vector multiplication
 */
function matVec(A: Matrix, v: Vector): Vector {
  const rows = A.length;
  const cols = A[0].length;
  const result = zeroVector(rows);

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[i] += A[i][j] * v[j];
    }
  }

  return result;
}

/**
 * Add matrix B to matrix A in place
 */
function addMatrixInPlace(A: Matrix, B: Matrix, rowOffset: number, colOffset: number): void {
  for (let i = 0; i < B.length; i++) {
    for (let j = 0; j < B[0].length; j++) {
      A[rowOffset + i][colOffset + j] += B[i][j];
    }
  }
}

/**
 * Calculate element length and direction cosines
 */
function calculateElementGeometry(
  startNode: StructuralNode,
  endNode: StructuralNode
): { length: number; localX: Vector; localY: Vector; localZ: Vector } {
  const dx = endNode.x - startNode.x;
  const dy = endNode.y - startNode.y;
  const dz = endNode.z - startNode.z;
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // Local x-axis along element
  const localX = [dx / length, dy / length, dz / length];

  // For local y and z, we need a reference vector
  // Use global Z if element is not vertical, otherwise use global X
  let refVector: Vector;
  if (Math.abs(localX[2]) < 0.999) {
    refVector = [0, 0, 1];
  } else {
    refVector = [1, 0, 0];
  }

  // Local z = localX cross refVector
  const localZ = [
    localX[1] * refVector[2] - localX[2] * refVector[1],
    localX[2] * refVector[0] - localX[0] * refVector[2],
    localX[0] * refVector[1] - localX[1] * refVector[0],
  ];
  const zLen = Math.sqrt(localZ[0] ** 2 + localZ[1] ** 2 + localZ[2] ** 2);
  localZ[0] /= zLen;
  localZ[1] /= zLen;
  localZ[2] /= zLen;

  // Local y = localZ cross localX
  const localY = [
    localZ[1] * localX[2] - localZ[2] * localX[1],
    localZ[2] * localX[0] - localZ[0] * localX[2],
    localZ[0] * localX[1] - localZ[1] * localX[0],
  ];

  return { length, localX, localY, localZ };
}

/**
 * Build transformation matrix from local to global coordinates
 */
function buildTransformationMatrix(
  localX: Vector,
  localY: Vector,
  localZ: Vector
): Matrix {
  // 12x12 transformation matrix for 6 DOF at each end
  const T = zeroMatrix(12, 12);

  // Rotation matrix (3x3)
  const R = [
    localX,
    localY,
    localZ,
  ];

  // Fill in the transformation matrix with 4 copies of R
  for (let block = 0; block < 4; block++) {
    const offset = block * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        T[offset + i][offset + j] = R[i][j];
      }
    }
  }

  return T;
}

/**
 * Build local stiffness matrix for a frame element
 */
function buildLocalStiffnessMatrix(
  E: number,
  G: number,
  A: number,
  Iy: number,
  Iz: number,
  J: number,
  L: number
): Matrix {
  const k = zeroMatrix(12, 12);

  // Axial stiffness
  const EA_L = E * A / L;
  k[0][0] = EA_L;
  k[0][6] = -EA_L;
  k[6][0] = -EA_L;
  k[6][6] = EA_L;

  // Torsional stiffness
  const GJ_L = G * J / L;
  k[3][3] = GJ_L;
  k[3][9] = -GJ_L;
  k[9][3] = -GJ_L;
  k[9][9] = GJ_L;

  // Bending in local xy plane (about z-axis)
  const EIz = E * Iz;
  const L2 = L * L;
  const L3 = L2 * L;
  k[1][1] = 12 * EIz / L3;
  k[1][5] = 6 * EIz / L2;
  k[1][7] = -12 * EIz / L3;
  k[1][11] = 6 * EIz / L2;
  k[5][1] = 6 * EIz / L2;
  k[5][5] = 4 * EIz / L;
  k[5][7] = -6 * EIz / L2;
  k[5][11] = 2 * EIz / L;
  k[7][1] = -12 * EIz / L3;
  k[7][5] = -6 * EIz / L2;
  k[7][7] = 12 * EIz / L3;
  k[7][11] = -6 * EIz / L2;
  k[11][1] = 6 * EIz / L2;
  k[11][5] = 2 * EIz / L;
  k[11][7] = -6 * EIz / L2;
  k[11][11] = 4 * EIz / L;

  // Bending in local xz plane (about y-axis)
  const EIy = E * Iy;
  k[2][2] = 12 * EIy / L3;
  k[2][4] = -6 * EIy / L2;
  k[2][8] = -12 * EIy / L3;
  k[2][10] = -6 * EIy / L2;
  k[4][2] = -6 * EIy / L2;
  k[4][4] = 4 * EIy / L;
  k[4][8] = 6 * EIy / L2;
  k[4][10] = 2 * EIy / L;
  k[8][2] = -12 * EIy / L3;
  k[8][4] = 6 * EIy / L2;
  k[8][8] = 12 * EIy / L3;
  k[8][10] = 6 * EIy / L2;
  k[10][2] = -6 * EIy / L2;
  k[10][4] = 2 * EIy / L;
  k[10][8] = 6 * EIy / L2;
  k[10][10] = 4 * EIy / L;

  return k;
}

/**
 * Apply releases to element stiffness matrix
 */
function applyReleases(
  k: Matrix,
  startReleases: boolean[],
  endReleases: boolean[]
): Matrix {
  // For released DOFs, we zero out the corresponding row and column
  // This is a simplified approach - full implementation would use static condensation
  const released = [...startReleases, ...endReleases];

  for (let i = 0; i < 12; i++) {
    if (released[i]) {
      for (let j = 0; j < 12; j++) {
        k[i][j] = 0;
        k[j][i] = 0;
      }
    }
  }

  return k;
}

/**
 * Solve linear system using Cholesky decomposition
 * For symmetric positive definite matrices
 */
function solveSystem(K: Matrix, F: Vector): Vector {
  const n = K.length;
  const L = zeroMatrix(n, n);

  // Cholesky decomposition: K = L * L^T
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = K[i][j];
      for (let k = 0; k < j; k++) {
        sum -= L[i][k] * L[j][k];
      }

      if (i === j) {
        if (sum <= 0) {
          // Matrix is not positive definite - add small value to diagonal
          L[i][j] = Math.sqrt(Math.max(sum, 1e-10));
        } else {
          L[i][j] = Math.sqrt(sum);
        }
      } else {
        L[i][j] = sum / L[j][j];
      }
    }
  }

  // Forward substitution: L * y = F
  const y = zeroVector(n);
  for (let i = 0; i < n; i++) {
    let sum = F[i];
    for (let j = 0; j < i; j++) {
      sum -= L[i][j] * y[j];
    }
    y[i] = sum / L[i][i];
  }

  // Back substitution: L^T * x = y
  const x = zeroVector(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = y[i];
    for (let j = i + 1; j < n; j++) {
      sum -= L[j][i] * x[j];
    }
    x[i] = sum / L[i][i];
  }

  return x;
}

/**
 * Build the analysis model from database
 */
async function buildModel(projectId: string): Promise<AnalysisModel> {
  const db = getDb();

  // Fetch nodes
  const nodesResult = await db.execute({
    sql: `SELECT * FROM nodes WHERE project_id = ?`,
    args: [projectId],
  });
  const nodes = new Map<string, StructuralNode>();
  const nodeIndexMap = new Map<string, number>();
  let nodeIndex = 0;

  for (const row of nodesResult.rows) {
    const node = nodeRowToNode(row as unknown as NodeRow);
    nodes.set(node.id, node);
    nodeIndexMap.set(node.id, nodeIndex++);
  }

  // Fetch materials
  const materialsResult = await db.execute({
    sql: `SELECT * FROM materials WHERE project_id = ? OR is_library = 1`,
    args: [projectId],
  });
  const materials = new Map<string, Material>();
  for (const row of materialsResult.rows) {
    const material = materialRowToMaterial(row as unknown as MaterialRow);
    materials.set(material.id, material);
  }

  // Fetch sections
  const sectionsResult = await db.execute({
    sql: `SELECT * FROM sections WHERE project_id = ? OR is_library = 1`,
    args: [projectId],
  });
  const sections = new Map<string, Section>();
  for (const row of sectionsResult.rows) {
    const section = sectionRowToSection(row as unknown as SectionRow);
    sections.set(section.id, section);
  }

  // Fetch frame elements
  const elements: FrameElement[] = [];

  // Beams
  const beamsResult = await db.execute({
    sql: `SELECT * FROM beams WHERE project_id = ?`,
    args: [projectId],
  });
  for (const row of beamsResult.rows) {
    const beam = beamRowToBeam(row as unknown as BeamRow);
    // Skip elements without required properties
    if (!beam.section_id || !beam.material_id) continue;
    const startNode = nodes.get(beam.node_i_id);
    const endNode = nodes.get(beam.node_j_id);

    if (startNode && endNode) {
      const geom = calculateElementGeometry(startNode, endNode);
      elements.push({
        id: beam.id,
        type: 'beam',
        startNodeId: beam.node_i_id,
        endNodeId: beam.node_j_id,
        sectionId: beam.section_id,
        materialId: beam.material_id,
        length: geom.length,
        startReleases: [
          beam.releases_i?.fx ?? false,
          beam.releases_i?.fy ?? false,
          beam.releases_i?.fz ?? false,
          beam.releases_i?.mx ?? false,
          beam.releases_i?.my ?? false,
          beam.releases_i?.mz ?? false,
        ],
        endReleases: [
          beam.releases_j?.fx ?? false,
          beam.releases_j?.fy ?? false,
          beam.releases_j?.fz ?? false,
          beam.releases_j?.mx ?? false,
          beam.releases_j?.my ?? false,
          beam.releases_j?.mz ?? false,
        ],
        localX: geom.localX,
        localY: geom.localY,
        localZ: geom.localZ,
      });
    }
  }

  // Columns
  const columnsResult = await db.execute({
    sql: `SELECT * FROM columns WHERE project_id = ?`,
    args: [projectId],
  });
  for (const row of columnsResult.rows) {
    const column = columnRowToColumn(row as unknown as ColumnRow);
    // Skip elements without required properties
    if (!column.section_id || !column.material_id) continue;
    const startNode = nodes.get(column.node_i_id);
    const endNode = nodes.get(column.node_j_id);

    if (startNode && endNode) {
      const geom = calculateElementGeometry(startNode, endNode);
      elements.push({
        id: column.id,
        type: 'column',
        startNodeId: column.node_i_id,
        endNodeId: column.node_j_id,
        sectionId: column.section_id,
        materialId: column.material_id,
        length: geom.length,
        startReleases: [
          column.releases_i?.fx ?? false,
          column.releases_i?.fy ?? false,
          column.releases_i?.fz ?? false,
          column.releases_i?.mx ?? false,
          column.releases_i?.my ?? false,
          column.releases_i?.mz ?? false,
        ],
        endReleases: [
          column.releases_j?.fx ?? false,
          column.releases_j?.fy ?? false,
          column.releases_j?.fz ?? false,
          column.releases_j?.mx ?? false,
          column.releases_j?.my ?? false,
          column.releases_j?.mz ?? false,
        ],
        localX: geom.localX,
        localY: geom.localY,
        localZ: geom.localZ,
      });
    }
  }

  // Braces
  const bracesResult = await db.execute({
    sql: `SELECT * FROM braces WHERE project_id = ?`,
    args: [projectId],
  });
  for (const row of bracesResult.rows) {
    const brace = braceRowToBrace(row as unknown as BraceRow);
    // Skip elements without required properties
    if (!brace.section_id || !brace.material_id) continue;
    const startNode = nodes.get(brace.node_i_id);
    const endNode = nodes.get(brace.node_j_id);

    if (startNode && endNode) {
      const geom = calculateElementGeometry(startNode, endNode);
      // Braces are typically pinned-pinned (moment releases at both ends)
      elements.push({
        id: brace.id,
        type: 'brace',
        startNodeId: brace.node_i_id,
        endNodeId: brace.node_j_id,
        sectionId: brace.section_id,
        materialId: brace.material_id,
        length: geom.length,
        startReleases: [false, false, false, true, true, true], // Pinned
        endReleases: [false, false, false, true, true, true],   // Pinned
        localX: geom.localX,
        localY: geom.localY,
        localZ: geom.localZ,
      });
    }
  }

  // Fetch shell elements
  const shellElements: ShellElementData[] = [];
  const shellResult = await db.execute({
    sql: `SELECT * FROM shell_elements WHERE project_id = ?`,
    args: [projectId],
  });

  for (const row of shellResult.rows) {
    const shell = row as any;
    // Skip elements without required properties
    if (!shell.material_id) continue;

    const nodeIds = [shell.node_1_id, shell.node_2_id, shell.node_3_id];
    if (shell.node_4_id) {
      nodeIds.push(shell.node_4_id);
    }

    // Verify all nodes exist
    const allNodesExist = nodeIds.every(id => nodes.has(id));
    if (!allNodesExist) continue;

    shellElements.push({
      id: shell.id,
      nodeIds,
      thickness: shell.thickness,
      materialId: shell.material_id,
      elementType: shell.element_type as 'tri3' | 'quad4',
      parentId: shell.parent_id,
    });
  }

  return {
    nodes,
    elements,
    shellElements,
    materials,
    sections,
    nodeIndexMap,
    totalDOF: nodes.size * DOF_PER_NODE,
  };
}

/**
 * Build global stiffness matrix
 */
function buildGlobalStiffnessMatrix(model: AnalysisModel): Matrix {
  const K = zeroMatrix(model.totalDOF, model.totalDOF);

  for (const element of model.elements) {
    const material = model.materials.get(element.materialId);
    const section = model.sections.get(element.sectionId);

    if (!material || !section) continue;

    const E = material.elastic_modulus;
    const G = material.shear_modulus || E / (2 * (1 + (material.poisson_ratio || 0.3)));
    const A = section.area ?? 1;
    const Iy = section.iy ?? 1;
    const Iz = section.iz ?? 1;
    const J = section.j ?? (Iy + Iz); // Approximate if not provided

    // Build local stiffness matrix
    let kLocal = buildLocalStiffnessMatrix(E, G, A, Iy, Iz, J, element.length);

    // Apply releases
    kLocal = applyReleases(kLocal, element.startReleases, element.endReleases);

    // Build transformation matrix
    const T = buildTransformationMatrix(element.localX, element.localY, element.localZ);
    const TT = transpose(T);

    // Transform to global: K_global = T^T * k_local * T
    const kGlobal = matMul(TT, matMul(kLocal, T));

    // Get DOF indices
    const startDOF = model.nodeIndexMap.get(element.startNodeId)! * DOF_PER_NODE;
    const endDOF = model.nodeIndexMap.get(element.endNodeId)! * DOF_PER_NODE;

    // Assemble into global stiffness matrix
    // Top-left block (start-start)
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        K[startDOF + i][startDOF + j] += kGlobal[i][j];
      }
    }
    // Top-right block (start-end)
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        K[startDOF + i][endDOF + j] += kGlobal[i][j + 6];
      }
    }
    // Bottom-left block (end-start)
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        K[endDOF + i][startDOF + j] += kGlobal[i + 6][j];
      }
    }
    // Bottom-right block (end-end)
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        K[endDOF + i][endDOF + j] += kGlobal[i + 6][j + 6];
      }
    }
  }

  // Assemble shell elements
  for (const shell of model.shellElements) {
    const material = model.materials.get(shell.materialId);
    if (!material) continue;

    // Get node coordinates
    const nodeCoords = shell.nodeIds.map(id => {
      const node = model.nodes.get(id)!;
      return { x: node.x, y: node.y, z: node.z };
    });

    // Build shell stiffness matrix (24×24 for quad, 18×18 for tri)
    if (shell.elementType === 'quad4' && nodeCoords.length === 4) {
      const Ke = buildShellStiffnessMatrix(
        nodeCoords,
        shell.thickness,
        material.elastic_modulus,
        material.poisson_ratio || 0.3
      );

      // Assemble into global matrix (4 nodes × 6 DOF each)
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          const nodeI = shell.nodeIds[i];
          const nodeJ = shell.nodeIds[j];
          const globalI = model.nodeIndexMap.get(nodeI)! * DOF_PER_NODE;
          const globalJ = model.nodeIndexMap.get(nodeJ)! * DOF_PER_NODE;

          // Copy 6×6 block from element matrix to global
          for (let m = 0; m < 6; m++) {
            for (let n = 0; n < 6; n++) {
              K[globalI + m][globalJ + n] += Ke[i * 6 + m][j * 6 + n];
            }
          }
        }
      }
    }
    // TODO: Add tri3 support
  }

  return K;
}

/**
 * Apply boundary conditions (modify stiffness matrix and load vector)
 */
function applyBoundaryConditions(
  K: Matrix,
  F: Vector,
  model: AnalysisModel
): { K: Matrix; F: Vector; restrainedDOFs: Set<number> } {
  const restrainedDOFs = new Set<number>();
  const n = K.length;

  // Apply restraints from nodes
  for (const [nodeId, node] of model.nodes) {
    const baseIndex = model.nodeIndexMap.get(nodeId)! * DOF_PER_NODE;
    const restraints = node.restraints;

    // Default to free if no restraints specified
    const dofRestraints = restraints
      ? [restraints.dx, restraints.dy, restraints.dz, restraints.rx, restraints.ry, restraints.rz]
      : [false, false, false, false, false, false];

    for (let i = 0; i < 6; i++) {
      if (dofRestraints[i]) {
        const dof = baseIndex + i;
        restrainedDOFs.add(dof);

        // Apply prescribed displacement if any
        const prescribed = [
          node.prescribed_displacements?.dx ?? 0,
          node.prescribed_displacements?.dy ?? 0,
          node.prescribed_displacements?.dz ?? 0,
          node.prescribed_displacements?.rx ?? 0,
          node.prescribed_displacements?.ry ?? 0,
          node.prescribed_displacements?.rz ?? 0,
        ];

        // Modify load vector for prescribed displacement
        if (prescribed[i] !== 0) {
          for (let j = 0; j < n; j++) {
            if (!restrainedDOFs.has(j)) {
              F[j] -= K[j][dof] * prescribed[i];
            }
          }
        }

        // Zero out row and column, set diagonal to 1
        for (let j = 0; j < n; j++) {
          K[dof][j] = 0;
          K[j][dof] = 0;
        }
        K[dof][dof] = 1;
        F[dof] = prescribed[i];
      }
    }
  }

  return { K, F, restrainedDOFs };
}

/**
 * Calculate member forces from displacements
 */
function calculateMemberForces(
  model: AnalysisModel,
  displacements: Vector
): Map<string, { stations: number[]; forces: number[][] }> {
  const memberForces = new Map<string, { stations: number[]; forces: number[][] }>();

  for (const element of model.elements) {
    const material = model.materials.get(element.materialId);
    const section = model.sections.get(element.sectionId);

    if (!material || !section) continue;

    const E = material.elastic_modulus;
    const G = material.shear_modulus || E / (2 * (1 + (material.poisson_ratio || 0.3)));
    const A = section.area ?? 1;
    const Iy = section.iy ?? 1;
    const Iz = section.iz ?? 1;
    const J = section.j ?? (Iy + Iz);

    // Build local stiffness matrix
    const kLocal = buildLocalStiffnessMatrix(E, G, A, Iy, Iz, J, element.length);

    // Build transformation matrix
    const T = buildTransformationMatrix(element.localX, element.localY, element.localZ);

    // Extract element displacements
    const startDOF = model.nodeIndexMap.get(element.startNodeId)! * DOF_PER_NODE;
    const endDOF = model.nodeIndexMap.get(element.endNodeId)! * DOF_PER_NODE;

    const dGlobal: Vector = [];
    for (let i = 0; i < 6; i++) {
      dGlobal.push(displacements[startDOF + i]);
    }
    for (let i = 0; i < 6; i++) {
      dGlobal.push(displacements[endDOF + i]);
    }

    // Transform to local coordinates
    const dLocal = matVec(T, dGlobal);

    // Calculate local forces: f = k * d
    const fLocal = matVec(kLocal, dLocal);

    // Store forces at stations (0, 0.25, 0.5, 0.75, 1.0)
    const stations = [0, 0.25, 0.5, 0.75, 1.0];
    const forces: number[][] = [];

    for (const station of stations) {
      // Interpolate forces along element
      // For now, use end forces (linear interpolation would be more accurate)
      const stationForces = [
        fLocal[0] * (1 - station) + fLocal[6] * station,  // Axial
        fLocal[1] * (1 - station) + fLocal[7] * station,  // Shear Y
        fLocal[2] * (1 - station) + fLocal[8] * station,  // Shear Z
        fLocal[3] * (1 - station) + fLocal[9] * station,  // Torsion
        fLocal[4] * (1 - station) + fLocal[10] * station, // Moment Y
        fLocal[5] * (1 - station) + fLocal[11] * station, // Moment Z
      ];
      forces.push(stationForces);
    }

    memberForces.set(element.id, { stations, forces });
  }

  return memberForces;
}

/**
 * Run static analysis for a project
 */
export async function runStaticAnalysis(
  projectId: string,
  analysisRunId: string,
  combinationIds: string[]
): Promise<void> {
  const db = getDb();

  try {
    // Update status to running
    await db.execute({
      sql: `UPDATE analysis_runs SET status = 'running', started_at = ? WHERE id = ?`,
      args: [new Date().toISOString(), analysisRunId],
    });

    // Build the model
    const model = await buildModel(projectId);

    if (model.nodes.size === 0) {
      throw new Error('No nodes in model');
    }

    if (model.elements.length === 0) {
      throw new Error('No elements in model');
    }

    // Build global stiffness matrix
    const K = buildGlobalStiffnessMatrix(model);

    // Fetch load combinations
    let combinations: LoadCombination[];
    if (combinationIds.length > 0) {
      const comboResult = await db.execute({
        sql: `SELECT * FROM load_combinations WHERE project_id = ? AND id IN (${combinationIds.map(() => '?').join(',')})`,
        args: [projectId, ...combinationIds],
      });
      combinations = comboResult.rows.map((row) =>
        loadCombinationRowToLoadCombination(row as unknown as LoadCombinationRow)
      );
    } else {
      const comboResult = await db.execute({
        sql: `SELECT * FROM load_combinations WHERE project_id = ?`,
        args: [projectId],
      });
      combinations = comboResult.rows.map((row) =>
        loadCombinationRowToLoadCombination(row as unknown as LoadCombinationRow)
      );
    }

    // For each combination, solve and store results
    for (const combination of combinations) {
      // Build load vector from all load cases in this combination
      let F = zeroVector(model.totalDOF);

      // Process each load case referenced in the combination
      for (const [loadCaseId, factor] of Object.entries(combination.factors)) {
        // Fetch nodal loads for this load case
        const nodalLoadsResult = await db.execute({
          sql: `SELECT * FROM nodal_loads WHERE load_case_id = ?`,
          args: [loadCaseId],
        });
        const nodalLoads = nodalLoadsResult.rows as unknown as PointLoad[];

        // Fetch area loads for this load case
        const areaLoadsResult = await db.execute({
          sql: `SELECT * FROM area_loads WHERE load_case_id = ?`,
          args: [loadCaseId],
        });
        const areaLoads = areaLoadsResult.rows as unknown as AreaLoad[];

        // Fetch member loads for this load case (TODO: implement member load distribution)
        const memberLoadsResult = await db.execute({
          sql: `SELECT * FROM member_loads WHERE load_case_id = ?`,
          args: [loadCaseId],
        });
        const memberLoads = memberLoadsResult.rows as unknown as MemberLoad[];

        // Build load vector for this load case with factor
        const F_case = buildLoadVector(
          nodalLoads,
          areaLoads,
          memberLoads,
          model.shellElements,
          model.nodes,
          model.nodeIndexMap,
          factor
        );

        // Add to total load vector
        for (let i = 0; i < F.length; i++) {
          F[i] += F_case[i];
        }
      }

      // Apply boundary conditions
      const { K: Kmod, F: Fmod, restrainedDOFs } = applyBoundaryConditions(
        JSON.parse(JSON.stringify(K)), // Deep copy
        [...F],
        model
      );

      // Solve system
      const displacements = solveSystem(Kmod, Fmod);

      // Calculate reactions
      const reactions = matVec(K, displacements);

      // Store node results
      for (const [nodeId] of model.nodes) {
        const baseIndex = model.nodeIndexMap.get(nodeId)! * DOF_PER_NODE;
        const hasRestraint = restrainedDOFs.has(baseIndex) || restrainedDOFs.has(baseIndex + 1);

        const nodeResult: NodeResult = {
          id: generateNodeResultId(),
          run_id: analysisRunId,
          combination_id: combination.id,
          node_id: nodeId,
          dx: displacements[baseIndex],
          dy: displacements[baseIndex + 1],
          dz: displacements[baseIndex + 2],
          rx: displacements[baseIndex + 3],
          ry: displacements[baseIndex + 4],
          rz: displacements[baseIndex + 5],
          reaction_fx: hasRestraint ? reactions[baseIndex] : null,
          reaction_fy: hasRestraint ? reactions[baseIndex + 1] : null,
          reaction_fz: hasRestraint ? reactions[baseIndex + 2] : null,
          reaction_mx: hasRestraint ? reactions[baseIndex + 3] : null,
          reaction_my: hasRestraint ? reactions[baseIndex + 4] : null,
          reaction_mz: hasRestraint ? reactions[baseIndex + 5] : null,
        };

        await db.execute({
          sql: `INSERT INTO node_results (
            id, run_id, combination_id, node_id,
            dx, dy, dz, rx, ry, rz,
            reaction_fx, reaction_fy, reaction_fz, reaction_mx, reaction_my, reaction_mz
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            nodeResult.id, nodeResult.run_id, nodeResult.combination_id, nodeResult.node_id,
            nodeResult.dx, nodeResult.dy, nodeResult.dz,
            nodeResult.rx, nodeResult.ry, nodeResult.rz,
            nodeResult.reaction_fx ?? null, nodeResult.reaction_fy ?? null, nodeResult.reaction_fz ?? null,
            nodeResult.reaction_mx ?? null, nodeResult.reaction_my ?? null, nodeResult.reaction_mz ?? null,
          ],
        });
      }

      // Calculate and store member forces
      const memberForces = calculateMemberForces(model, displacements);

      for (const [elementId, forces] of memberForces) {
        const element = model.elements.find(e => e.id === elementId);
        const memberType = element?.type || 'beam';

        // Create one MemberResult per station
        for (let i = 0; i < forces.stations.length; i++) {
          const memberResult: MemberResult = {
            id: generateMemberResultId(),
            run_id: analysisRunId,
            combination_id: combination.id,
            member_id: elementId,
            member_type: memberType,
            station: forces.stations[i],
            axial: forces.forces[i][0],
            shear_major: forces.forces[i][1],
            shear_minor: forces.forces[i][2],
            torsion: forces.forces[i][3],
            moment_major: forces.forces[i][4],
            moment_minor: forces.forces[i][5],
            deflection_major: null,
            deflection_minor: null,
          };

          await db.execute({
            sql: `INSERT INTO member_results (
              id, run_id, combination_id, member_id, member_type,
              station, axial, shear_major, shear_minor, torsion, moment_major, moment_minor,
              deflection_major, deflection_minor
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              memberResult.id, memberResult.run_id, memberResult.combination_id,
              memberResult.member_id, memberResult.member_type,
              memberResult.station, memberResult.axial,
              memberResult.shear_major, memberResult.shear_minor,
              memberResult.torsion, memberResult.moment_major,
              memberResult.moment_minor, memberResult.deflection_major ?? null, memberResult.deflection_minor ?? null,
            ],
          });
        }
      }

      // Calculate and store shell stresses
      for (const shell of model.shellElements) {
        if (shell.elementType !== 'quad4') continue; // Only quad4 supported for now

        const material = model.materials.get(shell.materialId);
        if (!material) continue;

        // Get node displacements for this shell element
        const nodeDisplacements: number[] = [];
        for (const nodeId of shell.nodeIds) {
          const baseIndex = model.nodeIndexMap.get(nodeId)! * DOF_PER_NODE;
          for (let i = 0; i < 6; i++) {
            nodeDisplacements.push(displacements[baseIndex + i]);
          }
        }

        // Get node coordinates
        const nodeCoords = shell.nodeIds.map(id => {
          const node = model.nodes.get(id)!;
          return { x: node.x, y: node.y, z: node.z };
        });

        // Recover stresses at element centroid
        const stresses = recoverShellStresses(
          shell.id,
          nodeDisplacements,
          nodeCoords,
          shell.thickness,
          material.elastic_modulus,
          material.poisson_ratio || 0.3
        );

        // Calculate principal values (simple approach)
        const f_avg = (stresses.f11 + stresses.f22) / 2;
        const f_diff = (stresses.f11 - stresses.f22) / 2;
        const f_radius = Math.sqrt(f_diff * f_diff + stresses.f12 * stresses.f12);
        const fmax = f_avg + f_radius;
        const fmin = f_avg - f_radius;

        const m_avg = (stresses.m11 + stresses.m22) / 2;
        const m_diff = (stresses.m11 - stresses.m22) / 2;
        const m_radius = Math.sqrt(m_diff * m_diff + stresses.m12 * stresses.m12);
        const mmax = m_avg + m_radius;
        const mmin = m_avg - m_radius;

        // Store shell result
        await db.execute({
          sql: `INSERT INTO shell_results (
            id, run_id, combination_id, element_id,
            f11, f22, f12, m11, m22, m12, v13, v23,
            fmax, fmin, mmax, mmin
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            stresses.id || `sr_${shell.id}_${combination.id}`,
            analysisRunId,
            combination.id,
            shell.id,
            stresses.f11,
            stresses.f22,
            stresses.f12,
            stresses.m11,
            stresses.m22,
            stresses.m12,
            stresses.v13,
            stresses.v23,
            fmax,
            fmin,
            mmax,
            mmin,
          ],
        });
      }
    }

    // Update status to completed
    await db.execute({
      sql: `UPDATE analysis_runs SET status = 'completed', completed_at = ? WHERE id = ?`,
      args: [new Date().toISOString(), analysisRunId],
    });
  } catch (error) {
    // Update status to failed
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await db.execute({
      sql: `UPDATE analysis_runs SET status = 'failed', error_message = ?, completed_at = ? WHERE id = ?`,
      args: [errorMessage, new Date().toISOString(), analysisRunId],
    });
    throw error;
  }
}
