'use client';

// ============================================================
// 3D SCENE
// Main React Three Fiber canvas with orbit controls and grid
// ============================================================

import { Suspense, useRef, useCallback, useState, useMemo } from 'react';
import { Canvas, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useEditorStore } from '@/stores';
import { Grid } from './Grid';
import { GhostPreview } from './GhostPreview';
import { NodeMesh } from './elements/NodeMesh';
import { BeamMesh } from './elements/BeamMesh';
import { ColumnMesh } from './elements/ColumnMesh';
import { BraceMesh } from './elements/BraceMesh';
import { DeformedShape } from './elements/DeformedShape';
import { ForceDiagram } from './elements/ForceDiagram';
import { ElementTooltip } from './ElementTooltip';
import { DCRatioLegend } from '@/components/viewers/DCRatioLegend';
import * as THREE from 'three';

// ============================================================
// SCENE CONTENT
// Internal component rendered inside Canvas
// ============================================================

function SceneContent() {
  const controlsRef = useRef<any>(null);
  const groundRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  // Store state
  const nodes = useEditorStore((state) => state.nodes);
  const beams = useEditorStore((state) => state.beams);
  const columns = useEditorStore((state) => state.columns);
  const braces = useEditorStore((state) => state.braces);
  const showGrid = useEditorStore((state) => state.showGrid);
  const showAxes = useEditorStore((state) => state.showAxes);
  const activeTool = useEditorStore((state) => state.activeTool);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const isDrawing = useEditorStore((state) => state.isDrawing);
  const drawingStartNodeId = useEditorStore((state) => state.drawingStartNodeId);
  const gridSize = useEditorStore((state) => state.gridSize);
  const select = useEditorStore((state) => state.select);
  const addNode = useEditorStore((state) => state.addNode);
  const addBeam = useEditorStore((state) => state.addBeam);
  const addColumn = useEditorStore((state) => state.addColumn);
  const addBrace = useEditorStore((state) => state.addBrace);
  const setHoveredId = useEditorStore((state) => state.setHoveredId);
  const setIsDrawing = useEditorStore((state) => state.setIsDrawing);
  const setDrawingStartNodeId = useEditorStore((state) => state.setDrawingStartNodeId);

  // Design results state
  const designResults = useEditorStore((state) => state.designResults);
  const showDCRatioColoring = useEditorStore((state) => state.showDCRatioColoring);
  const hoveredId = useEditorStore((state) => state.hoveredId);

  // Tooltip position state - tracks where to show the tooltip
  const [tooltipPosition, setTooltipPosition] = useState<[number, number, number] | null>(null);

  // Calculate element center position for tooltip
  const getElementCenter = useCallback(
    (elementId: string): [number, number, number] | null => {
      // Check beams
      const beam = beams.get(elementId);
      if (beam) {
        const nodeI = nodes.get(beam.node_i_id);
        const nodeJ = nodes.get(beam.node_j_id);
        if (nodeI && nodeJ) {
          return [
            (nodeI.x + nodeJ.x) / 2,
            (nodeI.y + nodeJ.y) / 2 + 0.5,
            (nodeI.z + nodeJ.z) / 2,
          ];
        }
      }

      // Check columns
      const column = columns.get(elementId);
      if (column) {
        const nodeI = nodes.get(column.node_i_id);
        const nodeJ = nodes.get(column.node_j_id);
        if (nodeI && nodeJ) {
          return [
            (nodeI.x + nodeJ.x) / 2,
            (nodeI.y + nodeJ.y) / 2 + 0.5,
            (nodeI.z + nodeJ.z) / 2,
          ];
        }
      }

      // Check braces
      const brace = braces.get(elementId);
      if (brace) {
        const nodeI = nodes.get(brace.node_i_id);
        const nodeJ = nodes.get(brace.node_j_id);
        if (nodeI && nodeJ) {
          return [
            (nodeI.x + nodeJ.x) / 2,
            (nodeI.y + nodeJ.y) / 2 + 0.5,
            (nodeI.z + nodeJ.z) / 2,
          ];
        }
      }

      return null;
    },
    [beams, columns, braces, nodes]
  );

  // Update tooltip position when hovered element changes
  const handleElementHover = useCallback(
    (elementId: string | null) => {
      setHoveredId(elementId);
      if (elementId) {
        const position = getElementCenter(elementId);
        setTooltipPosition(position);
      } else {
        setTooltipPosition(null);
      }
    },
    [setHoveredId, getElementCenter]
  );

  // Helper to create a node at position
  const createNodeAtPosition = useCallback(
    (x: number, y: number, z: number) => {
      const snappedX = Math.round(x / gridSize) * gridSize;
      const snappedZ = Math.round(z / gridSize) * gridSize;

      const node = {
        id: `nd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        project_id: '',
        story_id: null,
        name: null,
        x: snappedX,
        y,
        z: snappedZ,
        support_type: 'free' as const,
        restraints: { dx: false, dy: false, dz: false, rx: false, ry: false, rz: false },
        spring_stiffness: {},
        prescribed_displacements: {},
        mass: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      addNode(node);
      return node.id;
    },
    [addNode, gridSize]
  );

  // Handle ground plane click for element creation
  const handleGroundClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      const point = event.point;

      // Node tool - single click creates node
      if (activeTool === 'node') {
        createNodeAtPosition(point.x, 0, point.z);
        return;
      }

      // Linear element tools (beam, column, brace)
      if (['beam', 'column', 'brace'].includes(activeTool)) {
        if (!isDrawing) {
          // First click - create start node and begin drawing
          const nodeId = createNodeAtPosition(point.x, 0, point.z);
          setDrawingStartNodeId(nodeId);
          setIsDrawing(true);
        } else if (drawingStartNodeId) {
          // Second click - create end node and connect with element
          const snappedX = Math.round(point.x / gridSize) * gridSize;
          const snappedZ = Math.round(point.z / gridSize) * gridSize;

          // For columns, create node at height
          const endY = activeTool === 'column' ? 3 : 0; // 3m default column height
          const endNodeId = createNodeAtPosition(snappedX, endY, snappedZ);

          const timestamp = Date.now();
          const now = new Date().toISOString();
          const baseElement = {
            project_id: '',
            story_id: null,
            name: null,
            node_i_id: drawingStartNodeId,
            node_j_id: endNodeId,
            section_id: 'default_section',
            material_id: null,
            releases_i: { fx: false, fy: false, fz: false, mx: false, my: false, mz: false },
            releases_j: { fx: false, fy: false, fz: false, mx: false, my: false, mz: false },
            offset_i: { dx: 0, dy: 0, dz: 0 },
            offset_j: { dx: 0, dy: 0, dz: 0 },
            rotation_angle: 0,
            created_at: now,
            updated_at: now,
          };

          if (activeTool === 'beam') {
            addBeam({
              id: `bm_${timestamp}`,
              ...baseElement,
              rigid_zone_i: 0,
              rigid_zone_j: 0,
              unbraced_length_major: null,
              unbraced_length_minor: null,
              unbraced_length_ltb: null,
              cb: 1.0,
              camber: 0,
            });
          } else if (activeTool === 'column') {
            addColumn({
              id: `col_${timestamp}`,
              ...baseElement,
              k_major: 1.0,
              k_minor: 1.0,
            });
          } else if (activeTool === 'brace') {
            addBrace({
              id: `br_${timestamp}`,
              ...baseElement,
              brace_type: 'diagonal',
              k: 1.0,
            });
          }

          // Reset drawing state
          setDrawingStartNodeId(null);
          setIsDrawing(false);
        }
      }
    },
    [activeTool, isDrawing, drawingStartNodeId, gridSize, createNodeAtPosition, addBeam, addColumn, addBrace, setIsDrawing, setDrawingStartNodeId]
  );

  // Handle element click for selection
  const handleElementClick = useCallback(
    (id: string, event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      if (activeTool === 'select') {
        if (event.shiftKey) {
          // Toggle selection
          const newSelection = new Set(selectedIds);
          if (newSelection.has(id)) {
            newSelection.delete(id);
          } else {
            newSelection.add(id);
          }
          select(Array.from(newSelection));
        } else {
          // Single select
          select([id]);
        }
      }
    },
    [activeTool, selectedIds, select]
  );

  // Handle background click for deselection
  const handleBackgroundClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      // Only deselect if clicking on ground plane itself
      if (activeTool === 'select') {
        select([]);
      }
    },
    [activeTool, select]
  );

  return (
    <>
      {/* Camera */}
      <PerspectiveCamera
        makeDefault
        position={[20, 15, 20]}
        fov={50}
        near={0.1}
        far={1000}
      />

      {/* Orbit Controls */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={200}
        maxPolarAngle={Math.PI / 2 - 0.01}
        target={[0, 0, 0]}
      />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[50, 50, 25]}
        intensity={0.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-50, 30, -25]} intensity={0.3} />

      {/* Axes Helper */}
      {showAxes && <axesHelper args={[10]} />}

      {/* Grid */}
      {showGrid && <Grid />}

      {/* Ground Plane (invisible, for element placement) */}
      <mesh
        ref={groundRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        onClick={handleGroundClick}
        onPointerMissed={handleBackgroundClick}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Ghost Preview for drawing tools */}
      <GhostPreview groundRef={groundRef} />

      {/* Render Nodes */}
      {Array.from(nodes.values()).map((node) => (
        <NodeMesh
          key={node.id}
          node={node}
          isSelected={selectedIds.has(node.id)}
          onClick={(e) => handleElementClick(node.id, e)}
          onPointerEnter={() => setHoveredId(node.id)}
          onPointerLeave={() => setHoveredId(null)}
        />
      ))}

      {/* Render Beams */}
      {Array.from(beams.values()).map((beam) => {
        const nodeI = nodes.get(beam.node_i_id);
        const nodeJ = nodes.get(beam.node_j_id);
        if (!nodeI || !nodeJ) return null;

        const designResult = designResults.get(beam.id);

        return (
          <BeamMesh
            key={beam.id}
            beam={beam}
            startNode={nodeI}
            endNode={nodeJ}
            isSelected={selectedIds.has(beam.id)}
            dcRatio={designResult?.demand_capacity_ratio}
            showDCColors={showDCRatioColoring}
            onClick={(e) => handleElementClick(beam.id, e)}
            onPointerEnter={() => handleElementHover(beam.id)}
            onPointerLeave={() => handleElementHover(null)}
          />
        );
      })}

      {/* Render Columns */}
      {Array.from(columns.values()).map((column) => {
        const nodeI = nodes.get(column.node_i_id);
        const nodeJ = nodes.get(column.node_j_id);
        if (!nodeI || !nodeJ) return null;

        const designResult = designResults.get(column.id);

        return (
          <ColumnMesh
            key={column.id}
            column={column}
            startNode={nodeI}
            endNode={nodeJ}
            isSelected={selectedIds.has(column.id)}
            dcRatio={designResult?.demand_capacity_ratio}
            showDCColors={showDCRatioColoring}
            onClick={(e) => handleElementClick(column.id, e)}
            onPointerEnter={() => handleElementHover(column.id)}
            onPointerLeave={() => handleElementHover(null)}
          />
        );
      })}

      {/* Render Braces */}
      {Array.from(braces.values()).map((brace) => {
        const nodeI = nodes.get(brace.node_i_id);
        const nodeJ = nodes.get(brace.node_j_id);
        if (!nodeI || !nodeJ) return null;

        const designResult = designResults.get(brace.id);

        return (
          <BraceMesh
            key={brace.id}
            brace={brace}
            startNode={nodeI}
            endNode={nodeJ}
            isSelected={selectedIds.has(brace.id)}
            dcRatio={designResult?.demand_capacity_ratio}
            showDCColors={showDCRatioColoring}
            onClick={(e) => handleElementClick(brace.id, e)}
            onPointerEnter={() => handleElementHover(brace.id)}
            onPointerLeave={() => handleElementHover(null)}
          />
        );
      })}

      {/* Deformed Shape Overlay */}
      <DeformedShape />

      {/* Force Diagram Overlay */}
      <ForceDiagram />

      {/* Element Tooltip - shown when hovering over elements */}
      {hoveredId && tooltipPosition && (
        <ElementTooltip elementId={hoveredId} position={tooltipPosition} />
      )}
    </>
  );
}

// ============================================================
// LOADING FALLBACK
// ============================================================

function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-lele-bg">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-2 border-lele-accent border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-400">Loading 3D Scene...</span>
      </div>
    </div>
  );
}

// ============================================================
// MAIN SCENE COMPONENT
// ============================================================

export function Scene() {
  return (
    <div className="w-full h-full relative">
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          shadows
          gl={{ antialias: true, alpha: false }}
          dpr={[1, 2]}
          style={{ background: '#0f172a' }}
        >
          <color attach="background" args={['#0f172a']} />
          <fog attach="fog" args={['#0f172a', 100, 300]} />
          <SceneContent />
        </Canvas>
      </Suspense>

      {/* D/C Ratio Legend (overlay) */}
      <DCRatioLegend />
    </div>
  );
}
