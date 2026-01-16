// ============================================================
// SHELL ELEMENT FORMULATION
// Quad4 isoparametric shell element with membrane + bending
// Uses local coordinate system approach
// ============================================================

type Matrix = number[][];
type Vector = number[];

interface NodeCoords {
  x: number;
  y: number;
  z: number;
}

interface ShellResult {
  id: string;
  element_id: string;
  // Membrane forces (N/mm or kN/m)
  f11: number;  // Normal force in local x
  f22: number;  // Normal force in local y
  f12: number;  // Shear force in-plane
  // Bending moments (N·mm/mm or kN·m/m)
  m11: number;  // Moment about local x
  m22: number;  // Moment about local y
  m12: number;  // Twisting moment
  // Transverse shears (N/mm or kN/m)
  v13: number;  // Shear in xz plane
  v23: number;  // Shear in yz plane
}

interface LocalCoordSystem {
  origin: NodeCoords;
  ex: NodeCoords;  // Local x-axis unit vector
  ey: NodeCoords;  // Local y-axis unit vector
  ez: NodeCoords;  // Local z-axis unit vector (normal)
}

// ============================================================
// VECTOR UTILITIES
// ============================================================

function vectorSubtract(a: NodeCoords, b: NodeCoords): NodeCoords {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vectorAdd(a: NodeCoords, b: NodeCoords): NodeCoords {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function vectorScale(v: NodeCoords, s: number): NodeCoords {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function vectorMagnitude(v: NodeCoords): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function vectorNormalize(v: NodeCoords): NodeCoords {
  const mag = vectorMagnitude(v);
  if (mag < 1e-10) return { x: 0, y: 0, z: 0 };
  return vectorScale(v, 1 / mag);
}

function vectorDot(a: NodeCoords, b: NodeCoords): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function vectorCross(a: NodeCoords, b: NodeCoords): NodeCoords {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

// ============================================================
// LOCAL COORDINATE SYSTEM
// ============================================================

/**
 * Establish local coordinate system for shell element
 * Origin at element centroid, ez normal to surface, ex and ey in plane
 */
export function buildLocalCoordSystem(nodeCoords: NodeCoords[]): LocalCoordSystem {
  // Centroid as origin
  const origin = {
    x: (nodeCoords[0].x + nodeCoords[1].x + nodeCoords[2].x + nodeCoords[3].x) / 4,
    y: (nodeCoords[0].y + nodeCoords[1].y + nodeCoords[2].y + nodeCoords[3].y) / 4,
    z: (nodeCoords[0].z + nodeCoords[1].z + nodeCoords[2].z + nodeCoords[3].z) / 4,
  };

  // Approximate normal using cross product of diagonals
  const v13 = vectorSubtract(nodeCoords[2], nodeCoords[0]);
  const v24 = vectorSubtract(nodeCoords[3], nodeCoords[1]);
  const ez = vectorNormalize(vectorCross(v13, v24));

  // Local x-axis: direction from node 1 to node 2, projected onto element plane
  const v12 = vectorSubtract(nodeCoords[1], nodeCoords[0]);
  const v12_proj = vectorSubtract(v12, vectorScale(ez, vectorDot(v12, ez)));
  const ex = vectorNormalize(v12_proj);

  // Local y-axis: perpendicular to ex and ez
  const ey = vectorCross(ez, ex);

  return { origin, ex, ey, ez };
}

/**
 * Transform global coordinates to local coordinate system
 */
export function globalToLocal(global: NodeCoords, localSystem: LocalCoordSystem): NodeCoords {
  const relative = vectorSubtract(global, localSystem.origin);
  return {
    x: vectorDot(relative, localSystem.ex),
    y: vectorDot(relative, localSystem.ey),
    z: vectorDot(relative, localSystem.ez),
  };
}

/**
 * Build transformation matrix from local to global DOFs (6×6 for one node)
 */
export function buildTransformationMatrix(localSystem: LocalCoordSystem): Matrix {
  const T = Array(6).fill(null).map(() => Array(6).fill(0));

  // Translation DOFs (first 3×3 block)
  T[0][0] = localSystem.ex.x;
  T[0][1] = localSystem.ey.x;
  T[0][2] = localSystem.ez.x;
  T[1][0] = localSystem.ex.y;
  T[1][1] = localSystem.ey.y;
  T[1][2] = localSystem.ez.y;
  T[2][0] = localSystem.ex.z;
  T[2][1] = localSystem.ey.z;
  T[2][2] = localSystem.ez.z;

  // Rotation DOFs (second 3×3 block - same transformation)
  T[3][3] = localSystem.ex.x;
  T[3][4] = localSystem.ey.x;
  T[3][5] = localSystem.ez.x;
  T[4][3] = localSystem.ex.y;
  T[4][4] = localSystem.ey.y;
  T[4][5] = localSystem.ez.y;
  T[5][3] = localSystem.ex.z;
  T[5][4] = localSystem.ey.z;
  T[5][5] = localSystem.ez.z;

  return T;
}

// ============================================================
// SHAPE FUNCTIONS
// ============================================================

/**
 * Quad4 shape functions in natural coordinates
 */
export function shapeFunction(node: number, xi: number, eta: number): number {
  const coords = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  const [xi_i, eta_i] = coords[node - 1];
  return 0.25 * (1 + xi * xi_i) * (1 + eta * eta_i);
}

/**
 * Shape function derivatives
 */
export function shapeFunctionDerivatives(
  node: number,
  xi: number,
  eta: number
): { dN_dxi: number; dN_deta: number } {
  const coords = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  const [xi_i, eta_i] = coords[node - 1];

  return {
    dN_dxi: 0.25 * xi_i * (1 + eta * eta_i),
    dN_deta: 0.25 * eta_i * (1 + xi * xi_i),
  };
}

// ============================================================
// JACOBIAN (IN LOCAL COORDINATES)
// ============================================================

/**
 * 2D Jacobian matrix in local coordinates (only x', y' - no z')
 */
export function jacobianMatrix2D(
  localCoords: NodeCoords[],
  xi: number,
  eta: number
): Matrix {
  const J: Matrix = [
    [0, 0],
    [0, 0],
  ];

  for (let i = 0; i < 4; i++) {
    const { dN_dxi, dN_deta } = shapeFunctionDerivatives(i + 1, xi, eta);
    const { x, y } = localCoords[i];

    J[0][0] += dN_dxi * x;
    J[0][1] += dN_dxi * y;
    J[1][0] += dN_deta * x;
    J[1][1] += dN_deta * y;
  }

  return J;
}

function determinant2x2(J: Matrix): number {
  return J[0][0] * J[1][1] - J[0][1] * J[1][0];
}

function inverse2x2(J: Matrix): Matrix {
  const det = determinant2x2(J);
  if (Math.abs(det) < 1e-10) {
    return [
      [0, 0],
      [0, 0],
    ];
  }
  return [
    [J[1][1] / det, -J[0][1] / det],
    [-J[1][0] / det, J[0][0] / det],
  ];
}

// ============================================================
// MATERIAL MATRICES
// ============================================================

export function planeStressMatrix(E: number, nu: number, t: number): Matrix {
  const factor = (E * t) / (1 - nu * nu);
  return [
    [factor, factor * nu, 0],
    [factor * nu, factor, 0],
    [0, 0, factor * (1 - nu) / 2],
  ];
}

export function plateBendingMatrix(E: number, nu: number, t: number): Matrix {
  const D = (E * t * t * t) / (12 * (1 - nu * nu));
  return [
    [D, D * nu, 0],
    [D * nu, D, 0],
    [0, 0, D * (1 - nu) / 2],
  ];
}

// ============================================================
// STRAIN-DISPLACEMENT MATRICES (IN LOCAL COORDINATES)
// ============================================================

/**
 * Membrane B matrix in local coordinates (3×8)
 */
export function membraneStrainMatrix(
  localCoords: NodeCoords[],
  xi: number,
  eta: number
): Matrix {
  const B = Array(3).fill(null).map(() => Array(8).fill(0));

  const J = jacobianMatrix2D(localCoords, xi, eta);
  const J_inv = inverse2x2(J);

  for (let i = 0; i < 4; i++) {
    const { dN_dxi, dN_deta } = shapeFunctionDerivatives(i + 1, xi, eta);

    // Transform to physical coordinates in local system
    const dN_dx = J_inv[0][0] * dN_dxi + J_inv[0][1] * dN_deta;
    const dN_dy = J_inv[1][0] * dN_dxi + J_inv[1][1] * dN_deta;

    // Fill B matrix (only in-plane DOFs: u', v')
    B[0][i * 2] = dN_dx;         // ∂u'/∂x'
    B[1][i * 2 + 1] = dN_dy;     // ∂v'/∂y'
    B[2][i * 2] = dN_dy;         // γx'y' = ∂u'/∂y'
    B[2][i * 2 + 1] = dN_dx;     // γx'y' += ∂v'/∂x'
  }

  return B;
}

/**
 * Bending B matrix in local coordinates (3×12)
 */
export function bendingStrainMatrix(
  localCoords: NodeCoords[],
  xi: number,
  eta: number
): Matrix {
  const B = Array(3).fill(null).map(() => Array(12).fill(0));

  const J = jacobianMatrix2D(localCoords, xi, eta);
  const J_inv = inverse2x2(J);

  for (let i = 0; i < 4; i++) {
    const { dN_dxi, dN_deta } = shapeFunctionDerivatives(i + 1, xi, eta);

    const dN_dx = J_inv[0][0] * dN_dxi + J_inv[0][1] * dN_deta;
    const dN_dy = J_inv[1][0] * dN_dxi + J_inv[1][1] * dN_deta;

    // Fill B matrix for curvatures (DOFs: w', θx', θy')
    B[0][i * 3 + 1] = -dN_dx;      // κx' = -∂θx'/∂x'
    B[1][i * 3 + 2] = -dN_dy;      // κy' = -∂θy'/∂y'
    B[2][i * 3 + 1] = -dN_dy;      // κx'y' = -∂θx'/∂y'
    B[2][i * 3 + 2] = -dN_dx;      // κx'y' += -∂θy'/∂x'
  }

  return B;
}

// ============================================================
// MATRIX UTILITIES
// ============================================================

function zeroMatrix(rows: number, cols: number): Matrix {
  return Array(rows).fill(null).map(() => Array(cols).fill(0));
}

function matMul(A: Matrix, B: Matrix): Matrix {
  const rowsA = A.length;
  const colsA = A[0].length;
  const colsB = B[0].length;
  const result = zeroMatrix(rowsA, colsB);

  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      let sum = 0;
      for (let k = 0; k < colsA; k++) {
        sum += A[i][k] * B[k][j];
      }
      result[i][j] = sum;
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

// ============================================================
// ELEMENT STIFFNESS MATRIX
// ============================================================

/**
 * Build 24×24 element stiffness matrix in LOCAL coordinates
 * Then transform to global coordinates
 */
export function buildShellStiffnessMatrix(
  nodeCoords: NodeCoords[],
  thickness: number,
  E: number,
  nu: number
): Matrix {
  // Build local coordinate system
  const localSystem = buildLocalCoordSystem(nodeCoords);

  // Transform node coordinates to local system
  const localCoords = nodeCoords.map(coord => globalToLocal(coord, localSystem));

  // Build local stiffness matrix
  const Ke_local = zeroMatrix(24, 24);

  // Gauss quadrature points
  const alpha = 1 / Math.sqrt(3);
  const gaussPoints = [
    { xi: -alpha, eta: -alpha, weight: 1 },
    { xi: alpha, eta: -alpha, weight: 1 },
    { xi: alpha, eta: alpha, weight: 1 },
    { xi: -alpha, eta: alpha, weight: 1 },
  ];

  const D_membrane = planeStressMatrix(E, nu, thickness);
  const D_bending = plateBendingMatrix(E, nu, thickness);

  for (const gp of gaussPoints) {
    const { xi, eta, weight } = gp;

    const J = jacobianMatrix2D(localCoords, xi, eta);
    const detJ = determinant2x2(J);

    if (Math.abs(detJ) < 1e-10) continue;

    // Membrane contribution
    const B_membrane = membraneStrainMatrix(localCoords, xi, eta);
    const BT_membrane = transpose(B_membrane);
    const temp_membrane = matMul(D_membrane, B_membrane);
    const Ke_membrane = matMul(BT_membrane, temp_membrane);

    // Add to global matrix (DOFs 0,1 for each node)
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        Ke_local[i * 6][j * 6] += Ke_membrane[i * 2][j * 2] * detJ * weight;
        Ke_local[i * 6][j * 6 + 1] += Ke_membrane[i * 2][j * 2 + 1] * detJ * weight;
        Ke_local[i * 6 + 1][j * 6] += Ke_membrane[i * 2 + 1][j * 2] * detJ * weight;
        Ke_local[i * 6 + 1][j * 6 + 1] += Ke_membrane[i * 2 + 1][j * 2 + 1] * detJ * weight;
      }
    }

    // Bending contribution
    const B_bending = bendingStrainMatrix(localCoords, xi, eta);
    const BT_bending = transpose(B_bending);
    const temp_bending = matMul(D_bending, B_bending);
    const Ke_bending = matMul(BT_bending, temp_bending);

    // Add to global matrix (DOFs 2,3,4 for each node)
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        for (let m = 0; m < 3; m++) {
          for (let n = 0; n < 3; n++) {
            Ke_local[i * 6 + 2 + m][j * 6 + 2 + n] +=
              Ke_bending[i * 3 + m][j * 3 + n] * detJ * weight;
          }
        }
      }
    }
  }

  // Transform to global coordinates: Ke_global = T^T * Ke_local * T
  const T_node = buildTransformationMatrix(localSystem);

  // Build full 24×24 transformation matrix (block diagonal with T_node)
  const T_full = zeroMatrix(24, 24);
  for (let i = 0; i < 4; i++) {
    for (let m = 0; m < 6; m++) {
      for (let n = 0; n < 6; n++) {
        T_full[i * 6 + m][i * 6 + n] = T_node[m][n];
      }
    }
  }

  const T_transpose = transpose(T_full);
  const temp = matMul(Ke_local, T_full);
  const Ke_global = matMul(T_transpose, temp);

  return Ke_global;
}

// ============================================================
// STRESS RECOVERY
// ============================================================

export function recoverShellStresses(
  elementId: string,
  nodeDisplacements: number[],
  nodeCoords: NodeCoords[],
  thickness: number,
  E: number,
  nu: number
): ShellResult {
  // Build local system and transform
  const localSystem = buildLocalCoordSystem(nodeCoords);
  const localCoords = nodeCoords.map(coord => globalToLocal(coord, localSystem));

  // Transform displacements to local coordinates
  const T_node = buildTransformationMatrix(localSystem);
  const u_local: number[] = [];

  for (let i = 0; i < 4; i++) {
    const u_global = nodeDisplacements.slice(i * 6, (i + 1) * 6);
    for (let m = 0; m < 6; m++) {
      let sum = 0;
      for (let n = 0; n < 6; n++) {
        sum += T_node[n][m] * u_global[n];  // T^T * u_global
      }
      u_local.push(sum);
    }
  }

  // Evaluate at centroid
  const B_membrane = membraneStrainMatrix(localCoords, 0, 0);
  const B_bending = bendingStrainMatrix(localCoords, 0, 0);

  // Extract membrane displacements (u', v')
  const u_membrane: number[] = [];
  for (let i = 0; i < 4; i++) {
    u_membrane.push(u_local[i * 6]);     // u'
    u_membrane.push(u_local[i * 6 + 1]); // v'
  }

  // Extract bending displacements (w', θx', θy')
  const u_bending: number[] = [];
  for (let i = 0; i < 4; i++) {
    u_bending.push(u_local[i * 6 + 2]); // w'
    u_bending.push(u_local[i * 6 + 3]); // θx'
    u_bending.push(u_local[i * 6 + 4]); // θy'
  }

  // Compute strains
  const strains_membrane = matrixVectorMultiply(B_membrane, u_membrane);
  const strains_bending = matrixVectorMultiply(B_bending, u_bending);

  // Material matrices
  const D_membrane = planeStressMatrix(E, nu, thickness);
  const D_bending = plateBendingMatrix(E, nu, thickness);

  // Compute forces and moments
  const forces = matrixVectorMultiply(D_membrane, strains_membrane);
  const moments = matrixVectorMultiply(D_bending, strains_bending);

  return {
    id: '',
    element_id: elementId,
    f11: forces[0],
    f22: forces[1],
    f12: forces[2],
    m11: moments[0],
    m22: moments[1],
    m12: moments[2],
    v13: 0,
    v23: 0,
  };
}

function matrixVectorMultiply(A: Matrix, x: number[]): number[] {
  const result: number[] = [];
  for (let i = 0; i < A.length; i++) {
    let sum = 0;
    for (let j = 0; j < A[0].length; j++) {
      sum += A[i][j] * x[j];
    }
    result.push(sum);
  }
  return result;
}

// ============================================================
// ELEMENT QUALITY VALIDATION
// ============================================================

export function validateElementQuality(
  nodeCoords: NodeCoords[]
): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Build local system
  const localSystem = buildLocalCoordSystem(nodeCoords);
  const localCoords = nodeCoords.map(coord => globalToLocal(coord, localSystem));

  // Check Jacobian determinant at Gauss points
  const alpha = 1 / Math.sqrt(3);
  const gaussPoints = [
    { xi: -alpha, eta: -alpha },
    { xi: alpha, eta: -alpha },
    { xi: alpha, eta: alpha },
    { xi: -alpha, eta: alpha },
  ];

  for (const gp of gaussPoints) {
    const J = jacobianMatrix2D(localCoords, gp.xi, gp.eta);
    const detJ = determinant2x2(J);
    if (detJ <= 0) {
      return { isValid: false, warnings: ['Negative Jacobian detected - element is inverted'] };
    }
  }

  // Check aspect ratio
  const edges = [
    distance(nodeCoords[0], nodeCoords[1]),
    distance(nodeCoords[1], nodeCoords[2]),
    distance(nodeCoords[2], nodeCoords[3]),
    distance(nodeCoords[3], nodeCoords[0]),
  ];
  const maxEdge = Math.max(...edges);
  const minEdge = Math.min(...edges);
  const aspectRatio = maxEdge / minEdge;

  if (aspectRatio > 10) {
    warnings.push(`High aspect ratio: ${aspectRatio.toFixed(1)}`);
  }

  // Check internal angles
  const angles = [
    angleBetweenVectors(nodeCoords[0], nodeCoords[1], nodeCoords[3]),
    angleBetweenVectors(nodeCoords[1], nodeCoords[2], nodeCoords[0]),
    angleBetweenVectors(nodeCoords[2], nodeCoords[3], nodeCoords[1]),
    angleBetweenVectors(nodeCoords[3], nodeCoords[0], nodeCoords[2]),
  ];

  for (const angle of angles) {
    if (angle < 30 || angle > 150) {
      warnings.push('Poor element angles detected');
      break;
    }
  }

  return { isValid: true, warnings };
}

function distance(p1: NodeCoords, p2: NodeCoords): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function angleBetweenVectors(p0: NodeCoords, p1: NodeCoords, p2: NodeCoords): number {
  const v1 = vectorSubtract(p0, p1);
  const v2 = vectorSubtract(p2, p1);

  const dot = vectorDot(v1, v2);
  const mag1 = vectorMagnitude(v1);
  const mag2 = vectorMagnitude(v2);

  if (mag1 < 1e-10 || mag2 < 1e-10) return 90; // Default for degenerate case

  const cosAngle = dot / (mag1 * mag2);
  return (Math.acos(Math.max(-1, Math.min(1, cosAngle))) * 180) / Math.PI;
}
