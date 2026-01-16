'use client';

import { useState, useCallback } from 'react';
import {
  // Horizontal curves
  calculateSimpleCircularCurve,
  calculateMinimumRadius,
  getLateralFriction,
  type SimpleCircularCurveInput,
} from '@/lib/road-geometry';

interface RoadGeometryPanelProps {
  projectId?: string;
  projectName?: string;
  onClose?: () => void;
}

type ToolMode = 'horizontal' | 'vertical' | 'superelevation' | 'sight' | 'reference';

export function RoadGeometryPanel({
  projectName,
  onClose,
}: RoadGeometryPanelProps) {
  const [toolMode, setToolMode] = useState<ToolMode>('horizontal');

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 shadow-xl w-[520px] max-h-[750px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-white">Road Geometry</h2>
          <p className="text-xs text-gray-400">
            {projectName || 'Horizontal & Vertical Alignment Design'}
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
          { id: 'horizontal', label: 'H-Curves' },
          { id: 'vertical', label: 'V-Curves' },
          { id: 'superelevation', label: 'Peralte' },
          { id: 'sight', label: 'Sight Dist.' },
          { id: 'reference', label: 'Data' },
        ] as { id: ToolMode; label: string }[]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setToolMode(tab.id)}
            className={`flex-shrink-0 px-4 py-2 text-sm font-medium transition-colors ${
              toolMode === tab.id
                ? 'text-purple-400 border-b-2 border-purple-400 bg-gray-800'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {toolMode === 'horizontal' && <HorizontalCurveTool />}
        {toolMode === 'vertical' && <VerticalCurveTool />}
        {toolMode === 'superelevation' && <SuperelevationTool />}
        {toolMode === 'sight' && <SightDistanceTool />}
        {toolMode === 'reference' && <GeometryReferenceView />}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-700 text-xs text-gray-500 text-center">
        Based on AASHTO Green Book & MOP Manual de Carreteras Vol. 3
      </div>
    </div>
  );
}

// ============================================
// HORIZONTAL CURVE TOOL
// ============================================

function HorizontalCurveTool() {
  const [mode, setMode] = useState<'analyze' | 'minRadius'>('analyze');

  // Simple curve inputs
  const [radius, setRadius] = useState('200');
  const [deflection, setDeflection] = useState('45');
  const [piStation, setPiStation] = useState('0+500');
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  // Min radius inputs
  const [designSpeed, setDesignSpeed] = useState('60');
  const [maxSuper, setMaxSuper] = useState('8');

  const [result, setResult] = useState<string | null>(null);

  const parseStation = (station: string): number => {
    const parts = station.split('+');
    if (parts.length === 2) {
      return parseFloat(parts[0]) * 1000 + parseFloat(parts[1]);
    }
    return parseFloat(station);
  };

  const formatStation = (value: number): string => {
    const km = Math.floor(value / 1000);
    const m = value % 1000;
    return `${km}+${m.toFixed(2).padStart(6, '0')}`;
  };

  const calculate = useCallback(() => {
    if (mode === 'analyze') {
      const input: SimpleCircularCurveInput = {
        radius: parseFloat(radius),
        deflectionAngle: parseFloat(deflection),
        piStation: parseStation(piStation),
        direction,
      };

      try {
        const curveResult = calculateSimpleCircularCurve(input);
        const lines = [
          '=== SIMPLE CIRCULAR CURVE ===',
          '',
          'INPUT:',
          `  Radius: ${curveResult.radius.toFixed(2)} m`,
          `  Deflection (Δ): ${curveResult.delta.toFixed(4)}°`,
          `  PI Station: ${formatStation(curveResult.piStation)}`,
          `  Direction: ${curveResult.direction === 'left' ? 'Left (Izquierda)' : 'Right (Derecha)'}`,
          '',
          'CURVE ELEMENTS:',
          `  Tangent (T): ${curveResult.tangent.toFixed(3)} m`,
          `  Length (L): ${curveResult.length.toFixed(3)} m`,
          `  External (E): ${curveResult.external.toFixed(3)} m`,
          `  Middle Ord. (M): ${curveResult.middleOrdinate.toFixed(3)} m`,
          `  Long Chord (C): ${curveResult.longChord.toFixed(3)} m`,
          `  Degree (Da): ${curveResult.degreeOfCurve.toFixed(4)}°`,
          '',
          'STATIONS:',
          `  PC: ${formatStation(curveResult.pcStation)}`,
          `  PI: ${formatStation(curveResult.piStation)}`,
          `  PT: ${formatStation(curveResult.ptStation)}`,
        ];
        setResult(lines.join('\n'));
      } catch (error) {
        setResult(`Error: ${error instanceof Error ? error.message : 'Calculation error'}`);
      }
    } else {
      // Min radius calculation
      const V = parseFloat(designSpeed);
      const ePercent = parseFloat(maxSuper);
      const eDecimal = ePercent / 100;

      try {
        const f = getLateralFriction(V);
        const minRadius = calculateMinimumRadius(V, ePercent);
        const lines = [
          '=== MINIMUM RADIUS CALCULATION ===',
          '',
          'INPUT:',
          `  Design Speed: ${V} km/h`,
          `  Max Superelevation: ${ePercent.toFixed(1)}%`,
          `  Lateral Friction: ${f.toFixed(3)} (AASHTO)`,
          '',
          'RESULT:',
          `  MINIMUM RADIUS: ${minRadius} m`,
          '',
          'Formula: R = V² / (127 × (e + f))',
          `  R = ${V}² / (127 × (${eDecimal.toFixed(2)} + ${f.toFixed(3)}))`,
          `  R = ${minRadius} m`,
          '',
          'NOTES:',
          '  - Based on AASHTO Green Book',
          '  - Includes safety margin for driver comfort',
        ];
        setResult(lines.join('\n'));
      } catch (error) {
        setResult(`Error: ${error instanceof Error ? error.message : 'Calculation error'}`);
      }
    }
  }, [mode, radius, deflection, piStation, direction, designSpeed, maxSuper]);

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('analyze')}
          className={`flex-1 py-2 px-3 text-sm rounded ${
            mode === 'analyze'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Curve Elements
        </button>
        <button
          onClick={() => setMode('minRadius')}
          className={`flex-1 py-2 px-3 text-sm rounded ${
            mode === 'minRadius'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Minimum Radius
        </button>
      </div>

      {mode === 'analyze' ? (
        <>
          <p className="text-sm text-gray-400">
            Calculate circular curve geometry elements
          </p>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Radius (m)</label>
            <input
              type="number"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              min="10"
              step="10"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Deflection Angle (°)</label>
            <input
              type="number"
              value={deflection}
              onChange={(e) => setDeflection(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              min="1"
              max="180"
              step="1"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">PI Station (km+m)</label>
            <input
              type="text"
              value={piStation}
              onChange={(e) => setPiStation(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              placeholder="0+500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Curve Direction</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as 'left' | 'right')}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            >
              <option value="right">Right (Derecha)</option>
              <option value="left">Left (Izquierda)</option>
            </select>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-400">
            Calculate minimum radius based on design speed and superelevation
          </p>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Design Speed (km/h)</label>
            <select
              value={designSpeed}
              onChange={(e) => setDesignSpeed(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            >
              <option value="30">30 km/h (Urban local)</option>
              <option value="40">40 km/h (Urban collector)</option>
              <option value="50">50 km/h (Urban arterial)</option>
              <option value="60">60 km/h (Suburban)</option>
              <option value="80">80 km/h (Rural secondary)</option>
              <option value="100">100 km/h (Rural primary)</option>
              <option value="120">120 km/h (Highway)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Max Superelevation (%)</label>
            <select
              value={maxSuper}
              onChange={(e) => setMaxSuper(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            >
              <option value="4">4% (Urban/slow speeds)</option>
              <option value="6">6% (Suburban)</option>
              <option value="8">8% (Rural - Standard)</option>
              <option value="10">10% (Mountain terrain)</option>
              <option value="12">12% (Special conditions)</option>
            </select>
          </div>
        </>
      )}

      <button
        onClick={calculate}
        className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium"
      >
        Calculate
      </button>

      {result && (
        <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700">
          <pre className="text-xs text-purple-300 whitespace-pre-wrap font-mono">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}

// ============================================
// VERTICAL CURVE TOOL
// ============================================

function VerticalCurveTool() {
  const [curveType, setCurveType] = useState<'crest' | 'sag'>('crest');
  const [g1, setG1] = useState('-3');
  const [g2, setG2] = useState('2');
  const [pviStation, setPviStation] = useState('1+000');
  const [pviElev, setPviElev] = useState('100.00');
  const [curveLength, setCurveLength] = useState('200');
  const [result, setResult] = useState<string | null>(null);

  const calculate = useCallback(() => {
    const G1 = parseFloat(g1) / 100;
    const G2 = parseFloat(g2) / 100;
    const L = parseFloat(curveLength);
    const A = Math.abs(G2 - G1) * 100; // Algebraic difference in %

    // K value
    const K = L / A;

    // High/low point location
    let highLowStation = '';
    const xHighLow = (G1 / (G1 - G2)) * L;
    if (xHighLow > 0 && xHighLow < L) {
      highLowStation = `${(xHighLow).toFixed(2)} m from PVC`;
    } else {
      highLowStation = 'Outside curve limits';
    }

    // External distance
    const E = (A * L) / 800;

    const lines = [
      `=== ${curveType.toUpperCase()} VERTICAL CURVE ===`,
      '',
      'INPUT:',
      `  Grade In (g1): ${g1}%`,
      `  Grade Out (g2): ${g2}%`,
      `  Curve Length: ${L} m`,
      `  PVI Station: ${pviStation}`,
      `  PVI Elevation: ${pviElev} m`,
      '',
      'CURVE DATA:',
      `  Algebraic Diff (A): ${A.toFixed(2)}%`,
      `  K Value: ${K.toFixed(2)} m/%`,
      `  External (E): ${E.toFixed(3)} m`,
      '',
      'STATIONS:',
      `  PVC: ${pviStation} - ${(L/2).toFixed(2)} = ${(parseFloat(pviStation.replace('+', '')) - L/2/1000).toFixed(3)}`,
      `  PVI: ${pviStation}`,
      `  PVT: ${pviStation} + ${(L/2).toFixed(2)}`,
      '',
      `High/Low Point: ${highLowStation}`,
      '',
      curveType === 'crest'
        ? `Sight Distance Check: K_min = V²/658 for S < L`
        : `Lighting Check: K_min = V²/120 for comfort`,
    ];

    setResult(lines.join('\n'));
  }, [curveType, g1, g2, pviStation, pviElev, curveLength]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Design crest and sag vertical curves
      </p>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Curve Type</label>
        <select
          value={curveType}
          onChange={(e) => setCurveType(e.target.value as 'crest' | 'sag')}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
        >
          <option value="crest">Crest (Convex)</option>
          <option value="sag">Sag (Concave)</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Grade In g1 (%)</label>
          <input
            type="number"
            value={g1}
            onChange={(e) => setG1(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            step="0.5"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Grade Out g2 (%)</label>
          <input
            type="number"
            value={g2}
            onChange={(e) => setG2(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            step="0.5"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Curve Length (m)</label>
        <input
          type="number"
          value={curveLength}
          onChange={(e) => setCurveLength(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          min="20"
          step="20"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">PVI Station</label>
          <input
            type="text"
            value={pviStation}
            onChange={(e) => setPviStation(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">PVI Elevation (m)</label>
          <input
            type="number"
            value={pviElev}
            onChange={(e) => setPviElev(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            step="0.1"
          />
        </div>
      </div>

      <button
        onClick={calculate}
        className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium"
      >
        Calculate Curve
      </button>

      {result && (
        <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700">
          <pre className="text-xs text-purple-300 whitespace-pre-wrap font-mono">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}

// ============================================
// SUPERELEVATION TOOL
// ============================================

function SuperelevationTool() {
  const [radius, setRadius] = useState('300');
  const [designSpeed, setDesignSpeed] = useState('80');
  const [maxSuper, setMaxSuper] = useState('8');
  const [result, setResult] = useState<string | null>(null);

  const calculate = useCallback(() => {
    const R = parseFloat(radius);
    const V = parseFloat(designSpeed);
    const eMax = parseFloat(maxSuper) / 100;

    // Lateral friction from AASHTO
    const f = 0.14 - 0.00025 * V; // Simplified approximation

    // Required superelevation
    const eRequired = (V * V) / (127 * R) - f;
    const eDesign = Math.min(Math.max(eRequired, 0.02), eMax);

    // Runoff length (simplified)
    const Lr = 0.556 * V * eDesign * 3.6; // Approximation

    // Tangent runout
    const Lt = eDesign > 0.02 ? (0.02 / eDesign) * Lr : 0;

    const lines = [
      '=== SUPERELEVATION DESIGN ===',
      '',
      'INPUT:',
      `  Radius: ${R} m`,
      `  Design Speed: ${V} km/h`,
      `  Max Super (emax): ${(eMax * 100).toFixed(1)}%`,
      '',
      'CALCULATIONS:',
      `  Lateral Friction (f): ${f.toFixed(3)}`,
      `  Required Super: ${(eRequired * 100).toFixed(2)}%`,
      `  Design Super (e): ${(eDesign * 100).toFixed(2)}%`,
      '',
      'TRANSITION:',
      `  Runoff Length (Lr): ${Lr.toFixed(1)} m`,
      `  Tangent Runout (Lt): ${Lt.toFixed(1)} m`,
      `  Total Transition: ${(Lr + Lt).toFixed(1)} m`,
      '',
      'RECOMMENDATIONS:',
      eDesign >= eMax ? '  - Using maximum superelevation' : '',
      eDesign < 0.04 ? '  - Consider normal crown if e < 4%' : '',
      R < 200 ? '  - Tight curve - verify sight distance' : '',
    ].filter(line => line !== '');

    setResult(lines.join('\n'));
  }, [radius, designSpeed, maxSuper]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Calculate superelevation and transition lengths
      </p>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Curve Radius (m)</label>
        <input
          type="number"
          value={radius}
          onChange={(e) => setRadius(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          min="50"
          step="50"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Design Speed (km/h)</label>
        <select
          value={designSpeed}
          onChange={(e) => setDesignSpeed(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
        >
          <option value="30">30 km/h</option>
          <option value="40">40 km/h</option>
          <option value="50">50 km/h</option>
          <option value="60">60 km/h</option>
          <option value="80">80 km/h</option>
          <option value="100">100 km/h</option>
          <option value="120">120 km/h</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Max Superelevation (%)</label>
        <select
          value={maxSuper}
          onChange={(e) => setMaxSuper(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
        >
          <option value="4">4% (Urban)</option>
          <option value="6">6% (Suburban)</option>
          <option value="8">8% (Rural)</option>
          <option value="10">10% (Mountain)</option>
        </select>
      </div>

      <button
        onClick={calculate}
        className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium"
      >
        Calculate Superelevation
      </button>

      {result && (
        <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700">
          <pre className="text-xs text-purple-300 whitespace-pre-wrap font-mono">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}

// ============================================
// SIGHT DISTANCE TOOL
// ============================================

function SightDistanceTool() {
  const [designSpeed, setDesignSpeed] = useState('80');
  const [reactionTime, setReactionTime] = useState('2.5');
  const [grade, setGrade] = useState('0');
  const [result, setResult] = useState<string | null>(null);

  const calculate = useCallback(() => {
    const V = parseFloat(designSpeed);
    const t = parseFloat(reactionTime);
    const G = parseFloat(grade) / 100;

    // Stopping sight distance (SSD)
    const a = 3.4; // Comfortable deceleration m/s²
    const v_ms = V / 3.6;
    const d_brake = (v_ms * v_ms) / (2 * a * (1 + G));
    const d_reaction = v_ms * t;
    const SSD = d_reaction + d_brake;

    // Passing sight distance (simplified)
    const PSD = 5.4 * V;

    // Decision sight distance (urban)
    const DSD = 4.5 * V;

    const lines = [
      '=== SIGHT DISTANCE ANALYSIS ===',
      '',
      'INPUT:',
      `  Design Speed: ${V} km/h (${v_ms.toFixed(1)} m/s)`,
      `  Perception-Reaction Time: ${t} s`,
      `  Grade: ${(G * 100).toFixed(1)}%`,
      `  Deceleration: ${a} m/s²`,
      '',
      'STOPPING SIGHT DISTANCE:',
      `  Reaction Distance: ${d_reaction.toFixed(1)} m`,
      `  Braking Distance: ${d_brake.toFixed(1)} m`,
      `  SSD: ${SSD.toFixed(1)} m`,
      '',
      'OTHER DISTANCES:',
      `  Passing (PSD): ${PSD.toFixed(0)} m`,
      `  Decision (DSD): ${DSD.toFixed(0)} m`,
      '',
      'APPLICATIONS:',
      `  - Horizontal curve: M = R × (1 - cos(28.65×SSD/R))`,
      `  - Crest curve: K = SSD²/658`,
      `  - Sag curve: K = SSD²/120`,
    ];

    setResult(lines.join('\n'));
  }, [designSpeed, reactionTime, grade]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Calculate stopping and passing sight distances
      </p>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Design Speed (km/h)</label>
        <select
          value={designSpeed}
          onChange={(e) => setDesignSpeed(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
        >
          <option value="30">30 km/h</option>
          <option value="40">40 km/h</option>
          <option value="50">50 km/h</option>
          <option value="60">60 km/h</option>
          <option value="80">80 km/h</option>
          <option value="100">100 km/h</option>
          <option value="120">120 km/h</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Perception-Reaction Time (s)</label>
        <input
          type="number"
          value={reactionTime}
          onChange={(e) => setReactionTime(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          min="1.5"
          max="4.0"
          step="0.5"
        />
        <p className="text-xs text-gray-500 mt-1">AASHTO: 2.5s standard</p>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Grade (%)</label>
        <input
          type="number"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          min="-12"
          max="12"
          step="1"
        />
      </div>

      <button
        onClick={calculate}
        className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium"
      >
        Calculate Distances
      </button>

      {result && (
        <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700">
          <pre className="text-xs text-purple-300 whitespace-pre-wrap font-mono">
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

function GeometryReferenceView() {
  const [activeTab, setActiveTab] = useState<'radius' | 'vertical' | 'super' | 'widening'>('radius');

  // Minimum radius data
  const minRadiusData = [
    { speed: 30, e8: 30, e10: 25, e12: 23 },
    { speed: 40, e8: 55, e10: 45, e12: 40 },
    { speed: 50, e8: 90, e10: 75, e12: 65 },
    { speed: 60, e8: 135, e10: 115, e12: 100 },
    { speed: 80, e8: 250, e10: 210, e12: 185 },
    { speed: 100, e8: 395, e10: 335, e12: 290 },
    { speed: 120, e8: 565, e10: 485, e12: 420 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 flex-wrap">
        {[
          { id: 'radius', label: 'Min Radius' },
          { id: 'vertical', label: 'K Values' },
          { id: 'super', label: 'Super Rates' },
          { id: 'widening', label: 'Widening' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-3 py-1 text-xs rounded ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-gray-800 rounded p-3 text-xs">
        {activeTab === 'radius' && (
          <div>
            <h4 className="font-medium text-white mb-2">Minimum Radius by Speed (AASHTO)</h4>
            <table className="w-full text-gray-300">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-1">Speed</th>
                  <th className="text-right py-1">e=8%</th>
                  <th className="text-right py-1">e=10%</th>
                  <th className="text-right py-1">e=12%</th>
                </tr>
              </thead>
              <tbody>
                {minRadiusData.map((row) => (
                  <tr key={row.speed} className="border-b border-gray-700/50">
                    <td className="py-1">{row.speed} km/h</td>
                    <td className="text-right text-purple-400">{row.e8}m</td>
                    <td className="text-right text-purple-400">{row.e10}m</td>
                    <td className="text-right text-purple-400">{row.e12}m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'vertical' && (
          <div>
            <h4 className="font-medium text-white mb-2">Minimum K Values (AASHTO)</h4>
            <table className="w-full text-gray-300">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-1">Speed</th>
                  <th className="text-right py-1">K Crest</th>
                  <th className="text-right py-1">K Sag</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">30 km/h</td>
                  <td className="text-right text-purple-400">3</td>
                  <td className="text-right text-purple-400">6</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">50 km/h</td>
                  <td className="text-right text-purple-400">11</td>
                  <td className="text-right text-purple-400">13</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">80 km/h</td>
                  <td className="text-right text-purple-400">43</td>
                  <td className="text-right text-purple-400">30</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">100 km/h</td>
                  <td className="text-right text-purple-400">84</td>
                  <td className="text-right text-purple-400">45</td>
                </tr>
                <tr>
                  <td className="py-1">120 km/h</td>
                  <td className="text-right text-purple-400">139</td>
                  <td className="text-right text-purple-400">63</td>
                </tr>
              </tbody>
            </table>
            <p className="text-gray-500 mt-2">L = K × A, where A = |g2 - g1|</p>
          </div>
        )}

        {activeTab === 'super' && (
          <div>
            <h4 className="font-medium text-white mb-2">Superelevation Rates</h4>
            <div className="space-y-2 text-gray-300">
              <p><span className="text-purple-400">Urban:</span> emax = 4-6%</p>
              <p><span className="text-purple-400">Suburban:</span> emax = 6-8%</p>
              <p><span className="text-purple-400">Rural:</span> emax = 8-10%</p>
              <p><span className="text-purple-400">Mountain:</span> emax = 10-12%</p>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-gray-500">Runoff rate: max 1:200 at 100 km/h</p>
              <p className="text-gray-500">Adverse crown: remove before curve</p>
            </div>
          </div>
        )}

        {activeTab === 'widening' && (
          <div>
            <h4 className="font-medium text-white mb-2">Lane Widening on Curves</h4>
            <p className="text-gray-400 mb-2">W = n(R - √(R² - L²)) + V/(10√R)</p>
            <table className="w-full text-gray-300">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-1">Radius</th>
                  <th className="text-right py-1">60 km/h</th>
                  <th className="text-right py-1">80 km/h</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">R = 100m</td>
                  <td className="text-right text-purple-400">0.9m</td>
                  <td className="text-right text-purple-400">1.1m</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">R = 200m</td>
                  <td className="text-right text-purple-400">0.5m</td>
                  <td className="text-right text-purple-400">0.7m</td>
                </tr>
                <tr>
                  <td className="py-1">R = 300m</td>
                  <td className="text-right text-purple-400">0.4m</td>
                  <td className="text-right text-purple-400">0.5m</td>
                </tr>
              </tbody>
            </table>
            <p className="text-gray-500 mt-2">Apply to inside of curve</p>
          </div>
        )}
      </div>
    </div>
  );
}
