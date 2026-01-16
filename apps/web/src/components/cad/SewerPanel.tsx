'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDisciplineStore } from '@/stores/discipline-store';
import type { SewerDesign } from '@/types/disciplines';
import {
  // Pipe Hydraulics
  MANNING_N,
  STANDARD_DIAMETERS,
  VELOCITY_LIMITS,
  FILL_RATIOS,
  calculateCircularPipeFlow,
  sizePipe,
  formatHydraulicResult,
  type PipeMaterial,

  // Storm Sewer
  quickStormPipeSize,

  // Sanitary Sewer
  quickSanitaryPipeSize,
  calculateSanitaryFlows,
  designHouseConnection,

  // Network Layout
  MANHOLE_SPECS,
  MAX_MANHOLE_SPACING,
  layoutManholes,
  estimateManholeCosts,
  formatManholeLayout,
  formatManholeCosts,
} from '@/lib/sewer';

interface SewerPanelProps {
  projectId?: string;
  projectName?: string;
  onClose?: () => void;
}

type ToolMode = 'network' | 'hydraulics' | 'storm' | 'sanitary' | 'manholes' | 'reference';

export function SewerPanel({
  projectId,
  projectName,
  onClose,
}: SewerPanelProps) {
  const [toolMode, setToolMode] = useState<ToolMode>('network');

  // Discipline store
  const {
    sewerDesigns,
    activeSewerDesign,
    setActiveSewerDesign,
    loadDesigns,
    createDesign,
    saveActiveDesign,
    isLoading,
    isSaving,
  } = useDisciplineStore();

  // Load designs on mount
  useEffect(() => {
    if (projectId) {
      loadDesigns(projectId, 'sewer');
    }
  }, [projectId, loadDesigns]);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 shadow-xl w-[480px] max-h-[700px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-white">Sewer Design</h2>
          <p className="text-xs text-gray-400">
            {projectName || 'Storm & Sanitary Sewer Tools'}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Tool Mode Tabs */}
      <div className="flex border-b border-gray-700 overflow-x-auto">
        {([
          { id: 'network', label: 'Red' },
          { id: 'hydraulics', label: 'Pipe Flow' },
          { id: 'storm', label: 'Storm' },
          { id: 'sanitary', label: 'Sanitary' },
          { id: 'manholes', label: 'Manholes' },
          { id: 'reference', label: 'Data' },
        ] as { id: ToolMode; label: string }[]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setToolMode(tab.id)}
            className={`flex-shrink-0 px-4 py-2 text-sm font-medium transition-colors ${
              toolMode === tab.id
                ? 'text-green-400 border-b-2 border-green-400 bg-gray-800'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {toolMode === 'network' && (
          <SewerDesignManagerView
            projectId={projectId}
            designs={sewerDesigns}
            activeDesign={activeSewerDesign}
            onSelectDesign={setActiveSewerDesign}
            onCreateDesign={(name) => projectId && createDesign('sewer', { name })}
            onSaveDesign={() => saveActiveDesign('sewer')}
            isLoading={isLoading}
            isSaving={isSaving}
          />
        )}
        {toolMode === 'hydraulics' && <PipeHydraulicsTool />}
        {toolMode === 'storm' && <StormSewerTool />}
        {toolMode === 'sanitary' && <SanitarySewerTool />}
        {toolMode === 'manholes' && <ManholeTool />}
        {toolMode === 'reference' && <SewerReferenceView />}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-700 text-xs text-gray-500 text-center">
        Based on NCh 1105, SISS & MINVU Chilean Standards
      </div>
    </div>
  );
}

// ============================================
// PIPE HYDRAULICS TOOL
// ============================================

function PipeHydraulicsTool() {
  const [mode, setMode] = useState<'analyze' | 'size'>('analyze');
  const [diameter, setDiameter] = useState('300');
  const [slope, setSlope] = useState('1.0');
  const [material, setMaterial] = useState<PipeMaterial>('pvc');
  const [flowRate, setFlowRate] = useState('50');
  const [sewerType, setSewerType] = useState<'storm' | 'sanitary'>('storm');
  const [result, setResult] = useState<string | null>(null);

  const calculate = useCallback(() => {
    if (mode === 'analyze') {
      // Analyze existing pipe
      const hydraulicResult = calculateCircularPipeFlow(
        {
          diameter: parseFloat(diameter),
          material,
          slope: parseFloat(slope) / 100,
        },
        {
          flowRate: parseFloat(flowRate),
        },
        sewerType
      );

      setResult(formatHydraulicResult(hydraulicResult));
    } else {
      // Size a new pipe
      const sizingResult = sizePipe(
        parseFloat(flowRate),
        material,
        sewerType,
        {
          minSlope: parseFloat(slope) / 100,
          maxSlope: parseFloat(slope) / 100 * 1.5,
        }
      );

      const lines = [
        '═══ PIPE SIZING RESULT ═══',
        '',
        `Design Flow: ${parseFloat(flowRate).toFixed(1)} L/s`,
        `Selected: Ø${sizingResult.recommendedDiameter}mm ${material.toUpperCase()}`,
        '',
        `Capacity: ${sizingResult.selectedResult.fullFlowCapacity.toFixed(1)} L/s`,
        `Velocity: ${sizingResult.selectedResult.velocity.toFixed(2)} m/s`,
        `Fill Ratio: ${(sizingResult.selectedResult.fillRatio * 100).toFixed(0)}%`,
        `Slope: ${(sizingResult.selectedResult.flowDepth > 0 ? parseFloat(slope) : 0).toFixed(2)}%`,
        '',
        sizingResult.selectedResult.velocityCheck.meetsMinimum && sizingResult.selectedResult.velocityCheck.meetsMaximum
          ? '✓ Velocity OK'
          : '✗ Velocity out of range',
        sizingResult.selectedResult.slopeCheck.meetsMinimum ? '✓ Slope OK' : '✗ Slope below minimum',
        sizingResult.selectedResult.isSelfCleaning ? '✓ Self-cleaning OK' : '✗ Self-cleaning not met',
      ];

      if (sizingResult.warnings.length > 0) {
        lines.push('', 'Warnings:');
        sizingResult.warnings.forEach((w: string) => lines.push(`  ⚠ ${w}`));
      }

      setResult(lines.join('\n'));
    }
  }, [mode, diameter, slope, material, flowRate, sewerType]);

  // Get all available diameters
  const allDiameters = [...new Set([
    ...STANDARD_DIAMETERS.storm,
    ...STANDARD_DIAMETERS.sanitary,
    ...STANDARD_DIAMETERS.pvc,
  ])].sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('analyze')}
          className={`flex-1 py-2 px-3 text-sm rounded ${
            mode === 'analyze'
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Analyze Pipe
        </button>
        <button
          onClick={() => setMode('size')}
          className={`flex-1 py-2 px-3 text-sm rounded ${
            mode === 'size'
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Size Pipe
        </button>
      </div>

      {/* Sewer Type */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Sewer Type</label>
        <select
          value={sewerType}
          onChange={(e) => setSewerType(e.target.value as 'storm' | 'sanitary')}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
        >
          <option value="storm">Storm Sewer (Aguas Lluvia)</option>
          <option value="sanitary">Sanitary Sewer (Alcantarillado)</option>
        </select>
      </div>

      {/* Material */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Pipe Material</label>
        <select
          value={material}
          onChange={(e) => setMaterial(e.target.value as PipeMaterial)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
        >
          <option value="pvc">PVC</option>
          <option value="hdpe">HDPE</option>
          <option value="concrete">Concrete</option>
          <option value="ductile_iron">Ductile Iron</option>
          <option value="clay">Clay/Ceramic</option>
        </select>
      </div>

      {mode === 'analyze' ? (
        <>
          {/* Diameter */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Diameter (mm)</label>
            <select
              value={diameter}
              onChange={(e) => setDiameter(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            >
              {allDiameters.map((d) => (
                <option key={d} value={d}>
                  Ø{d} mm
                </option>
              ))}
            </select>
          </div>
          {/* Flow Rate for analysis */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Flow Rate (L/s)</label>
            <input
              type="number"
              value={flowRate}
              onChange={(e) => setFlowRate(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              min="1"
              step="5"
            />
          </div>
        </>
      ) : (
        <>
          {/* Design Flow */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Design Flow (L/s)</label>
            <input
              type="number"
              value={flowRate}
              onChange={(e) => setFlowRate(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              min="1"
              step="5"
            />
          </div>
        </>
      )}

      {/* Slope */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Slope (%)</label>
        <input
          type="number"
          value={slope}
          onChange={(e) => setSlope(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          min="0.1"
          max="20"
          step="0.1"
        />
      </div>

      {/* Calculate Button */}
      <button
        onClick={calculate}
        className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded font-medium"
      >
        {mode === 'analyze' ? 'Analyze' : 'Size Pipe'}
      </button>

      {/* Results */}
      {result && (
        <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700">
          <pre className="text-xs text-green-300 whitespace-pre-wrap font-mono">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}

// ============================================
// STORM SEWER TOOL
// ============================================

function StormSewerTool() {
  const [drainageArea, setDrainageArea] = useState('1.0');
  const [runoffC, setRunoffC] = useState('0.70');
  const [intensity, setIntensity] = useState('60');
  const [slope, setSlope] = useState('1.0');
  const [material, setMaterial] = useState<PipeMaterial>('pvc');
  const [result, setResult] = useState<string | null>(null);

  const calculate = useCallback(() => {
    const sizing = quickStormPipeSize(
      parseFloat(drainageArea),
      parseFloat(runoffC),
      parseFloat(intensity),
      material,
      parseFloat(slope)
    );

    const lines = [
      '═══ STORM SEWER SIZING ═══',
      '',
      'INPUT:',
      `  Drainage Area: ${drainageArea} ha`,
      `  Runoff Coeff.: ${runoffC}`,
      `  Intensity: ${intensity} mm/hr`,
      `  Slope: ${slope}%`,
      `  Material: ${material.toUpperCase()}`,
      '',
      'RESULT:',
      `  Peak Flow: ${sizing.peakFlow.toFixed(1)} L/s`,
      `  Selected Pipe: Ø${sizing.diameter}mm`,
      `  Velocity: ${sizing.velocity.toFixed(2)} m/s`,
      `  Fill Ratio: ${(sizing.fillRatio * 100).toFixed(0)}%`,
      '',
      sizing.isAdequate ? '✓ Design adequate' : '⚠ Review design parameters',
    ];

    setResult(lines.join('\n'));
  }, [drainageArea, runoffC, intensity, slope, material]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Quick storm sewer pipe sizing using Rational Method (Q = C×i×A)
      </p>

      {/* Drainage Area */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Drainage Area (ha)</label>
        <input
          type="number"
          value={drainageArea}
          onChange={(e) => setDrainageArea(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          min="0.1"
          step="0.1"
        />
      </div>

      {/* Runoff Coefficient */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Runoff Coefficient (C)</label>
        <input
          type="number"
          value={runoffC}
          onChange={(e) => setRunoffC(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          min="0.1"
          max="0.95"
          step="0.05"
        />
        <p className="text-xs text-gray-500 mt-1">
          Residential: 0.50-0.70 | Commercial: 0.70-0.95 | Green: 0.10-0.30
        </p>
      </div>

      {/* Rainfall Intensity */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Rainfall Intensity (mm/hr)</label>
        <input
          type="number"
          value={intensity}
          onChange={(e) => setIntensity(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          min="10"
          max="200"
          step="5"
        />
      </div>

      {/* Material */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Pipe Material</label>
        <select
          value={material}
          onChange={(e) => setMaterial(e.target.value as PipeMaterial)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
        >
          <option value="pvc">PVC</option>
          <option value="hdpe">HDPE</option>
          <option value="concrete">Concrete</option>
        </select>
      </div>

      {/* Slope */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Pipe Slope (%)</label>
        <input
          type="number"
          value={slope}
          onChange={(e) => setSlope(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          min="0.3"
          max="15"
          step="0.1"
        />
      </div>

      {/* Calculate */}
      <button
        onClick={calculate}
        className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded font-medium"
      >
        Calculate Storm Sewer
      </button>

      {/* Results */}
      {result && (
        <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700">
          <pre className="text-xs text-green-300 whitespace-pre-wrap font-mono">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}

// ============================================
// SANITARY SEWER TOOL
// ============================================

function SanitarySewerTool() {
  const [mode, setMode] = useState<'flow' | 'pipe' | 'connection'>('flow');
  const [population, setPopulation] = useState('500');
  const [returnFactor, setReturnFactor] = useState('0.8');
  const [infiltration, setInfiltration] = useState('0.2');
  const [pipeLength, setPipeLength] = useState('200');
  const [slope, setSlope] = useState('1.0');
  const [material, setMaterial] = useState<PipeMaterial>('pvc');
  const [units, setUnits] = useState('10');
  const [occupants, setOccupants] = useState('4');
  const [result, setResult] = useState<string | null>(null);

  const calculate = useCallback(() => {
    if (mode === 'flow') {
      // Calculate sanitary flows
      const flows = calculateSanitaryFlows(
        parseInt(population),
        parseFloat(returnFactor),
        parseFloat(infiltration),
        parseFloat(pipeLength)
      );

      // Calculate Harmon factor manually for display
      const popThousands = parseInt(population) / 1000;
      const M = 1 + 14 / (4 + Math.sqrt(popThousands));

      const lines = [
        '═══ SANITARY FLOW CALCULATION ═══',
        '',
        'INPUT:',
        `  Population: ${population} inhabitants`,
        `  Water Consumption: 170 L/hab/day`,
        `  Return Factor: ${returnFactor}`,
        `  Infiltration Rate: ${infiltration} L/s/km`,
        `  Pipe Length: ${pipeLength} m`,
        '',
        'FLOWS:',
        `  Average Domestic: ${flows.averageDomesticFlow.toFixed(2)} L/s`,
        `  Harmon Peak Factor: ${M.toFixed(2)}`,
        `  Peak Domestic: ${flows.peakDomesticFlow.toFixed(2)} L/s`,
        `  Infiltration: ${flows.infiltrationFlow.toFixed(2)} L/s`,
        '',
        `  DESIGN FLOW: ${flows.peakDesignFlow.toFixed(2)} L/s`,
      ];

      setResult(lines.join('\n'));
    } else if (mode === 'pipe') {
      // Size sanitary pipe
      const sizing = quickSanitaryPipeSize(
        parseInt(population),
        material,
        parseFloat(slope)
      );

      const lines = [
        '═══ SANITARY PIPE SIZING ═══',
        '',
        `Population: ${population} inhabitants`,
        `Material: ${material.toUpperCase()}`,
        `Slope: ${slope}%`,
        '',
        'RESULT:',
        `  Average Flow: ${sizing.averageFlow.toFixed(2)} L/s`,
        `  Peak Flow: ${sizing.peakFlow.toFixed(2)} L/s`,
        `  Selected Pipe: Ø${sizing.diameter}mm`,
        `  Velocity: ${sizing.velocity.toFixed(2)} m/s`,
        `  Fill Ratio: ${(sizing.fillRatio * 100).toFixed(0)}%`,
        '',
        sizing.fillRatio <= 0.75
          ? '✓ Fill ratio OK (≤75% for ventilation)'
          : '⚠ Fill ratio exceeds 75%',
        sizing.isAdequate
          ? '✓ Design adequate'
          : '⚠ Review design parameters',
      ];

      setResult(lines.join('\n'));
    } else {
      // Design house connection
      const connection = designHouseConnection(
        parseInt(units),
        parseFloat(occupants)
      );

      const connPopulation = parseInt(units) * parseFloat(occupants);

      const lines = [
        '═══ HOUSE CONNECTION DESIGN ═══',
        '',
        `Units: ${units}`,
        `Occupants/Unit: ${occupants}`,
        `Total Population: ${connPopulation}`,
        '',
        'CONNECTION SPECS:',
        `  Diameter: Ø${connection.diameter}mm`,
        `  Material: PVC`,
        `  Min. Slope: ${(connection.minSlope * 100).toFixed(1)}%`,
        `  Max. Length: ${connection.maxLength.toFixed(1)}m`,
        '',
        'CAPACITY:',
        `  Velocity: ${connection.velocity.toFixed(2)} m/s`,
        `  Capacity: ${connection.capacity.toFixed(2)} L/s`,
        '',
        'NOTES:',
        '  • Connection to main sewer via UD fitting',
        '  • Inspection chamber required at property line',
        '  • Minimum ventilation per NCh 2472',
      ];

      setResult(lines.join('\n'));
    }
  }, [mode, population, returnFactor, infiltration, pipeLength, slope, material, units, occupants]);

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('flow')}
          className={`flex-1 py-2 px-2 text-xs rounded ${
            mode === 'flow'
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Flows
        </button>
        <button
          onClick={() => setMode('pipe')}
          className={`flex-1 py-2 px-2 text-xs rounded ${
            mode === 'pipe'
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Pipe Size
        </button>
        <button
          onClick={() => setMode('connection')}
          className={`flex-1 py-2 px-2 text-xs rounded ${
            mode === 'connection'
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Connection
        </button>
      </div>

      {mode === 'flow' && (
        <>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Population</label>
            <input
              type="number"
              value={population}
              onChange={(e) => setPopulation(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              min="10"
              step="10"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Return Factor</label>
            <input
              type="number"
              value={returnFactor}
              onChange={(e) => setReturnFactor(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              min="0.6"
              max="0.9"
              step="0.05"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Infiltration (L/s/km)</label>
            <input
              type="number"
              value={infiltration}
              onChange={(e) => setInfiltration(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              min="0.05"
              max="0.5"
              step="0.05"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Pipe Length (m)</label>
            <input
              type="number"
              value={pipeLength}
              onChange={(e) => setPipeLength(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              min="50"
              step="50"
            />
          </div>
        </>
      )}

      {mode === 'pipe' && (
        <>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Population Served</label>
            <input
              type="number"
              value={population}
              onChange={(e) => setPopulation(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              min="10"
              step="50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Pipe Material</label>
            <select
              value={material}
              onChange={(e) => setMaterial(e.target.value as PipeMaterial)}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            >
              <option value="pvc">PVC</option>
              <option value="hdpe">HDPE</option>
              <option value="concrete">Concrete</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Slope (%)</label>
            <input
              type="number"
              value={slope}
              onChange={(e) => setSlope(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              min="0.3"
              max="10"
              step="0.1"
            />
          </div>
        </>
      )}

      {mode === 'connection' && (
        <>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Number of Units/Houses</label>
            <input
              type="number"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              min="1"
              step="1"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Occupants per Unit</label>
            <input
              type="number"
              value={occupants}
              onChange={(e) => setOccupants(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              min="1"
              max="10"
              step="0.5"
            />
          </div>
        </>
      )}

      {/* Calculate */}
      <button
        onClick={calculate}
        className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded font-medium"
      >
        Calculate
      </button>

      {/* Results */}
      {result && (
        <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700">
          <pre className="text-xs text-green-300 whitespace-pre-wrap font-mono">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}

// ============================================
// MANHOLE TOOL
// ============================================

function ManholeTool() {
  const [sewerType, setSewerType] = useState<'storm' | 'sanitary'>('sanitary');
  const [pipeDiameter, setPipeDiameter] = useState('300');
  const [startInvert, setStartInvert] = useState('98.5');
  const [targetSlope, setTargetSlope] = useState('1.0');
  const [totalLength, setTotalLength] = useState('200');
  const [groundElev, setGroundElev] = useState('100.0');
  const [result, setResult] = useState<string | null>(null);

  // Get diameters based on sewer type
  const availableDiameters = sewerType === 'storm'
    ? STANDARD_DIAMETERS.storm
    : STANDARD_DIAMETERS.sanitary;

  const calculate = useCallback(() => {
    // Create simple alignment
    const length = parseFloat(totalLength);
    const ground = parseFloat(groundElev);
    const alignment = [
      { x: 0, y: 0, groundElevation: ground },
      { x: length / 3, y: 0, groundElevation: ground - 0.2 },
      { x: length * 2 / 3, y: 0, groundElevation: ground - 0.4 },
      { x: length, y: 0, groundElevation: ground - 0.6 },
    ];

    const layoutResult = layoutManholes({
      alignment,
      sewerType,
      pipeDiameter: parseInt(pipeDiameter),
      startInvert: parseFloat(startInvert),
      targetSlope: parseFloat(targetSlope),
    });

    // Get cost estimate
    const costs = estimateManholeCosts(layoutResult.manholes);

    const output = [
      formatManholeLayout(layoutResult),
      '',
      formatManholeCosts(costs),
    ].join('\n');

    setResult(output);
  }, [sewerType, pipeDiameter, startInvert, targetSlope, totalLength, groundElev]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Design manholes and generate profiles for a sewer line
      </p>

      {/* Sewer Type */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Sewer Type</label>
        <select
          value={sewerType}
          onChange={(e) => setSewerType(e.target.value as 'storm' | 'sanitary')}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
        >
          <option value="sanitary">Sanitary (Alcantarillado)</option>
          <option value="storm">Storm (Aguas Lluvia)</option>
        </select>
      </div>

      {/* Pipe Diameter */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Pipe Diameter (mm)</label>
        <select
          value={pipeDiameter}
          onChange={(e) => setPipeDiameter(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
        >
          {availableDiameters.filter((d: number) => d >= 200).map((d: number) => (
            <option key={d} value={d}>Ø{d}mm</option>
          ))}
        </select>
      </div>

      {/* Total Length */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Total Length (m)</label>
        <input
          type="number"
          value={totalLength}
          onChange={(e) => setTotalLength(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          min="50"
          step="50"
        />
      </div>

      {/* Ground Elevation */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Ground Elevation (m)</label>
        <input
          type="number"
          value={groundElev}
          onChange={(e) => setGroundElev(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          step="0.5"
        />
      </div>

      {/* Start Invert */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Start Invert Elevation (m)</label>
        <input
          type="number"
          value={startInvert}
          onChange={(e) => setStartInvert(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          step="0.1"
        />
      </div>

      {/* Target Slope */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Target Slope (%)</label>
        <input
          type="number"
          value={targetSlope}
          onChange={(e) => setTargetSlope(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          min="0.3"
          max="10"
          step="0.1"
        />
      </div>

      {/* Calculate */}
      <button
        onClick={calculate}
        className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded font-medium"
      >
        Layout Manholes
      </button>

      {/* Results */}
      {result && (
        <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700 max-h-96 overflow-y-auto">
          <pre className="text-xs text-green-300 whitespace-pre-wrap font-mono">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}

// ============================================
// REFERENCE DATA VIEW
// ============================================

function SewerReferenceView() {
  const [activeTab, setActiveTab] = useState<'manning' | 'diameters' | 'limits' | 'manholes'>('manning');

  return (
    <div className="space-y-4">
      {/* Tab Selection */}
      <div className="flex gap-1 flex-wrap">
        {[
          { id: 'manning', label: "Manning's n" },
          { id: 'diameters', label: 'Pipe Sizes' },
          { id: 'limits', label: 'Design Limits' },
          { id: 'manholes', label: 'Manhole Specs' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-3 py-1 text-xs rounded ${
              activeTab === tab.id
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-gray-800 rounded p-3 text-xs">
        {activeTab === 'manning' && (
          <div>
            <h4 className="font-medium text-white mb-2">Manning&apos;s Roughness Coefficients</h4>
            <table className="w-full text-gray-300">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-1">Material</th>
                  <th className="text-right py-1">Typical n</th>
                  <th className="text-right py-1">Range</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(MANNING_N).map(([mat, values]) => (
                  <tr key={mat} className="border-b border-gray-700/50">
                    <td className="py-1 capitalize">{mat.replace(/_/g, ' ')}</td>
                    <td className="text-right py-1 text-green-400">{values.typical.toFixed(3)}</td>
                    <td className="text-right py-1 text-gray-500">{values.min}-{values.max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'diameters' && (
          <div>
            <h4 className="font-medium text-white mb-2">Standard Pipe Diameters (Chile)</h4>
            <div className="space-y-3">
              <div>
                <p className="text-gray-400 mb-1">Storm Sewer:</p>
                <div className="grid grid-cols-5 gap-1 text-gray-300">
                  {STANDARD_DIAMETERS.storm.map((d: number) => (
                    <div key={d} className="bg-gray-700 px-1 py-0.5 rounded text-center text-xs">
                      Ø{d}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Sanitary Sewer:</p>
                <div className="grid grid-cols-5 gap-1 text-gray-300">
                  {STANDARD_DIAMETERS.sanitary.map((d: number) => (
                    <div key={d} className="bg-gray-700 px-1 py-0.5 rounded text-center text-xs">
                      Ø{d}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-gray-400 mb-1">PVC Pipes:</p>
                <div className="grid grid-cols-5 gap-1 text-gray-300">
                  {STANDARD_DIAMETERS.pvc.map((d: number) => (
                    <div key={d} className="bg-gray-700 px-1 py-0.5 rounded text-center text-xs">
                      Ø{d}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'limits' && (
          <div>
            <h4 className="font-medium text-white mb-2">Design Limits per Sewer Type</h4>
            <table className="w-full text-gray-300">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-1">Parameter</th>
                  <th className="text-right py-1">Storm</th>
                  <th className="text-right py-1">Sanitary</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">Min Velocity (m/s)</td>
                  <td className="text-right text-green-400">{VELOCITY_LIMITS.storm.min}</td>
                  <td className="text-right text-green-400">{VELOCITY_LIMITS.sanitary.min}</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">Max Velocity (m/s)</td>
                  <td className="text-right text-green-400">{VELOCITY_LIMITS.storm.max}</td>
                  <td className="text-right text-green-400">{VELOCITY_LIMITS.sanitary.max}</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">Max Fill Ratio</td>
                  <td className="text-right text-green-400">{(FILL_RATIOS.storm.maxAllowed * 100).toFixed(0)}%</td>
                  <td className="text-right text-green-400">{(FILL_RATIOS.sanitary.maxAllowed * 100).toFixed(0)}%</td>
                </tr>
                <tr>
                  <td className="py-1">Design Fill</td>
                  <td className="text-right text-green-400">{(FILL_RATIOS.storm.design * 100).toFixed(0)}%</td>
                  <td className="text-right text-green-400">{(FILL_RATIOS.sanitary.design * 100).toFixed(0)}%</td>
                </tr>
              </tbody>
            </table>
            <p className="text-gray-500 mt-3 text-xs">
              Min shear stress for self-cleaning: 1.0 Pa (N/m²)
            </p>
          </div>
        )}

        {activeTab === 'manholes' && (
          <div>
            <h4 className="font-medium text-white mb-2">Manhole Specifications</h4>
            <table className="w-full text-gray-300 text-xs">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-1">Type</th>
                  <th className="text-right py-1">Size</th>
                  <th className="text-right py-1">Depth</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(MANHOLE_SPECS).map(([key, spec]) => (
                  <tr key={key} className="border-b border-gray-700/50">
                    <td className="py-1 capitalize">{spec.type.replace(/_/g, ' ')}</td>
                    <td className="text-right text-green-400">
                      {spec.shape === 'circular'
                        ? `Ø${spec.internalDiameter}`
                        : `${spec.internalWidth}x${spec.internalLength}`}
                    </td>
                    <td className="text-right">
                      {spec.minimumDepth}-{spec.maximumDepth}m
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h4 className="font-medium text-white mt-4 mb-2">Max Manhole Spacing</h4>
            <div className="grid grid-cols-2 gap-2 text-gray-300">
              {Object.entries(MAX_MANHOLE_SPACING).slice(0, 6).map(([dia, spacing]) => (
                <div key={dia} className="flex justify-between">
                  <span>Ø{dia}mm:</span>
                  <span className="text-green-400">{spacing}m</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// SEWER DESIGN MANAGER VIEW
// ============================================

interface SewerDesignManagerViewProps {
  projectId?: string;
  designs: SewerDesign[];
  activeDesign: SewerDesign | null;
  onSelectDesign: (design: SewerDesign | null) => void;
  onCreateDesign: (name: string) => void;
  onSaveDesign: () => void;
  isLoading: boolean;
  isSaving: boolean;
}

function SewerDesignManagerView({
  projectId,
  designs,
  activeDesign,
  onSelectDesign,
  onCreateDesign,
  onSaveDesign,
  isLoading,
  isSaving,
}: SewerDesignManagerViewProps) {
  const [newDesignName, setNewDesignName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreate = () => {
    if (newDesignName.trim()) {
      onCreateDesign(newDesignName.trim());
      setNewDesignName('');
      setShowCreateForm(false);
    }
  };

  if (!projectId) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400 text-sm">
          Guarda el proyecto para habilitar el guardado de diseños de alcantarillado.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-gray-400 text-sm">Cargando diseños...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-white font-medium text-sm">Diseños de Alcantarillado</h4>
        <button
          onClick={() => setShowCreateForm(true)}
          className="text-green-400 hover:text-green-300 text-xs"
        >
          + Nuevo
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-gray-800 rounded p-3 space-y-2">
          <input
            type="text"
            value={newDesignName}
            onChange={(e) => setNewDesignName(e.target.value)}
            placeholder="Nombre del diseño"
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded py-1 text-xs"
            >
              Crear
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white rounded py-1 text-xs"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Designs List */}
      {designs.length === 0 ? (
        <div className="text-center py-4 text-gray-500 text-sm">
          No hay diseños. Crea uno nuevo para empezar.
        </div>
      ) : (
        <div className="space-y-2">
          {designs.map((design) => (
            <div
              key={design.id}
              onClick={() => onSelectDesign(design)}
              className={`p-3 rounded cursor-pointer border transition-colors ${
                activeDesign?.id === design.id
                  ? 'bg-green-900/30 border-green-600'
                  : 'bg-gray-800 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-medium">{design.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  design.status === 'final' ? 'bg-green-600 text-white' :
                  design.status === 'review' ? 'bg-yellow-600 text-white' :
                  'bg-gray-600 text-gray-300'
                }`}>
                  {design.status}
                </span>
              </div>
              <div className="text-gray-400 text-xs mt-1">
                {design.manholes.length} pozos · {design.pipes.length} tuberías · {design.connections.length} conexiones
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active Design Stats */}
      {activeDesign && (
        <div className="bg-gray-800 rounded p-3 space-y-2">
          <h5 className="text-white text-sm font-medium">Diseño Activo</h5>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-gray-400">
              Tipo: <span className="text-green-400">{activeDesign.sewerType}</span>
            </div>
            <div className="text-gray-400">
              Población: <span className="text-white">{activeDesign.designPopulation?.toLocaleString() || '-'}</span>
            </div>
            <div className="text-gray-400">
              Pendiente mín: <span className="text-white">{(activeDesign.minSlope * 100).toFixed(2)}%</span>
            </div>
            <div className="text-gray-400">
              Profundidad mín: <span className="text-white">{activeDesign.minDepth}m</span>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={onSaveDesign}
            disabled={isSaving}
            className="w-full mt-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Cambios'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
