/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - R3F JSX elements are dynamically typed
'use client';

import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text, Line } from '@react-three/drei';
import * as THREE from 'three';

// Extend Three.js objects for React Three Fiber
extend({
  Mesh: THREE.Mesh,
  BufferGeometry: THREE.BufferGeometry,
  ExtrudeGeometry: THREE.ExtrudeGeometry,
  ShapeGeometry: THREE.ShapeGeometry,
  PlaneGeometry: THREE.PlaneGeometry,
  MeshStandardMaterial: THREE.MeshStandardMaterial,
  MeshBasicMaterial: THREE.MeshBasicMaterial,
  AmbientLight: THREE.AmbientLight,
  DirectionalLight: THREE.DirectionalLight,
  GridHelper: THREE.GridHelper,
  AxesHelper: THREE.AxesHelper,
  Group: THREE.Group,
});

// ============================================
// TYPES
// ============================================

export type ChannelShape = 'trapezoidal' | 'rectangular' | 'triangular' | 'circular';
export type ViewMode = 'cross-section' | 'profile' | 'isometric';

export interface ChannelGeometry {
  shape: ChannelShape;
  bottomWidth: number;      // m (b)
  sideSlope: number;        // z (H:V)
  depth: number;            // m (total channel depth)
  waterDepth: number;       // m (y - flow depth)
  diameter?: number;        // m (for circular)
}

export interface ChannelHydraulics {
  flowRate: number;         // m³/s
  velocity: number;         // m/s
  froudeNumber: number;
  criticalDepth: number;    // m
  normalDepth: number;      // m
  specificEnergy: number;   // m
  slope: number;            // decimal
}

export interface ProfileStation {
  station: number;          // m (distance along channel)
  bedElevation: number;     // m
  waterSurface: number;     // m
  energyGrade: number;      // m (EGL)
  criticalDepth: number;    // m
}

export interface HydraulicsViewer3DProps {
  channel: ChannelGeometry;
  hydraulics?: ChannelHydraulics;
  profile?: ProfileStation[];
  viewMode?: ViewMode;
  showWaterSurface?: boolean;
  showFlowAnimation?: boolean;
  showDimensions?: boolean;
  showHydraulicGrades?: boolean;
  className?: string;
}

// ============================================
// CHANNEL CROSS-SECTION GEOMETRY
// ============================================

function createChannelCrossSectionShape(channel: ChannelGeometry): THREE.Shape {
  const shape = new THREE.Shape();
  const { bottomWidth: b, sideSlope: z, depth: H } = channel;

  switch (channel.shape) {
    case 'rectangular': {
      shape.moveTo(-b / 2, 0);
      shape.lineTo(-b / 2, H);
      shape.lineTo(b / 2, H);
      shape.lineTo(b / 2, 0);
      shape.lineTo(-b / 2, 0);
      break;
    }
    case 'trapezoidal': {
      const topWidth = b + 2 * z * H;
      shape.moveTo(-b / 2, 0);
      shape.lineTo(-topWidth / 2, H);
      shape.lineTo(topWidth / 2, H);
      shape.lineTo(b / 2, 0);
      shape.lineTo(-b / 2, 0);
      break;
    }
    case 'triangular': {
      const topWidth = 2 * z * H;
      shape.moveTo(0, 0);
      shape.lineTo(-topWidth / 2, H);
      shape.lineTo(topWidth / 2, H);
      shape.lineTo(0, 0);
      break;
    }
    case 'circular': {
      const D = channel.diameter || b;
      const r = D / 2;
      // Draw semicircle from bottom
      shape.absarc(0, r, r, -Math.PI / 2, Math.PI * 1.5, false);
      break;
    }
  }

  return shape;
}

function createWaterSectionShape(channel: ChannelGeometry): THREE.Shape | null {
  const { bottomWidth: b, sideSlope: z, waterDepth: y, shape: channelShape } = channel;
  if (y <= 0) return null;

  const shape = new THREE.Shape();

  switch (channelShape) {
    case 'rectangular': {
      shape.moveTo(-b / 2, 0);
      shape.lineTo(-b / 2, y);
      shape.lineTo(b / 2, y);
      shape.lineTo(b / 2, 0);
      shape.lineTo(-b / 2, 0);
      break;
    }
    case 'trapezoidal': {
      const topWidth = b + 2 * z * y;
      shape.moveTo(-b / 2, 0);
      shape.lineTo(-topWidth / 2, y);
      shape.lineTo(topWidth / 2, y);
      shape.lineTo(b / 2, 0);
      shape.lineTo(-b / 2, 0);
      break;
    }
    case 'triangular': {
      const topWidth = 2 * z * y;
      shape.moveTo(0, 0);
      shape.lineTo(-topWidth / 2, y);
      shape.lineTo(topWidth / 2, y);
      shape.lineTo(0, 0);
      break;
    }
    case 'circular': {
      const D = channel.diameter || b;
      const r = D / 2;
      // Water in circular section
      if (y >= D) {
        shape.absarc(0, r, r, 0, Math.PI * 2, false);
      } else {
        // Partial fill - approximate with chord
        const theta = 2 * Math.acos((r - y) / r);
        const halfChord = r * Math.sin(theta / 2);
        shape.moveTo(-halfChord, y);
        shape.absarc(0, r, r, Math.PI + theta / 2, 2 * Math.PI - theta / 2, false);
        shape.lineTo(-halfChord, y);
      }
      break;
    }
  }

  return shape;
}

// ============================================
// 3D CHANNEL MESH COMPONENTS
// ============================================

interface ChannelMeshProps {
  channel: ChannelGeometry;
  length?: number;
  showWater?: boolean;
  animated?: boolean;
}

function ChannelMesh({ channel, length = 10, showWater = true, animated = false }: ChannelMeshProps) {
  const waterRef = useRef<THREE.Mesh>(null);

  // Create channel geometry (extruded cross-section)
  const channelGeometry = useMemo(() => {
    const shape = createChannelCrossSectionShape(channel);
    const extrudeSettings = {
      steps: 50,
      depth: length,
      bevelEnabled: false,
    };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, -length / 2);
    return geo;
  }, [channel, length]);

  // Create water geometry
  const waterGeometry = useMemo(() => {
    const waterShape = createWaterSectionShape(channel);
    if (!waterShape) return null;
    const extrudeSettings = {
      steps: 50,
      depth: length,
      bevelEnabled: false,
    };
    const geo = new THREE.ExtrudeGeometry(waterShape, extrudeSettings);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, -length / 2);
    return geo;
  }, [channel, length]);

  // Water animation
  useFrame((state) => {
    if (animated && waterRef.current) {
      const material = waterRef.current.material as THREE.MeshStandardMaterial;
      if (material.map) {
        material.map.offset.y -= 0.01;
      }
      // Subtle wave effect
      waterRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.005;
    }
  });

  const channelMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
  }, []);

  const waterMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: 0x1e90ff,
      transparent: true,
      opacity: 0.7,
      roughness: 0.1,
      metalness: 0.3,
      side: THREE.DoubleSide,
    });
  }, []);

  return (
    <group>
      {/* Channel walls */}
      <mesh geometry={channelGeometry} material={channelMaterial} />

      {/* Water surface */}
      {showWater && waterGeometry && (
        <mesh ref={waterRef} geometry={waterGeometry} material={waterMaterial} />
      )}
    </group>
  );
}

// ============================================
// CROSS-SECTION VIEW (2D-style in 3D)
// ============================================

interface CrossSectionViewProps {
  channel: ChannelGeometry;
  hydraulics?: ChannelHydraulics;
  showDimensions?: boolean;
}

function CrossSectionView({ channel, hydraulics, showDimensions = true }: CrossSectionViewProps) {
  const { bottomWidth: b, sideSlope: z, depth: H, waterDepth: y, shape } = channel;

  // Calculate dimensions
  const topWidth = shape === 'triangular'
    ? 2 * z * H
    : shape === 'circular'
      ? (channel.diameter || b)
      : b + 2 * z * H;

  const waterTopWidth = shape === 'triangular'
    ? 2 * z * y
    : shape === 'circular'
      ? (channel.diameter || b) // Simplified
      : b + 2 * z * y;

  // Create outline points for channel
  const channelPoints = useMemo(() => {
    const points: [number, number, number][] = [];

    switch (shape) {
      case 'rectangular':
        points.push([-b / 2, 0, 0], [-b / 2, H, 0], [b / 2, H, 0], [b / 2, 0, 0]);
        break;
      case 'trapezoidal':
        points.push([-b / 2, 0, 0], [-topWidth / 2, H, 0], [topWidth / 2, H, 0], [b / 2, 0, 0]);
        break;
      case 'triangular':
        points.push([0, 0, 0], [-topWidth / 2, H, 0], [topWidth / 2, H, 0], [0, 0, 0]);
        break;
      case 'circular': {
        const D = channel.diameter || b;
        const r = D / 2;
        for (let i = 0; i <= 32; i++) {
          const angle = (i / 32) * Math.PI * 2;
          points.push([Math.sin(angle) * r, r - Math.cos(angle) * r, 0]);
        }
        break;
      }
    }
    return points;
  }, [shape, b, H, topWidth, channel.diameter]);

  // Water surface line
  const waterLinePoints = useMemo(() => {
    if (y <= 0) return [];

    switch (shape) {
      case 'rectangular':
        return [[-b / 2, y, 0], [b / 2, y, 0]] as [number, number, number][];
      case 'trapezoidal':
        return [[-waterTopWidth / 2, y, 0], [waterTopWidth / 2, y, 0]] as [number, number, number][];
      case 'triangular':
        return [[-waterTopWidth / 2, y, 0], [waterTopWidth / 2, y, 0]] as [number, number, number][];
      default:
        return [];
    }
  }, [shape, b, y, waterTopWidth]);

  // Critical depth line
  const criticalLinePoints = useMemo(() => {
    if (!hydraulics?.criticalDepth) return [];
    const yc = hydraulics.criticalDepth;
    const wcWidth = shape === 'triangular'
      ? 2 * z * yc
      : b + 2 * z * yc;

    return [[-wcWidth / 2 - 0.2, yc, 0], [wcWidth / 2 + 0.2, yc, 0]] as [number, number, number][];
  }, [hydraulics, shape, b, z]);

  return (
    <group>
      {/* Channel outline */}
      <Line
        points={channelPoints}
        color="#808080"
        lineWidth={3}
      />

      {/* Water surface */}
      {waterLinePoints.length > 0 && (
        <Line
          points={waterLinePoints}
          color="#1e90ff"
          lineWidth={2}
        />
      )}

      {/* Critical depth line (dashed) */}
      {criticalLinePoints.length > 0 && (
        <Line
          points={criticalLinePoints}
          color="#ff6b6b"
          lineWidth={1}
          dashed
          dashSize={0.1}
          gapSize={0.05}
        />
      )}

      {/* Fill water area */}
      {y > 0 && (
        <mesh position={[0, y / 2, -0.01]}>
          <planeGeometry args={[waterTopWidth, y]} />
          <meshBasicMaterial color="#1e90ff" transparent opacity={0.3} />
        </mesh>
      )}

      {/* Dimensions */}
      {showDimensions && (
        <>
          {/* Bottom width label */}
          <Text
            position={[0, -0.3, 0]}
            fontSize={0.15}
            color="#ffffff"
            anchorX="center"
            anchorY="top"
          >
            b = {b.toFixed(2)} m
          </Text>

          {/* Depth label */}
          <Text
            position={[topWidth / 2 + 0.3, H / 2, 0]}
            fontSize={0.15}
            color="#ffffff"
            anchorX="left"
            anchorY="middle"
          >
            H = {H.toFixed(2)} m
          </Text>

          {/* Water depth label */}
          {y > 0 && (
            <Text
              position={[-topWidth / 2 - 0.3, y / 2, 0]}
              fontSize={0.15}
              color="#1e90ff"
              anchorX="right"
              anchorY="middle"
            >
              y = {y.toFixed(2)} m
            </Text>
          )}

          {/* Side slope label */}
          {(shape === 'trapezoidal' || shape === 'triangular') && (
            <Text
              position={[(b / 2 + topWidth / 2) / 2 + 0.2, H / 2 + 0.2, 0]}
              fontSize={0.12}
              color="#aaaaaa"
              anchorX="left"
              anchorY="middle"
            >
              z = {z}:1
            </Text>
          )}
        </>
      )}

      {/* Hydraulic info panel */}
      {hydraulics && (
        <group position={[topWidth / 2 + 1, H - 0.5, 0]}>
          <Text fontSize={0.12} color="#4ade80" anchorX="left" anchorY="top" position={[0, 0, 0]}>
            Q = {hydraulics.flowRate.toFixed(3)} m³/s
          </Text>
          <Text fontSize={0.12} color="#4ade80" anchorX="left" anchorY="top" position={[0, -0.18, 0]}>
            V = {hydraulics.velocity.toFixed(2)} m/s
          </Text>
          <Text fontSize={0.12} color="#4ade80" anchorX="left" anchorY="top" position={[0, -0.36, 0]}>
            Fr = {hydraulics.froudeNumber.toFixed(2)}
          </Text>
          <Text fontSize={0.10} color="#ff6b6b" anchorX="left" anchorY="top" position={[0, -0.54, 0]}>
            yc = {hydraulics.criticalDepth.toFixed(3)} m
          </Text>
          <Text fontSize={0.10} color="#f59e0b" anchorX="left" anchorY="top" position={[0, -0.70, 0]}>
            yn = {hydraulics.normalDepth.toFixed(3)} m
          </Text>
        </group>
      )}
    </group>
  );
}

// ============================================
// PROFILE VIEW (Longitudinal Section)
// ============================================

interface ProfileViewProps {
  profile: ProfileStation[];
  showEGL?: boolean;
  showHGL?: boolean;
  verticalExaggeration?: number;
}

function ProfileView({
  profile,
  showEGL = true,
  showHGL = true,
  verticalExaggeration = 5
}: ProfileViewProps) {
  if (profile.length < 2) return null;

  const vScale = verticalExaggeration;
  const minElev = Math.min(...profile.map(p => p.bedElevation));

  // Bed profile line
  const bedPoints = useMemo(() => {
    return profile.map(p => [p.station, (p.bedElevation - minElev) * vScale, 0] as [number, number, number]);
  }, [profile, minElev, vScale]);

  // Water surface line
  const waterPoints = useMemo(() => {
    return profile.map(p => [p.station, (p.waterSurface - minElev) * vScale, 0] as [number, number, number]);
  }, [profile, minElev, vScale]);

  // Energy grade line
  const eglPoints = useMemo(() => {
    return profile.map(p => [p.station, (p.energyGrade - minElev) * vScale, 0] as [number, number, number]);
  }, [profile, minElev, vScale]);

  // Critical depth line
  const criticalPoints = useMemo(() => {
    return profile.map(p => [
      p.station,
      (p.bedElevation + p.criticalDepth - minElev) * vScale,
      0
    ] as [number, number, number]);
  }, [profile, minElev, vScale]);

  // Fill area between bed and water
  const fillGeometry = useMemo(() => {
    const shape = new THREE.Shape();

    // Start from first bed point
    shape.moveTo(profile[0].station, (profile[0].bedElevation - minElev) * vScale);

    // Draw along water surface
    profile.forEach(p => {
      shape.lineTo(p.station, (p.waterSurface - minElev) * vScale);
    });

    // Draw back along bed
    for (let i = profile.length - 1; i >= 0; i--) {
      shape.lineTo(profile[i].station, (profile[i].bedElevation - minElev) * vScale);
    }

    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, [profile, minElev, vScale]);

  return (
    <group>
      {/* Water fill */}
      <mesh geometry={fillGeometry}>
        <meshBasicMaterial color="#1e90ff" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Bed profile */}
      <Line points={bedPoints} color="#8B4513" lineWidth={3} />

      {/* Water surface (HGL) */}
      {showHGL && <Line points={waterPoints} color="#1e90ff" lineWidth={2} />}

      {/* Energy grade line */}
      {showEGL && <Line points={eglPoints} color="#4ade80" lineWidth={1} dashed dashSize={0.5} gapSize={0.2} />}

      {/* Critical depth line */}
      <Line points={criticalPoints} color="#ff6b6b" lineWidth={1} dashed dashSize={0.3} gapSize={0.15} />

      {/* Labels */}
      <Text
        position={[profile[0].station - 1, (profile[0].waterSurface - minElev) * vScale, 0]}
        fontSize={0.3}
        color="#1e90ff"
        anchorX="right"
      >
        WS
      </Text>
      <Text
        position={[profile[0].station - 1, (profile[0].energyGrade - minElev) * vScale, 0]}
        fontSize={0.3}
        color="#4ade80"
        anchorX="right"
      >
        EGL
      </Text>
      <Text
        position={[profile[0].station - 1, (profile[0].bedElevation - minElev) * vScale, 0]}
        fontSize={0.3}
        color="#8B4513"
        anchorX="right"
      >
        Bed
      </Text>
    </group>
  );
}

// ============================================
// SCENE CONTENT
// ============================================

interface SceneContentProps {
  channel: ChannelGeometry;
  hydraulics?: ChannelHydraulics;
  profile?: ProfileStation[];
  viewMode: ViewMode;
  showWater: boolean;
  showAnimation: boolean;
  showDimensions: boolean;
  showHydraulicGrades: boolean;
}

function SceneContent({
  channel,
  hydraulics,
  profile,
  viewMode,
  showWater,
  showAnimation,
  showDimensions,
  showHydraulicGrades,
}: SceneContentProps) {
  // Camera position based on view mode
  const cameraPosition = useMemo(() => {
    switch (viewMode) {
      case 'cross-section':
        return [0, channel.depth / 2, 5] as [number, number, number];
      case 'profile':
        return [profile ? profile.length * 0.5 : 10, 5, 15] as [number, number, number];
      case 'isometric':
      default:
        return [8, 5, 8] as [number, number, number];
    }
  }, [viewMode, channel.depth, profile]);

  return (
    <>
      <PerspectiveCamera makeDefault position={cameraPosition} fov={50} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={1}
        maxDistance={100}
        target={[0, channel.depth / 2, 0]}
      />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} />

      {/* Grid */}
      <gridHelper args={[20, 20, '#4a4a6a', '#2a2a4a']} rotation={[0, 0, 0]} />

      {/* View content */}
      {viewMode === 'cross-section' && (
        <CrossSectionView
          channel={channel}
          hydraulics={hydraulics}
          showDimensions={showDimensions}
        />
      )}

      {viewMode === 'isometric' && (
        <ChannelMesh
          channel={channel}
          length={10}
          showWater={showWater}
          animated={showAnimation}
        />
      )}

      {viewMode === 'profile' && profile && (
        <ProfileView
          profile={profile}
          showEGL={showHydraulicGrades}
          showHGL={showWater}
        />
      )}

      {/* Axes helper */}
      <axesHelper args={[2]} />
    </>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function HydraulicsViewer3D({
  channel,
  hydraulics,
  profile,
  viewMode: initialViewMode = 'cross-section',
  showWaterSurface = true,
  showFlowAnimation = false,
  showDimensions = true,
  showHydraulicGrades = true,
  className = '',
}: HydraulicsViewer3DProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [showWater, setShowWater] = useState(showWaterSurface);
  const [showAnimation, setShowAnimation] = useState(showFlowAnimation);
  const [showDims, setShowDims] = useState(showDimensions);
  const [showGrades, setShowGrades] = useState(showHydraulicGrades);

  return (
    <div className={`relative w-full h-full bg-cad-bg ${className}`}>
      {/* Controls overlay */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        {/* View mode selector */}
        <div className="bg-gray-900/90 rounded-lg p-2 backdrop-blur-sm">
          <div className="text-gray-400 text-xs mb-2">View Mode</div>
          <div className="flex gap-1">
            {(['cross-section', 'isometric', 'profile'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  viewMode === mode
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {mode === 'cross-section' ? 'X-Sec' : mode === 'isometric' ? '3D' : 'Profile'}
              </button>
            ))}
          </div>
        </div>

        {/* Display toggles */}
        <div className="bg-gray-900/90 rounded-lg p-2 backdrop-blur-sm">
          <div className="text-gray-400 text-xs mb-2">Display</div>
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-2 text-xs text-gray-300">
              <input
                type="checkbox"
                checked={showWater}
                onChange={(e) => setShowWater(e.target.checked)}
                className="w-3 h-3 rounded"
              />
              Water
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-300">
              <input
                type="checkbox"
                checked={showDims}
                onChange={(e) => setShowDims(e.target.checked)}
                className="w-3 h-3 rounded"
              />
              Dimensions
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-300">
              <input
                type="checkbox"
                checked={showGrades}
                onChange={(e) => setShowGrades(e.target.checked)}
                className="w-3 h-3 rounded"
              />
              EGL/HGL
            </label>
            {viewMode === 'isometric' && (
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={showAnimation}
                  onChange={(e) => setShowAnimation(e.target.checked)}
                  className="w-3 h-3 rounded"
                />
                Animate
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 bg-gray-900/90 rounded-lg p-2 backdrop-blur-sm">
        <div className="text-gray-400 text-xs mb-1">Legend</div>
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-blue-500"></div>
            <span className="text-gray-300">Water Surface (HGL)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-green-400" style={{ borderTop: '1px dashed' }}></div>
            <span className="text-gray-300">Energy Grade (EGL)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-red-400" style={{ borderTop: '1px dashed' }}></div>
            <span className="text-gray-300">Critical Depth (yc)</span>
          </div>
        </div>
      </div>

      {/* Channel info */}
      {hydraulics && (
        <div className="absolute top-3 right-3 z-10 bg-gray-900/90 rounded-lg p-3 backdrop-blur-sm">
          <div className="text-teal-400 text-sm font-medium mb-2">Hydraulics</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-gray-400">Flow Q:</span>
            <span className="text-white font-mono">{hydraulics.flowRate.toFixed(3)} m³/s</span>
            <span className="text-gray-400">Velocity V:</span>
            <span className="text-white font-mono">{hydraulics.velocity.toFixed(2)} m/s</span>
            <span className="text-gray-400">Froude Fr:</span>
            <span className={`font-mono ${hydraulics.froudeNumber < 1 ? 'text-green-400' : 'text-orange-400'}`}>
              {hydraulics.froudeNumber.toFixed(3)}
            </span>
            <span className="text-gray-400">Flow Type:</span>
            <span className={`font-mono ${hydraulics.froudeNumber < 1 ? 'text-green-400' : 'text-orange-400'}`}>
              {hydraulics.froudeNumber < 1 ? 'Subcritical' : 'Supercritical'}
            </span>
            <span className="text-gray-400">yc:</span>
            <span className="text-red-400 font-mono">{hydraulics.criticalDepth.toFixed(3)} m</span>
            <span className="text-gray-400">yn:</span>
            <span className="text-yellow-400 font-mono">{hydraulics.normalDepth.toFixed(3)} m</span>
          </div>
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas shadows>
        <SceneContent
          channel={channel}
          hydraulics={hydraulics}
          profile={profile}
          viewMode={viewMode}
          showWater={showWater}
          showAnimation={showAnimation}
          showDimensions={showDims}
          showHydraulicGrades={showGrades}
        />
      </Canvas>
    </div>
  );
}
