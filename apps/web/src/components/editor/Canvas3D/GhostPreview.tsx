'use client';

// ============================================================
// GHOST PREVIEW
// Shows translucent preview of elements while drawing
// ============================================================

import { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useEditorStore } from '@/stores';
import { DrawingTool } from '@/stores/slices/types';

// Ghost colors
const GHOST_COLOR = '#3b82f6';
const GHOST_OPACITY = 0.4;

interface GhostPreviewProps {
  groundRef: React.RefObject<THREE.Mesh | null>;
}

export function GhostPreview({ groundRef }: GhostPreviewProps) {
  const activeTool = useEditorStore((state) => state.activeTool);
  const gridSize = useEditorStore((state) => state.gridSize);
  const snapToGrid = useEditorStore((state) => state.snapToGrid);
  const nodes = useEditorStore((state) => state.nodes);
  const isDrawing = useEditorStore((state) => state.isDrawing);
  const drawingStartNodeId = useEditorStore((state) => state.drawingStartNodeId);

  const [mousePosition, setMousePosition] = useState<THREE.Vector3 | null>(null);
  const { raycaster, camera, pointer } = useThree();

  // Snap position to grid
  const snapPosition = useCallback(
    (pos: THREE.Vector3): THREE.Vector3 => {
      if (!snapToGrid) return pos;
      return new THREE.Vector3(
        Math.round(pos.x / gridSize) * gridSize,
        pos.y,
        Math.round(pos.z / gridSize) * gridSize
      );
    },
    [gridSize, snapToGrid]
  );

  // Update mouse position each frame
  useFrame(() => {
    if (!groundRef.current) return;
    if (!['node', 'beam', 'column', 'brace'].includes(activeTool)) {
      setMousePosition(null);
      return;
    }

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(groundRef.current);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const snapped = snapPosition(point);
      setMousePosition(snapped);
    } else {
      setMousePosition(null);
    }
  });

  if (!mousePosition) return null;

  // Get start node for linear elements
  const startNode = drawingStartNodeId ? nodes.get(drawingStartNodeId) : null;

  return (
    <group>
      {/* Node Ghost */}
      {activeTool === 'node' && (
        <GhostNode position={mousePosition} />
      )}

      {/* Linear element ghosts */}
      {['beam', 'column', 'brace'].includes(activeTool) && (
        <>
          {/* Show cursor node when not drawing */}
          {!isDrawing && (
            <GhostNode position={mousePosition} showSnapIndicator />
          )}

          {/* Show line preview when drawing */}
          {isDrawing && startNode && (
            <GhostLine
              start={new THREE.Vector3(startNode.x, startNode.y, startNode.z)}
              end={mousePosition}
              tool={activeTool as 'beam' | 'column' | 'brace'}
            />
          )}
        </>
      )}

      {/* Dimension annotation */}
      {isDrawing && startNode && mousePosition && (
        <DimensionAnnotation
          start={new THREE.Vector3(startNode.x, startNode.y, startNode.z)}
          end={mousePosition}
        />
      )}
    </group>
  );
}

// ============================================================
// GHOST NODE
// Translucent sphere preview
// ============================================================

interface GhostNodeProps {
  position: THREE.Vector3;
  showSnapIndicator?: boolean;
}

function GhostNode({ position, showSnapIndicator }: GhostNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Subtle animation
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(clock.elapsedTime * 3) * 0.1;
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group position={position}>
      {/* Main ghost sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial
          color={GHOST_COLOR}
          transparent
          opacity={GHOST_OPACITY}
          depthWrite={false}
        />
      </mesh>

      {/* Outer glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.5, 32]} />
        <meshBasicMaterial
          color={GHOST_COLOR}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Snap indicator crosshair */}
      {showSnapIndicator && (
        <>
          <Line
            points={[[-0.5, 0, 0], [0.5, 0, 0]]}
            color={GHOST_COLOR}
            lineWidth={1}
            transparent
            opacity={0.5}
          />
          <Line
            points={[[0, 0, -0.5], [0, 0, 0.5]]}
            color={GHOST_COLOR}
            lineWidth={1}
            transparent
            opacity={0.5}
          />
        </>
      )}
    </group>
  );
}

// ============================================================
// GHOST LINE
// Preview for beams, columns, braces
// ============================================================

interface GhostLineProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  tool: 'beam' | 'column' | 'brace';
}

function GhostLine({ start, end, tool }: GhostLineProps) {
  const lineRef = useRef<THREE.Line>(null);

  // Calculate line properties
  const midpoint = new THREE.Vector3().lerpVectors(start, end, 0.5);
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();

  // Element thickness based on type
  const thickness = tool === 'column' ? 0.15 : 0.1;

  // Calculate rotation to align cylinder with line
  const up = new THREE.Vector3(0, 1, 0);
  direction.normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);

  return (
    <group>
      {/* Line preview */}
      <Line
        points={[start, end]}
        color={GHOST_COLOR}
        lineWidth={2}
        transparent
        opacity={0.6}
        dashed
        dashSize={0.3}
        gapSize={0.15}
      />

      {/* Cylinder preview */}
      <mesh position={midpoint} quaternion={quaternion}>
        <cylinderGeometry args={[thickness, thickness, length, 8]} />
        <meshStandardMaterial
          color={GHOST_COLOR}
          transparent
          opacity={GHOST_OPACITY}
          depthWrite={false}
        />
      </mesh>

      {/* End node indicator */}
      <GhostNode position={end} />
    </group>
  );
}

// ============================================================
// DIMENSION ANNOTATION
// Shows length while drawing
// ============================================================

interface DimensionAnnotationProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
}

function DimensionAnnotation({ start, end }: DimensionAnnotationProps) {
  const length = start.distanceTo(end);
  const midpoint = new THREE.Vector3().lerpVectors(start, end, 0.5);
  midpoint.y += 0.8; // Offset above the line

  if (length < 0.1) return null;

  return (
    <group position={midpoint}>
      {/* Background pill */}
      <mesh>
        <planeGeometry args={[1.5, 0.4]} />
        <meshBasicMaterial
          color="#1e293b"
          transparent
          opacity={0.9}
          depthTest={false}
        />
      </mesh>

      {/* Text */}
      <Text
        fontSize={0.25}
        color="#e2e8f0"
        anchorX="center"
        anchorY="middle"
        depthOffset={-1}
      >
        {length.toFixed(2)}m
      </Text>
    </group>
  );
}
