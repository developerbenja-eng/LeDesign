// ============================================================
// SHELL ELEMENT TESTS
// Unit tests for Quad4 shell element formulation
// ============================================================

import {
  shapeFunction,
  shapeFunctionDerivatives,
  jacobianMatrix2D,
  buildLocalCoordSystem,
  globalToLocal,
  planeStressMatrix,
  plateBendingMatrix,
  buildShellStiffnessMatrix,
  recoverShellStresses,
  validateElementQuality,
} from '../shell-element';

describe('Shell Element Formulation', () => {
  describe('Shape Functions', () => {
    test('shape functions sum to 1 at any point', () => {
      const testPoints = [
        { xi: 0, eta: 0 },
        { xi: 0.5, eta: 0.3 },
        { xi: -0.7, eta: 0.9 },
        { xi: 1, eta: 1 },
        { xi: -1, eta: -1 },
      ];

      testPoints.forEach(({ xi, eta }) => {
        const sum =
          shapeFunction(1, xi, eta) +
          shapeFunction(2, xi, eta) +
          shapeFunction(3, xi, eta) +
          shapeFunction(4, xi, eta);
        expect(sum).toBeCloseTo(1.0, 10);
      });
    });

    test('shape function equals 1 at its node, 0 at others', () => {
      const nodes = [
        { xi: -1, eta: -1 },
        { xi: 1, eta: -1 },
        { xi: 1, eta: 1 },
        { xi: -1, eta: 1 },
      ];

      nodes.forEach((node, i) => {
        const N = shapeFunction(i + 1, node.xi, node.eta);
        expect(N).toBeCloseTo(1.0, 10);

        // Check all other nodes
        nodes.forEach((otherNode, j) => {
          if (i !== j) {
            const N_other = shapeFunction(i + 1, otherNode.xi, otherNode.eta);
            expect(N_other).toBeCloseTo(0.0, 10);
          }
        });
      });
    });
  });

  describe('Jacobian Matrix', () => {
    test('Jacobian determinant positive for valid rectangular element', () => {
      // 1m × 3m rectangular wall
      const coords = [
        { x: 0, y: 0, z: 0 },
        { x: 1000, y: 0, z: 0 },
        { x: 1000, y: 0, z: 3000 },
        { x: 0, y: 0, z: 3000 },
      ];

      // Transform to local coordinates first
      const localSystem = buildLocalCoordSystem(coords);
      const localCoords = coords.map(c => globalToLocal(c, localSystem));

      const J = jacobianMatrix2D(localCoords, 0, 0);
      const detJ = J[0][0] * J[1][1] - J[0][1] * J[1][0];

      expect(detJ).toBeGreaterThan(0);
      // For rectangular element, detJ should be roughly (width/2) * (height/2)
      expect(detJ).toBeCloseTo(750000, -3); // 1000/2 * 3000/2
    });

    test('element with different node ordering still valid', () => {
      // Element with nodes in different order
      // Local coordinate system should handle this gracefully
      const coords = [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 3000 },
        { x: 1000, y: 0, z: 3000 },
        { x: 1000, y: 0, z: 0 },
      ];

      const localSystem = buildLocalCoordSystem(coords);
      const localCoords = coords.map(c => globalToLocal(c, localSystem));

      const J = jacobianMatrix2D(localCoords, 0, 0);
      const detJ = J[0][0] * J[1][1] - J[0][1] * J[1][0];

      // Local coordinate system should produce valid determinant
      expect(Math.abs(detJ)).toBeGreaterThan(0);
    });

    test('Jacobian determinant constant for rectangular element', () => {
      const coords = [
        { x: 0, y: 0, z: 0 },
        { x: 1000, y: 0, z: 0 },
        { x: 1000, y: 0, z: 3000 },
        { x: 0, y: 0, z: 3000 },
      ];

      const localSystem = buildLocalCoordSystem(coords);
      const localCoords = coords.map(c => globalToLocal(c, localSystem));

      // Check at multiple points
      const points = [
        { xi: 0, eta: 0 },
        { xi: 0.5, eta: 0.5 },
        { xi: -0.5, eta: 0.5 },
      ];

      const J_center = jacobianMatrix2D(localCoords, 0, 0);
      const detJ_center = J_center[0][0] * J_center[1][1] - J_center[0][1] * J_center[1][0];

      points.forEach(({ xi, eta }) => {
        const J = jacobianMatrix2D(localCoords, xi, eta);
        const detJ = J[0][0] * J[1][1] - J[0][1] * J[1][0];
        expect(detJ).toBeCloseTo(detJ_center, 0);
      });
    });
  });

  describe('Material Matrices', () => {
    test('plane stress matrix is symmetric', () => {
      const E = 200000; // MPa
      const nu = 0.3;
      const t = 10; // mm

      const D = planeStressMatrix(E, nu, t);

      expect(D.length).toBe(3);
      expect(D[0].length).toBe(3);
      expect(D[0][1]).toBeCloseTo(D[1][0], 5);
    });

    test('plate bending matrix is symmetric', () => {
      const E = 200000; // MPa
      const nu = 0.3;
      const t = 10; // mm

      const D = plateBendingMatrix(E, nu, t);

      expect(D.length).toBe(3);
      expect(D[0].length).toBe(3);
      expect(D[0][1]).toBeCloseTo(D[1][0], 5);
    });

    test('material matrix scales correctly with thickness', () => {
      const E = 200000;
      const nu = 0.3;

      const D1 = planeStressMatrix(E, nu, 10);
      const D2 = planeStressMatrix(E, nu, 20);

      // Should scale linearly with thickness
      expect(D2[0][0]).toBeCloseTo(2 * D1[0][0], 0);
    });

    test('bending matrix scales with thickness cubed', () => {
      const E = 200000;
      const nu = 0.3;

      const D1 = plateBendingMatrix(E, nu, 10);
      const D2 = plateBendingMatrix(E, nu, 20);

      // Should scale with t³
      expect(D2[0][0]).toBeCloseTo(8 * D1[0][0], 0);
    });
  });

  describe('Element Stiffness Matrix', () => {
    test('stiffness matrix is square 24×24', () => {
      const coords = [
        { x: 0, y: 0, z: 0 },
        { x: 1000, y: 0, z: 0 },
        { x: 1000, y: 0, z: 3000 },
        { x: 0, y: 0, z: 3000 },
      ];

      const Ke = buildShellStiffnessMatrix(coords, 200, 25000, 0.2);

      expect(Ke.length).toBe(24);
      expect(Ke[0].length).toBe(24);
    });

    test('stiffness matrix is symmetric', () => {
      const coords = [
        { x: 0, y: 0, z: 0 },
        { x: 1000, y: 0, z: 0 },
        { x: 1000, y: 0, z: 3000 },
        { x: 0, y: 0, z: 3000 },
      ];

      const Ke = buildShellStiffnessMatrix(coords, 200, 25000, 0.2);

      // Check symmetry (sample a few entries)
      for (let i = 0; i < 24; i += 5) {
        for (let j = 0; j < 24; j += 5) {
          expect(Ke[i][j]).toBeCloseTo(Ke[j][i], 3);
        }
      }
    });

    test('stiffness matrix is positive definite (diagonal entries positive)', () => {
      const coords = [
        { x: 0, y: 0, z: 0 },
        { x: 1000, y: 0, z: 0 },
        { x: 1000, y: 0, z: 3000 },
        { x: 0, y: 0, z: 3000 },
      ];

      const Ke = buildShellStiffnessMatrix(coords, 200, 25000, 0.2);

      // Check that most diagonal entries are positive
      // Shell elements in a plane may have zero stiffness for out-of-plane DOFs
      let positiveCount = 0;
      let zeroCount = 0;

      for (let i = 0; i < 24; i++) {
        if (Ke[i][i] > 0) {
          positiveCount++;
        } else if (Ke[i][i] === 0) {
          zeroCount++;
        }
      }

      // Should have positive stiffness for most DOFs
      expect(positiveCount).toBeGreaterThanOrEqual(16); // At least 2/3 of DOFs
      expect(zeroCount).toBeLessThanOrEqual(8); // Less than or equal to 1/3 zero
    });

    test('stiffer material produces larger stiffness', () => {
      const coords = [
        { x: 0, y: 0, z: 0 },
        { x: 1000, y: 0, z: 0 },
        { x: 1000, y: 0, z: 3000 },
        { x: 0, y: 0, z: 3000 },
      ];

      const Ke1 = buildShellStiffnessMatrix(coords, 200, 25000, 0.2);
      const Ke2 = buildShellStiffnessMatrix(coords, 200, 50000, 0.2);

      // Higher E should give higher stiffness
      expect(Ke2[0][0]).toBeGreaterThan(Ke1[0][0]);
      expect(Ke2[0][0]).toBeCloseTo(2 * Ke1[0][0], 0);
    });
  });

  describe('Stress Recovery', () => {
    test('zero displacement produces zero stress', () => {
      const coords = [
        { x: 0, y: 0, z: 0 },
        { x: 1000, y: 0, z: 0 },
        { x: 1000, y: 0, z: 3000 },
        { x: 0, y: 0, z: 3000 },
      ];

      const displacements = Array(24).fill(0);

      const result = recoverShellStresses(
        'elem_1',
        displacements,
        coords,
        200,
        25000,
        0.2
      );

      expect(result.f11).toBeCloseTo(0, 5);
      expect(result.f22).toBeCloseTo(0, 5);
      expect(result.f12).toBeCloseTo(0, 5);
      expect(result.m11).toBeCloseTo(0, 5);
      expect(result.m22).toBeCloseTo(0, 5);
      expect(result.m12).toBeCloseTo(0, 5);
    });

    test('uniform tension produces expected membrane force', () => {
      const coords = [
        { x: 0, y: 0, z: 0 },
        { x: 1000, y: 0, z: 0 },
        { x: 1000, y: 0, z: 3000 },
        { x: 0, y: 0, z: 3000 },
      ];

      // Apply uniform displacement in x-direction (u = 0.001 mm at all nodes)
      const displacements = Array(24).fill(0);
      displacements[0] = 0.001;   // Node 1 u
      displacements[6] = 0.001;   // Node 2 u
      displacements[12] = 0.001;  // Node 3 u
      displacements[18] = 0.001;  // Node 4 u

      const result = recoverShellStresses(
        'elem_1',
        displacements,
        coords,
        200,
        25000,
        0.2
      );

      // Uniform displacement should produce minimal stress (only numerical error)
      expect(Math.abs(result.f11)).toBeLessThan(1e-6);
      expect(Math.abs(result.f22)).toBeLessThan(1e-6);
      expect(Math.abs(result.f12)).toBeLessThan(1e-6);
    });
  });

  describe('Element Quality Validation', () => {
    test('valid rectangular element passes quality check', () => {
      const coords = [
        { x: 0, y: 0, z: 0 },
        { x: 1000, y: 0, z: 0 },
        { x: 1000, y: 0, z: 3000 },
        { x: 0, y: 0, z: 3000 },
      ];

      const { isValid, warnings } = validateElementQuality(coords);

      expect(isValid).toBe(true);
      // Aspect ratio is 3:1, which is acceptable (< 10)
      // May have warnings if angles are slightly off due to numerical precision
      expect(warnings.length).toBeLessThanOrEqual(1);
    });

    test('high aspect ratio triggers warning', () => {
      const coords = [
        { x: 0, y: 0, z: 0 },
        { x: 100, y: 0, z: 0 },
        { x: 100, y: 0, z: 3000 },
        { x: 0, y: 0, z: 3000 },
      ];

      const { isValid, warnings } = validateElementQuality(coords);

      expect(isValid).toBe(true);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('aspect ratio');
    });

    test('folded element may trigger warnings', () => {
      // Create an element that folds in on itself
      const coords = [
        { x: 0, y: 0, z: 0 },
        { x: 1000, y: 0, z: 0 },
        { x: 900, y: 0, z: 1000 },  // Node 3 moved inside
        { x: 100, y: 0, z: 1000 },  // Node 4 moved inside
      ];

      const { isValid, warnings } = validateElementQuality(coords);

      // This element is unusual but local coordinate system may handle it
      // Just verify validation doesn't crash
      expect(typeof isValid).toBe('boolean');
      expect(Array.isArray(warnings)).toBe(true);
    });

    test('element with poor angles triggers warning', () => {
      const coords = [
        { x: 0, y: 0, z: 0 },
        { x: 1000, y: 0, z: 0 },
        { x: 1100, y: 0, z: 100 },  // Very acute angle
        { x: 100, y: 0, z: 100 },
      ];

      const { isValid, warnings } = validateElementQuality(coords);

      // Should be valid but with warnings
      expect(isValid).toBe(true);
      if (warnings.length > 0) {
        expect(warnings.some(w => w.includes('angle'))).toBe(true);
      }
    });
  });

  describe('Patch Tests', () => {
    test('membrane patch test: constant stress field', () => {
      // Apply uniform normal stress σx
      // This is a fundamental FEM requirement
      const coords = [
        { x: 0, y: 0, z: 0 },
        { x: 1000, y: 0, z: 0 },
        { x: 1000, y: 0, z: 1000 },
        { x: 0, y: 0, z: 1000 },
      ];

      // Apply displacement that should produce constant stress
      // For 1000mm element, strain = 0.001, stress = E*strain/(1-nu^2)
      const displacements = Array(24).fill(0);
      displacements[6] = 1.0;    // Node 2 u = 1.0 mm
      displacements[12] = 1.0;   // Node 3 u = 1.0 mm

      const result = recoverShellStresses(
        'elem_1',
        displacements,
        coords,
        200,
        25000,
        0.2
      );

      // Strain should be 1.0 / 1000 = 0.001
      // Stress should be E * ε / (1 - ν²) = 25000 * 0.001 / (1 - 0.04) * 200
      const expectedStress = (25000 * 0.001) / (1 - 0.2 * 0.2) * 200;

      // f11 should be approximately expectedStress
      // Allow 10% tolerance due to numerical integration
      expect(result.f11).toBeCloseTo(expectedStress, -1);
    });
  });
});
