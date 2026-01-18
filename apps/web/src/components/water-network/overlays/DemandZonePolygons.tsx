'use client';

import { Polygon, Tooltip } from 'react-leaflet';
import {
  useWaterNetworkStore,
  useDemandZones,
  useSelectionActions,
} from '@/stores/water-network/waterNetworkStore';
import type { LandUseCategory } from '@/stores/water-network/types';

// Land use category colors
const LAND_USE_COLORS: Record<LandUseCategory, string> = {
  residential_low: '#22c55e',    // Green
  residential_medium: '#84cc16', // Lime
  residential_high: '#eab308',   // Yellow
  commercial: '#f97316',         // Orange
  industrial_light: '#8b5cf6',   // Violet
  industrial_heavy: '#6366f1',   // Indigo
  institutional: '#06b6d4',      // Cyan
  rural: '#10b981',              // Emerald
  mixed_use: '#ec4899',          // Pink
};

const LAND_USE_LABELS: Record<LandUseCategory, string> = {
  residential_low: 'Residencial Baja Densidad',
  residential_medium: 'Residencial Media Densidad',
  residential_high: 'Residencial Alta Densidad',
  commercial: 'Comercial',
  industrial_light: 'Industrial Liviano',
  industrial_heavy: 'Industrial Pesado',
  institutional: 'Institucional',
  rural: 'Rural',
  mixed_use: 'Uso Mixto',
};

export function DemandZonePolygons() {
  const demandZones = useDemandZones();
  const selection = useWaterNetworkStore((s) => s.selection);
  const { selectZone, setHoveredElement } = useSelectionActions();

  return (
    <>
      {demandZones.map((zone) => {
        const positions = zone.polygon.map((p) => [p.lat, p.lng] as [number, number]);
        const isSelected = selection.selectedZoneIds.has(zone.id);
        const isHovered = selection.hoveredElementId === zone.id;
        const color = LAND_USE_COLORS[zone.landUse];

        return (
          <Polygon
            key={zone.id}
            positions={positions}
            pathOptions={{
              color: isSelected ? '#fbbf24' : color,
              weight: isSelected ? 3 : isHovered ? 2 : 1,
              fillColor: color,
              fillOpacity: zone.opacity || 0.3,
            }}
            eventHandlers={{
              click: (e) => {
                e.originalEvent.stopPropagation();
                selectZone(zone.id, e.originalEvent.shiftKey);
              },
              mouseover: () => setHoveredElement(zone.id, 'zone'),
              mouseout: () => setHoveredElement(null, null),
            }}
          >
            <Tooltip>
              <div className="text-xs">
                <div className="font-bold flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {zone.name}
                </div>
                <div>Uso: {LAND_USE_LABELS[zone.landUse]}</div>
                <div>Área: {zone.areaHa.toFixed(2)} ha</div>
                <div>Población est.: {zone.estimatedPopulation.toLocaleString()}</div>
                <div>Demanda est.: {zone.estimatedDemand.toFixed(2)} L/s</div>
                <div>Nodos asignados: {zone.assignedJunctions.length}</div>
              </div>
            </Tooltip>
          </Polygon>
        );
      })}
    </>
  );
}
