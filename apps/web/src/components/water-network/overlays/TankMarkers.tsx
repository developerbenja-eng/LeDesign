'use client';

import { CircleMarker, Tooltip } from 'react-leaflet';
import {
  useWaterNetworkStore,
  useTanks,
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

export function TankMarkers() {
  const tanks = useTanks();
  const selection = useWaterNetworkStore((s) => s.selection);
  const solver = useWaterNetworkStore((s) => s.solver);
  const mapCenter = useWaterNetworkStore((s) => s.map.center);
  const { selectNode, setHoveredElement } = useSelectionActions();

  return (
    <>
      {tanks.map((tank) => {
        const position = xyToLatLng(tank.x, tank.y, mapCenter[0], mapCenter[1]);
        const isSelected = selection.selectedNodeIds.has(tank.id);
        const isHovered = selection.hoveredElementId === tank.id;
        const nodeResult = solver?.nodeResults.get(tank.id);

        return (
          <CircleMarker
            key={tank.id}
            center={position}
            radius={isSelected ? 14 : isHovered ? 13 : 12}
            pathOptions={{
              color: isSelected ? '#fbbf24' : '#1e293b',
              weight: isSelected ? 3 : 2,
              fillColor: '#06b6d4', // Cyan for tanks
              fillOpacity: 0.9,
            }}
            eventHandlers={{
              click: (e) => {
                e.originalEvent.stopPropagation();
                selectNode(tank.id, e.originalEvent.shiftKey);
              },
              mouseover: () => setHoveredElement(tank.id, 'node'),
              mouseout: () => setHoveredElement(null, null),
            }}
          >
            <Tooltip>
              <div className="text-xs">
                <div className="font-bold flex items-center gap-1">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full" />
                  {tank.id} (Estanque)
                </div>
                <div>Elevación: {tank.elevation.toFixed(1)} m</div>
                <div>Diámetro: {tank.diameter.toFixed(1)} m</div>
                <div>Nivel inicial: {tank.initLevel.toFixed(1)} m</div>
                <div>Nivel mín/máx: {tank.minLevel.toFixed(1)} - {tank.maxLevel.toFixed(1)} m</div>
                {nodeResult && (
                  <>
                    <div className="border-t border-slate-600 mt-1 pt-1">
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
