'use client';

// ============================================================
// BRACE MESH
// 3D representation of a structural brace
// ============================================================

import { useRef, useState, useMemo } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Brace, StructuralNode } from '@ledesign/structural';
import * as THREE from 'three';
import {
  createElementMaterial,
  createDCRatioMaterial,
} from '@/lib/three-geometry/material-rendering';

interface BraceMeshProps {
  brace: Brace;
  startNode: StructuralNode;
  endNode: StructuralNode;
  isSelected?: boolean;
  dcRatio?: number;
  showDCColors?: boolean;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

export function BraceMesh({
  brace,
  startNode,
  endNode,
  isSelected = false,
  dcRatio,
  showDCColors = false,
  onClick,
  onPointerEnter,
  onPointerLeave,
}: BraceMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Calculate brace geometry
  const { position, rotation, length } = useMemo(() => {
    const start = new THREE.Vector3(startNode.x, startNode.y, startNode.z);
    const end = new THREE.Vector3(endNode.x, endNode.y, endNode.z);

    const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const length = start.distanceTo(end);

    const direction = new THREE.Vector3().subVectors(end, start).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);

    return {
      position: midpoint,
      rotation: euler,
      length,
    };
  }, [startNode, endNode]);

  // Brace is typically a circular section
  const braceRadius = 0.08;

  // Create material based on state and D/C ratio
  const threeMaterial = useMemo(() => {
    const state = isSelected ? 'selected' : isHovered ? 'hovered' : 'default';

    // Selection and hover states take priority over D/C coloring
    if (state !== 'default') {
      return createElementMaterial('brace', state);
    }

    // D/C ratio coloring when enabled and ratio is available
    if (showDCColors && dcRatio !== undefined) {
      return createDCRatioMaterial(dcRatio);
    }

    // Default material
    return createElementMaterial('brace', state);
  }, [isSelected, isHovered, showDCColors, dcRatio]);

  const handlePointerEnter = () => {
    setIsHovered(true);
    onPointerEnter?.();
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    onPointerLeave?.();
  };

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      onClick={onClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      material={threeMaterial}
    >
      <cylinderGeometry args={[braceRadius, braceRadius, length, 8]} />
    </mesh>
  );
}
