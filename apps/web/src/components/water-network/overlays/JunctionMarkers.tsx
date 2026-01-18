'use client';

import { CircleMarker, Tooltip } from 'react-leaflet';
import {
  useWaterNetworkStore,
  useJunctions,
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

export function JunctionMarkers() {
  const junctions = useJunctions();
  const visualization = useVisualization();
  const selection = useWaterNetworkStore((s) => s.selection);
  const solver = useWaterNetworkStore((s) => s.solver);
  const mapCenter = useWaterNetworkStore((s) => s.map.center);
  const { selectNode, setHoveredElement } = useSelectionActions();

  return (
    <>
      {junctions.map((junction) => {
        const position = xyToLatLng(junction.x, junction.y, mapCenter[0], mapCenter[1]);
        const isSelected = selection.selectedNodeIds.has(junction.id);
        const isHovered = selection.hoveredElementId === junction.id;
        const nodeResult = solver?.nodeResults.get(junction.id);

        // Get color based on pressure if showing pressure visualization
        let fillColor = '#3b82f6'; // Default blue
        if (visualization.showPressure && nodeResult) {
          fillColor = visualization.pressureColorScale.getColor(nodeResult.pressure);
        }

        return (
          <CircleMarker
            key={junction.id}
            center={position}
            radius={isSelected ? 10 : isHovered ? 9 : 7}
            pathOptions={{
              color: isSelected ? '#fbbf24' : '#1e293b',
              weight: isSelected ? 3 : 2,
              fillColor,
              fillOpacity: 0.9,
            }}
            eventHandlers={{
              click: (e) => {
                e.originalEvent.stopPropagation();
                selectNode(junction.id, e.originalEvent.shiftKey);
              },
              mouseover: () => setHoveredElement(junction.id, 'node'),
              mouseout: () => setHoveredElement(null, null),
            }}
          >
            <Tooltip>
              <div className="text-xs">
                <div className="font-bold">{junction.id}</div>
                <div>Elevación: {junction.elevation.toFixed(1)} m</div>
                <div>Demanda: {junction.baseDemand.toFixed(2)} L/s</div>
                {nodeResult && (
                  <>
                    <div className="border-t border-slate-600 mt-1 pt-1">
                      <div>Presión: {nodeResult.pressure.toFixed(1)} m</div>
                      <div>Altura: {nodeResult.head.toFixed(1)} m</div>
                    </div>
                  </>
                )}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
