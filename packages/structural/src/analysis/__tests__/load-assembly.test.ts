// ============================================================
// LOAD ASSEMBLY TESTS
// Unit tests for area load distribution to nodes
// ============================================================

import {
  distributeAreaLoad,
  buildLoadVector,
  accumulateNodalForces,
  type NodalForce,
} from '../load-assembly';
import type { AreaLoad, NodalLoad, LoadDirection } from '../types/loads';
import type { StructuralNode } from '@/types/structural/elements';

describe('Load Assembly', () => {
  describe('Area Load Distribution', () => {
    test('distributes uniform load equally to 4 nodes (quad)', () => {
      const shellElement = {
        id: 'se_1',
        nodeIds: ['nd_1', 'nd_2', 'nd_3', 'nd_4'],
        thickness: 200,
        materialId: 'mat_1',
        elementType: 'quad4' as const,
      };

      // 1m × 1m quad
      const nodeCoords = [
        { x: 0, y: 0, z: 0 },
        { x: 1000, y: 0, z: 0 },
        { x: 1000, y: 0, z: 1000 },
        { x: 0, y: 0, z: 1000 },
      ];

      // 5 kN/m² downward (gravity)
      // Note: Coordinates are in mm, so we need to convert load intensity
      // 5 kN/m² = 5000 N/m² = 5000 N / 1,000,000 mm² = 0.005 N/mm²
      const loadIntensity = 0.005; // N/mm² (5 kN/m² converted)
      const direction: LoadDirection = 'gravity';

      const nodalForces = distributeAreaLoad(
        shellElement,
        nodeCoords,
        loadIntensity,
        direction,
        true
      );

      expect(nodalForces.size).toBe(4);

      // Total force = 0.005 N/mm² × 1,000,000 mm² (1 m²) = 5,000 N = 5 kN
      // Force per node = 5,000 N / 4 = 1,250 N
      const area = 1000 * 1000; // mm²
      const totalForce = loadIntensity * area; // N
      const expectedForcePerNode = totalForce / 4; // N

      for (const [nodeId, forces] of nodalForces) {
        expect(forces.fx).toBeCloseTo(0, 5);
        expect(forces.fy).toBeCloseTo(0, 5);
        expect(forces.fz).toBeCloseTo(-expectedForcePerNode, 1); // Downward (N)
        expect(forces.mx).toBe(0);
        expect(forces.my).toBe(0);
        expect(forces.mz).toBe(0);
      }
    });

    test('distributes load correctly for rectangular element', () => {
      const shellElement = {
        id: 'se_1',
        nodeIds: ['nd_1', 'nd_2', 'nd_3', 'nd_4'],
        thickness: 200,
        materialId: 'mat_1',
        elementType: 'quad4' as const,
      };

      // 2m × 3m rectangular wall
      const nodeCoords = [
        { x: 0, y: 0, z: 0 },
        { x: 2000, y: 0, z: 0 },
        { x: 2000, y: 0, z: 3000 },
        { x: 0, y: 0, z: 3000 },
      ];

      // 10 kN/m² downward = 0.01 N/mm²
      const loadIntensity = 0.01; // N/mm²
      const direction: LoadDirection = 'gravity';

      const nodalForces = distributeAreaLoad(
        shellElement,
        nodeCoords,
        loadIntensity,
        direction,
        true
      );

      // Total force = 0.01 N/mm² × (2000 × 3000) mm² = 60,000 N = 60 kN
      // Force per node = 60,000 N / 4 = 15,000 N
      const area = 2000 * 3000; // mm²
      const totalForce = loadIntensity * area; // N
      const expectedForcePerNode = totalForce / 4; // N

      for (const [nodeId, forces] of nodalForces) {
        expect(forces.fz).toBeCloseTo(-expectedForcePerNode, 1);
      }
    });

    test('handles triangle elements (tri3)', () => {
      const shellElement = {
        id: 'se_1',
        nodeIds: ['nd_1', 'nd_2', 'nd_3'],
        thickness: 200,
        materialId: 'mat_1',
        elementType: 'tri3' as const,
      };

      // Right triangle with legs 1m × 1m
      const nodeCoords = [
        { x: 0, y: 0, z: 0 },
        { x: 1000, y: 0, z: 0 },
        { x: 0, y: 0, z: 1000 },
      ];

      // 4 kN/m² = 0.004 N/mm²
      const loadIntensity = 0.004; // N/mm²
      const direction: LoadDirection = 'gravity';

      const nodalForces = distributeAreaLoad(
        shellElement,
        nodeCoords,
        loadIntensity,
        direction,
        true
      );

      expect(nodalForces.size).toBe(3);

      // Area = 0.5 × 1000 × 1000 = 500,000 mm²
      // Total force = 0.004 N/mm² × 500,000 mm² = 2,000 N = 2 kN
      // Force per node = 2,000 N / 3 ≈ 666.67 N
      const area = 0.5 * 1000 * 1000; // mm²
      const totalForce = loadIntensity * area; // N
      const expectedForcePerNode = totalForce / 3; // N

      for (const [nodeId, forces] of nodalForces) {
        expect(forces.fz).toBeCloseTo(-expectedForcePerNode, 1);
      }
    });

    test('handles load in X direction', () => {
      const shellElement = {
        id: 'se_1',
        nodeIds: ['nd_1', 'nd_2', 'nd_3', 'nd_4'],
        thickness: 200,
        materialId: 'mat_1',
        elementType: 'quad4' as const,
      };

      // Vertical wall in YZ plane
      const nodeCoords = [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 1000, z: 0 },
        { x: 0, y: 1000, z: 3000 },
        { x: 0, y: 0, z: 3000 },
      ];

      // Wind load 2 kN/m² in X direction = 0.002 N/mm²
      const loadIntensity = 0.002; // N/mm²
      const direction: LoadDirection = 'x';

      const nodalForces = distributeAreaLoad(
        shellElement,
        nodeCoords,
        loadIntensity,
        direction,
        true
      );

      // Area = 1000 × 3000 = 3,000,000 mm²
      // Total force = 0.002 N/mm² × 3,000,000 mm² = 6,000 N = 6 kN
      // Force per node = 6,000 N / 4 = 1,500 N
      const area = 1000 * 3000; // mm²
      const totalForce = loadIntensity * area; // N
      const expectedForcePerNode = totalForce / 4; // N

      for (const [nodeId, forces] of nodalForces) {
        expect(forces.fx).toBeCloseTo(expectedForcePerNode, 1);
        expect(forces.fy).toBeCloseTo(0, 5);
        expect(forces.fz).toBeCloseTo(0, 5);
      }
    });

    test('handles negative load intensity (reverses direction)', () => {
      const shellElement = {
        id: 'se_1',
        nodeIds: ['nd_1', 'nd_2', 'nd_3', 'nd_4'],
        thickness: 200,
        materialId: 'mat_1',
        elementType: 'quad4' as const,
      };

      const nodeCoords = [
        { x: 0, y: 0, z: 0 },
        { x: 1000, y: 0, z: 0 },
        { x: 1000, y: 0, z: 1000 },
        { x: 0, y: 0, z: 1000 },
      ];

      // Negative load (upward pressure)
      const loadIntensity = -3; // kN/m²
      const direction: LoadDirection = 'gravity';

      const nodalForces = distributeAreaLoad(
        shellElement,
        nodeCoords,
        loadIntensity,
        direction,
        true
      );

      // Should be upward (+Z direction)
      for (const [nodeId, forces] of nodalForces) {
        expect(forces.fz).toBeGreaterThan(0); // Upward
      }
    });

    test('handles local coordinates (normal to element)', () => {
      const shellElement = {
        id: 'se_1',
        nodeIds: ['nd_1', 'nd_2', 'nd_3', 'nd_4'],
        thickness: 200,
        materialId: 'mat_1',
        elementType: 'quad4' as const,
      };

      // Vertical wall in YZ plane
      const nodeCoords = [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 1000, z: 0 },
        { x: 0, y: 1000, z: 3000 },
        { x: 0, y: 0, z: 3000 },
      ];

      // Pressure normal to wall (should be in X direction)
      const loadIntensity = 5;
      const direction: LoadDirection = 'z'; // Doesn't matter for local
      const isGlobal = false; // Local coordinates

      const nodalForces = distributeAreaLoad(
        shellElement,
        nodeCoords,
        loadIntensity,
        direction,
        isGlobal
      );

      // Force should be in X direction (normal to YZ plane)
      for (const [nodeId, forces] of nodalForces) {
        expect(Math.abs(forces.fx)).toBeGreaterThan(0);
      }
    });
  });

  describe('Load Vector Assembly', () => {
    test('builds load vector with nodal loads only', () => {
      const nodes = new Map<string, StructuralNode>([
        ['nd_1', { id: 'nd_1', project_id: 'proj_1', x: 0, y: 0, z: 0 } as StructuralNode],
        ['nd_2', { id: 'nd_2', project_id: 'proj_1', x: 1000, y: 0, z: 0 } as StructuralNode],
      ]);

      const nodeIndexMap = new Map<string, number>([
        ['nd_1', 0],
        ['nd_2', 1],
      ]);

      const nodalLoads: NodalLoad[] = [
        {
          id: 'nl_1',
          project_id: 'proj_1',
          load_case_id: 'lc_1',
          node_id: 'nd_1',
          fx: 10,
          fy: 0,
          fz: -5,
          mx: 0,
          my: 0,
          mz: 0,
        } as NodalLoad,
      ];

      const F = buildLoadVector(
        nodalLoads,
        [],
        [],
        [],
        nodes,
        nodeIndexMap,
        1.0
      );

      expect(F.length).toBe(12); // 2 nodes × 6 DOF

      // Check node 1 loads
      expect(F[0]).toBeCloseTo(10, 5); // Fx
      expect(F[1]).toBeCloseTo(0, 5); // Fy
      expect(F[2]).toBeCloseTo(-5, 5); // Fz

      // Check node 2 (should be zero)
      expect(F[6]).toBeCloseTo(0, 5);
      expect(F[7]).toBeCloseTo(0, 5);
      expect(F[8]).toBeCloseTo(0, 5);
    });

    test('applies load case factor correctly', () => {
      const nodes = new Map<string, StructuralNode>([
        ['nd_1', { id: 'nd_1', project_id: 'proj_1', x: 0, y: 0, z: 0 } as StructuralNode],
      ]);

      const nodeIndexMap = new Map<string, number>([
        ['nd_1', 0],
      ]);

      const nodalLoads: NodalLoad[] = [
        {
          id: 'nl_1',
          project_id: 'proj_1',
          load_case_id: 'lc_1',
          node_id: 'nd_1',
          fx: 100,
          fy: 0,
          fz: 0,
          mx: 0,
          my: 0,
          mz: 0,
        } as NodalLoad,
      ];

      // Apply 1.5 factor (e.g., 1.2DL + 1.6LL)
      const F = buildLoadVector(
        nodalLoads,
        [],
        [],
        [],
        nodes,
        nodeIndexMap,
        1.5
      );

      expect(F[0]).toBeCloseTo(150, 5); // 100 × 1.5
    });

    test('handles multiple nodal loads on same node', () => {
      const nodes = new Map<string, StructuralNode>([
        ['nd_1', { id: 'nd_1', project_id: 'proj_1', x: 0, y: 0, z: 0 } as StructuralNode],
      ]);

      const nodeIndexMap = new Map<string, number>([
        ['nd_1', 0],
      ]);

      const nodalLoads: NodalLoad[] = [
        {
          id: 'nl_1',
          project_id: 'proj_1',
          load_case_id: 'lc_1',
          node_id: 'nd_1',
          fx: 10,
          fy: 0,
          fz: 0,
          mx: 0,
          my: 0,
          mz: 0,
        } as NodalLoad,
        {
          id: 'nl_2',
          project_id: 'proj_1',
          load_case_id: 'lc_1',
          node_id: 'nd_1',
          fx: 5,
          fy: 3,
          fz: 0,
          mx: 0,
          my: 0,
          mz: 0,
        } as NodalLoad,
      ];

      const F = buildLoadVector(
        nodalLoads,
        [],
        [],
        [],
        nodes,
        nodeIndexMap,
        1.0
      );

      // Should sum loads on same node
      expect(F[0]).toBeCloseTo(15, 5); // 10 + 5
      expect(F[1]).toBeCloseTo(3, 5); // 0 + 3
    });
  });

  describe('Nodal Force Accumulation', () => {
    test('accumulates forces on same node', () => {
      const existing = new Map<string, NodalForce>([
        [
          'nd_1',
          {
            nodeId: 'nd_1',
            fx: 10,
            fy: 5,
            fz: 0,
            mx: 0,
            my: 0,
            mz: 0,
          },
        ],
      ]);

      const newForces = new Map<string, NodalForce>([
        [
          'nd_1',
          {
            nodeId: 'nd_1',
            fx: 3,
            fy: 2,
            fz: -1,
            mx: 0,
            my: 0,
            mz: 0,
          },
        ],
      ]);

      const result = accumulateNodalForces(existing, newForces);

      expect(result.get('nd_1')?.fx).toBeCloseTo(13, 5);
      expect(result.get('nd_1')?.fy).toBeCloseTo(7, 5);
      expect(result.get('nd_1')?.fz).toBeCloseTo(-1, 5);
    });

    test('adds new nodes from new forces', () => {
      const existing = new Map<string, NodalForce>([
        [
          'nd_1',
          {
            nodeId: 'nd_1',
            fx: 10,
            fy: 0,
            fz: 0,
            mx: 0,
            my: 0,
            mz: 0,
          },
        ],
      ]);

      const newForces = new Map<string, NodalForce>([
        [
          'nd_2',
          {
            nodeId: 'nd_2',
            fx: 5,
            fy: 0,
            fz: 0,
            mx: 0,
            my: 0,
            mz: 0,
          },
        ],
      ]);

      const result = accumulateNodalForces(existing, newForces);

      expect(result.size).toBe(2);
      expect(result.get('nd_1')?.fx).toBeCloseTo(10, 5);
      expect(result.get('nd_2')?.fx).toBeCloseTo(5, 5);
    });
  });

  describe('Integration Tests', () => {
    test('area load on simple wall produces correct total force', () => {
      // 5m wide × 3m tall wall with 2 kN/m² wind load
      const shellElement = {
        id: 'se_wall',
        nodeIds: ['nd_1', 'nd_2', 'nd_3', 'nd_4'],
        thickness: 200,
        materialId: 'mat_1',
        elementType: 'quad4' as const,
      };

      const nodeCoords = [
        { x: 0, y: 0, z: 0 },
        { x: 5000, y: 0, z: 0 },
        { x: 5000, y: 0, z: 3000 },
        { x: 0, y: 0, z: 3000 },
      ];

      const nodalForces = distributeAreaLoad(
        shellElement,
        nodeCoords,
        0.002, // 2 kN/m² = 0.002 N/mm²
        'gravity',
        true
      );

      // Calculate total force
      let totalFz = 0;
      for (const [_, forces] of nodalForces) {
        totalFz += forces.fz;
      }

      // Expected: 5m × 3m × 2 kN/m² = 30 kN = 30,000 N downward
      expect(totalFz).toBeCloseTo(-30000, 1);
    });

    test('multiple elements distribute load correctly', () => {
      // Two 1m × 1m elements, each with 4 kN/m² load
      const element1 = {
        id: 'se_1',
        nodeIds: ['nd_1', 'nd_2', 'nd_3', 'nd_4'],
        thickness: 200,
        materialId: 'mat_1',
        elementType: 'quad4' as const,
      };

      const element2 = {
        id: 'se_2',
        nodeIds: ['nd_2', 'nd_5', 'nd_6', 'nd_3'],
        thickness: 200,
        materialId: 'mat_1',
        elementType: 'quad4' as const,
      };

      const coords1 = [
        { x: 0, y: 0, z: 0 },
        { x: 1000, y: 0, z: 0 },
        { x: 1000, y: 0, z: 1000 },
        { x: 0, y: 0, z: 1000 },
      ];

      const coords2 = [
        { x: 1000, y: 0, z: 0 },
        { x: 2000, y: 0, z: 0 },
        { x: 2000, y: 0, z: 1000 },
        { x: 1000, y: 0, z: 1000 },
      ];

      // 4 kN/m² = 0.004 N/mm²
      const forces1 = distributeAreaLoad(element1, coords1, 0.004, 'gravity', true);
      const forces2 = distributeAreaLoad(element2, coords2, 0.004, 'gravity', true);

      // Accumulate forces (nodes 2 and 3 are shared)
      const totalForces = accumulateNodalForces(forces1, forces2);

      // Shared nodes should have double the force
      // Each element: 1,000,000 mm² × 0.004 N/mm² = 4,000 N, 1,000 N per node
      expect(forces1.get('nd_1')?.fz).toBeCloseTo(-1000, 1);
      expect(forces1.get('nd_2')?.fz).toBeCloseTo(-1000, 1);

      // Shared node nd_2: should get force from both elements = 2,000 N
      expect(totalForces.get('nd_2')?.fz).toBeCloseTo(-2000, 1);
    });
  });
});
