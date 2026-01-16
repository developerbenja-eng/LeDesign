'use client';

// ============================================================
// SLAB MESH
// 3D representation of a structural slab (floor/roof shell element)
// ============================================================

import { useRef, useState, useMemo } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Slab, Material } from '@ledesign/structural';
import * as THREE from 'three';
import {
  createMaterialByType,
  createElementMaterial,
  createDCRatioMaterial,
} from '@/lib/three-geometry/material-rendering';

interface SlabMeshProps {
  slab: Slab;
  material?: Material | null;
  isSelected?: boolean;
  dcRatio?: number;
  showDCColors?: boolean;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

export function SlabMesh({
  slab,
  material: materialEntity,
  isSelected = false,
  dcRatio,
  showDCColors = false,
  onClick,
  onPointerEnter,
  onPointerLeave,
}: SlabMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Parse boundary nodes (may be JSON string or object)
  const boundaryNodes = useMemo(() => {
    const nodes = slab.boundary_nodes as unknown;
    if (typeof nodes === 'string') {
      return JSON.parse(nodes);
    }
    return nodes as Array<{ x: number; y: number; z: number }>;
  }, [slab.boundary_nodes]);

  // Create slab geometry from boundary nodes
  const geometry = useMemo(() => {
    if (!boundaryNodes || boundaryNodes.length < 3) {
      // Fallback to default rectangle
      return new THREE.BoxGeometry(5000, slab.thickness, 5000);
    }

    // Create shape from boundary nodes (horizontal plane)
    const shape = new THREE.Shape();
    shape.moveTo(boundaryNodes[0].x, boundaryNodes[0].z);
    for (let i = 1; i < boundaryNodes.length; i++) {
      shape.lineTo(boundaryNodes[i].x, boundaryNodes[i].z);
    }
    shape.closePath();

    // Handle openings if present
    const openings = slab.openings as unknown;
    if (openings) {
      const openingsArray = typeof openings === 'string' ? JSON.parse(openings) : openings;
      if (Array.isArray(openingsArray) && openingsArray.length > 0) {
        for (const opening of openingsArray) {
          const holePath = new THREE.Path();
          holePath.moveTo(opening.nodes[0].x, opening.nodes[0].z);
          for (let i = 1; i < opening.nodes.length; i++) {
            holePath.lineTo(opening.nodes[i].x, opening.nodes[i].z);
          }
          holePath.closePath();
          shape.holes.push(holePath);
        }
      }
    }

    // Extrude shape by thickness
    const extrudeSettings = {
      depth: slab.thickness,
      bevelEnabled: false,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // Rotate to horizontal plane (XZ plane)
    geometry.rotateX(-Math.PI / 2);

    // Center the geometry
    geometry.computeBoundingBox();
    const center = new THREE.Vector3();
    geometry.boundingBox!.getCenter(center);
    geometry.translate(-center.x, 0, -center.z);

    return geometry;
  }, [boundaryNodes, slab.thickness, slab.openings]);

  // Calculate slab position (average of boundary nodes)
  const position = useMemo(() => {
    if (!boundaryNodes || boundaryNodes.length === 0) {
      return new THREE.Vector3(0, 0, 0);
    }

    const avgX = boundaryNodes.reduce((sum: number, node: any) => sum + node.x, 0) / boundaryNodes.length;
    const avgY = boundaryNodes.reduce((sum: number, node: any) => sum + node.y, 0) / boundaryNodes.length;
    const avgZ = boundaryNodes.reduce((sum: number, node: any) => sum + node.z, 0) / boundaryNodes.length;

    return new THREE.Vector3(avgX, avgY, avgZ);
  }, [boundaryNodes]);

  // Create material based on material type, element default, or D/C ratio
  const threeMaterial = useMemo(() => {
    const state = isSelected ? 'selected' : isHovered ? 'hovered' : 'default';

    // Selection and hover states take priority over D/C coloring
    if (state !== 'default') {
      if (materialEntity) {
        return createMaterialByType(materialEntity.material_type, state);
      }
      // Use beam color for slabs (structural horizontal element)
      return createElementMaterial('beam', state);
    }

    // D/C ratio coloring when enabled and ratio is available
    if (showDCColors && dcRatio !== undefined) {
      return createDCRatioMaterial(dcRatio);
    }

    // Default material
    if (materialEntity) {
      return createMaterialByType(materialEntity.material_type, state);
    }
    return createElementMaterial('beam', state);
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
