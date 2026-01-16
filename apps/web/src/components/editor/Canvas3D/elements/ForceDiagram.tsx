'use client';

// ============================================================
// FORCE DIAGRAM VISUALIZATION
// Renders moment/shear/axial diagrams as 3D colored meshes
// ============================================================

import { useMemo } from 'react';
import { useEditorStore } from '@/stores';
import { buildForceDiagrams, getGlobalRange, calculateOffsetVector } from '@ledesign/structural/analysis';
import * as THREE from 'three';

export function ForceDiagram() {
  const showForcesDiagram = useEditorStore((state) => state.showForcesDiagram);
  const diagramType = useEditorStore((state) => state.diagramType);
  const activeRunId = useEditorStore((state) => state.activeRunId);
  const activeCombinationId = useEditorStore((state) => state.activeCombinationId);
  const memberResults = useEditorStore((state) => state.memberResults);
  const beams = useEditorStore((state) => state.beams);
  const columns = useEditorStore((state) => state.columns);
  const braces = useEditorStore((state) => state.braces);
  const nodes = useEditorStore((state) => state.nodes);

  // Build diagrams when dependencies change
  const diagrams = useMemo(() => {
    if (!showForcesDiagram || !activeRunId || !activeCombinationId) {
      return [];
    }

    const results = memberResults.get(activeRunId);
    if (!results || results.length === 0) {
      return [];
    }

    return buildForceDiagrams({
      beams,
      columns,
      braces,
      nodes,
      memberResults: results,
      diagramType,
      combinationId: activeCombinationId,
    });
  }, [
    showForcesDiagram,
    activeRunId,
    activeCombinationId,
    memberResults,
    diagramType,
    beams,
    columns,
    braces,
    nodes,
  ]);

  // Calculate global range for consistent scaling
  const globalRange = useMemo(() => {
    return getGlobalRange(diagrams);
  }, [diagrams]);

  // Auto-scale factor based on model size and force magnitude
  const autoScale = useMemo(() => {
    if (diagrams.length === 0) return 1;

    // Calculate average member length
    let totalLength = 0;
    let count = 0;

    for (const beam of beams.values()) {
      const nodeI = nodes.get(beam.node_i_id);
      const nodeJ = nodes.get(beam.node_j_id);
      if (nodeI && nodeJ) {
        const dx = nodeJ.x - nodeI.x;
        const dy = nodeJ.y - nodeI.y;
        const dz = nodeJ.z - nodeI.z;
        totalLength += Math.sqrt(dx * dx + dy * dy + dz * dz);
        count++;
      }
    }

    const avgLength = count > 0 ? totalLength / count : 1000;

    // Scale factor: show diagram at ~10% of member length for max value
    const maxAbsValue = Math.max(Math.abs(globalRange.max), Math.abs(globalRange.min));
    if (maxAbsValue === 0) return 1;

    return (avgLength * 0.1) / maxAbsValue;
  }, [diagrams, beams, nodes, globalRange]);

  if (!showForcesDiagram || diagrams.length === 0) {
    return null;
  }

  return (
    <group>
      {diagrams.map((diagram) => (
        <DiagramMesh
          key={diagram.memberId}
          diagram={diagram}
          scale={autoScale}
          globalRange={globalRange}
        />
      ))}
    </group>
  );
}

// ============================================================
// INDIVIDUAL DIAGRAM MESH
// ============================================================

interface DiagramMeshProps {
  diagram: ReturnType<typeof buildForceDiagrams>[number];
  scale: number;
  globalRange: { max: number; min: number };
}

function DiagramMesh({ diagram, scale, globalRange }: DiagramMeshProps) {
  const { points } = diagram;

  if (points.length < 2) return null;

  // Create geometry for diagram
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    // We'll create a tube-like mesh using triangles
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    // For each segment between points, create a quad
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];

      // Calculate offset vectors
      const offset1 = calculateOffsetVector(
        p1.position,
        p2.position,
        p1.value,
        scale
      );

      const offset2 = calculateOffsetVector(
        p1.position,
        p2.position,
        p2.value,
        scale
      );

      // Create quad vertices
      // Bottom edge (on member centerline)
      const v1 = [p1.position[0], p1.position[1], p1.position[2]];
      const v2 = [p2.position[0], p2.position[1], p2.position[2]];

      // Top edge (offset by force value)
      const v3 = [
        p1.position[0] + offset1[0],
        p1.position[1] + offset1[1],
        p1.position[2] + offset1[2],
      ];
      const v4 = [
        p2.position[0] + offset2[0],
        p2.position[1] + offset2[1],
        p2.position[2] + offset2[2],
      ];

      // Add vertices
      const baseIndex = positions.length / 3;
      positions.push(...v1, ...v2, ...v3, ...v4);

      // Add colors based on value (positive = red, negative = blue)
      const color1 = getColorForValue(p1.value, globalRange);
      const color2 = getColorForValue(p2.value, globalRange);

      colors.push(...color1, ...color2, ...color1, ...color2);

      // Add indices for two triangles forming a quad
      indices.push(
        baseIndex,
        baseIndex + 1,
        baseIndex + 2,
        baseIndex + 1,
        baseIndex + 3,
        baseIndex + 2
      );
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return geo;
  }, [points, scale, globalRange]);

  const material = useMemo(() => {
    return new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
      shininess: 30,
    });
  }, []);

  return <mesh geometry={geometry} material={material} />;
}

// ============================================================
// COLOR MAPPING
// ============================================================

/**
 * Map force value to color
 * Positive (tension/sagging) = Red gradient
 * Negative (compression/hogging) = Blue gradient
 * Zero = White
 */
function getColorForValue(value: number, globalRange: { max: number; min: number }): [number, number, number] {
  const maxAbs = Math.max(Math.abs(globalRange.max), Math.abs(globalRange.min));

  if (maxAbs === 0) {
    return [1, 1, 1]; // White
  }

  const normalized = value / maxAbs;

  if (normalized > 0) {
    // Positive: White (0) → Red (1)
    const intensity = Math.min(normalized, 1);
    return [1, 1 - intensity * 0.8, 1 - intensity * 0.8]; // Red gradient
  } else if (normalized < 0) {
    // Negative: White (0) → Blue (-1)
    const intensity = Math.min(Math.abs(normalized), 1);
    return [1 - intensity * 0.8, 1 - intensity * 0.8, 1]; // Blue gradient
  } else {
    // Zero
    return [1, 1, 1]; // White
  }
}
