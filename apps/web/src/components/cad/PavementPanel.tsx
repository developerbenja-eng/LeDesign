'use client';

import { useState, useCallback } from 'react';
import {
  // AASHTO Flexible Pavement
  designFlexiblePavement,
  formatFlexiblePavementResult,
  getDefaultCoefficients,
  LAYER_COEFFICIENTS_CHILE,
  DRAINAGE_COEFFICIENTS,
  RECOMMENDED_RELIABILITY,
  type FlexiblePavementInput,
  type FlexiblePavementResult,
} from '@/lib/pavement';

interface PavementPanelProps {
  projectId?: string;
  projectName?: string;
  onClose?: () => void;
}

type ToolMode = 'flexible' | 'rigid' | 'traffic' | 'cbr' | 'reference';

export function PavementPanel({
  projectName,
  onClose,
}: PavementPanelProps) {
  const [toolMode, setToolMode] = useState<ToolMode>('flexible');

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 shadow-xl w-[520px] max-h-[750px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-white">Pavement Design</h2>
          <p className="text-xs text-gray-400">
            {projectName || 'AASHTO 93 Structural Design'}
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
          { id: 'flexible', label: 'Flexible' },
          { id: 'rigid', label: 'Rigid' },
          { id: 'traffic', label: 'Traffic' },
          { id: 'cbr', label: 'CBR' },
          { id: 'reference', label: 'Data' },
        ] as { id: ToolMode; label: string }[]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setToolMode(tab.id)}
            className={`flex-shrink-0 px-4 py-2 text-sm font-medium transition-colors ${
              toolMode === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {toolMode === 'flexible' && <FlexiblePavementTool />}
        {toolMode === 'rigid' && <RigidPavementTool />}
        {toolMode === 'traffic' && <TrafficAnalysisTool />}
        {toolMode === 'cbr' && <CBRDesignTool />}
        {toolMode === 'reference' && <PavementReferenceView />}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-700 text-xs text-gray-500 text-center">
        Based on AASHTO Guide 1993 & MOP Manual de Carreteras Vol. 3
      </div>
    </div>
  );
}

// ============================================
// FLEXIBLE PAVEMENT TOOL (AASHTO 93)
// ============================================

function FlexiblePavementTool() {
  // Traffic parameters
  const [esal, setEsal] = useState('1000000');
  const [roadClass, setRoadClass] = useState<string>('collector');

  // Design parameters
  const [reliability, setReliability] = useState('90');
  const [stdDev, setStdDev] = useState('0.45');
  const [piInitial, setPiInitial] = useState('4.2');
  const [piTerminal, setPiTerminal] = useState('2.5');
  const [subgradeMr, setSubgradeMr] = useState('10000');

  // Material parameters
  const [surfaceMat, setSurfaceMat] = useState('asphalt_concrete');
  const [baseMat, setBaseMat] = useState('crushed_stone_base');
  const [subbaseMat, setSubbaseMat] = useState('granular_subbase');
  const [drainageQuality, setDrainageQuality] = useState('fair');

  const [result, setResult] = useState<FlexiblePavementResult | null>(null);

  const calculate = useCallback(() => {
    const input: FlexiblePavementInput = {
      W18: parseFloat(esal),
      reliability: parseFloat(reliability),
      standardDeviation: parseFloat(stdDev),
      serviceabilityInitial: parseFloat(piInitial),
      serviceabilityTerminal: parseFloat(piTerminal),
      subgradeMr: parseFloat(subgradeMr),
    };

    const coefficients = getDefaultCoefficients(
      surfaceMat,
      baseMat,
      subbaseMat,
      drainageQuality
    );

    try {
      const designResult = designFlexiblePavement(input, coefficients);
      setResult(designResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error en el calculo';
      setResult({
        SN: 0,
        SNprovided: 0,
        layers: [],
        adequate: false,
        deltaServiceability: 0,
        reliability: parseFloat(reliability),
        subgradeMr: parseFloat(subgradeMr),
        warnings: [message],
      });
    }
  }, [esal, reliability, stdDev, piInitial, piTerminal, subgradeMr, surfaceMat, baseMat, subbaseMat, drainageQuality]);

  // Update reliability when road class changes
  const handleRoadClassChange = useCallback((newClass: string) => {
    setRoadClass(newClass);
    const recReliability = RECOMMENDED_RELIABILITY[newClass];
    if (recReliability) {
      setReliability(recReliability.toString());
    }
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        AASHTO 93 Structural Number method for flexible pavement design
      </p>

      {/* Road Classification */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Road Classification</label>
        <select
          value={roadClass}
          onChange={(e) => handleRoadClassChange(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
        >
          <option value="express">Expresa (Autopista)</option>
          <option value="trunk">Troncal</option>
          <option value="collector">Colectora</option>
          <option value="service">Servicio</option>
          <option value="local">Local</option>
          <option value="passage">Pasaje</option>
        </select>
      </div>

      {/* Traffic */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Design ESALs (W18)</label>
        <input
          type="number"
          value={esal}
          onChange={(e) => setEsal(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          min="10000"
          step="100000"
        />
        <p className="text-xs text-gray-500 mt-1">
          Equivalent 18-kip single axle loads (design period)
        </p>
      </div>

      {/* Reliability & Standard Deviation */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Reliability (%)</label>
          <input
            type="number"
            value={reliability}
            onChange={(e) => setReliability(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            min="50"
            max="99.9"
            step="5"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Std. Deviation (So)</label>
          <input
            type="number"
            value={stdDev}
            onChange={(e) => setStdDev(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            min="0.30"
            max="0.60"
            step="0.05"
          />
        </div>
      </div>

      {/* Serviceability */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Initial PSI (po)</label>
          <input
            type="number"
            value={piInitial}
            onChange={(e) => setPiInitial(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            min="3.5"
            max="5.0"
            step="0.1"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Terminal PSI (pt)</label>
          <input
            type="number"
            value={piTerminal}
            onChange={(e) => setPiTerminal(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            min="1.5"
            max="3.5"
            step="0.1"
          />
        </div>
      </div>

      {/* Subgrade */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Subgrade Mr (psi)</label>
        <input
          type="number"
          value={subgradeMr}
          onChange={(e) => setSubgradeMr(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          min="1500"
          max="50000"
          step="500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Mr = 1500 × CBR (approx. for CBR &lt; 10)
        </p>
      </div>

      {/* Materials */}
      <div className="border border-gray-700 rounded p-3 space-y-3">
        <h4 className="text-white text-sm font-medium">Materials</h4>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Surface Layer</label>
          <select
            value={surfaceMat}
            onChange={(e) => setSurfaceMat(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          >
            <option value="asphalt_concrete">Concreto Asfaltico (a1=0.44)</option>
            <option value="asphalt_concrete_modified">CA Modificado (a1=0.46)</option>
            <option value="stone_mastic_asphalt">SMA (a1=0.45)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Base Layer</label>
          <select
            value={baseMat}
            onChange={(e) => setBaseMat(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          >
            <option value="crushed_stone_base">Base Granular Triturada CBR&gt;80 (a2=0.14)</option>
            <option value="granular_base_high">Base Granular CBR&gt;60 (a2=0.13)</option>
            <option value="asphalt_treated_base">Base Tratada Asfalto (a2=0.34)</option>
            <option value="cement_treated_base">Base Tratada Cemento (a2=0.23)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Subbase Layer</label>
          <select
            value={subbaseMat}
            onChange={(e) => setSubbaseMat(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          >
            <option value="granular_subbase">Subbase Granular CBR&gt;40 (a3=0.11)</option>
            <option value="stabilized_subbase">Subbase Estabilizada (a3=0.10)</option>
            <option value="sandy_gravel">Grava Arenosa (a3=0.09)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Drainage Quality</label>
          <select
            value={drainageQuality}
            onChange={(e) => setDrainageQuality(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          >
            <option value="excellent">Excelente (m=1.40) - Drena en 2 hrs</option>
            <option value="good">Bueno (m=1.20) - Drena en 1 dia</option>
            <option value="fair">Regular (m=1.00) - Drena en 1 semana</option>
            <option value="poor">Pobre (m=0.80) - Drena en 1 mes</option>
            <option value="very_poor">Muy Pobre (m=0.60) - No drena</option>
          </select>
        </div>
      </div>

      {/* Calculate Button */}
      <button
        onClick={calculate}
        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
      >
        Design Pavement
      </button>

      {/* Results */}
      {result && (
        <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700">
          <pre className="text-xs text-blue-300 whitespace-pre-wrap font-mono">
            {formatFlexiblePavementResult(result)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ============================================
// RIGID PAVEMENT TOOL
// ============================================

function RigidPavementTool() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        AASHTO 93 Rigid (PCC) pavement design - Coming soon
      </p>
      <div className="p-8 border border-dashed border-gray-600 rounded text-center text-gray-500">
        <p>Rigid pavement design module</p>
        <p className="text-xs mt-2">Joint spacing, dowels, tie bars</p>
      </div>
    </div>
  );
}

// ============================================
// TRAFFIC ANALYSIS TOOL
// ============================================

function TrafficAnalysisTool() {
  const [aadt, setAadt] = useState('5000');
  const [truckPercent, setTruckPercent] = useState('10');
  const [growthRate, setGrowthRate] = useState('3');
  const [designYears, setDesignYears] = useState('20');
  const [laneDF, setLaneDF] = useState('0.45');
  const [result, setResult] = useState<string | null>(null);

  const calculate = useCallback(() => {
    const AADT = parseFloat(aadt);
    const trucks = parseFloat(truckPercent) / 100;
    const growth = parseFloat(growthRate) / 100;
    const years = parseInt(designYears);
    const dirFactor = 0.5; // Assume 50% directional
    const laneFactor = parseFloat(laneDF);

    // Truck factor (typical for mixed traffic)
    const truckFactor = 1.5; // Simplified - should be from weight study

    // Growth factor
    const growthFactor = ((1 + growth) ** years - 1) / growth;

    // Calculate ESALs
    const dailyTrucks = AADT * trucks;
    const ESALs = dailyTrucks * 365 * years * truckFactor * dirFactor * laneFactor * growthFactor / years;

    const lines = [
      '=== TRAFFIC ANALYSIS (ESAL) ===',
      '',
      'INPUT:',
      `  AADT: ${AADT.toLocaleString()} veh/day`,
      `  Truck %: ${(trucks * 100).toFixed(1)}%`,
      `  Growth Rate: ${(growth * 100).toFixed(1)}%/year`,
      `  Design Period: ${years} years`,
      `  Lane Distribution: ${(laneFactor * 100).toFixed(0)}%`,
      '',
      'CALCULATIONS:',
      `  Daily Trucks: ${dailyTrucks.toLocaleString()} trucks/day`,
      `  Growth Factor: ${growthFactor.toFixed(2)}`,
      `  Truck Factor: ${truckFactor.toFixed(2)} (assumed)`,
      '',
      'RESULT:',
      `  Design ESALs (W18): ${ESALs.toExponential(2)}`,
      `  ~${(ESALs / 1000000).toFixed(2)} million ESALs`,
      '',
      'Notes:',
      '  - Truck factor should be from axle load study',
      '  - Consider seasonal variation for accuracy',
    ];

    setResult(lines.join('\n'));
  }, [aadt, truckPercent, growthRate, designYears, laneDF]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Calculate design ESALs from traffic data
      </p>

      <div>
        <label className="block text-sm text-gray-400 mb-1">AADT (veh/day)</label>
        <input
          type="number"
          value={aadt}
          onChange={(e) => setAadt(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          min="100"
          step="500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Truck %</label>
          <input
            type="number"
            value={truckPercent}
            onChange={(e) => setTruckPercent(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            min="1"
            max="50"
            step="1"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Growth Rate (%/yr)</label>
          <input
            type="number"
            value={growthRate}
            onChange={(e) => setGrowthRate(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            min="0"
            max="10"
            step="0.5"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Design Years</label>
          <input
            type="number"
            value={designYears}
            onChange={(e) => setDesignYears(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            min="5"
            max="40"
            step="5"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Lane Factor</label>
          <input
            type="number"
            value={laneDF}
            onChange={(e) => setLaneDF(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            min="0.2"
            max="1.0"
            step="0.05"
          />
        </div>
      </div>

      <button
        onClick={calculate}
        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
      >
        Calculate ESALs
      </button>

      {result && (
        <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700">
          <pre className="text-xs text-blue-300 whitespace-pre-wrap font-mono">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}

// ============================================
// CBR DESIGN TOOL
// ============================================

function CBRDesignTool() {
  const [cbr, setCbr] = useState('8');
  const [result, setResult] = useState<string | null>(null);

  const calculate = useCallback(() => {
    const CBR = parseFloat(cbr);

    // Correlations
    const Mr_psi = 1500 * CBR; // AASHTO approximation for CBR < 10
    const Mr_psi_nchrp = 2555 * Math.pow(CBR, 0.64); // NCHRP correlation
    const Mr_MPa = Mr_psi_nchrp * 0.00689;

    // Subgrade classification
    let classification: string;
    if (CBR < 3) classification = 'Very Poor (A-7)';
    else if (CBR < 7) classification = 'Poor (A-6)';
    else if (CBR < 20) classification = 'Fair (A-4 to A-2)';
    else if (CBR < 50) classification = 'Good (A-2 to A-1)';
    else classification = 'Excellent (A-1)';

    const lines = [
      '=== CBR to Mr CONVERSION ===',
      '',
      `CBR: ${CBR}%`,
      `Classification: ${classification}`,
      '',
      'RESILIENT MODULUS:',
      `  Mr = 1500 × CBR (AASHTO): ${Mr_psi.toLocaleString()} psi`,
      `  Mr = 2555 × CBR^0.64 (NCHRP): ${Math.round(Mr_psi_nchrp).toLocaleString()} psi`,
      `  Mr (NCHRP): ${Mr_MPa.toFixed(1)} MPa`,
      '',
      'RECOMMENDATIONS:',
      CBR < 3 ? '  - Soil improvement required' : '',
      CBR < 5 ? '  - Consider lime or cement stabilization' : '',
      CBR < 10 ? '  - Adequate granular subbase recommended' : '',
      CBR >= 10 ? '  - Subgrade adequate for direct pavement support' : '',
    ].filter(line => line !== '');

    setResult(lines.join('\n'));
  }, [cbr]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Convert CBR to Resilient Modulus (Mr) for pavement design
      </p>

      <div>
        <label className="block text-sm text-gray-400 mb-1">CBR (%)</label>
        <input
          type="number"
          value={cbr}
          onChange={(e) => setCbr(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          min="1"
          max="100"
          step="0.5"
        />
      </div>

      <button
        onClick={calculate}
        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
      >
        Calculate Mr
      </button>

      {result && (
        <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700">
          <pre className="text-xs text-blue-300 whitespace-pre-wrap font-mono">
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

function PavementReferenceView() {
  const [activeTab, setActiveTab] = useState<'coefficients' | 'drainage' | 'reliability' | 'thickness'>('coefficients');

  return (
    <div className="space-y-4">
      {/* Tab Selection */}
      <div className="flex gap-1 flex-wrap">
        {[
          { id: 'coefficients', label: 'Layer Coeff.' },
          { id: 'drainage', label: 'Drainage' },
          { id: 'reliability', label: 'Reliability' },
          { id: 'thickness', label: 'Min Thick.' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-3 py-1 text-xs rounded ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-gray-800 rounded p-3 text-xs">
        {activeTab === 'coefficients' && (
          <div>
            <h4 className="font-medium text-white mb-2">Layer Structural Coefficients (Chile)</h4>
            <table className="w-full text-gray-300">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-1">Material</th>
                  <th className="text-right py-1">Coeff.</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(LAYER_COEFFICIENTS_CHILE).map(([mat, coeff]) => (
                  <tr key={mat} className="border-b border-gray-700/50">
                    <td className="py-1 capitalize">{mat.replace(/_/g, ' ')}</td>
                    <td className="text-right py-1 text-blue-400">{coeff.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'drainage' && (
          <div>
            <h4 className="font-medium text-white mb-2">Drainage Coefficients (AASHTO)</h4>
            <table className="w-full text-gray-300">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-1">Quality</th>
                  <th className="text-right py-1">m2, m3</th>
                  <th className="text-left py-1 pl-2">Description</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(DRAINAGE_COEFFICIENTS).map(([quality, data]) => (
                  <tr key={quality} className="border-b border-gray-700/50">
                    <td className="py-1 capitalize">{quality.replace(/_/g, ' ')}</td>
                    <td className="text-right py-1 text-blue-400">{data.m2.toFixed(1)}</td>
                    <td className="py-1 pl-2 text-gray-500">{data.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'reliability' && (
          <div>
            <h4 className="font-medium text-white mb-2">Recommended Reliability by Road Class</h4>
            <table className="w-full text-gray-300">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-1">Classification</th>
                  <th className="text-right py-1">R (%)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(RECOMMENDED_RELIABILITY).map(([roadClass, rel]) => (
                  <tr key={roadClass} className="border-b border-gray-700/50">
                    <td className="py-1 capitalize">{roadClass}</td>
                    <td className="text-right py-1 text-blue-400">{rel}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-gray-500 mt-3">
              Higher reliability = more conservative design
            </p>
          </div>
        )}

        {activeTab === 'thickness' && (
          <div>
            <h4 className="font-medium text-white mb-2">Minimum Layer Thicknesses (AASHTO)</h4>
            <table className="w-full text-gray-300">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-1">ESALs</th>
                  <th className="text-right py-1">Asphalt</th>
                  <th className="text-right py-1">Base</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">&lt; 50,000</td>
                  <td className="text-right text-blue-400">2.5 cm</td>
                  <td className="text-right text-blue-400">10 cm</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">50k - 150k</td>
                  <td className="text-right text-blue-400">5.0 cm</td>
                  <td className="text-right text-blue-400">10 cm</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">150k - 500k</td>
                  <td className="text-right text-blue-400">6.5 cm</td>
                  <td className="text-right text-blue-400">10 cm</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">500k - 2M</td>
                  <td className="text-right text-blue-400">7.5 cm</td>
                  <td className="text-right text-blue-400">15 cm</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">2M - 7M</td>
                  <td className="text-right text-blue-400">9.0 cm</td>
                  <td className="text-right text-blue-400">15 cm</td>
                </tr>
                <tr>
                  <td className="py-1">&gt; 7M</td>
                  <td className="text-right text-blue-400">10.0 cm</td>
                  <td className="text-right text-blue-400">15 cm</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
