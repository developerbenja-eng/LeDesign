'use client';

import { Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  useWaterNetworkStore,
  usePumps,
  useSelectionActions,
  useVisualization,
} from '@/stores/water-network/waterNetworkStore';

// Create custom pump icon (arrow in circle)
const createPumpIcon = (isSelected: boolean, isActive: boolean) => {
  const color = isSelected ? '#fbbf24' : isActive ? '#22c55e' : '#8b5cf6';
  const size = isSelected ? 28 : 24;

  return L.divIcon({
    className: 'pump-marker',
    html: `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="${color}" stroke="${isSelected ? '#fff' : '#1e293b'}" stroke-width="2"/>
        <path d="M8 12L16 12M16 12L13 9M16 12L13 15" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

export function PumpMarkers() {
  const pumps = usePumps();
  const solver = useWaterNetworkStore((s) => s.solver);
  const selectedLinkIds = useWaterNetworkStore((s) => s.selection.selectedLinkIds);
  const network = useWaterNetworkStore((s) => s.network);
  const { selectLink } = useSelectionActions();

  // Get node positions for pump placement (midpoint between start and end)
  const getPumpPosition = (startNodeId: string, endNodeId: string): [number, number] | null => {
    const startNode = [...network.junctions, ...network.tanks, ...network.reservoirs].find(
      (n) => n.id === startNodeId
    );
    const endNode = [...network.junctions, ...network.tanks, ...network.reservoirs].find(
      (n) => n.id === endNodeId
    );

    if (!startNode || !endNode) return null;

    // Calculate midpoint
    const midLat = (startNode.y + endNode.y) / 2;
    const midLng = (startNode.x + endNode.x) / 2;

    return [midLat, midLng];
  };

  return (
    <>
      {pumps.map((pump) => {
        const position = getPumpPosition(pump.startNode, pump.endNode);
        if (!position) return null;

        const isSelected = selectedLinkIds.has(pump.id);
        const result = solver?.linkResults.get(pump.id);
        const isActive = result?.status === 'active' || result?.status === 'open';

        return (
          <Marker
            key={pump.id}
            position={position}
            icon={createPumpIcon(isSelected, isActive)}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e.originalEvent);
                selectLink(pump.id, e.originalEvent.shiftKey);
              },
            }}
          >
            <Tooltip>
              <div className="text-xs">
                <div className="font-semibold text-slate-800">Bomba: {pump.id}</div>
                <div className="text-slate-600">
                  {pump.startNode} → {pump.endNode}
                </div>
                {pump.pumpType === 'power' && (
                  <div>Potencia: {pump.power} kW</div>
                )}
                {pump.pumpType === 'head' && pump.headCurveId && (
                  <div>Curva: {pump.headCurveId}</div>
                )}
                {result && (
                  <>
                    <hr className="my-1 border-slate-300" />
                    <div className={result.status === 'active' ? 'text-green-600' : 'text-slate-500'}>
                      Estado: {result.status === 'active' ? 'Activa' : result.status === 'closed' ? 'Cerrada' : 'Abierta'}
                    </div>
                    <div>Caudal: {result.flow.toFixed(2)} L/s</div>
                    <div>Altura: {result.headLoss.toFixed(2)} m</div>
                  </>
                )}
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
}
