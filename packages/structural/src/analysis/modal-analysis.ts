/**
 * Modal Analysis Engine
 *
 * Implements eigenvalue analysis to find natural frequencies and mode shapes.
 * Uses the inverse iteration method (power method) for eigenvalue extraction.
 */

import { getDb } from '@ledesign/db';
import {
  StructuralNode,
  Material,
  Section,
  ModalResult,
  ModeShape,
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
} from '../types';
import { generateModalResultId, generateModeShapeId } from '../factories';

type Matrix = number[][];
type Vector = number[];

const DOF_PER_NODE = 6;

interface FrameElement {
  id: string;
  type: 'beam' | 'column' | 'brace';
  startNodeId: string;
  endNodeId: string;
  sectionId: string;
  materialId: string;
  length: number;
  localX: Vector;
  localY: Vector;
  localZ: Vector;
}

interface AnalysisModel {
  nodes: Map<string, StructuralNode>;
  elements: FrameElement[];
  materials: Map<string, Material>;
  sections: Map<string, Section>;
  nodeIndexMap: Map<string, number>;
  totalDOF: number;
}

// Matrix utilities
function zeroMatrix(rows: number, cols: number): Matrix {
  return Array(rows).fill(null).map(() => Array(cols).fill(0));
}

function zeroVector(length: number): Vector {
  return Array(length).fill(0);
}

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

function dotProduct(a: Vector, b: Vector): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

function vectorNorm(v: Vector): number {
  return Math.sqrt(dotProduct(v, v));
}

function scaleVector(v: Vector, s: number): Vector {
  return v.map(x => x * s);
}

function subtractVectors(a: Vector, b: Vector): Vector {
  return a.map((x, i) => x - b[i]);
}

/**
 * Calculate element geometry
 */
function calculateElementGeometry(
  startNode: StructuralNode,
  endNode: StructuralNode
): { length: number; localX: Vector; localY: Vector; localZ: Vector } {
  const dx = endNode.x - startNode.x;
  const dy = endNode.y - startNode.y;
  const dz = endNode.z - startNode.z;
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

  const localX = [dx / length, dy / length, dz / length];

  let refVector: Vector;
  if (Math.abs(localX[2]) < 0.999) {
    refVector = [0, 0, 1];
  } else {
    refVector = [1, 0, 0];
  }

  const localZ = [
    localX[1] * refVector[2] - localX[2] * refVector[1],
    localX[2] * refVector[0] - localX[0] * refVector[2],
    localX[0] * refVector[1] - localX[1] * refVector[0],
  ];
  const zLen = Math.sqrt(localZ[0] ** 2 + localZ[1] ** 2 + localZ[2] ** 2);
  localZ[0] /= zLen;
  localZ[1] /= zLen;
  localZ[2] /= zLen;

  const localY = [
    localZ[1] * localX[2] - localZ[2] * localX[1],
    localZ[2] * localX[0] - localZ[0] * localX[2],
    localZ[0] * localX[1] - localZ[1] * localX[0],
  ];

  return { length, localX, localY, localZ };
}

/**
 * Build transformation matrix
 */
function buildTransformationMatrix(
  localX: Vector,
  localY: Vector,
  localZ: Vector
): Matrix {
  const T = zeroMatrix(12, 12);
  const R = [localX, localY, localZ];

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

  const EA_L = E * A / L;
  k[0][0] = EA_L;
  k[0][6] = -EA_L;
  k[6][0] = -EA_L;
  k[6][6] = EA_L;

  const GJ_L = G * J / L;
  k[3][3] = GJ_L;
  k[3][9] = -GJ_L;
  k[9][3] = -GJ_L;
  k[9][9] = GJ_L;

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
 * Build consistent mass matrix for a frame element
 */
function buildLocalMassMatrix(
  rho: number,
  A: number,
  L: number
): Matrix {
  const m = zeroMatrix(12, 12);
  const mL = rho * A * L;

  // Consistent mass matrix for frame element
  // Axial (translational) mass
  m[0][0] = mL / 3;
  m[0][6] = mL / 6;
  m[6][0] = mL / 6;
  m[6][6] = mL / 3;

  // Transverse (y-direction) consistent mass
  m[1][1] = 13 * mL / 35;
  m[1][5] = 11 * mL * L / 210;
  m[1][7] = 9 * mL / 70;
  m[1][11] = -13 * mL * L / 420;
  m[5][1] = 11 * mL * L / 210;
  m[5][5] = mL * L * L / 105;
  m[5][7] = 13 * mL * L / 420;
  m[5][11] = -mL * L * L / 140;
  m[7][1] = 9 * mL / 70;
  m[7][5] = 13 * mL * L / 420;
  m[7][7] = 13 * mL / 35;
  m[7][11] = -11 * mL * L / 210;
  m[11][1] = -13 * mL * L / 420;
  m[11][5] = -mL * L * L / 140;
  m[11][7] = -11 * mL * L / 210;
  m[11][11] = mL * L * L / 105;

  // Transverse (z-direction) consistent mass
  m[2][2] = 13 * mL / 35;
  m[2][4] = -11 * mL * L / 210;
  m[2][8] = 9 * mL / 70;
  m[2][10] = 13 * mL * L / 420;
  m[4][2] = -11 * mL * L / 210;
  m[4][4] = mL * L * L / 105;
  m[4][8] = -13 * mL * L / 420;
  m[4][10] = -mL * L * L / 140;
  m[8][2] = 9 * mL / 70;
  m[8][4] = -13 * mL * L / 420;
  m[8][8] = 13 * mL / 35;
  m[8][10] = 11 * mL * L / 210;
  m[10][2] = 13 * mL * L / 420;
  m[10][4] = -mL * L * L / 140;
  m[10][8] = 11 * mL * L / 210;
  m[10][10] = mL * L * L / 105;

  // Rotational inertia (torsion) - simplified
  m[3][3] = mL / 3;
  m[3][9] = mL / 6;
  m[9][3] = mL / 6;
  m[9][9] = mL / 3;

  return m;
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
      elements.push({
        id: brace.id,
        type: 'brace',
        startNodeId: brace.node_i_id,
        endNodeId: brace.node_j_id,
        sectionId: brace.section_id,
        materialId: brace.material_id,
        length: geom.length,
        localX: geom.localX,
        localY: geom.localY,
        localZ: geom.localZ,
      });
    }
  }

  return {
    nodes,
    elements,
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
    const J = section.j ?? (Iy + Iz);

    const kLocal = buildLocalStiffnessMatrix(E, G, A, Iy, Iz, J, element.length);
    const T = buildTransformationMatrix(element.localX, element.localY, element.localZ);
    const TT = transpose(T);
    const kGlobal = matMul(TT, matMul(kLocal, T));

    const startDOF = model.nodeIndexMap.get(element.startNodeId)! * DOF_PER_NODE;
    const endDOF = model.nodeIndexMap.get(element.endNodeId)! * DOF_PER_NODE;

    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        K[startDOF + i][startDOF + j] += kGlobal[i][j];
        K[startDOF + i][endDOF + j] += kGlobal[i][j + 6];
        K[endDOF + i][startDOF + j] += kGlobal[i + 6][j];
        K[endDOF + i][endDOF + j] += kGlobal[i + 6][j + 6];
      }
    }
  }

  return K;
}

/**
 * Build global mass matrix
 */
function buildGlobalMassMatrix(model: AnalysisModel): Matrix {
  const M = zeroMatrix(model.totalDOF, model.totalDOF);

  for (const element of model.elements) {
    const material = model.materials.get(element.materialId);
    const section = model.sections.get(element.sectionId);

    if (!material || !section) continue;

    const rho = material.density ?? 490; // Default to steel density (pcf)
    const A = section.area ?? 1;

    const mLocal = buildLocalMassMatrix(rho, A, element.length);
    const T = buildTransformationMatrix(element.localX, element.localY, element.localZ);
    const TT = transpose(T);
    const mGlobal = matMul(TT, matMul(mLocal, T));

    const startDOF = model.nodeIndexMap.get(element.startNodeId)! * DOF_PER_NODE;
    const endDOF = model.nodeIndexMap.get(element.endNodeId)! * DOF_PER_NODE;

    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        M[startDOF + i][startDOF + j] += mGlobal[i][j];
        M[startDOF + i][endDOF + j] += mGlobal[i][j + 6];
        M[endDOF + i][startDOF + j] += mGlobal[i + 6][j];
        M[endDOF + i][endDOF + j] += mGlobal[i + 6][j + 6];
      }
    }
  }

  // Add lumped nodal masses
  for (const [nodeId, node] of model.nodes) {
    if (node.mass) {
      const baseIndex = model.nodeIndexMap.get(nodeId)! * DOF_PER_NODE;
      M[baseIndex][baseIndex] += node.mass.massX ?? node.mass.mass ?? 0;
      M[baseIndex + 1][baseIndex + 1] += node.mass.massY ?? node.mass.mass ?? 0;
      M[baseIndex + 2][baseIndex + 2] += node.mass.massZ ?? node.mass.mass ?? 0;
      M[baseIndex + 3][baseIndex + 3] += node.mass.inertiaX ?? 0;
      M[baseIndex + 4][baseIndex + 4] += node.mass.inertiaY ?? 0;
      M[baseIndex + 5][baseIndex + 5] += node.mass.inertiaZ ?? 0;
    }
  }

  return M;
}

/**
 * Apply boundary conditions to matrices
 */
function applyBoundaryConditions(
  K: Matrix,
  M: Matrix,
  model: AnalysisModel
): { K: Matrix; M: Matrix; freeDOFs: number[]; restrainedDOFs: number[] } {
  const restrainedDOFs: number[] = [];
  const freeDOFs: number[] = [];

  for (const [nodeId, node] of model.nodes) {
    const baseIndex = model.nodeIndexMap.get(nodeId)! * DOF_PER_NODE;
    const restraints = node.restraints;

    // Default to free if no restraints specified
    const dofRestraints = restraints
      ? [restraints.dx, restraints.dy, restraints.dz, restraints.rx, restraints.ry, restraints.rz]
      : [false, false, false, false, false, false];

    for (let i = 0; i < 6; i++) {
      if (dofRestraints[i]) {
        restrainedDOFs.push(baseIndex + i);
      } else {
        freeDOFs.push(baseIndex + i);
      }
    }
  }

  // Create reduced matrices (only free DOFs)
  const n = freeDOFs.length;
  const Kred = zeroMatrix(n, n);
  const Mred = zeroMatrix(n, n);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      Kred[i][j] = K[freeDOFs[i]][freeDOFs[j]];
      Mred[i][j] = M[freeDOFs[i]][freeDOFs[j]];
    }
  }

  return { K: Kred, M: Mred, freeDOFs, restrainedDOFs };
}

/**
 * Cholesky decomposition for positive definite matrix
 */
function choleskyDecomposition(A: Matrix): Matrix {
  const n = A.length;
  const L = zeroMatrix(n, n);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = A[i][j];
      for (let k = 0; k < j; k++) {
        sum -= L[i][k] * L[j][k];
      }

      if (i === j) {
        L[i][j] = Math.sqrt(Math.max(sum, 1e-10));
      } else {
        L[i][j] = sum / L[j][j];
      }
    }
  }

  return L;
}

/**
 * Solve L * L^T * x = b using forward and back substitution
 */
function solveLLT(L: Matrix, b: Vector): Vector {
  const n = L.length;

  // Forward substitution: L * y = b
  const y = zeroVector(n);
  for (let i = 0; i < n; i++) {
    let sum = b[i];
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
 * Inverse iteration method for eigenvalue extraction
 * Solves the generalized eigenvalue problem: K * phi = lambda * M * phi
 */
function inverseIteration(
  K: Matrix,
  M: Matrix,
  numModes: number,
  tolerance: number = 1e-8,
  maxIterations: number = 100
): { eigenvalues: number[]; eigenvectors: Vector[] } {
  const n = K.length;
  const eigenvalues: number[] = [];
  const eigenvectors: Vector[] = [];

  // Cholesky decomposition of K
  const L = choleskyDecomposition(K);

  for (let mode = 0; mode < numModes; mode++) {
    // Initial guess (random vector)
    let phi = Array(n).fill(0).map(() => Math.random() - 0.5);
    let lambda = 0;

    for (let iter = 0; iter < maxIterations; iter++) {
      // Orthogonalize against previously found modes
      for (let i = 0; i < mode; i++) {
        const dot = dotProduct(matVec(M, phi), eigenvectors[i]);
        phi = subtractVectors(phi, scaleVector(eigenvectors[i], dot));
      }

      // Normalize with respect to M: phi^T * M * phi = 1
      const Mphi = matVec(M, phi);
      const scale = Math.sqrt(dotProduct(phi, Mphi));
      if (scale < 1e-15) break;
      phi = scaleVector(phi, 1 / scale);

      // Solve K * phi_new = M * phi
      const rhs = matVec(M, phi);
      const phiNew = solveLLT(L, rhs);

      // Calculate eigenvalue: lambda = phi^T * K * phi / (phi^T * M * phi)
      const KphiNew = matVec(K, phiNew);
      const MphiNew = matVec(M, phiNew);
      const lambdaNew = dotProduct(phiNew, KphiNew) / dotProduct(phiNew, MphiNew);

      // Check convergence
      if (Math.abs(lambdaNew - lambda) / Math.max(Math.abs(lambdaNew), 1) < tolerance) {
        lambda = lambdaNew;
        phi = phiNew;
        break;
      }

      lambda = lambdaNew;
      phi = phiNew;
    }

    // Normalize final eigenvector
    const Mphi = matVec(M, phi);
    const scale = Math.sqrt(dotProduct(phi, Mphi));
    phi = scaleVector(phi, 1 / scale);

    eigenvalues.push(lambda);
    eigenvectors.push(phi);
  }

  return { eigenvalues, eigenvectors };
}

/**
 * Calculate modal participation factors
 */
function calculateParticipationFactors(
  eigenvectors: Vector[],
  M: Matrix,
  totalMass: { x: number; y: number; z: number },
  freeDOFs: number[]
): { x: number; y: number; z: number }[] {
  const participationFactors: { x: number; y: number; z: number }[] = [];

  for (const phi of eigenvectors) {
    // Effective modal mass in each direction
    const Mphi = matVec(M, phi);

    // Sum up translational DOFs
    let Lx = 0, Ly = 0, Lz = 0;
    let mn = dotProduct(phi, Mphi); // Modal mass

    for (let i = 0; i < freeDOFs.length; i++) {
      const dof = freeDOFs[i] % 6; // Local DOF within node
      if (dof === 0) Lx += Mphi[i]; // X translation
      else if (dof === 1) Ly += Mphi[i]; // Y translation
      else if (dof === 2) Lz += Mphi[i]; // Z translation
    }

    // Mass participation = L^2 / (mn * total_mass)
    participationFactors.push({
      x: totalMass.x > 0 ? (Lx * Lx) / (mn * totalMass.x) * 100 : 0,
      y: totalMass.y > 0 ? (Ly * Ly) / (mn * totalMass.y) * 100 : 0,
      z: totalMass.z > 0 ? (Lz * Lz) / (mn * totalMass.z) * 100 : 0,
    });
  }

  return participationFactors;
}

/**
 * Run modal analysis for a project
 */
export async function runModalAnalysis(
  projectId: string,
  analysisRunId: string,
  settings: { numModes?: number; tolerance?: number } = {}
): Promise<void> {
  const db = getDb();
  const numModes = settings.numModes || 12;
  const tolerance = settings.tolerance || 1e-8;

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

    // Build global matrices
    const K = buildGlobalStiffnessMatrix(model);
    const M = buildGlobalMassMatrix(model);

    // Apply boundary conditions
    const { K: Kred, M: Mred, freeDOFs, restrainedDOFs } = applyBoundaryConditions(K, M, model);

    if (freeDOFs.length === 0) {
      throw new Error('All DOFs are restrained');
    }

    // Limit number of modes to available DOFs
    const actualNumModes = Math.min(numModes, freeDOFs.length);

    // Solve eigenvalue problem
    const { eigenvalues, eigenvectors } = inverseIteration(Kred, Mred, actualNumModes, tolerance);

    // Calculate total mass
    let totalMassX = 0, totalMassY = 0, totalMassZ = 0;
    for (let i = 0; i < Mred.length; i++) {
      const dof = freeDOFs[i] % 6;
      if (dof === 0) totalMassX += Mred[i][i];
      else if (dof === 1) totalMassY += Mred[i][i];
      else if (dof === 2) totalMassZ += Mred[i][i];
    }

    // Calculate participation factors
    const participationFactors = calculateParticipationFactors(
      eigenvectors,
      Mred,
      { x: totalMassX, y: totalMassY, z: totalMassZ },
      freeDOFs
    );

    // Store modal results
    for (let i = 0; i < eigenvalues.length; i++) {
      const omega = Math.sqrt(Math.max(eigenvalues[i], 0)); // rad/s
      const frequency = omega / (2 * Math.PI); // Hz
      const period = frequency > 0 ? 1 / frequency : 0; // seconds

      // Calculate cumulative participation
      let cumX = 0, cumY = 0, cumZ = 0;
      for (let j = 0; j <= i; j++) {
        cumX += participationFactors[j].x;
        cumY += participationFactors[j].y;
        cumZ += participationFactors[j].z;
      }

      // Calculate effective modal mass (sum of participation factors)
      const modalMass = (participationFactors[i].x + participationFactors[i].y + participationFactors[i].z) / 3;

      const modalResult: ModalResult = {
        id: generateModalResultId(),
        run_id: analysisRunId,
        mode_number: i + 1,
        frequency: frequency,
        period: period,
        circular_frequency: omega,
        mass_participation_x: participationFactors[i].x,
        mass_participation_y: participationFactors[i].y,
        mass_participation_z: participationFactors[i].z,
        mass_participation_rx: 0, // TODO: Calculate rotational participation
        mass_participation_ry: 0,
        mass_participation_rz: 0,
        // Backwards compatibility aliases
        participation_x: participationFactors[i].x,
        participation_y: participationFactors[i].y,
        participation_z: participationFactors[i].z,
        mass_ratio_x: participationFactors[i].x,
        mass_ratio_y: participationFactors[i].y,
        mass_ratio_z: participationFactors[i].z,
        cumulative_x: cumX,
        cumulative_y: cumY,
        cumulative_z: cumZ,
        cumulative_mass_x: cumX,
        cumulative_mass_y: cumY,
        cumulative_mass_z: cumZ,
        modal_mass: modalMass,
        created_at: new Date().toISOString(),
      };

      await db.execute({
        sql: `INSERT INTO modal_results (
          id, run_id, mode_number, frequency, period, circular_frequency,
          mass_participation_x, mass_participation_y, mass_participation_z,
          mass_participation_rx, mass_participation_ry, mass_participation_rz,
          cumulative_x, cumulative_y, cumulative_z, modal_mass, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          modalResult.id, modalResult.run_id, modalResult.mode_number,
          modalResult.frequency, modalResult.period, modalResult.circular_frequency,
          modalResult.mass_participation_x, modalResult.mass_participation_y, modalResult.mass_participation_z,
          modalResult.mass_participation_rx, modalResult.mass_participation_ry, modalResult.mass_participation_rz,
          modalResult.cumulative_x, modalResult.cumulative_y, modalResult.cumulative_z,
          modalResult.modal_mass, modalResult.created_at,
        ],
      });

      // Store mode shape (nodal displacements)
      const fullModeShape = zeroVector(model.totalDOF);
      for (let j = 0; j < freeDOFs.length; j++) {
        fullModeShape[freeDOFs[j]] = eigenvectors[i][j];
      }

      for (const [nodeId] of model.nodes) {
        const baseIndex = model.nodeIndexMap.get(nodeId)! * DOF_PER_NODE;

        const modeShape: ModeShape = {
          id: generateModeShapeId(),
          modal_result_id: modalResult.id,
          node_id: nodeId,
          dx: fullModeShape[baseIndex],
          dy: fullModeShape[baseIndex + 1],
          dz: fullModeShape[baseIndex + 2],
          rx: fullModeShape[baseIndex + 3],
          ry: fullModeShape[baseIndex + 4],
          rz: fullModeShape[baseIndex + 5],
        };

        await db.execute({
          sql: `INSERT INTO mode_shapes (
            id, modal_result_id, node_id, dx, dy, dz, rx, ry, rz
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            modeShape.id, modeShape.modal_result_id, modeShape.node_id,
            modeShape.dx, modeShape.dy, modeShape.dz,
            modeShape.rx, modeShape.ry, modeShape.rz,
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
