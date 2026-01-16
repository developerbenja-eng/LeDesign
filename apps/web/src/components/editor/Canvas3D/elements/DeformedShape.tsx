'use client';

// ============================================================
// DEFORMED SHAPE VISUALIZATION
// Renders deformed structure overlay with scaled displacements
// ============================================================

import { useMemo } from 'react';
import { useEditorStore } from '@/stores';
import * as THREE from 'three';

interface DeformedNodeMeshProps {
  nodeId: string;
  originalX: number;
  originalY: number;
  originalZ: number;
  dx: number;
  dy: number;
  dz: number;
  scale: number;
}

function DeformedNodeMesh({ originalX, originalY, originalZ, dx, dy, dz, scale }: DeformedNodeMeshProps) {
  const deformedPosition: [number, number, number] = [
    originalX + dx * scale,
    originalY + dy * scale,
    originalZ + dz * scale,
  ];

  return (
    <mesh position={deformedPosition}>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshStandardMaterial color="#22c55e" opacity={0.7} transparent />
    </mesh>
  );
}

interface DeformedBeamMeshProps {
  startNodeId: string;
  endNodeId: string;
  originalStart: [number, number, number];
  originalEnd: [number, number, number];
  deformedStart: [number, number, number];
  deformedEnd: [number, number, number];
}

function DeformedBeamMesh({ deformedStart, deformedEnd }: DeformedBeamMeshProps) {
  const geometry = useMemo(() => {
    const start = new THREE.Vector3(...deformedStart);
    const end = new THREE.Vector3(...deformedEnd);
    const direction = end.clone().sub(start);
    const length = direction.length();

    const geometry = new THREE.CylinderGeometry(0.06, 0.06, length, 8);
    geometry.rotateX(Math.PI / 2);
    geometry.translate(0, 0, length / 2);

    return geometry;
  }, [deformedStart, deformedEnd]);

  const position = useMemo(() => {
    return deformedStart;
  }, [deformedStart]);

  const rotation = useMemo(() => {
    const start = new THREE.Vector3(...deformedStart);
    const end = new THREE.Vector3(...deformedEnd);
    const direction = end.clone().sub(start).normalize();

    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);

    const euler = new THREE.Euler();
    euler.setFromQuaternion(quaternion);

    return [euler.x, euler.y, euler.z] as [number, number, number];
  }, [deformedStart, deformedEnd]);

  return (
    <mesh position={position} rotation={rotation} geometry={geometry}>
      <meshStandardMaterial color="#22c55e" opacity={0.6} transparent />
    </mesh>
  );
}

export function DeformedShape() {
  const showDeformedShape = useEditorStore((state) => state.showDeformedShape);
  const deformationScale = useEditorStore((state) => state.deformationScale);
  const activeRunId = useEditorStore((state) => state.activeRunId);
  const activeCombinationId = useEditorStore((state) => state.activeCombinationId);
  const nodeResults = useEditorStore((state) => state.nodeResults);
  const nodes = useEditorStore((state) => state.nodes);
  const beams = useEditorStore((state) => state.beams);
  const columns = useEditorStore((state) => state.columns);
  const braces = useEditorStore((state) => state.braces);

  // Don't render if deformed shape is hidden or no active run
  if (!showDeformedShape || !activeRunId || !activeCombinationId) {
    return null;
  }

  const results = nodeResults.get(activeRunId);
  if (!results || results.length === 0) {
    return null;
  }

  // Create a map of node displacements for quick lookup
  const displacementsMap = useMemo(() => {
    const map = new Map<string, { dx: number; dy: number; dz: number }>();
    results.forEach((result) => {
      if (result.combination_id === activeCombinationId) {
        map.set(result.node_id, {
          dx: result.dx || 0,
          dy: result.dy || 0,
          dz: result.dz || 0,
        });
      }
    });
    return map;
  }, [results, activeCombinationId]);

  // Calculate deformed node positions
  const deformedNodes = useMemo(() => {
    const deformed = new Map<string, [number, number, number]>();
    nodes.forEach((node) => {
      const displacement = displacementsMap.get(node.id);
      if (displacement) {
        deformed.set(node.id, [
          node.x + displacement.dx * deformationScale,
          node.y + displacement.dy * deformationScale,
          node.z + displacement.dz * deformationScale,
        ]);
      } else {
        deformed.set(node.id, [node.x, node.y, node.z]);
      }
    });
    return deformed;
  }, [nodes, displacementsMap, deformationScale]);

  return (
    <group>
      {/* Render deformed nodes */}
      {Array.from(nodes.values()).map((node) => {
        const displacement = displacementsMap.get(node.id);
        if (!displacement) return null;

        return (
          <DeformedNodeMesh
            key={`deformed-node-${node.id}`}
            nodeId={node.id}
            originalX={node.x}
            originalY={node.y}
            originalZ={node.z}
            dx={displacement.dx}
            dy={displacement.dy}
            dz={displacement.dz}
            scale={deformationScale}
          />
        );
      })}

      {/* Render deformed beams */}
      {Array.from(beams.values()).map((beam) => {
        const nodeI = nodes.get(beam.node_i_id);
        const nodeJ = nodes.get(beam.node_j_id);
        if (!nodeI || !nodeJ) return null;

        const deformedStartPos = deformedNodes.get(beam.node_i_id);
        const deformedEndPos = deformedNodes.get(beam.node_j_id);
        if (!deformedStartPos || !deformedEndPos) return null;

        return (
          <DeformedBeamMesh
            key={`deformed-beam-${beam.id}`}
            startNodeId={beam.node_i_id}
            endNodeId={beam.node_j_id}
            originalStart={[nodeI.x, nodeI.y, nodeI.z]}
            originalEnd={[nodeJ.x, nodeJ.y, nodeJ.z]}
            deformedStart={deformedStartPos}
            deformedEnd={deformedEndPos}
          />
        );
      })}

      {/* Render deformed columns */}
      {Array.from(columns.values()).map((column) => {
        const nodeI = nodes.get(column.node_i_id);
        const nodeJ = nodes.get(column.node_j_id);
        if (!nodeI || !nodeJ) return null;

        const deformedStartPos = deformedNodes.get(column.node_i_id);
        const deformedEndPos = deformedNodes.get(column.node_j_id);
        if (!deformedStartPos || !deformedEndPos) return null;

        return (
          <DeformedBeamMesh
            key={`deformed-column-${column.id}`}
            startNodeId={column.node_i_id}
            endNodeId={column.node_j_id}
            originalStart={[nodeI.x, nodeI.y, nodeI.z]}
            originalEnd={[nodeJ.x, nodeJ.y, nodeJ.z]}
            deformedStart={deformedStartPos}
            deformedEnd={deformedEndPos}
          />
        );
      })}

      {/* Render deformed braces */}
      {Array.from(braces.values()).map((brace) => {
        const nodeI = nodes.get(brace.node_i_id);
        const nodeJ = nodes.get(brace.node_j_id);
        if (!nodeI || !nodeJ) return null;

        const deformedStartPos = deformedNodes.get(brace.node_i_id);
        const deformedEndPos = deformedNodes.get(brace.node_j_id);
        if (!deformedStartPos || !deformedEndPos) return null;

        return (
          <DeformedBeamMesh
            key={`deformed-brace-${brace.id}`}
            startNodeId={brace.node_i_id}
            endNodeId={brace.node_j_id}
            originalStart={[nodeI.x, nodeI.y, nodeI.z]}
            originalEnd={[nodeJ.x, nodeJ.y, nodeJ.z]}
            deformedStart={deformedStartPos}
            deformedEnd={deformedEndPos}
          />
        );
      })}
    </group>
  );
}
