'use client';

// ============================================================
// BEAM MESH
// 3D representation of a structural beam with section profile
// ============================================================

import { useRef, useState, useMemo } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Beam, StructuralNode, Section, Material } from '@ledesign/structural';
import * as THREE from 'three';
import {
  createSectionGeometry,
  getDefaultDimensions,
} from '@/lib/three-geometry/section-geometry';
import {
  createMaterialByType,
  createElementMaterial,
  createDCRatioMaterial,
  ELEMENT_COLORS,
} from '@/lib/three-geometry/material-rendering';

interface BeamMeshProps {
  beam: Beam;
  startNode: StructuralNode;
  endNode: StructuralNode;
  section?: Section | null;
  material?: Material | null;
  isSelected?: boolean;
  dcRatio?: number;
  showDCColors?: boolean;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

export function BeamMesh({
  beam,
  startNode,
  endNode,
  section,
  material: materialEntity,
  isSelected = false,
  dcRatio,
  showDCColors = false,
  onClick,
  onPointerEnter,
  onPointerLeave,
}: BeamMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Calculate beam position, rotation, and length
  const { position, quaternion, length } = useMemo(() => {
    const start = new THREE.Vector3(startNode.x, startNode.y, startNode.z);
    const end = new THREE.Vector3(endNode.x, endNode.y, endNode.z);

    // Midpoint for positioning
    const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    // Length of beam
    const length = start.distanceTo(end);

    // Direction vector
    const direction = new THREE.Vector3().subVectors(end, start).normalize();

    // Calculate rotation to align Y-axis with direction
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);

    return {
      position: midpoint,
      quaternion,
      length,
    };
  }, [startNode, endNode]);

  // Create section geometry (uses cache internally)
  const geometry = useMemo(() => {
    if (section?.section_type && section?.dimensions) {
      // Use actual section profile
      return createSectionGeometry(
        section.section_type,
        section.dimensions,
        length,
        { segments: 1 }
      );
    }
    // Fallback to default W-shape
    const defaultDim = getDefaultDimensions('w_shape');
    return createSectionGeometry('w_shape', defaultDim, length, { segments: 1 });
  }, [section, length]);

  // Create material based on material type, element default, or D/C ratio
  const threeMaterial = useMemo(() => {
    const state = isSelected ? 'selected' : isHovered ? 'hovered' : 'default';

    // Selection and hover states take priority over D/C coloring
    if (state !== 'default') {
      if (materialEntity) {
        return createMaterialByType(materialEntity.material_type, state);
      }
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
      quaternion={quaternion}
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
