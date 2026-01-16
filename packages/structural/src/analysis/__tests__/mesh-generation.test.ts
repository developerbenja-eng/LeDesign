// ============================================================
// MESH GENERATION TESTS
// Unit tests for wall and slab mesh generation
// ============================================================

import {
  generateWallMesh,
  generateSlabMesh,
  validateElementQuality,
  createNodeEntities,
  createShellElementEntities,
} from '../mesh-generation';
import { Wall, Slab } from '../types';

describe('Mesh Generation', () => {
  describe('Wall Mesh Generation', () => {
    test('generates mesh for rectangular wall', () => {
      const wall: Partial<Wall> = {
        id: 'wl_test',
        corner_nodes: [
          { x: 0, y: 0, z: 0 },
          { x: 5000, y: 0, z: 0 },
          { x: 5000, y: 0, z: 3000 },
          { x: 0, y: 0, z: 3000 },
        ] as any,
      };

      const { meshNodes, shellElements } = generateWallMesh(
        wall as Wall,
        'proj_test',
        1000 // 1m mesh size
      );

      // Wall is 5m × 3m with 1m mesh
      // Should have 6×4 = 24 nodes (nx+1)×(ny+1)
      expect(meshNodes.length).toBe(24);

      // Should have 5×3 = 15 elements
      expect(shellElements.length).toBe(15);

      // Check first node is at origin
      expect(meshNodes[0].x).toBeCloseTo(0, 1);
      expect(meshNodes[0].y).toBeCloseTo(0, 1);
      expect(meshNodes[0].z).toBeCloseTo(0, 1);

      // Check last node is at top-right corner
      const lastNode = meshNodes[meshNodes.length - 1];
      expect(lastNode.x).toBeCloseTo(5000, 1);
      expect(lastNode.y).toBeCloseTo(0, 1);
      expect(lastNode.z).toBeCloseTo(3000, 1);
    });

    test('generates coarse mesh with larger mesh size', () => {
      const wall: Partial<Wall> = {
        id: 'wl_test',
        corner_nodes: [
          { x: 0, y: 0, z: 0 },
          { x: 6000, y: 0, z: 0 },
          { x: 6000, y: 0, z: 3000 },
          { x: 0, y: 0, z: 3000 },
        ] as any,
      };

      const { meshNodes, shellElements } = generateWallMesh(
        wall as Wall,
        'proj_test',
        3000 // 3m mesh size (coarse)
      );

      // With 3m mesh: nx=2, ny=1
      // Nodes: (2+1)×(1+1) = 6
      expect(meshNodes.length).toBe(6);

      // Elements: 2×1 = 2
      expect(shellElements.length).toBe(2);
    });

    test('wall mesh elements have correct connectivity', () => {
      const wall: Partial<Wall> = {
        id: 'wl_test',
        corner_nodes: [
          { x: 0, y: 0, z: 0 },
          { x: 2000, y: 0, z: 0 },
          { x: 2000, y: 0, z: 2000 },
          { x: 0, y: 0, z: 2000 },
        ] as any,
      };

      const { meshNodes, shellElements } = generateWallMesh(
        wall as Wall,
        'proj_test',
        1000
      );

      // Check first element connectivity
      const elem0 = shellElements[0];
      expect(elem0.nodes.length).toBe(4);

      // Verify nodes are in meshNodes array
      for (const nodeId of elem0.nodes) {
        const node = meshNodes.find(n => n.id === nodeId);
        expect(node).toBeDefined();
      }
    });

    test('wall mesh elements have valid areas', () => {
      const wall: Partial<Wall> = {
        id: 'wl_test',
        corner_nodes: [
          { x: 0, y: 0, z: 0 },
          { x: 1000, y: 0, z: 0 },
          { x: 1000, y: 0, z: 1000 },
          { x: 0, y: 0, z: 1000 },
        ] as any,
      };

      const { shellElements } = generateWallMesh(wall as Wall, 'proj_test', 1000);

      // Single 1m×1m element should have area ≈ 1,000,000 mm²
      expect(shellElements.length).toBe(1);
      expect(shellElements[0].area).toBeCloseTo(1000000, 0);
    });

    test('throws error for invalid corner node count', () => {
      const wall: Partial<Wall> = {
        id: 'wl_test',
        corner_nodes: [
          { x: 0, y: 0, z: 0 },
          { x: 1000, y: 0, z: 0 },
          { x: 1000, y: 0, z: 1000 },
        ] as any, // Only 3 nodes
      };

      expect(() => {
        generateWallMesh(wall as Wall, 'proj_test', 1000);
      }).toThrow('Wall must have exactly 4 corner nodes');
    });
  });

  describe('Slab Mesh Generation', () => {
    test('generates mesh for rectangular slab', () => {
      const slab: Partial<Slab> = {
        id: 'sl_test',
        boundary_nodes: [
          { x: 0, y: 0, z: 0 },
          { x: 5000, y: 0, z: 0 },
          { x: 5000, y: 0, z: 5000 },
          { x: 0, y: 0, z: 5000 },
        ] as any,
        openings: [] as any,
      };

      const { meshNodes, shellElements } = generateSlabMesh(
        slab as Slab,
        'proj_test',
        2000
      );

      // Should have at least boundary nodes
      expect(meshNodes.length).toBeGreaterThanOrEqual(4);

      // Should have triangulated elements
      expect(shellElements.length).toBeGreaterThan(0);

      // All elements should be triangles (fan triangulation)
      for (const elem of shellElements) {
        expect(elem.nodes.length).toBe(3);
      }
    });

    test('slab mesh elements have positive areas', () => {
      const slab: Partial<Slab> = {
        id: 'sl_test',
        boundary_nodes: [
          { x: 0, y: 0, z: 0 },
          { x: 1000, y: 0, z: 0 },
          { x: 1000, y: 0, z: 1000 },
          { x: 0, y: 0, z: 1000 },
        ] as any,
        openings: [] as any,
      };

      const { shellElements } = generateSlabMesh(slab as Slab, 'proj_test', 1000);

      for (const elem of shellElements) {
        expect(elem.area).toBeGreaterThan(0);
      }
    });

    test('throws error for invalid boundary node count', () => {
      const slab: Partial<Slab> = {
        id: 'sl_test',
        boundary_nodes: [
          { x: 0, y: 0, z: 0 },
          { x: 1000, y: 0, z: 0 },
        ] as any, // Only 2 nodes
        openings: [] as any,
      };

      expect(() => {
        generateSlabMesh(slab as Slab, 'proj_test', 1000);
      }).toThrow('Slab must have at least 3 boundary nodes');
    });

    test('slab mesh respects Y coordinate of boundary nodes', () => {
      const slab: Partial<Slab> = {
        id: 'sl_test',
        boundary_nodes: [
          { x: 0, y: 3000, z: 0 },
          { x: 1000, y: 3000, z: 0 },
          { x: 1000, y: 3000, z: 1000 },
          { x: 0, y: 3000, z: 1000 },
        ] as any,
        openings: [] as any,
      };

      const { meshNodes } = generateSlabMesh(slab as Slab, 'proj_test', 1000);

      // All boundary nodes should have Y ≈ 3000
      for (let i = 0; i < 4; i++) {
        expect(meshNodes[i].y).toBeCloseTo(3000, 1);
      }
    });
  });

  describe('Mesh Quality Validation', () => {
    test('valid square quad passes quality check', () => {
      const nodes: [any, any, any, any] = [
        { x: 0, y: 0, z: 0 },
        { x: 1000, y: 0, z: 0 },
        { x: 1000, y: 0, z: 1000 },
        { x: 0, y: 0, z: 1000 },
      ];

      const quality = validateElementQuality(nodes);

      expect(quality.isValid).toBe(true);
      expect(quality.aspectRatio).toBeCloseTo(1.0, 1);
      expect(quality.minAngle).toBeGreaterThan(80);
      expect(quality.maxAngle).toBeLessThan(100);
      expect(quality.jacobianOK).toBe(true);
    });

    test('high aspect ratio quad triggers warning', () => {
      const nodes: [any, any, any, any] = [
        { x: 0, y: 0, z: 0 },
        { x: 100, y: 0, z: 0 },
        { x: 100, y: 0, z: 2000 },
        { x: 0, y: 0, z: 2000 },
      ];

      const quality = validateElementQuality(nodes);

      expect(quality.isValid).toBe(true);
      expect(quality.aspectRatio).toBeGreaterThan(10);
      expect(quality.warnings.length).toBeGreaterThan(0);
      expect(quality.warnings[0]).toContain('aspect ratio');
    });

    test('degenerate quad with zero area fails', () => {
      const nodes: [any, any, any, any] = [
        { x: 0, y: 0, z: 0 },
        { x: 1000, y: 0, z: 0 },
        { x: 1000, y: 0, z: 0 }, // Duplicate node
        { x: 0, y: 0, z: 0 },
      ];

      const quality = validateElementQuality(nodes);

      expect(quality.isValid).toBe(false);
      expect(quality.warnings.some(w => w.includes('Degenerate'))).toBe(true);
    });

    test('valid triangle passes quality check', () => {
      const nodes: [any, any, any] = [
        { x: 0, y: 0, z: 0 },
        { x: 1000, y: 0, z: 0 },
        { x: 500, y: 0, z: 866 }, // Equilateral triangle
      ];

      const quality = validateElementQuality(nodes);

      expect(quality.isValid).toBe(true);
      expect(quality.minAngle).toBeGreaterThan(50);
      expect(quality.maxAngle).toBeLessThan(70);
      expect(quality.jacobianOK).toBe(true);
    });

    test('triangle with acute angle triggers warning', () => {
      const nodes: [any, any, any] = [
        { x: 0, y: 0, z: 0 },
        { x: 1000, y: 0, z: 0 },
        { x: 900, y: 0, z: 50 }, // Very acute triangle
      ];

      const quality = validateElementQuality(nodes);

      expect(quality.isValid).toBe(true);
      expect(quality.warnings.length).toBeGreaterThan(0);
      expect(quality.warnings[0]).toContain('angle');
    });

    test('degenerate triangle fails', () => {
      const nodes: [any, any, any] = [
        { x: 0, y: 0, z: 0 },
        { x: 1000, y: 0, z: 0 },
        { x: 500, y: 0, z: 0 }, // Collinear points
      ];

      const quality = validateElementQuality(nodes);

      expect(quality.isValid).toBe(false);
    });
  });

  describe('Entity Conversion', () => {
    test('creates node entities with correct structure', () => {
      const meshNodes = [
        { id: 'nd_1', x: 0, y: 0, z: 0 },
        { id: 'nd_2', x: 1000, y: 0, z: 0 },
        { id: 'nd_3', x: 1000, y: 0, z: 1000 },
      ];

      const nodeEntities = createNodeEntities(meshNodes, 'proj_1', 'st_1');

      expect(nodeEntities.length).toBe(3);
      expect(nodeEntities[0].id).toBe('nd_1');
      expect(nodeEntities[0].project_id).toBe('proj_1');
      expect(nodeEntities[0].story_id).toBe('st_1');
      expect(nodeEntities[0].x).toBe(0);
      expect(nodeEntities[0].support_type).toBeNull();
    });

    test('creates quad shell element entities', () => {
      const shellElements = [
        {
          nodes: ['nd_1', 'nd_2', 'nd_3', 'nd_4'] as [string, string, string, string],
          centroid: { x: 500, y: 0, z: 500 },
          area: 1000000,
        },
      ];

      const elementEntities = createShellElementEntities(
        shellElements,
        'wl_1',
        'wall',
        'proj_1',
        200,
        'mat_1'
      );

      expect(elementEntities.length).toBe(1);
      expect(elementEntities[0].parent_id).toBe('wl_1');
      expect(elementEntities[0].parent_type).toBe('wall');
      expect(elementEntities[0].element_type).toBe('quad4');
      expect(elementEntities[0].node_1_id).toBe('nd_1');
      expect(elementEntities[0].node_4_id).toBe('nd_4');
      expect(elementEntities[0].thickness).toBe(200);
      expect(elementEntities[0].material_id).toBe('mat_1');
    });

    test('creates triangle shell element entities', () => {
      const shellElements = [
        {
          nodes: ['nd_1', 'nd_2', 'nd_3'] as [string, string, string],
          centroid: { x: 500, y: 0, z: 500 },
          area: 500000,
        },
      ];

      const elementEntities = createShellElementEntities(
        shellElements,
        'sl_1',
        'slab',
        'proj_1',
        150,
        null
      );

      expect(elementEntities.length).toBe(1);
      expect(elementEntities[0].parent_id).toBe('sl_1');
      expect(elementEntities[0].parent_type).toBe('slab');
      expect(elementEntities[0].element_type).toBe('tri3');
      expect(elementEntities[0].node_1_id).toBe('nd_1');
      expect(elementEntities[0].node_4_id).toBeNull();
      expect(elementEntities[0].thickness).toBe(150);
      expect(elementEntities[0].material_id).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    test('handles wall with very small mesh size', () => {
      const wall: Partial<Wall> = {
        id: 'wl_test',
        corner_nodes: [
          { x: 0, y: 0, z: 0 },
          { x: 1000, y: 0, z: 0 },
          { x: 1000, y: 0, z: 1000 },
          { x: 0, y: 0, z: 1000 },
        ] as any,
      };

      const { meshNodes, shellElements } = generateWallMesh(
        wall as Wall,
        'proj_test',
        100 // Very fine mesh
      );

      // Should have many nodes and elements
      expect(meshNodes.length).toBeGreaterThan(100);
      expect(shellElements.length).toBeGreaterThan(90);
    });

    test('handles slab with minimum boundary nodes', () => {
      const slab: Partial<Slab> = {
        id: 'sl_test',
        boundary_nodes: [
          { x: 0, y: 0, z: 0 },
          { x: 1000, y: 0, z: 0 },
          { x: 500, y: 0, z: 866 },
        ] as any, // Triangle
        openings: [] as any,
      };

      const { meshNodes, shellElements } = generateSlabMesh(
        slab as Slab,
        'proj_test',
        1000
      );

      expect(meshNodes.length).toBeGreaterThanOrEqual(3);
      expect(shellElements.length).toBeGreaterThanOrEqual(1);
    });

    test('mesh generation is deterministic', () => {
      const wall: Partial<Wall> = {
        id: 'wl_test',
        corner_nodes: [
          { x: 0, y: 0, z: 0 },
          { x: 1000, y: 0, z: 0 },
          { x: 1000, y: 0, z: 1000 },
          { x: 0, y: 0, z: 1000 },
        ] as any,
      };

      const result1 = generateWallMesh(wall as Wall, 'proj_test', 500);
      const result2 = generateWallMesh(wall as Wall, 'proj_test', 500);

      // Should generate same number of nodes and elements
      expect(result1.meshNodes.length).toBe(result2.meshNodes.length);
      expect(result1.shellElements.length).toBe(result2.shellElements.length);

      // Node coordinates should match (excluding IDs which are generated)
      for (let i = 0; i < result1.meshNodes.length; i++) {
        expect(result1.meshNodes[i].x).toBeCloseTo(result2.meshNodes[i].x, 1);
        expect(result1.meshNodes[i].y).toBeCloseTo(result2.meshNodes[i].y, 1);
        expect(result1.meshNodes[i].z).toBeCloseTo(result2.meshNodes[i].z, 1);
      }
    });
  });
});
