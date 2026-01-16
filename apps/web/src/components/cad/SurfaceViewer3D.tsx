/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import { useRef, useMemo } from 'react';
import { Canvas, extend } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { TINSurface } from '@/types/cad';
import { surfaceToGeometry } from '@/lib/landxml-parser';

// Extend Three.js objects for React Three Fiber
extend({
  Mesh: THREE.Mesh,
  BufferGeometry: THREE.BufferGeometry,
  MeshStandardMaterial: THREE.MeshStandardMaterial,
  AmbientLight: THREE.AmbientLight,
  DirectionalLight: THREE.DirectionalLight,
  AxesHelper: THREE.AxesHelper,
  Group: THREE.Group,
});

interface SurfaceMeshProps {
  surface: TINSurface;
  wireframe?: boolean;
}

function SurfaceMesh({ surface, wireframe = false }: SurfaceMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const { positions, indices, colors } = surfaceToGeometry(surface);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();

    return geo;
  }, [surface]);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      wireframe: wireframe,
      flatShading: true,
    });
  }, [wireframe]);

  // @ts-expect-error - React Three Fiber primitive type
  return <primitive object={new THREE.Mesh(geometry, material)} ref={meshRef} />;
}

function TerrainMesh({ mesh }: { mesh: THREE.Mesh }) {
  // @ts-expect-error - React Three Fiber primitive type
  return <primitive object={mesh} />;
}

function SceneContent({
  surfaces,
  showWireframe,
  showGrid,
  terrainMesh,
}: {
  surfaces: TINSurface[];
  showWireframe: boolean;
  showGrid: boolean;
  terrainMesh?: THREE.Mesh | null;
}) {
  const ambientLight = useMemo(() => new THREE.AmbientLight(0xffffff, 0.4), []);
  const directionalLight1 = useMemo(() => {
    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(100, 200, 100);
    light.castShadow = true;
    return light;
  }, []);
  const directionalLight2 = useMemo(() => {
    const light = new THREE.DirectionalLight(0xffffff, 0.3);
    light.position.set(-100, 100, -100);
    return light;
  }, []);
  const axesHelper = useMemo(() => new THREE.AxesHelper(200), []);

  return (
    <>
      <PerspectiveCamera makeDefault position={[500, 500, 500]} fov={50} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={100}
        maxDistance={5000}
      />

      {/* Lighting */}
      {/* @ts-expect-error - React Three Fiber primitive type */}
      <primitive object={ambientLight} />
      {/* @ts-expect-error - React Three Fiber primitive type */}
      <primitive object={directionalLight1} />
      {/* @ts-expect-error - React Three Fiber primitive type */}
      <primitive object={directionalLight2} />

      {/* Grid */}
      {showGrid && (
        <Grid
          position={[0, -50, 0]}
          args={[2000, 2000]}
          cellSize={50}
          cellThickness={0.5}
          cellColor="#4a4a6a"
          sectionSize={200}
          sectionThickness={1}
          sectionColor="#6a6a8a"
          fadeDistance={2000}
          infiniteGrid
        />
      )}

      {/* Surfaces */}
      {surfaces.map((surface) => (
        <SurfaceMesh key={surface.id} surface={surface} wireframe={showWireframe} />
      ))}

      {/* Terrain DEM mesh */}
      {terrainMesh && <TerrainMesh mesh={terrainMesh} />}

      {/* Axes helper */}
      {/* @ts-expect-error - React Three Fiber primitive type */}
      <primitive object={axesHelper} />
    </>
  );
}

interface SurfaceViewer3DProps {
  surfaces: TINSurface[];
  showWireframe?: boolean;
  showGrid?: boolean;
  className?: string;
  terrainMesh?: THREE.Mesh | null;
}

export default function SurfaceViewer3D({
  surfaces,
  showWireframe = false,
  showGrid = true,
  className = '',
  terrainMesh = null,
}: SurfaceViewer3DProps) {
  return (
    <div className={`w-full h-full bg-cad-bg ${className}`}>
      <Canvas shadows>
        <SceneContent
          surfaces={surfaces}
          showWireframe={showWireframe}
          showGrid={showGrid}
          terrainMesh={terrainMesh}
        />
      </Canvas>
    </div>
  );
}
