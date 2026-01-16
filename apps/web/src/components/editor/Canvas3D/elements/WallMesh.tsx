'use client';

// ============================================================
// WALL MESH
// 3D representation of a structural wall (planar shell element)
// ============================================================

import { useRef, useState, useMemo } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Wall, Material } from '@ledesign/structural';
import * as THREE from 'three';
import {
  createMaterialByType,
  createElementMaterial,
  createDCRatioMaterial,
} from '@/lib/three-geometry/material-rendering';

interface WallMeshProps {
  wall: Wall;
  material?: Material | null;
  isSelected?: boolean;
  dcRatio?: number;
  showDCColors?: boolean;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

export function WallMesh({
  wall,
  material: materialEntity,
  isSelected = false,
  dcRatio,
  showDCColors = false,
  onClick,
  onPointerEnter,
  onPointerLeave,
}: WallMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Parse corner nodes (may be JSON string or object)
  const cornerNodes = useMemo(() => {
    const nodes = wall.corner_nodes as unknown;
    if (typeof nodes === 'string') {
      return JSON.parse(nodes);
    }
    return nodes as Array<{ x: number; y: number; z: number }>;
  }, [wall.corner_nodes]);

  // Create wall geometry from corner nodes
  const geometry = useMemo(() => {
    if (!cornerNodes || cornerNodes.length < 3) {
      // Fallback to default rectangle
      return new THREE.PlaneGeometry(1000, 3000);
    }

    // Create shape from corner nodes
    const shape = new THREE.Shape();
    shape.moveTo(cornerNodes[0].x, cornerNodes[0].z);
    for (let i = 1; i < cornerNodes.length; i++) {
      shape.lineTo(cornerNodes[i].x, cornerNodes[i].z);
    }
    shape.closePath();

    // Extrude shape by thickness
    const extrudeSettings = {
      depth: wall.thickness,
      bevelEnabled: false,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // Center the geometry
    geometry.computeBoundingBox();
    const center = new THREE.Vector3();
    geometry.boundingBox!.getCenter(center);
    geometry.translate(-center.x, 0, -center.z);

    return geometry;
  }, [cornerNodes, wall.thickness]);

  // Calculate wall position (average of corner nodes)
  const position = useMemo(() => {
    if (!cornerNodes || cornerNodes.length === 0) {
      return new THREE.Vector3(0, 0, 0);
    }

    const avgX = cornerNodes.reduce((sum: number, node: any) => sum + node.x, 0) / cornerNodes.length;
    const avgY = cornerNodes.reduce((sum: number, node: any) => sum + node.y, 0) / cornerNodes.length;
    const avgZ = cornerNodes.reduce((sum: number, node: any) => sum + node.z, 0) / cornerNodes.length;

    return new THREE.Vector3(avgX, avgY, avgZ);
  }, [cornerNodes]);

  // Create material based on material type, element default, or D/C ratio
  const threeMaterial = useMemo(() => {
    const state = isSelected ? 'selected' : isHovered ? 'hovered' : 'default';

    // Selection and hover states take priority over D/C coloring
    if (state !== 'default') {
      if (materialEntity) {
        return createMaterialByType(materialEntity.material_type, state);
      }
      // Use column color for walls (structural vertical element)
      return createElementMaterial('column', state);
    }

    // D/C ratio coloring when enabled and ratio is available
    if (showDCColors && dcRatio !== undefined) {
      return createDCRatioMaterial(dcRatio);
    }

    // Default material
    if (materialEntity) {
      return createMaterialByType(materialEntity.material_type, state);
    }
    return createElementMaterial('column', state);
  }, [materialEntity, isSelected, isHovered, showDCColors, dcRatio]);

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
      geometry={geometry}
      material={threeMaterial}
      onClick={onClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      castShadow
      receiveShadow
    />
  );
}
