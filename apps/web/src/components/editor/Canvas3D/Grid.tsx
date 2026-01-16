'use client';

// ============================================================
// GRID
// Infinite grid with major/minor lines for the 3D scene
// ============================================================

import { Grid as DreiGrid } from '@react-three/drei';
import { useEditorStore } from '@/stores';

export function Grid() {
  const gridSize = useEditorStore((state) => state.gridSize);

  return (
    <DreiGrid
      position={[0, 0, 0]}
      args={[100, 100]}
      cellSize={gridSize}
      cellThickness={0.5}
      cellColor="#334155"
      sectionSize={gridSize * 5}
      sectionThickness={1}
      sectionColor="#475569"
      fadeDistance={100}
      fadeStrength={1}
      followCamera={false}
      infiniteGrid
    />
  );
}
