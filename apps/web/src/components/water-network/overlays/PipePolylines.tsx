'use client';

import { Polyline, Tooltip } from 'react-leaflet';
import {
  useWaterNetworkStore,
  usePipes,
  useJunctions,
  useTanks,
  useReservoirs,
  useVisualization,
  useSelectionActions,
} from '@/stores/water-network/waterNetworkStore';

// Convert network x/y back to lat/lng
function xyToLatLng(x: number, y: number, originLat: number, originLng: number): [number, number] {
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos((originLat * Math.PI) / 180);

  const lat = originLat + y / metersPerDegreeLat;
  const lng = originLng + x / metersPerDegreeLng;

  return [lat, lng];
}

export function PipePolylines() {
  const pipes = usePipes();
  const junctions = useJunctions();
  const tanks = useTanks();
  const reservoirs = useReservoirs();
  const visualization = useVisualization();
  const selection = useWaterNetworkStore((s) => s.selection);
  const solver = useWaterNetworkStore((s) => s.solver);
  const mapCenter = useWaterNetworkStore((s) => s.map.center);
  const drawingState = useWaterNetworkStore((s) => s.drawing);
  const { selectLink, setHoveredElement } = useSelectionActions();

  // All nodes for position lookup
  const allNodes = [...junctions, ...tanks, ...reservoirs];

  const getNodePosition = (nodeId: string): [number, number] | null => {
    const node = allNodes.find((n) => n.id === nodeId);
    if (!node) return null;
    return xyToLatLng(node.x, node.y, mapCenter[0], mapCenter[1]);
  };

  return (
    <>
      {/* Existing pipes */}
      {pipes.map((pipe) => {
        const startPos = getNodePosition(pipe.startNode);
        const endPos = getNodePosition(pipe.endNode);

        if (!startPos || !endPos) return null;

        const isSelected = selection.selectedLinkIds.has(pipe.id);
        const isHovered = selection.hoveredElementId === pipe.id;
        const linkResult = solver?.linkResults.get(pipe.id);

        // Get color based on velocity if showing velocity visualization
        let strokeColor = '#3b82f6'; // Default blue
        if (visualization.showVelocity && linkResult) {
          strokeColor = visualization.velocityColorScale.getColor(linkResult.velocity);
        }

        return (
          <Polyline
            key={pipe.id}
            positions={[startPos, endPos]}
            pathOptions={{
              color: isSelected ? '#fbbf24' : strokeColor,
              weight: isSelected ? 6 : isHovered ? 5 : 4,
              opacity: 0.9,
            }}
            eventHandlers={{
              click: (e) => {
                e.originalEvent.stopPropagation();
                selectLink(pipe.id, e.originalEvent.shiftKey);
              },
              mouseover: () => setHoveredElement(pipe.id, 'link'),
              mouseout: () => setHoveredElement(null, null),
            }}
          >
            <Tooltip>
              <div className="text-xs">
                <div className="font-bold">{pipe.id}</div>
                <div>D: {pipe.diameter} mm</div>
                <div>L: {pipe.length.toFixed(1)} m</div>
                <div>Material: {pipe.material.toUpperCase()}</div>
                {linkResult && (
                  <>
                    <div className="border-t border-slate-600 mt-1 pt-1">
                      <div>Caudal: {linkResult.flow.toFixed(2)} L/s</div>
                      <div>Velocidad: {linkResult.velocity.toFixed(2)} m/s</div>
                      <div>Pérdida: {linkResult.headLoss.toFixed(2)} m</div>
                    </div>
                  </>
                )}
              </div>
            </Tooltip>
          </Polyline>
        );
      })}

      {/* Ghost pipe during drawing */}
      {drawingState.isDrawing && drawingState.ghostPipe && (
        <Polyline
          positions={[
            [drawingState.ghostPipe.startLat, drawingState.ghostPipe.startLng],
            [drawingState.ghostPipe.endLat, drawingState.ghostPipe.endLng],
          ]}
          pathOptions={{
            color: '#60a5fa',
            weight: 3,
            opacity: 0.6,
            dashArray: '10, 10',
          }}
        />
      )}
    </>
  );
}
