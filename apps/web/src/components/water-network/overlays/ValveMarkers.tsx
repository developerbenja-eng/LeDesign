'use client';

import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import {
  useWaterNetworkStore,
  useValves,
  useSelectionActions,
} from '@/stores/water-network/waterNetworkStore';

// Valve type colors
const valveColors: Record<string, string> = {
  PRV: '#ef4444', // Red - Pressure Reducing
  PSV: '#f97316', // Orange - Pressure Sustaining
  PBV: '#eab308', // Yellow - Pressure Breaker
  FCV: '#22c55e', // Green - Flow Control
  TCV: '#06b6d4', // Cyan - Throttle Control
  GPV: '#8b5cf6', // Purple - General Purpose
};

// Create custom valve icon (bowtie shape)
const createValveIcon = (valveType: string, isSelected: boolean, isClosed: boolean) => {
  const color = isSelected ? '#fbbf24' : valveColors[valveType] || '#64748b';
  const size = isSelected ? 26 : 22;

  return L.divIcon({
    className: 'valve-marker',
    html: `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 12L12 6L20 12L12 18L4 12Z" fill="${color}" stroke="${isSelected ? '#fff' : '#1e293b'}" stroke-width="2"/>
        ${isClosed ? '<line x1="4" y1="4" x2="20" y2="20" stroke="#ef4444" stroke-width="2"/>' : ''}
      </svg>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const valveTypeNames: Record<string, string> = {
  PRV: 'Reductora de Presión',
  PSV: 'Sostenedora de Presión',
  PBV: 'Interruptora de Presión',
  FCV: 'Control de Caudal',
  TCV: 'Control de Estrangulamiento',
  GPV: 'Propósito General',
};

export function ValveMarkers() {
  const valves = useValves();
  const solver = useWaterNetworkStore((s) => s.solver);
  const selectedLinkIds = useWaterNetworkStore((s) => s.selection.selectedLinkIds);
  const network = useWaterNetworkStore((s) => s.network);
  const { selectLink } = useSelectionActions();

  // Get node positions for valve placement (midpoint between start and end)
  const getValvePosition = (startNodeId: string, endNodeId: string): [number, number] | null => {
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
      {valves.map((valve) => {
        const position = getValvePosition(valve.startNode, valve.endNode);
        if (!position) return null;

        const isSelected = selectedLinkIds.has(valve.id);
        const result = solver?.linkResults.get(valve.id);
        const isClosed = result?.status === 'closed' || valve.status === 'closed';

        return (
          <Marker
            key={valve.id}
            position={position}
            icon={createValveIcon(valve.valveType, isSelected, isClosed)}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e.originalEvent);
                selectLink(valve.id, e.originalEvent.shiftKey);
              },
            }}
          >
            <Tooltip>
              <div className="text-xs">
                <div className="font-semibold text-slate-800">Válvula: {valve.id}</div>
                <div className="text-slate-600">
                  Tipo: {valveTypeNames[valve.valveType] || valve.valveType}
                </div>
                <div className="text-slate-600">
                  {valve.startNode} → {valve.endNode}
                </div>
                <div>Diámetro: {valve.diameter} mm</div>
                {valve.valveType === 'PRV' && <div>Presión objetivo: {valve.setting} m</div>}
                {valve.valveType === 'FCV' && <div>Caudal objetivo: {valve.setting} L/s</div>}
                {result && (
                  <>
                    <hr className="my-1 border-slate-300" />
                    <div className={isClosed ? 'text-red-600' : 'text-green-600'}>
                      Estado: {isClosed ? 'Cerrada' : 'Abierta'}
                    </div>
                    <div>Caudal: {result.flow.toFixed(2)} L/s</div>
                    <div>Pérdida: {result.headLoss.toFixed(2)} m</div>
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
