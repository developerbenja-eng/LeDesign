'use client';

import { useState, useEffect } from 'react';
import { useCADStore } from '@/stores/cad-store';
import { useInfrastructureStore } from '@/stores/infrastructure-store';
import type {
  AnyInfrastructureEntity,
  WaterPipeEntity,
  WaterJunctionEntity,
  SewerPipeEntity,
  ManholeEntity,
  StormCollectorEntity,
  StormInletEntity,
} from '@/types/infrastructure-entities';
import { isInfrastructureEntity } from '@/types/infrastructure-entities';

interface ElementPropertiesPanelProps {
  onClose: () => void;
}

type TabType = 'general' | 'hydraulic' | 'results' | 'connections';

// Property field configuration
interface PropertyField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'readonly';
  unit?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  category: TabType;
}

// Get property fields based on entity type
function getPropertyFields(infraType: string): PropertyField[] {
  const baseFields: PropertyField[] = [
    { key: 'id', label: 'ID', type: 'readonly', category: 'general' },
    { key: 'name', label: 'Name', type: 'text', category: 'general' },
    { key: 'layer', label: 'Layer', type: 'text', category: 'general' },
    { key: 'designStatus', label: 'Status', type: 'select', category: 'general', options: [
      { value: 'draft', label: 'Draft' },
      { value: 'preliminary', label: 'Preliminary' },
      { value: 'final', label: 'Final' },
      { value: 'as_built', label: 'As-Built' },
    ]},
  ];

  switch (infraType) {
    case 'water_pipe':
      return [
        ...baseFields,
        { key: 'material', label: 'Material', type: 'select', category: 'general', options: [
          { value: 'hdpe', label: 'HDPE' },
          { value: 'pvc', label: 'PVC' },
          { value: 'ductile_iron', label: 'Ductile Iron' },
          { value: 'steel', label: 'Steel' },
          { value: 'copper', label: 'Copper' },
        ]},
        { key: 'diameter', label: 'Diameter', type: 'number', unit: 'mm', min: 20, max: 2000, category: 'hydraulic' },
        { key: 'length', label: 'Length', type: 'readonly', unit: 'm', category: 'hydraulic' },
        { key: 'hazenWilliamsC', label: 'Hazen-Williams C', type: 'number', min: 60, max: 150, category: 'hydraulic' },
        { key: 'roughnessCoeff', label: 'Roughness', type: 'number', unit: 'mm', min: 0.001, max: 10, step: 0.001, category: 'hydraulic' },
        { key: 'nominalPressure', label: 'Nominal Pressure', type: 'number', unit: 'bar', min: 4, max: 25, category: 'hydraulic' },
        { key: 'burialDepth', label: 'Burial Depth', type: 'number', unit: 'm', min: 0.3, max: 5, step: 0.1, category: 'general' },
        { key: 'flow', label: 'Flow', type: 'readonly', unit: 'L/s', category: 'results' },
        { key: 'velocity', label: 'Velocity', type: 'readonly', unit: 'm/s', category: 'results' },
        { key: 'headLoss', label: 'Head Loss', type: 'readonly', unit: 'm', category: 'results' },
        { key: 'pressureStart', label: 'Pressure (Start)', type: 'readonly', unit: 'm.c.a.', category: 'results' },
        { key: 'pressureEnd', label: 'Pressure (End)', type: 'readonly', unit: 'm.c.a.', category: 'results' },
      ];

    case 'water_junction':
      return [
        ...baseFields,
        { key: 'junctionType', label: 'Type', type: 'select', category: 'general', options: [
          { value: 'tee', label: 'Tee' },
          { value: 'cross', label: 'Cross' },
          { value: 'elbow', label: 'Elbow' },
          { value: 'reducer', label: 'Reducer' },
          { value: 'end_cap', label: 'End Cap' },
        ]},
        { key: 'elevation', label: 'Elevation', type: 'number', unit: 'm', category: 'general' },
        { key: 'baseDemand', label: 'Base Demand', type: 'number', unit: 'L/s', min: 0, step: 0.1, category: 'hydraulic' },
        { key: 'demandPattern', label: 'Demand Pattern', type: 'text', category: 'hydraulic' },
        { key: 'head', label: 'Head', type: 'readonly', unit: 'm', category: 'results' },
        { key: 'pressure', label: 'Pressure', type: 'readonly', unit: 'm.c.a.', category: 'results' },
        { key: 'actualDemand', label: 'Actual Demand', type: 'readonly', unit: 'L/s', category: 'results' },
      ];

    case 'sewer_pipe':
      return [
        ...baseFields,
        { key: 'material', label: 'Material', type: 'select', category: 'general', options: [
          { value: 'pvc', label: 'PVC' },
          { value: 'hdpe', label: 'HDPE' },
          { value: 'concrete', label: 'Concrete' },
        ]},
        { key: 'diameter', label: 'Diameter', type: 'number', unit: 'mm', min: 110, max: 2000, category: 'hydraulic' },
        { key: 'length', label: 'Length', type: 'readonly', unit: 'm', category: 'hydraulic' },
        { key: 'slope', label: 'Slope', type: 'number', unit: '%', min: 0.1, max: 20, step: 0.1, category: 'hydraulic' },
        { key: 'manningN', label: 'Manning n', type: 'number', min: 0.009, max: 0.025, step: 0.001, category: 'hydraulic' },
        { key: 'invertStart', label: 'Invert (Start)', type: 'number', unit: 'm', category: 'general' },
        { key: 'invertEnd', label: 'Invert (End)', type: 'number', unit: 'm', category: 'general' },
        { key: 'fillRatio', label: 'Design Fill Ratio', type: 'number', min: 0.5, max: 0.85, step: 0.05, category: 'hydraulic' },
        { key: 'fullFlowCapacity', label: 'Full Flow Capacity', type: 'readonly', unit: 'L/s', category: 'results' },
        { key: 'actualFlow', label: 'Actual Flow', type: 'readonly', unit: 'L/s', category: 'results' },
        { key: 'velocity', label: 'Velocity', type: 'readonly', unit: 'm/s', category: 'results' },
        { key: 'depthOfFlow', label: 'Flow Depth', type: 'readonly', unit: 'm', category: 'results' },
      ];

    case 'manhole':
      return [
        ...baseFields,
        { key: 'manholeType', label: 'Type', type: 'select', category: 'general', options: [
          { value: 'A', label: 'Type A (1.2m)' },
          { value: 'B', label: 'Type B (1.3m)' },
          { value: 'drop', label: 'Drop' },
          { value: 'junction', label: 'Junction' },
        ]},
        { key: 'rimElevation', label: 'Rim Elevation', type: 'number', unit: 'm', category: 'general' },
        { key: 'invertElevation', label: 'Invert Elevation', type: 'number', unit: 'm', category: 'general' },
        { key: 'depth', label: 'Depth', type: 'readonly', unit: 'm', category: 'general' },
        { key: 'internalDiameter', label: 'Internal Diameter', type: 'number', unit: 'm', min: 1.0, max: 2.0, step: 0.1, category: 'general' },
        { key: 'coverType', label: 'Cover Type', type: 'select', category: 'general', options: [
          { value: 'traffic', label: 'Traffic (D400)' },
          { value: 'sidewalk', label: 'Sidewalk (C250)' },
        ]},
        { key: 'wallMaterial', label: 'Wall Material', type: 'select', category: 'general', options: [
          { value: 'concrete', label: 'Concrete' },
          { value: 'brick', label: 'Brick' },
          { value: 'hdpe', label: 'HDPE' },
        ]},
      ];

    case 'storm_collector':
      return [
        ...baseFields,
        { key: 'material', label: 'Material', type: 'select', category: 'general', options: [
          { value: 'concrete', label: 'Concrete' },
          { value: 'hdpe', label: 'HDPE' },
          { value: 'pvc', label: 'PVC' },
        ]},
        { key: 'shape', label: 'Shape', type: 'select', category: 'hydraulic', options: [
          { value: 'circular', label: 'Circular' },
          { value: 'rectangular', label: 'Rectangular' },
          { value: 'egg', label: 'Egg-Shaped' },
        ]},
        { key: 'diameter', label: 'Diameter', type: 'number', unit: 'mm', min: 300, max: 3000, category: 'hydraulic' },
        { key: 'length', label: 'Length', type: 'readonly', unit: 'm', category: 'hydraulic' },
        { key: 'slope', label: 'Slope', type: 'number', unit: '%', min: 0.1, max: 20, step: 0.1, category: 'hydraulic' },
        { key: 'manningN', label: 'Manning n', type: 'number', min: 0.009, max: 0.025, step: 0.001, category: 'hydraulic' },
        { key: 'returnPeriod', label: 'Return Period', type: 'select', category: 'hydraulic', options: [
          { value: '2', label: '2 years' },
          { value: '5', label: '5 years' },
          { value: '10', label: '10 years' },
          { value: '25', label: '25 years' },
          { value: '50', label: '50 years' },
          { value: '100', label: '100 years' },
        ]},
        { key: 'catchmentArea', label: 'Catchment Area', type: 'number', unit: 'ha', min: 0, step: 0.1, category: 'hydraulic' },
        { key: 'runoffCoeff', label: 'Runoff Coeff (C)', type: 'number', min: 0.1, max: 1.0, step: 0.05, category: 'hydraulic' },
        { key: 'designFlow', label: 'Design Flow', type: 'number', unit: 'L/s', category: 'hydraulic' },
        { key: 'capacity', label: 'Capacity', type: 'readonly', unit: 'L/s', category: 'results' },
        { key: 'actualFlow', label: 'Actual Flow', type: 'readonly', unit: 'L/s', category: 'results' },
        { key: 'velocity', label: 'Velocity', type: 'readonly', unit: 'm/s', category: 'results' },
      ];

    case 'storm_inlet':
      return [
        ...baseFields,
        { key: 'inletType', label: 'Type', type: 'select', category: 'general', options: [
          { value: 'S1', label: 'S1 (0.98m)' },
          { value: 'S2', label: 'S2 (0.66m)' },
          { value: 'combined', label: 'Combined' },
          { value: 'DOH', label: 'DOH Standard' },
          { value: 'grate', label: 'Grate Only' },
        ]},
        { key: 'grateType', label: 'Grate Material', type: 'select', category: 'general', options: [
          { value: 'cast_iron', label: 'Cast Iron' },
          { value: 'galvanized_steel', label: 'Galvanized Steel' },
          { value: 'stainless_steel', label: 'Stainless Steel' },
        ]},
        { key: 'catchmentArea', label: 'Catchment Area', type: 'number', unit: 'm²', min: 0, category: 'hydraulic' },
        { key: 'captureEfficiency', label: 'Capture Efficiency', type: 'number', unit: '%', min: 0, max: 100, category: 'hydraulic' },
        { key: 'designFlow', label: 'Design Flow', type: 'number', unit: 'L/s', category: 'hydraulic' },
        { key: 'sumpDepth', label: 'Sump Depth', type: 'number', unit: 'm', min: 0.1, max: 1.0, step: 0.1, category: 'general' },
        { key: 'inflow', label: 'Inflow', type: 'readonly', unit: 'L/s', category: 'results' },
        { key: 'capturedFlow', label: 'Captured Flow', type: 'readonly', unit: 'L/s', category: 'results' },
      ];

    default:
      return baseFields;
  }
}

// Get display name for infrastructure type
function getDisplayName(infraType: string): string {
  const names: Record<string, string> = {
    water_pipe: 'Water Pipe',
    water_junction: 'Water Junction',
    water_valve: 'Water Valve',
    water_tank: 'Water Tank',
    water_pump: 'Water Pump',
    hydrant: 'Fire Hydrant',
    sewer_pipe: 'Sewer Pipe',
    manhole: 'Manhole',
    house_connection: 'House Connection',
    storm_collector: 'Storm Collector',
    storm_inlet: 'Storm Inlet',
    gutter: 'Gutter',
    road_segment: 'Road Segment',
    curb: 'Curb',
  };
  return names[infraType] || infraType;
}

// Get category icon
function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    water: '💧',
    sewer: '🚰',
    stormwater: '🌧️',
    road: '🛣️',
  };
  return icons[category] || '📐';
}

export function ElementPropertiesPanel({ onClose }: ElementPropertiesPanelProps) {
  const { selectedIds, entities } = useCADStore();
  const { updateInfraEntity, validationMessages, connections, getConnectedEntities } = useInfrastructureStore();
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [editedValues, setEditedValues] = useState<Record<string, unknown>>({});

  // Get selected infrastructure entity
  const selectedId = selectedIds.size > 0 ? Array.from(selectedIds)[0] : null;
  const selectedEntity = selectedId ? entities.get(selectedId) : null;
  const isInfra = selectedEntity && isInfrastructureEntity(selectedEntity);
  const infraEntity = isInfra ? (selectedEntity as unknown as AnyInfrastructureEntity) : null;

  // Reset edited values when selection changes
  useEffect(() => {
    setEditedValues({});
    setActiveTab('general');
  }, [selectedId]);

  // Get validation messages for selected entity
  const entityValidation = infraEntity
    ? validationMessages.filter((m) => m.entityId === infraEntity.id)
    : [];

  // Get connections for selected entity
  const connectedIds = infraEntity ? getConnectedEntities(infraEntity.id) : [];

  // Handle value change
  const handleValueChange = (key: string, value: unknown) => {
    setEditedValues((prev) => ({ ...prev, [key]: value }));
  };

  // Apply changes
  const handleApply = () => {
    if (infraEntity && Object.keys(editedValues).length > 0) {
      updateInfraEntity(infraEntity.id, editedValues as Partial<AnyInfrastructureEntity>);
      setEditedValues({});
    }
  };

  // Get current value (edited or original)
  const getValue = (key: string): unknown => {
    if (key in editedValues) return editedValues[key];
    if (infraEntity && key in infraEntity) {
      return (infraEntity as unknown as Record<string, unknown>)[key];
    }
    return undefined;
  };

  // Render property field
  const renderField = (field: PropertyField) => {
    const value = getValue(field.key);
    const displayValue = value !== undefined && value !== null ? value : '';

    if (field.type === 'readonly') {
      return (
        <div key={field.key} className="flex justify-between items-center py-1">
          <span className="text-gray-400 text-sm">{field.label}</span>
          <span className="text-white text-sm">
            {typeof displayValue === 'number' ? displayValue.toFixed(2) : String(displayValue)}
            {field.unit && <span className="text-gray-500 ml-1">{field.unit}</span>}
          </span>
        </div>
      );
    }

    if (field.type === 'select') {
      return (
        <div key={field.key} className="flex justify-between items-center py-1">
          <span className="text-gray-400 text-sm">{field.label}</span>
          <select
            value={String(displayValue)}
            onChange={(e) => handleValueChange(field.key, e.target.value)}
            className="bg-gray-700 text-white text-sm rounded px-2 py-1 w-36"
          >
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (field.type === 'number') {
      // For slope fields, convert to percentage for display
      const isSlope = field.key === 'slope';
      const numValue = typeof displayValue === 'number'
        ? (isSlope ? displayValue * 100 : displayValue)
        : 0;

      return (
        <div key={field.key} className="flex justify-between items-center py-1">
          <span className="text-gray-400 text-sm">{field.label}</span>
          <div className="flex items-center">
            <input
              type="number"
              value={numValue}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                handleValueChange(field.key, isSlope ? val / 100 : val);
              }}
              min={field.min}
              max={field.max}
              step={field.step || 1}
              className="bg-gray-700 text-white text-sm rounded px-2 py-1 w-24 text-right"
            />
            {field.unit && <span className="text-gray-500 ml-1 text-sm w-12">{field.unit}</span>}
          </div>
        </div>
      );
    }

    // Text field
    return (
      <div key={field.key} className="flex justify-between items-center py-1">
        <span className="text-gray-400 text-sm">{field.label}</span>
        <input
          type="text"
          value={String(displayValue)}
          onChange={(e) => handleValueChange(field.key, e.target.value)}
          className="bg-gray-700 text-white text-sm rounded px-2 py-1 w-36"
        />
      </div>
    );
  };

  // If nothing selected or not infrastructure
  if (!infraEntity) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-lg w-80 overflow-hidden">
        <div className="bg-gray-700 px-4 py-2 flex justify-between items-center">
          <h3 className="text-white font-semibold text-sm">Properties</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg">
            ×
          </button>
        </div>
        <div className="p-4 text-gray-400 text-sm text-center">
          {selectedIds.size === 0 ? (
            <span>Select an element to view properties</span>
          ) : selectedIds.size > 1 ? (
            <span>{selectedIds.size} elements selected</span>
          ) : (
            <span>Selected element is not an infrastructure element</span>
          )}
        </div>
      </div>
    );
  }

  const fields = getPropertyFields(infraEntity.infrastructureType);
  const tabFields = fields.filter((f) => f.category === activeTab);
  const hasChanges = Object.keys(editedValues).length > 0;

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg w-80 overflow-hidden max-h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="bg-gray-700 px-4 py-2 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getCategoryIcon(infraEntity.category)}</span>
          <div>
            <h3 className="text-white font-semibold text-sm">
              {getDisplayName(infraEntity.infrastructureType)}
            </h3>
            <span className="text-gray-400 text-xs">{infraEntity.name || infraEntity.id}</span>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-lg">
          ×
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 shrink-0">
        {(['general', 'hydraulic', 'results', 'connections'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-700/50'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'connections' ? (
          <div className="space-y-3">
            <div className="text-gray-400 text-sm mb-2">
              Connected Elements ({connectedIds.length})
            </div>
            {connectedIds.length === 0 ? (
              <div className="text-gray-500 text-xs">No connections</div>
            ) : (
              connectedIds.map((id) => {
                const connEntity = entities.get(id);
                const connInfra = connEntity && isInfrastructureEntity(connEntity)
                  ? (connEntity as unknown as AnyInfrastructureEntity)
                  : null;
                return (
                  <div
                    key={id}
                    className="bg-gray-700/50 rounded px-3 py-2 flex items-center gap-2"
                  >
                    <span className="text-sm">
                      {connInfra ? getCategoryIcon(connInfra.category) : '📐'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm truncate">
                        {connInfra ? getDisplayName(connInfra.infrastructureType) : 'Element'}
                      </div>
                      <div className="text-gray-400 text-xs truncate">
                        {connInfra?.name || id}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {tabFields.length === 0 ? (
              <div className="text-gray-500 text-xs">No properties in this tab</div>
            ) : (
              tabFields.map(renderField)
            )}
          </div>
        )}

        {/* Validation Messages */}
        {entityValidation.length > 0 && activeTab !== 'connections' && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="text-gray-400 text-sm mb-2">Validation</div>
            {entityValidation.map((msg, idx) => (
              <div
                key={idx}
                className={`text-xs rounded px-2 py-1 mb-1 ${
                  msg.type === 'error'
                    ? 'bg-red-900/50 text-red-300'
                    : msg.type === 'warning'
                    ? 'bg-yellow-900/50 text-yellow-300'
                    : 'bg-blue-900/50 text-blue-300'
                }`}
              >
                {msg.message}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Apply Button */}
      {hasChanges && (
        <div className="shrink-0 p-3 border-t border-gray-700 bg-gray-800">
          <button
            onClick={handleApply}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded transition-colors"
          >
            Apply Changes
          </button>
        </div>
      )}
    </div>
  );
}
