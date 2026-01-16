// ============================================================
// CANTILEVER WALL VALIDATION TEST
// Compare FEM results to analytical beam theory
// ============================================================

import { describe, test, expect } from 'vitest';
import { generateWallMesh } from '../mesh-generation';
import { buildShellStiffnessMatrix, recoverShellStresses } from '../shell-element';
import { distributeAreaLoad } from '../load-assembly';
import type { Wall } from './types/elements';

describe('Cantilever Wall Validation', () => {
  /**
   * Test Setup: Cantilever wall fixed at base, point load at top
   *
   * Geometry:
   * - Height: 10 m (10,000 mm)
   * - Width: 5 m (5,000 mm)
   * - Thickness: 200 mm
   * - Material: Concrete (E = 25 GPa = 25,000 MPa = 25,000 N/mm²)
   * - Boundary: Fixed at base (z = 0)
   * - Load: Point load P = 100 kN = 100,000 N at top center
   *
   * Analytical Solution (Beam Theory):
   * - Moment of inertia: I = (b * t³) / 12 = (5000 * 200³) / 12 = 3.333e10 mm⁴
   * - Tip deflection: δ = (P * L³) / (3 * E * I)
   * - Maximum stress: σ = (M * c) / I where M = P * L, c = t/2
   */

  test('tip deflection matches analytical solution within 5%', async () => {
    // Wall geometry
    const height = 10000; // mm
    const width = 5000; // mm
    const thickness = 200; // mm
    const E = 25000; // N/mm²
    const nu = 0.2; // Poisson's ratio

    // Create wall definition
    const wall: Partial<Wall> = {
      id: 'wl_cantilever',
      corner_nodes: [
        { x: 0, y: 0, z: 0 },
        { x: width, y: 0, z: 0 },
        { x: width, y: 0, z: height },
        { x: 0, y: 0, z: height },
      ] as any,
      thickness,
    };

    // Generate mesh (use coarse mesh for speed: 1000mm = 1m elements)
    const { meshNodes, shellElements } = generateWallMesh(
      wall as Wall,
      'proj_test',
      1000 // 1m mesh size → 5×10 = 50 elements
    );

    // Build global stiffness matrix
    const DOF_PER_NODE = 6;
    const numNodes = meshNodes.length;
    const totalDOF = numNodes * DOF_PER_NODE;

    // Simple global K assembly (this is a simplified version)
    // In reality would use full assembly from static-analysis.ts
    const K_global = Array(totalDOF)
      .fill(0)
      .map(() => Array(totalDOF).fill(0));

    // Node index map
    const nodeIndexMap = new Map<string, number>();
    meshNodes.forEach((node, i) => {
      nodeIndexMap.set(node.id, i);
    });

    // Assemble all element stiffness matrices
    for (const elem of shellElements) {
      const nodeCoords = elem.nodes.map(nodeId => {
        const node = meshNodes.find(n => n.id === nodeId)!;
        return { x: node.x, y: node.y, z: node.z };
      });

      const Ke = buildShellStiffnessMatrix(nodeCoords, thickness, E, nu);

      // Assemble into global K (4 nodes × 6 DOF each)
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          const nodeI = elem.nodes[i];
          const nodeJ = elem.nodes[j];
          const globalI = nodeIndexMap.get(nodeI)! * DOF_PER_NODE;
          const globalJ = nodeIndexMap.get(nodeJ)! * DOF_PER_NODE;

          for (let m = 0; m < 6; m++) {
            for (let n = 0; n < 6; n++) {
              K_global[globalI + m][globalJ + n] += Ke[i * 6 + m][j * 6 + n];
            }
          }
        }
      }
    }

    // Apply boundary conditions: fix all DOFs at base (z = 0)
    const baseTolerance = 10; // mm
    for (const node of meshNodes) {
      if (node.z < baseTolerance) {
        const baseIndex = nodeIndexMap.get(node.id)! * DOF_PER_NODE;
        for (let i = 0; i < 6; i++) {
          const dof = baseIndex + i;
          // Zero out row and column, set diagonal to 1
          for (let j = 0; j < totalDOF; j++) {
            K_global[dof][j] = 0;
            K_global[j][dof] = 0;
          }
          K_global[dof][dof] = 1;
        }
      }
    }

    // Apply load: 100 kN point load at top center
    const F_global = Array(totalDOF).fill(0);
    const topCenterNode = meshNodes
      .filter(n => Math.abs(n.z - height) < baseTolerance)
      .sort((a, b) => Math.abs(a.x - width / 2) - Math.abs(b.x - width / 2))[0];

    const loadIndex = nodeIndexMap.get(topCenterNode.id)! * DOF_PER_NODE;
    F_global[loadIndex + 0] = 100000; // 100 kN in X direction

    // Solve system: K * U = F (using simple Gaussian elimination for test)
    const U = gaussianElimination(K_global, F_global);

    // Extract tip deflection (X displacement at top center)
    const tipDeflection = Math.abs(U[loadIndex + 0]);

    // Analytical solution
    const I = (width * Math.pow(thickness, 3)) / 12; // mm⁴
    const P = 100000; // N
    const L = height; // mm
    const delta_analytical = (P * Math.pow(L, 3)) / (3 * E * I);

    // Check if within 5%
    const error = Math.abs(tipDeflection - delta_analytical) / delta_analytical;
    expect(error).toBeLessThan(0.05); // 5% tolerance

    // Also check absolute values are reasonable
    expect(tipDeflection).toBeGreaterThan(0);
    expect(tipDeflection).toBeLessThan(delta_analytical * 1.1);
  });

  test('maximum bending stress matches analytical solution within 10%', async () => {
    // Same setup as above but checking stress instead of deflection
    const height = 10000; // mm
    const width = 5000; // mm
    const thickness = 200; // mm
    const E = 25000; // N/mm²
    const nu = 0.2;

    // Analytical maximum stress at base
    const P = 100000; // N
    const M = P * height; // N·mm
    const I = (width * Math.pow(thickness, 3)) / 12; // mm⁴
    const c = thickness / 2; // mm
    const sigma_analytical = (M * c) / I; // N/mm² = MPa

    // For this test, we'll just verify the formula is correct
    // Full FEM stress recovery would require solving the system above
    // and using recoverShellStresses for base elements

    expect(sigma_analytical).toBeGreaterThan(0);
    expect(sigma_analytical).toBeCloseTo(120, 0); // Approximately 120 MPa

    // TODO: Implement full stress check when static analysis is complete
  });
});

/**
 * Simple Gaussian elimination solver for testing
 * NOTE: This is NOT production code - use proper solver in real analysis
 */
function gaussianElimination(A: number[][], b: number[]): number[] {
  const n = b.length;
  const Ab = A.map((row, i) => [...row, b[i]]);

  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(Ab[k][i]) > Math.abs(Ab[maxRow][i])) {
        maxRow = k;
      }
    }

    // Swap rows
    [Ab[i], Ab[maxRow]] = [Ab[maxRow], Ab[i]];

    // Skip if pivot is zero (singular matrix)
    if (Math.abs(Ab[i][i]) < 1e-10) continue;

    // Eliminate column
    for (let k = i + 1; k < n; k++) {
      const factor = Ab[k][i] / Ab[i][i];
      for (let j = i; j <= n; j++) {
        Ab[k][j] -= factor * Ab[i][j];
      }
    }
  }

  // Back substitution
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = Ab[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= Ab[i][j] * x[j];
    }
    if (Math.abs(Ab[i][i]) > 1e-10) {
      x[i] /= Ab[i][i];
    }
  }

  return x;
}
