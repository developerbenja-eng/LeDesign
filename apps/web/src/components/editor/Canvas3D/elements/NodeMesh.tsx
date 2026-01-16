'use client';

// ============================================================
// NODE MESH
// 3D representation of a structural node
// ============================================================

import { useRef, useState } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Sphere, Html } from '@react-three/drei';
import { StructuralNode } from '@ledesign/structural';
import * as THREE from 'three';

// Element colors
const COLORS = {
  default: '#94a3b8',
  selected: '#3b82f6',
  hovered: '#60a5fa',
  support: {
    free: '#94a3b8',
    pinned: '#22c55e',
    fixed: '#ef4444',
    roller: '#f59e0b',
    roller_x: '#f59e0b',
    roller_y: '#f59e0b',
    roller_z: '#f59e0b',
    spring: '#8b5cf6',
    custom: '#ec4899',
  },
};

interface NodeMeshProps {
  node: StructuralNode;
  isSelected?: boolean;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

export function NodeMesh({
  node,
  isSelected = false,
  onClick,
  onPointerEnter,
  onPointerLeave,
}: NodeMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Determine color based on state
  const getColor = () => {
    if (isSelected) return COLORS.selected;
    if (isHovered) return COLORS.hovered;
    return COLORS.support[node.support_type] || COLORS.default;
  };

  // Node size scales with support type
  const getSize = () => {
    if (node.support_type === 'fixed') return 0.4;
    if (node.support_type === 'pinned') return 0.35;
    return 0.3;
  };

  const handlePointerEnter = () => {
    setIsHovered(true);
    onPointerEnter?.();
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    onPointerLeave?.();
  };

  return (
    <group position={[node.x, node.y, node.z]}>
      {/* Node Sphere */}
      <Sphere
        ref={meshRef}
        args={[getSize(), 16, 16]}
        onClick={onClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <meshStandardMaterial
          color={getColor()}
          metalness={0.3}
          roughness={0.7}
          emissive={isSelected || isHovered ? getColor() : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : isHovered ? 0.15 : 0}
        />
      </Sphere>

      {/* Support Symbol */}
      {node.support_type !== 'free' && (
        <SupportSymbol supportType={node.support_type} />
      )}

      {/* Label (shown on hover or selection) */}
      {(isHovered || isSelected) && node.name && (
        <Html
          position={[0, 0.6, 0]}
          center
          className="pointer-events-none"
        >
          <div className="bg-lele-panel/90 px-2 py-1 rounded text-xs text-slate-200 whitespace-nowrap border border-lele-border">
            {node.name}
          </div>
        </Html>
      )}
    </group>
  );
}

// ============================================================
// SUPPORT SYMBOL
// Visual representation of support conditions
// ============================================================

interface SupportSymbolProps {
  supportType: StructuralNode['support_type'];
}

function SupportSymbol({ supportType }: SupportSymbolProps) {
  switch (supportType) {
    case 'fixed':
      return (
        <mesh position={[0, -0.3, 0]}>
          <boxGeometry args={[0.8, 0.15, 0.8]} />
          <meshStandardMaterial color="#ef4444" metalness={0.5} roughness={0.5} />
        </mesh>
      );

    case 'pinned':
      return (
        <mesh position={[0, -0.35, 0]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.35, 0.5, 3]} />
          <meshStandardMaterial color="#22c55e" metalness={0.5} roughness={0.5} />
        </mesh>
      );

    case 'roller_x':
    case 'roller_y':
    case 'roller_z':
      return (
        <group position={[0, -0.4, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.6, 16]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.2, 0]}>
            <boxGeometry args={[0.7, 0.05, 0.7]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.5} />
          </mesh>
        </group>
      );

    default:
      return null;
  }
}
