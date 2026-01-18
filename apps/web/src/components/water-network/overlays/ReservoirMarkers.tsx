'use client';

import { CircleMarker, Tooltip } from 'react-leaflet';
import {
  useWaterNetworkStore,
  useReservoirs,
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

export function ReservoirMarkers() {
  const reservoirs = useReservoirs();
  const selection = useWaterNetworkStore((s) => s.selection);
  const solver = useWaterNetworkStore((s) => s.solver);
  const mapCenter = useWaterNetworkStore((s) => s.map.center);
  const { selectNode, setHoveredElement } = useSelectionActions();

  return (
    <>
      {reservoirs.map((reservoir) => {
        const position = xyToLatLng(reservoir.x, reservoir.y, mapCenter[0], mapCenter[1]);
        const isSelected = selection.selectedNodeIds.has(reservoir.id);
        const isHovered = selection.hoveredElementId === reservoir.id;
        const nodeResult = solver?.nodeResults.get(reservoir.id);

        return (
          <CircleMarker
            key={reservoir.id}
            center={position}
            radius={isSelected ? 16 : isHovered ? 15 : 14}
            pathOptions={{
              color: isSelected ? '#fbbf24' : '#1e293b',
              weight: isSelected ? 3 : 2,
              fillColor: '#22c55e', // Green for reservoirs
              fillOpacity: 0.9,
            }}
            eventHandlers={{
              click: (e) => {
                e.originalEvent.stopPropagation();
                selectNode(reservoir.id, e.originalEvent.shiftKey);
              },
              mouseover: () => setHoveredElement(reservoir.id, 'node'),
              mouseout: () => setHoveredElement(null, null),
            }}
          >
            <Tooltip>
              <div className="text-xs">
                <div className="font-bold flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full" />
                  {reservoir.id} (Embalse)
                </div>
                <div>Elevación: {reservoir.elevation.toFixed(1)} m</div>
                <div>Altura total: {reservoir.totalHead.toFixed(1)} m</div>
                {nodeResult && (
                  <>
                    <div className="border-t border-slate-600 mt-1 pt-1">
                      <div>Altura: {nodeResult.head.toFixed(1)} m</div>
                      <div>Salida: {Math.abs(nodeResult.demand).toFixed(2)} L/s</div>
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
