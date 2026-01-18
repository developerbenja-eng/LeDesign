'use client';

import { useState, useEffect } from 'react';
import { useDisciplineStore } from '@/stores/discipline-store';
import { useModuleTracking } from '@/hooks/useModuleTracking';
import {
  // Pipe hydraulics
  HAZEN_WILLIAMS_C,
  STANDARD_DIAMETERS_WATER,
  VELOCITY_LIMITS_WATER,
  PRESSURE_LIMITS,
  HEAD_LOSS_LIMITS,
  calculateHeadLoss,
  sizePipeForFlow,
  formatHeadLossResult,
  formatPipeSizingResult,
  type WaterPipeMaterial,
  type FrictionFormula,

  // Network elements
  createJunction,
  createTank,
  createReservoir,
  createPipe,
  createPumpPowerFunc,
  calculatePumpHead,
  calculatePumpPower,
  getNetworkStatistics,
  validateNetwork,
  createEmptyNetwork,

  // Solver
  solveNetwork,
  formatSolverResult,

  // Demand analysis
  BASE_CONSUMPTION,
  CLIMATE_FACTORS,
  FIRE_FLOW_REQUIREMENTS,
  calculateAreaDemand,
  calculateStorageRequirements,
  getStandardPatterns,
  formatPopulationDemand,
  formatStorageRequirements,
  type LandUseCategory,
  type ClimateZone,

  // Water quality
  CHILEAN_WATER_STANDARDS,
  calculateRequiredChlorineDose,
  formatQualityStandards,
} from '@/lib/water-network';

interface WaterNetworkPanelProps {
  projectId?: string;
  projectName: string;
  onClose: () => void;
}

type TabType = 'network' | 'hydraulics' | 'demand' | 'pump' | 'quality' | 'reference';

export function WaterNetworkPanel({ projectId, projectName, onClose }: WaterNetworkPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('network');

  // Track module usage for reporting
  useModuleTracking(projectId || '', 'hydraulic');

  // Discipline store
  const {
    waterNetworkDesigns,
    activeWaterNetworkDesign,
    setActiveWaterNetworkDesign,
    loadDesigns,
    createDesign,
    saveActiveDesign,
    isLoading,
    isSaving,
  } = useDisciplineStore();

  // Load designs on mount
  useEffect(() => {
    if (projectId) {
      loadDesigns(projectId, 'water-network');
    }
  }, [projectId, loadDesigns]);

  return (
    <div className="bg-cad-panel border border-gray-700 rounded-lg shadow-xl w-96 max-h-[80vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div>
          <h3 className="text-white font-medium">Water Network Design</h3>
          <p className="text-gray-400 text-xs">{projectName}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Network Studio Button */}
      <div className="p-3 border-b border-gray-700">
        <a
          href={projectId ? `/water-network?projectId=${projectId}` : '/water-network'}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Open Network Studio
        </a>
        <p className="text-center text-gray-500 text-xs mt-2">
          Full EPANET-style network designer with map view
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {[
          { id: 'network', label: 'Red' },
          { id: 'hydraulics', label: 'Pipes' },
          { id: 'demand', label: 'Demand' },
          { id: 'pump', label: 'Pumps' },
          { id: 'quality', label: 'Quality' },
          { id: 'reference', label: 'Ref' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'network' && (
          <NetworkManagerView
            projectId={projectId}
            designs={waterNetworkDesigns}
            activeDesign={activeWaterNetworkDesign}
            onSelectDesign={setActiveWaterNetworkDesign}
            onCreateDesign={(name) => projectId && createDesign('water-network', { name })}
            onSaveDesign={() => saveActiveDesign('water-network')}
            isLoading={isLoading}
            isSaving={isSaving}
          />
        )}
        {activeTab === 'hydraulics' && <PipeHydraulicsView />}
        {activeTab === 'demand' && <DemandAnalysisView />}
        {activeTab === 'pump' && <PumpDesignView />}
        {activeTab === 'quality' && <WaterQualityView />}
        {activeTab === 'reference' && <ReferenceView />}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-700 text-xs text-gray-500 text-center">
        Based on NCh 691, NCh 2485, NCh 409 • Similar to EPANET
      </div>
    </div>
  );
}

// ============================================================================
// Pipe Hydraulics View
// ============================================================================

function PipeHydraulicsView() {
  const [flow, setFlow] = useState(10);
  const [diameter, setDiameter] = useState(100);
  const [length, setLength] = useState(500);
  const [material, setMaterial] = useState<WaterPipeMaterial>('hdpe');
  const [formula, setFormula] = useState<FrictionFormula>('hazen-williams');
  const [result, setResult] = useState<string | null>(null);

  const calculateHeadLossResult = () => {
    const hlResult = calculateHeadLoss(flow, diameter, length, material, formula);
    setResult(formatHeadLossResult(hlResult));
  };

  const sizePipe = () => {
    const sizing = sizePipeForFlow({
      flow,
      length,
      availableHead: 10, // Default 10m available
      material,
      formula,
    });
    setResult(formatPipeSizingResult(sizing));
  };

  return (
    <div className="space-y-4">
      <h4 className="text-white font-medium text-sm">Pipe Head Loss Calculator</h4>

      {/* Material & Formula */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-gray-400 text-xs mb-1">Material</label>
          <select
            value={material}
            onChange={(e) => setMaterial(e.target.value as WaterPipeMaterial)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
          >
            <option value="hdpe">HDPE PE100</option>
            <option value="pvc">PVC</option>
            <option value="ductile_iron">Ductile Iron</option>
            <option value="steel">Steel</option>
            <option value="concrete">Concrete</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Formula</label>
          <select
            value={formula}
            onChange={(e) => setFormula(e.target.value as FrictionFormula)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
          >
            <option value="hazen-williams">Hazen-Williams</option>
            <option value="darcy-weisbach">Darcy-Weisbach</option>
            <option value="manning">Manning</option>
          </select>
        </div>
      </div>

      {/* Parameters */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-gray-400 text-xs mb-1">Flow (L/s)</label>
          <input
            type="number"
            value={flow}
            onChange={(e) => setFlow(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Diameter (mm)</label>
          <select
            value={diameter}
            onChange={(e) => setDiameter(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
          >
            {STANDARD_DIAMETERS_WATER[material].map((d) => (
              <option key={d} value={d}>{d} mm</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Length (m)</label>
          <input
            type="number"
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={calculateHeadLossResult}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded py-2 text-sm font-medium transition-colors"
        >
          Calculate Head Loss
        </button>
        <button
          onClick={sizePipe}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded py-2 text-sm font-medium transition-colors"
        >
          Size Pipe
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-gray-800 rounded p-3 mt-4">
          <pre className="text-green-400 text-xs whitespace-pre-wrap font-mono">{result}</pre>
        </div>
      )}

      {/* Quick Info */}
      <div className="text-gray-400 text-xs mt-2">
        <p>C = {HAZEN_WILLIAMS_C[material].new} (new) / {HAZEN_WILLIAMS_C[material].aged} (aged)</p>
        <p>Velocity: {VELOCITY_LIMITS_WATER.minimum}-{VELOCITY_LIMITS_WATER.maximum} m/s</p>
      </div>
    </div>
  );
}

// ============================================================================
// Demand Analysis View
// ============================================================================

function DemandAnalysisView() {
  const [area, setArea] = useState(10);
  const [landUse, setLandUse] = useState<LandUseCategory>('residential_medium');
  const [climate, setClimate] = useState<ClimateZone>('centro');
  const [population, setPopulation] = useState<number | undefined>(undefined);
  const [result, setResult] = useState<string | null>(null);
  const [storageResult, setStorageResult] = useState<string | null>(null);

  const calculateDemand = () => {
    const demand = calculateAreaDemand(area, landUse, climate, population);
    setResult(formatPopulationDemand(demand));

    // Calculate storage requirements
    const storage = calculateStorageRequirements(demand.maximumDailyDemand);
    setStorageResult(formatStorageRequirements(storage));
  };

  return (
    <div className="space-y-4">
      <h4 className="text-white font-medium text-sm">Water Demand Analysis</h4>

      {/* Land Use & Climate */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-gray-400 text-xs mb-1">Land Use</label>
          <select
            value={landUse}
            onChange={(e) => setLandUse(e.target.value as LandUseCategory)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
          >
            <option value="residential_low">Residential Low</option>
            <option value="residential_medium">Residential Medium</option>
            <option value="residential_high">Residential High</option>
            <option value="commercial">Commercial</option>
            <option value="industrial_light">Industrial Light</option>
            <option value="mixed_use">Mixed Use</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Climate Zone</label>
          <select
            value={climate}
            onChange={(e) => setClimate(e.target.value as ClimateZone)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
          >
            <option value="norte">Norte (Atacama)</option>
            <option value="centro">Centro (Santiago)</option>
            <option value="sur">Sur (Concepción)</option>
            <option value="austral">Austral (Magallanes)</option>
          </select>
        </div>
      </div>

      {/* Area & Population */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-gray-400 text-xs mb-1">Area (ha)</label>
          <input
            type="number"
            value={area}
            onChange={(e) => setArea(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Population (optional)</label>
          <input
            type="number"
            value={population || ''}
            onChange={(e) => setPopulation(e.target.value ? Number(e.target.value) : undefined)}
            placeholder="Auto-calculate"
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
          />
        </div>
      </div>

      {/* Calculate Button */}
      <button
        onClick={calculateDemand}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded py-2 text-sm font-medium transition-colors"
      >
        Calculate Demand & Storage
      </button>

      {/* Results */}
      {result && (
        <div className="bg-gray-800 rounded p-3">
          <pre className="text-green-400 text-xs whitespace-pre-wrap font-mono">{result}</pre>
        </div>
      )}

      {storageResult && (
        <div className="bg-gray-800 rounded p-3">
          <pre className="text-cyan-400 text-xs whitespace-pre-wrap font-mono">{storageResult}</pre>
        </div>
      )}

      {/* Quick Reference */}
      <div className="text-gray-400 text-xs">
        <p>Base consumption: {BASE_CONSUMPTION[landUse]} L/hab/day</p>
        <p>Climate factor: {CLIMATE_FACTORS[climate]}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Pump Design View
// ============================================================================

function PumpDesignView() {
  const [flow, setFlow] = useState(20);
  const [shutoffHead, setShutoffHead] = useState(50);
  const [designHead, setDesignHead] = useState(40);
  const [efficiency, setEfficiency] = useState(0.75);
  const [result, setResult] = useState<string | null>(null);

  const calculatePump = () => {
    // Create pump with power function
    const pump = createPumpPowerFunc(
      'P1', 'N1', 'N2',
      shutoffHead,
      flow,
      designHead,
      { ratedEfficiency: efficiency }
    );

    // Calculate operating point
    const headAtFlow = calculatePumpHead(pump, flow);
    const power = calculatePumpPower(flow, headAtFlow, efficiency);

    // Generate pump curve points
    const curvePoints: string[] = [];
    for (let q = 0; q <= flow * 1.5; q += flow * 0.25) {
      const h = calculatePumpHead(pump, q);
      curvePoints.push(`  Q=${q.toFixed(1)} L/s → H=${h.toFixed(1)} m`);
    }

    const lines = [
      `Pump Analysis`,
      `========================================`,
      `Design Point: Q=${flow} L/s, H=${designHead} m`,
      `Shutoff Head: ${shutoffHead} m`,
      ``,
      `Operating Characteristics:`,
      `  Head at Design Flow: ${headAtFlow.toFixed(1)} m`,
      `  Power Required: ${power.toFixed(2)} kW`,
      `  Efficiency: ${(efficiency * 100).toFixed(0)}%`,
      ``,
      `Pump Curve (H = A - B×Q^C):`,
      `  A = ${pump.powerCoeffA?.toFixed(2)}`,
      `  B = ${pump.powerCoeffB?.toFixed(6)}`,
      `  C = ${pump.powerCoeffC?.toFixed(2)}`,
      ``,
      `Performance Points:`,
      ...curvePoints,
    ];

    setResult(lines.join('\n'));
  };

  return (
    <div className="space-y-4">
      <h4 className="text-white font-medium text-sm">Pump Selection & Analysis</h4>

      {/* Design Parameters */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-gray-400 text-xs mb-1">Design Flow (L/s)</label>
          <input
            type="number"
            value={flow}
            onChange={(e) => setFlow(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Design Head (m)</label>
          <input
            type="number"
            value={designHead}
            onChange={(e) => setDesignHead(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-gray-400 text-xs mb-1">Shutoff Head (m)</label>
          <input
            type="number"
            value={shutoffHead}
            onChange={(e) => setShutoffHead(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Efficiency (%)</label>
          <input
            type="number"
            value={efficiency * 100}
            onChange={(e) => setEfficiency(Number(e.target.value) / 100)}
            min={50}
            max={95}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
          />
        </div>
      </div>

      {/* Calculate Button */}
      <button
        onClick={calculatePump}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded py-2 text-sm font-medium transition-colors"
      >
        Analyze Pump
      </button>

      {/* Results */}
      {result && (
        <div className="bg-gray-800 rounded p-3">
          <pre className="text-green-400 text-xs whitespace-pre-wrap font-mono">{result}</pre>
        </div>
      )}

      {/* Formula */}
      <div className="text-gray-400 text-xs">
        <p>Power: P = ρgQH/η (kW)</p>
        <p>Typical efficiency: 70-85%</p>
      </div>
    </div>
  );
}

// ============================================================================
// Water Quality View
// ============================================================================

function WaterQualityView() {
  const [travelTime, setTravelTime] = useState(12);
  const [pipeSize, setPipeSize] = useState(150);
  const [targetResidual, setTargetResidual] = useState(0.2);
  const [result, setResult] = useState<string | null>(null);

  const calculateChlorine = () => {
    const dose = calculateRequiredChlorineDose(
      targetResidual,
      travelTime,
      pipeSize
    );

    const lines = [
      `Chlorine Dosing Analysis`,
      `========================================`,
      `Target Residual: ${targetResidual} mg/L`,
      `Max Travel Time: ${travelTime} hours`,
      `Conservative Pipe Size: ${pipeSize} mm`,
      ``,
      `Required Dosing:`,
      `  Source Concentration: ${dose.requiredDose.toFixed(2)} mg/L`,
      `  Expected at Endpoint: ${dose.expectedResidual.toFixed(2)} mg/L`,
      `  Safety Margin: ${dose.safetyMargin.toFixed(2)} mg/L`,
      ``,
      `Chilean Standards (NCh 409):`,
      `  Minimum: ${CHILEAN_WATER_STANDARDS.chlorine.minimum} mg/L`,
      `  Maximum: ${CHILEAN_WATER_STANDARDS.chlorine.maximum} mg/L`,
      ``,
      dose.requiredDose > CHILEAN_WATER_STANDARDS.chlorine.maximum
        ? `⚠ Warning: Required dose exceeds maximum allowed`
        : `✓ Required dose within standards`,
    ];

    setResult(lines.join('\n'));
  };

  return (
    <div className="space-y-4">
      <h4 className="text-white font-medium text-sm">Water Quality Analysis</h4>

      {/* Parameters */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-gray-400 text-xs mb-1">Max Travel Time (h)</label>
          <input
            type="number"
            value={travelTime}
            onChange={(e) => setTravelTime(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Pipe Diameter (mm)</label>
          <input
            type="number"
            value={pipeSize}
            onChange={(e) => setPipeSize(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-gray-400 text-xs mb-1">Target Min Residual (mg/L)</label>
        <input
          type="number"
          value={targetResidual}
          onChange={(e) => setTargetResidual(Number(e.target.value))}
          step={0.1}
          min={0.1}
          max={1.0}
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
        />
      </div>

      {/* Calculate Button */}
      <button
        onClick={calculateChlorine}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded py-2 text-sm font-medium transition-colors"
      >
        Calculate Chlorine Dose
      </button>

      {/* Results */}
      {result && (
        <div className="bg-gray-800 rounded p-3">
          <pre className="text-green-400 text-xs whitespace-pre-wrap font-mono">{result}</pre>
        </div>
      )}

      {/* Standards Summary */}
      <div className="bg-gray-800 rounded p-3">
        <pre className="text-cyan-400 text-xs whitespace-pre-wrap font-mono">{formatQualityStandards()}</pre>
      </div>
    </div>
  );
}

// ============================================================================
// Reference View
// ============================================================================

function ReferenceView() {
  const [activeSection, setActiveSection] = useState<'design' | 'fire' | 'patterns'>('design');

  return (
    <div className="space-y-4">
      <h4 className="text-white font-medium text-sm">Design Reference</h4>

      {/* Section Tabs */}
      <div className="flex gap-1">
        {['design', 'fire', 'patterns'].map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section as 'design' | 'fire' | 'patterns')}
            className={`flex-1 py-1 text-xs rounded ${
              activeSection === section
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            {section.charAt(0).toUpperCase() + section.slice(1)}
          </button>
        ))}
      </div>

      {/* Design Criteria */}
      {activeSection === 'design' && (
        <div className="space-y-3">
          <div>
            <h5 className="text-gray-300 text-xs font-medium mb-1">Velocity Limits</h5>
            <table className="w-full text-gray-300 text-xs">
              <tbody>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">Minimum</td>
                  <td className="text-right text-blue-400">{VELOCITY_LIMITS_WATER.minimum} m/s</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">Maximum</td>
                  <td className="text-right text-blue-400">{VELOCITY_LIMITS_WATER.maximum} m/s</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">Recommended</td>
                  <td className="text-right text-blue-400">{VELOCITY_LIMITS_WATER.recommended.min}-{VELOCITY_LIMITS_WATER.recommended.max} m/s</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h5 className="text-gray-300 text-xs font-medium mb-1">Pressure Limits (m.c.a.)</h5>
            <table className="w-full text-gray-300 text-xs">
              <tbody>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">Min Static</td>
                  <td className="text-right text-blue-400">{PRESSURE_LIMITS.minimum.static} m</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">Min Residual</td>
                  <td className="text-right text-blue-400">{PRESSURE_LIMITS.minimum.residual} m</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">Max Static</td>
                  <td className="text-right text-blue-400">{PRESSURE_LIMITS.maximum.static} m</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h5 className="text-gray-300 text-xs font-medium mb-1">Head Loss Limits (m/km)</h5>
            <table className="w-full text-gray-300 text-xs">
              <tbody>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">Transmission</td>
                  <td className="text-right text-blue-400">{HEAD_LOSS_LIMITS.transmission.typical}</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">Distribution</td>
                  <td className="text-right text-blue-400">{HEAD_LOSS_LIMITS.distribution.typical}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fire Flow Requirements */}
      {activeSection === 'fire' && (
        <div>
          <h5 className="text-gray-300 text-xs font-medium mb-2">Fire Flow Requirements (NCh 691)</h5>
          <table className="w-full text-gray-300 text-xs">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-1">Category</th>
                <th className="text-right py-1">Flow</th>
                <th className="text-right py-1">Duration</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(FIRE_FLOW_REQUIREMENTS).map(([key, req]) => (
                <tr key={key} className="border-b border-gray-700/50">
                  <td className="py-1 text-xs">{req.category}</td>
                  <td className="text-right text-red-400">{req.requiredFlow} L/s</td>
                  <td className="text-right text-orange-400">{req.duration}h</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-gray-500 mt-2 text-xs">
            Min residual pressure during fire: {FIRE_FLOW_REQUIREMENTS.residential_single.residualPressure} m
          </p>
        </div>
      )}

      {/* Demand Patterns */}
      {activeSection === 'patterns' && (
        <div className="space-y-3">
          <h5 className="text-gray-300 text-xs font-medium mb-2">Standard Demand Patterns</h5>
          {getStandardPatterns().map((pattern) => (
            <div key={pattern.id} className="bg-gray-800 rounded p-2">
              <p className="text-blue-400 text-xs font-medium capitalize">{pattern.id}</p>
              <p className="text-gray-500 text-xs">{pattern.description}</p>
              <div className="flex items-end h-12 gap-px mt-2">
                {pattern.multipliers.map((mult, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-blue-500"
                    style={{ height: `${(mult / Math.max(...pattern.multipliers)) * 100}%` }}
                    title={`${i}:00 - ${mult.toFixed(2)}`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-gray-500 text-xs mt-1">
                <span>0h</span>
                <span>12h</span>
                <span>24h</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Network Manager View (Save/Load Designs)
// ============================================================================

import type { WaterNetworkDesign } from '@/types/disciplines';

interface NetworkManagerViewProps {
  projectId?: string;
  designs: WaterNetworkDesign[];
  activeDesign: WaterNetworkDesign | null;
  onSelectDesign: (design: WaterNetworkDesign | null) => void;
  onCreateDesign: (name: string) => void;
  onSaveDesign: () => void;
  isLoading: boolean;
  isSaving: boolean;
}

function NetworkManagerView({
  projectId,
  designs,
  activeDesign,
  onSelectDesign,
  onCreateDesign,
  onSaveDesign,
  isLoading,
  isSaving,
}: NetworkManagerViewProps) {
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
          Guarda el proyecto para habilitar el guardado de diseños de red.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-gray-400 text-sm">Cargando diseños...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-white font-medium text-sm">Diseños de Red</h4>
        <button
          onClick={() => setShowCreateForm(true)}
          className="text-blue-400 hover:text-blue-300 text-xs"
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
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded py-1 text-xs"
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
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm">No hay diseños guardados.</p>
          <p className="text-gray-600 text-xs mt-1">Crea uno nuevo para empezar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {designs.map((design) => (
            <div
              key={design.id}
              onClick={() => onSelectDesign(design)}
              className={`p-3 rounded cursor-pointer transition-colors ${
                activeDesign?.id === design.id
                  ? 'bg-blue-900/30 border border-blue-500'
                  : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-medium">{design.name}</span>
                {activeDesign?.id === design.id && (
                  <span className="text-blue-400 text-xs">Activo</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                <span>{design.nodes.length} nodos</span>
                <span>{design.pipes.length} tuberías</span>
                <span>{design.pumps.length} bombas</span>
              </div>
              {design.description && (
                <p className="text-gray-500 text-xs mt-1 truncate">{design.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Active Design Info */}
      {activeDesign && (
        <div className="bg-gray-800 rounded p-3 space-y-3">
          <h5 className="text-gray-300 text-xs font-medium">Diseño Activo</h5>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-700 rounded p-2">
              <span className="text-gray-400">Nodos</span>
              <p className="text-white text-lg font-semibold">{activeDesign.nodes.length}</p>
            </div>
            <div className="bg-gray-700 rounded p-2">
              <span className="text-gray-400">Tuberías</span>
              <p className="text-white text-lg font-semibold">{activeDesign.pipes.length}</p>
            </div>
            <div className="bg-gray-700 rounded p-2">
              <span className="text-gray-400">Bombas</span>
              <p className="text-white text-lg font-semibold">{activeDesign.pumps.length}</p>
            </div>
            <div className="bg-gray-700 rounded p-2">
              <span className="text-gray-400">Tanques</span>
              <p className="text-white text-lg font-semibold">{activeDesign.tanks.length}</p>
            </div>
          </div>

          <button
            onClick={onSaveDesign}
            disabled={isSaving}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded py-2 text-sm font-medium transition-colors"
          >
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="text-gray-500 text-xs">
        <p>Los diseños se guardan automáticamente con el proyecto.</p>
        <p className="mt-1">Usa las otras pestañas para agregar elementos a la red.</p>
      </div>
    </div>
  );
}

export default WaterNetworkPanel;
