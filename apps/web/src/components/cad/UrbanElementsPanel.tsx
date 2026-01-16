'use client';

import { useState, useCallback } from 'react';

interface UrbanElementsPanelProps {
  projectId?: string;
  projectName?: string;
  onClose?: () => void;
}

type ToolMode = 'ramps' | 'crosswalks' | 'driveways' | 'intersections' | 'calming' | 'reference';

export function UrbanElementsPanel({
  projectName,
  onClose,
}: UrbanElementsPanelProps) {
  const [toolMode, setToolMode] = useState<ToolMode>('ramps');

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 shadow-xl w-[520px] max-h-[750px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-white">Urban Elements</h2>
          <p className="text-xs text-gray-400">
            {projectName || 'Pedestrian & Traffic Calming Design'}
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
          { id: 'ramps', label: 'Ramps' },
          { id: 'crosswalks', label: 'Crosswalks' },
          { id: 'driveways', label: 'Driveways' },
          { id: 'intersections', label: 'Corners' },
          { id: 'calming', label: 'Calming' },
          { id: 'reference', label: 'Data' },
        ] as { id: ToolMode; label: string }[]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setToolMode(tab.id)}
            className={`flex-shrink-0 px-4 py-2 text-sm font-medium transition-colors ${
              toolMode === tab.id
                ? 'text-orange-400 border-b-2 border-orange-400 bg-gray-800'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {toolMode === 'ramps' && <PedestrianRampTool />}
        {toolMode === 'crosswalks' && <CrosswalkTool />}
        {toolMode === 'driveways' && <DrivewayTool />}
        {toolMode === 'intersections' && <IntersectionTool />}
        {toolMode === 'calming' && <TrafficCalmingTool />}
        {toolMode === 'reference' && <UrbanReferenceView />}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-700 text-xs text-gray-500 text-center">
        Based on REDEVU, OGUC & ADA Standards
      </div>
    </div>
  );
}

// ============================================
// PEDESTRIAN RAMP TOOL
// ============================================

function PedestrianRampTool() {
  const [rampType, setRampType] = useState<string>('perpendicular');
  const [curbHeight, setCurbHeight] = useState('15');
  const [availableWidth, setAvailableWidth] = useState('1.50');
  const [availableDepth, setAvailableDepth] = useState('2.50');
  const [maxSlope, setMaxSlope] = useState('8.33');
  const [flaredSides, setFlaredSides] = useState(true);
  const [result, setResult] = useState<string | null>(null);

  const calculate = useCallback(() => {
    const height = parseFloat(curbHeight) / 100; // Convert to meters
    const width = parseFloat(availableWidth);
    const depth = parseFloat(availableDepth);
    const slope = parseFloat(maxSlope) / 100;

    // Calculate ramp geometry
    const runLength = height / slope;
    const landingDepth = 1.50; // Standard landing
    const totalDepth = runLength + landingDepth;

    // Check if fits in available space
    const fits = totalDepth <= depth && width >= 1.20;

    // Detectable warning
    const warningDepth = 0.60;
    const warningWidth = width;

    // Flare calculations
    const flareSlope = flaredSides ? 10 : 0; // 1:10 max per OGUC
    const flareWidth = flaredSides ? height * 10 : 0;

    const lines = [
      '=== PEDESTRIAN RAMP DESIGN ===',
      `Type: ${rampType}`,
      '',
      'INPUT:',
      `  Curb Height: ${(height * 100).toFixed(0)} cm`,
      `  Available Width: ${width.toFixed(2)} m`,
      `  Available Depth: ${depth.toFixed(2)} m`,
      `  Max Running Slope: ${(slope * 100).toFixed(2)}%`,
      '',
      'RAMP GEOMETRY:',
      `  Run Length: ${runLength.toFixed(2)} m`,
      `  Running Slope: ${(slope * 100).toFixed(2)}% (1:${Math.round(1/slope)})`,
      `  Cross Slope: 2.0% max`,
      `  Ramp Width: ${width.toFixed(2)} m`,
      '',
      'LANDING:',
      `  Depth: ${landingDepth.toFixed(2)} m`,
      `  Width: ${width.toFixed(2)} m (matches ramp)`,
      '',
      'DETECTABLE WARNING:',
      `  Depth: ${warningDepth.toFixed(2)} m`,
      `  Width: ${warningWidth.toFixed(2)} m`,
      `  Material: Truncated domes, contrasting color`,
      '',
      flaredSides ? `FLARES: 1:${flareSlope} slope, ${flareWidth.toFixed(2)}m each side` : '',
      '',
      'TOTAL DEPTH REQUIRED:',
      `  ${totalDepth.toFixed(2)} m`,
      '',
      fits
        ? '✓ Design fits available space'
        : '✗ Insufficient space - consider parallel ramp',
      '',
      'COMPLIANCE:',
      slope <= 0.0833 ? '✓ Running slope ≤ 8.33% (OGUC)' : '⚠ Running slope > 8.33%',
      width >= 1.20 ? '✓ Width ≥ 1.20m (min)' : '✗ Width < 1.20m minimum',
      width >= 1.50 ? '✓ Width ≥ 1.50m (preferred)' : '⚠ Width < 1.50m preferred',
    ].filter(line => line !== '');

    setResult(lines.join('\n'));
  }, [rampType, curbHeight, availableWidth, availableDepth, maxSlope, flaredSides]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Design accessible pedestrian ramps (rebajes peatonales) per OGUC
      </p>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Ramp Type</label>
        <select
          value={rampType}
          onChange={(e) => setRampType(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
        >
          <option value="perpendicular">Perpendicular (Standard)</option>
          <option value="parallel">Parallel (Constrained)</option>
          <option value="combined">Combined (Corner - two directions)</option>
          <option value="depressed_corner">Depressed Corner</option>
          <option value="midblock">Mid-block Crossing</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Curb Height (cm)</label>
        <input
          type="number"
          value={curbHeight}
          onChange={(e) => setCurbHeight(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          min="10"
          max="25"
          step="1"
        />
        <p className="text-xs text-gray-500 mt-1">Standard: 15 cm</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Available Width (m)</label>
          <input
            type="number"
            value={availableWidth}
            onChange={(e) => setAvailableWidth(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            min="1.0"
            max="3.0"
            step="0.1"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Available Depth (m)</label>
          <input
            type="number"
            value={availableDepth}
            onChange={(e) => setAvailableDepth(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            min="1.5"
            max="5.0"
            step="0.1"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Max Running Slope (%)</label>
        <input
          type="number"
          value={maxSlope}
          onChange={(e) => setMaxSlope(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          min="5"
          max="10"
          step="0.5"
        />
        <p className="text-xs text-gray-500 mt-1">OGUC max: 8.33% (1:12)</p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="flaredSides"
          checked={flaredSides}
          onChange={(e) => setFlaredSides(e.target.checked)}
          className="w-4 h-4 rounded bg-gray-700 border-gray-600"
        />
        <label htmlFor="flaredSides" className="text-sm text-gray-400">
          Include flared sides (1:10 slope)
        </label>
      </div>

      <button
        onClick={calculate}
        className="w-full py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded font-medium"
      >
        Design Ramp
      </button>

      {result && (
        <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700">
          <pre className="text-xs text-orange-300 whitespace-pre-wrap font-mono">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}

// ============================================
// CROSSWALK TOOL
// ============================================

function CrosswalkTool() {
  const [crosswalkType, setCrosswalkType] = useState<string>('standard');
  const [roadWidth, setRoadWidth] = useState('7.0');
  const [speedLimit, setSpeedLimit] = useState('50');
  const [pedestrianVolume, setPedestrianVolume] = useState('medium');
  const [result, setResult] = useState<string | null>(null);

  const calculate = useCallback(() => {
    const width = parseFloat(roadWidth);
    const speed = parseInt(speedLimit);

    // Crosswalk width based on volume
    let crosswalkWidth: number;
    let stripWidth: number;
    let stripSpacing: number;
    let markingType: string;

    switch (pedestrianVolume) {
      case 'high':
        crosswalkWidth = 4.0;
        stripWidth = 0.50;
        stripSpacing = 0.50;
        markingType = 'Continental (Zebra)';
        break;
      case 'medium':
        crosswalkWidth = 3.0;
        stripWidth = 0.40;
        stripSpacing = 0.40;
        markingType = crosswalkType === 'standard' ? 'Parallel lines' : 'Continental';
        break;
      default:
        crosswalkWidth = 2.5;
        stripWidth = 0.30;
        stripSpacing = 0.50;
        markingType = 'Parallel lines';
    }

    // Crossing time (pedestrian speed 1.2 m/s standard)
    const crossingTime = width / 1.2;
    const crossingTimeElderly = width / 0.9;

    // Refuge island needed?
    const needsRefuge = width > 10 || crossingTime > 8;

    const lines = [
      '=== CROSSWALK DESIGN ===',
      `Type: ${crosswalkType}`,
      '',
      'INPUT:',
      `  Road Width: ${width.toFixed(1)} m`,
      `  Speed Limit: ${speed} km/h`,
      `  Pedestrian Volume: ${pedestrianVolume}`,
      '',
      'CROSSWALK GEOMETRY:',
      `  Width: ${crosswalkWidth.toFixed(1)} m`,
      `  Length: ${width.toFixed(1)} m (road width)`,
      `  Marking Type: ${markingType}`,
      '',
      'MARKING DETAIL:',
      `  Strip Width: ${(stripWidth * 100).toFixed(0)} cm`,
      `  Strip Spacing: ${(stripSpacing * 100).toFixed(0)} cm`,
      `  Number of Strips: ${Math.ceil(crosswalkWidth / (stripWidth + stripSpacing))}`,
      `  Paint: Thermoplastic white`,
      '',
      'TIMING ANALYSIS:',
      `  Crossing Time (1.2 m/s): ${crossingTime.toFixed(1)} s`,
      `  Crossing Time (elderly 0.9 m/s): ${crossingTimeElderly.toFixed(1)} s`,
      '',
      needsRefuge
        ? '⚠ REFUGE ISLAND RECOMMENDED\n  - Width > 10m or crossing > 8s\n  - Island width: 2.0m min'
        : '✓ Refuge island not required',
      '',
      'SETBACKS:',
      `  From intersection: ${speed > 40 ? '4.0' : '2.0'} m min`,
      `  From stop line: 1.5 m`,
      '',
      'ACCESSIBILITY:',
      '  - Pedestrian ramps required at both ends',
      '  - Detectable warnings facing crosswalk',
      '  - Accessible pedestrian signals (APS) if signalized',
    ];

    setResult(lines.join('\n'));
  }, [crosswalkType, roadWidth, speedLimit, pedestrianVolume]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Design crosswalk markings and geometry
      </p>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Crosswalk Type</label>
        <select
          value={crosswalkType}
          onChange={(e) => setCrosswalkType(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
        >
          <option value="standard">Standard (Paso de cebra)</option>
          <option value="raised">Raised Crosswalk (Lomo de toro)</option>
          <option value="midblock">Mid-block Crossing</option>
          <option value="school">School Zone</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Road Width (m)</label>
        <input
          type="number"
          value={roadWidth}
          onChange={(e) => setRoadWidth(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          min="5"
          max="30"
          step="0.5"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Speed Limit (km/h)</label>
        <select
          value={speedLimit}
          onChange={(e) => setSpeedLimit(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
        >
          <option value="30">30 km/h (Residential)</option>
          <option value="40">40 km/h (Urban local)</option>
          <option value="50">50 km/h (Urban collector)</option>
          <option value="60">60 km/h (Urban arterial)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Pedestrian Volume</label>
        <select
          value={pedestrianVolume}
          onChange={(e) => setPedestrianVolume(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
        >
          <option value="low">Low (&lt;50 ped/hr)</option>
          <option value="medium">Medium (50-200 ped/hr)</option>
          <option value="high">High (&gt;200 ped/hr)</option>
        </select>
      </div>

      <button
        onClick={calculate}
        className="w-full py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded font-medium"
      >
        Design Crosswalk
      </button>

      {result && (
        <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700">
          <pre className="text-xs text-orange-300 whitespace-pre-wrap font-mono">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}

// ============================================
// DRIVEWAY TOOL
// ============================================

function DrivewayTool() {
  const [driveType, setDriveType] = useState<string>('residential');
  const [driveWidth, setDriveWidth] = useState('3.0');
  const [slopeChange, setSlopeChange] = useState('15');
  const [result, setResult] = useState<string | null>(null);

  const calculate = useCallback(() => {
    const width = parseFloat(driveWidth);
    const slope = parseFloat(slopeChange);

    // Determine dimensions based on type
    let minWidth: number;
    let maxWidth: number;
    let minRadius: number;
    let apronSlope: number;
    let flareAngle: number;

    switch (driveType) {
      case 'commercial':
        minWidth = 6.0;
        maxWidth = 12.0;
        minRadius = 6.0;
        apronSlope = 8;
        flareAngle = 60;
        break;
      case 'industrial':
        minWidth = 8.0;
        maxWidth = 15.0;
        minRadius = 10.0;
        apronSlope = 6;
        flareAngle = 45;
        break;
      default: // residential
        minWidth = 2.5;
        maxWidth = 6.0;
        minRadius = 1.5;
        apronSlope = 10;
        flareAngle = 60;
    }

    // Check width
    const widthOk = width >= minWidth && width <= maxWidth;

    // Transition length for grade change
    const transitionLength = slope > 8 ? slope / 4 : slope / 3;

    const lines = [
      '=== DRIVEWAY DESIGN ===',
      `Type: ${driveType}`,
      '',
      'INPUT:',
      `  Driveway Width: ${width.toFixed(1)} m`,
      `  Grade Change: ${slope}%`,
      '',
      'GEOMETRY:',
      `  Width: ${width.toFixed(1)} m ${widthOk ? '✓' : '✗'}`,
      `  Min Width: ${minWidth.toFixed(1)} m`,
      `  Max Width: ${maxWidth.toFixed(1)} m`,
      `  Entry Radius: ${minRadius.toFixed(1)} m min`,
      `  Flare Angle: ${flareAngle}°`,
      '',
      'APRON:',
      `  Apron Slope: ${apronSlope}% max`,
      `  Transition Length: ${transitionLength.toFixed(1)} m`,
      `  Material: Same as sidewalk or colored concrete`,
      '',
      'SIDEWALK CROSSING:',
      '  - Maintain sidewalk level across driveway',
      '  - Tactile warning strips at edges',
      '  - Clear sight triangles both directions',
      '',
      'DRAINAGE:',
      '  - Grade to street or property',
      '  - Do not discharge onto sidewalk',
      '  - Consider trench drain at property line',
      '',
      'SETBACKS:',
      '  - From corner: 10m min (REDEVU)',
      '  - From crosswalk: 6m min',
      '  - Between driveways: 6m min',
    ];

    setResult(lines.join('\n'));
  }, [driveType, driveWidth, slopeChange]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Design vehicular access (acceso vehicular) per REDEVU
      </p>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Driveway Type</label>
        <select
          value={driveType}
          onChange={(e) => setDriveType(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
        >
          <option value="residential">Residential (Vivienda)</option>
          <option value="commercial">Commercial (Comercial)</option>
          <option value="industrial">Industrial</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Driveway Width (m)</label>
        <input
          type="number"
          value={driveWidth}
          onChange={(e) => setDriveWidth(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          min="2.5"
          max="15"
          step="0.5"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Grade Change (%)</label>
        <input
          type="number"
          value={slopeChange}
          onChange={(e) => setSlopeChange(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          min="0"
          max="25"
          step="1"
        />
      </div>

      <button
        onClick={calculate}
        className="w-full py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded font-medium"
      >
        Design Driveway
      </button>

      {result && (
        <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700">
          <pre className="text-xs text-orange-300 whitespace-pre-wrap font-mono">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}

// ============================================
// INTERSECTION TOOL
// ============================================

function IntersectionTool() {
  const [intType, setIntType] = useState<string>('standard');
  const [cornerRadius, setCornerRadius] = useState('8');
  const [laneWidth, setLaneWidth] = useState('3.5');
  const [designVehicle, setDesignVehicle] = useState<string>('passenger');
  const [result, setResult] = useState<string | null>(null);

  const calculate = useCallback(() => {
    const radius = parseFloat(cornerRadius);
    const lane = parseFloat(laneWidth);

    // Minimum radius by design vehicle
    const minRadii: Record<string, number> = {
      passenger: 4.5,
      single_unit: 9.0,
      bus: 12.0,
      semi_trailer: 15.0,
    };

    const minRadius = minRadii[designVehicle] || 4.5;
    const radiusOk = radius >= minRadius;

    // Effective turning width
    const effectiveWidth = lane + (radius > 10 ? 0.5 : 1.0);

    // Sight triangle
    const sightDistance = 25; // Simplified for 40 km/h

    const lines = [
      '=== INTERSECTION CORNER DESIGN ===',
      `Type: ${intType}`,
      '',
      'INPUT:',
      `  Corner Radius: ${radius.toFixed(1)} m`,
      `  Lane Width: ${lane.toFixed(1)} m`,
      `  Design Vehicle: ${designVehicle}`,
      '',
      'CORNER GEOMETRY:',
      `  Radius: ${radius.toFixed(1)} m ${radiusOk ? '✓' : '✗'}`,
      `  Min for ${designVehicle}: ${minRadius.toFixed(1)} m`,
      `  Effective Turn Width: ${effectiveWidth.toFixed(1)} m`,
      '',
      'CURB RAMPS:',
      '  - One ramp per crosswalk (preferred)',
      '  - Diagonal ramp acceptable if constrained',
      '  - Landing at back of curb',
      '',
      'SIGHT TRIANGLE:',
      `  Clear distance: ${sightDistance} m each leg`,
      '  Height: 0.6m - 2.0m clear zone',
      '',
      'ACCESSIBILITY:',
      '  - Detectable warnings on all ramps',
      '  - Pedestrian refuge if median present',
      '  - APS if signalized',
      '',
      'NOTES:',
      radius < 6 ? '  - Consider compound curve for tight corners' : '',
      radius > 15 ? '  - Large radius may increase ped crossing distance' : '',
      '  - Consider curb extensions for traffic calming',
    ].filter(line => line !== '');

    setResult(lines.join('\n'));
  }, [intType, cornerRadius, laneWidth, designVehicle]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Design intersection corners and turning geometry
      </p>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Intersection Type</label>
        <select
          value={intType}
          onChange={(e) => setIntType(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
        >
          <option value="standard">Standard 90° Intersection</option>
          <option value="skewed">Skewed Intersection</option>
          <option value="tee">T-Intersection</option>
          <option value="roundabout">Mini-Roundabout Entry</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Corner Radius (m)</label>
        <input
          type="number"
          value={cornerRadius}
          onChange={(e) => setCornerRadius(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          min="3"
          max="25"
          step="0.5"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Lane Width (m)</label>
        <input
          type="number"
          value={laneWidth}
          onChange={(e) => setLaneWidth(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          min="2.7"
          max="4.0"
          step="0.1"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Design Vehicle</label>
        <select
          value={designVehicle}
          onChange={(e) => setDesignVehicle(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
        >
          <option value="passenger">Passenger Car (P)</option>
          <option value="single_unit">Single Unit Truck (SU)</option>
          <option value="bus">City Bus (BUS)</option>
          <option value="semi_trailer">Semi-Trailer (WB-15)</option>
        </select>
      </div>

      <button
        onClick={calculate}
        className="w-full py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded font-medium"
      >
        Design Corner
      </button>

      {result && (
        <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700">
          <pre className="text-xs text-orange-300 whitespace-pre-wrap font-mono">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}

// ============================================
// TRAFFIC CALMING TOOL
// ============================================

function TrafficCalmingTool() {
  const [measure, setMeasure] = useState<string>('speed_bump');
  const [targetSpeed, setTargetSpeed] = useState('30');
  const [roadWidth, setRoadWidth] = useState('7.0');
  const [result, setResult] = useState<string | null>(null);

  const calculate = useCallback(() => {
    const speed = parseInt(targetSpeed);
    const width = parseFloat(roadWidth);

    type MeasureSpec = {
      name: string;
      height: number;
      length: number;
      rampSlope: number;
      spacing: number;
      speedReduction: string;
    };

    const measureSpecs: Record<string, MeasureSpec> = {
      speed_bump: {
        name: 'Speed Bump (Lomo de Toro)',
        height: 8,
        length: 35,
        rampSlope: 1 / 4,
        spacing: 75,
        speedReduction: '30 km/h effective',
      },
      speed_hump: {
        name: 'Speed Hump (Resalto)',
        height: 10,
        length: 370,
        rampSlope: 1 / 25,
        spacing: 100,
        speedReduction: '40 km/h effective',
      },
      speed_table: {
        name: 'Speed Table (Mesa)',
        height: 8,
        length: 600,
        rampSlope: 1 / 25,
        spacing: 150,
        speedReduction: '40 km/h effective',
      },
      chicane: {
        name: 'Chicane',
        height: 0,
        length: width * 2,
        rampSlope: 0,
        spacing: 50,
        speedReduction: '25-35 km/h depending on geometry',
      },
      choker: {
        name: 'Choker / Pinch Point',
        height: 0,
        length: 6,
        rampSlope: 0,
        spacing: 100,
        speedReduction: 'Varies with narrowing',
      },
    };

    const spec = measureSpecs[measure] || measureSpecs.speed_bump;

    const lines = [
      `=== ${spec.name.toUpperCase()} ===`,
      '',
      'INPUT:',
      `  Target Speed: ${speed} km/h`,
      `  Road Width: ${width} m`,
      '',
      'DEVICE GEOMETRY:',
      spec.height > 0 ? `  Height: ${spec.height} cm` : '',
      spec.length > 0 ? `  Length: ${spec.length} cm` : '',
      spec.rampSlope > 0 ? `  Ramp Slope: 1:${Math.round(1 / spec.rampSlope)}` : '',
      `  Width: Full carriageway (${width} m)`,
      '',
      'PLACEMENT:',
      `  Spacing: ${spec.spacing} m recommended`,
      '  Location: Away from driveways, intersections',
      '  Drainage: Provide gaps or drainage channels',
      '',
      'EFFECTIVENESS:',
      `  Speed Reduction: ${spec.speedReduction}`,
      '',
      'SIGNAGE & MARKING:',
      '  - Warning sign 50m in advance',
      '  - Road marking (triangles or chevrons)',
      measure === 'speed_bump' || measure === 'speed_hump'
        ? '  - Retroreflective stripe on device'
        : '',
      '',
      'ACCESSIBILITY:',
      '  - Maintain accessible route on sidewalk',
      '  - Consider cyclist bypass if applicable',
      measure === 'speed_table'
        ? '  - Can serve as raised crosswalk'
        : '',
      '',
      'EMERGENCY SERVICES:',
      '  - Consult with fire/ambulance services',
      '  - Consider alternative routes',
      '  - Speed humps preferred over bumps for EMS',
    ].filter(line => line !== '');

    setResult(lines.join('\n'));
  }, [measure, targetSpeed, roadWidth]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Design traffic calming measures per REDEVU
      </p>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Calming Measure</label>
        <select
          value={measure}
          onChange={(e) => setMeasure(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
        >
          <option value="speed_bump">Speed Bump (Lomo de Toro)</option>
          <option value="speed_hump">Speed Hump (Resalto)</option>
          <option value="speed_table">Speed Table / Raised Crosswalk</option>
          <option value="chicane">Chicane (Deflection)</option>
          <option value="choker">Choker / Pinch Point</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Target Speed (km/h)</label>
        <select
          value={targetSpeed}
          onChange={(e) => setTargetSpeed(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
        >
          <option value="20">20 km/h (Pedestrian zone)</option>
          <option value="30">30 km/h (Residential)</option>
          <option value="40">40 km/h (Urban)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Road Width (m)</label>
        <input
          type="number"
          value={roadWidth}
          onChange={(e) => setRoadWidth(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          min="5"
          max="15"
          step="0.5"
        />
      </div>

      <button
        onClick={calculate}
        className="w-full py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded font-medium"
      >
        Design Measure
      </button>

      {result && (
        <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-700">
          <pre className="text-xs text-orange-300 whitespace-pre-wrap font-mono">
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

function UrbanReferenceView() {
  const [activeTab, setActiveTab] = useState<'ramps' | 'marking' | 'calming' | 'vehicles'>('ramps');

  return (
    <div className="space-y-4">
      <div className="flex gap-1 flex-wrap">
        {[
          { id: 'ramps', label: 'Ramp Specs' },
          { id: 'marking', label: 'Markings' },
          { id: 'calming', label: 'Calming' },
          { id: 'vehicles', label: 'Vehicles' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-3 py-1 text-xs rounded ${
              activeTab === tab.id
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-gray-800 rounded p-3 text-xs">
        {activeTab === 'ramps' && (
          <div>
            <h4 className="font-medium text-white mb-2">Pedestrian Ramp Requirements (OGUC)</h4>
            <table className="w-full text-gray-300">
              <tbody>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">Max Running Slope</td>
                  <td className="text-right text-orange-400">8.33% (1:12)</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">Max Cross Slope</td>
                  <td className="text-right text-orange-400">2%</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">Min Width</td>
                  <td className="text-right text-orange-400">1.20 m</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">Preferred Width</td>
                  <td className="text-right text-orange-400">1.50 m</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">Landing Size</td>
                  <td className="text-right text-orange-400">1.50 × 1.50 m</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">Detectable Warning</td>
                  <td className="text-right text-orange-400">0.60 m deep</td>
                </tr>
                <tr>
                  <td className="py-1">Flare Slope (max)</td>
                  <td className="text-right text-orange-400">1:10 (10%)</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'marking' && (
          <div>
            <h4 className="font-medium text-white mb-2">Crosswalk Marking Standards</h4>
            <table className="w-full text-gray-300">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-1">Type</th>
                  <th className="text-right py-1">Width</th>
                  <th className="text-right py-1">Spacing</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">Parallel Lines</td>
                  <td className="text-right text-orange-400">15 cm</td>
                  <td className="text-right text-orange-400">2.5-3.0 m</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">Continental</td>
                  <td className="text-right text-orange-400">40-50 cm</td>
                  <td className="text-right text-orange-400">40-50 cm</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">School Zone</td>
                  <td className="text-right text-orange-400">50 cm</td>
                  <td className="text-right text-orange-400">50 cm</td>
                </tr>
                <tr>
                  <td className="py-1">Stop Line</td>
                  <td className="text-right text-orange-400">40 cm</td>
                  <td className="text-right text-gray-500">-</td>
                </tr>
              </tbody>
            </table>
            <p className="text-gray-500 mt-2">Material: Thermoplastic, retroreflective</p>
          </div>
        )}

        {activeTab === 'calming' && (
          <div>
            <h4 className="font-medium text-white mb-2">Traffic Calming Dimensions</h4>
            <table className="w-full text-gray-300">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-1">Device</th>
                  <th className="text-right py-1">Height</th>
                  <th className="text-right py-1">Length</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">Speed Bump</td>
                  <td className="text-right text-orange-400">8 cm</td>
                  <td className="text-right text-orange-400">35 cm</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">Speed Hump</td>
                  <td className="text-right text-orange-400">10 cm</td>
                  <td className="text-right text-orange-400">3.7 m</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">Speed Table</td>
                  <td className="text-right text-orange-400">8 cm</td>
                  <td className="text-right text-orange-400">6 m</td>
                </tr>
                <tr>
                  <td className="py-1">Raised Crosswalk</td>
                  <td className="text-right text-orange-400">8 cm</td>
                  <td className="text-right text-orange-400">3-6 m</td>
                </tr>
              </tbody>
            </table>
            <p className="text-gray-500 mt-2">Ramp slope typically 1:25 for EMS access</p>
          </div>
        )}

        {activeTab === 'vehicles' && (
          <div>
            <h4 className="font-medium text-white mb-2">Design Vehicle Turning Radii</h4>
            <table className="w-full text-gray-300">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-1">Vehicle</th>
                  <th className="text-right py-1">Min Radius</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">Passenger Car</td>
                  <td className="text-right text-orange-400">4.5 m</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">Single Unit Truck</td>
                  <td className="text-right text-orange-400">9.0 m</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">City Bus</td>
                  <td className="text-right text-orange-400">12.0 m</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1">Semi-Trailer (WB-15)</td>
                  <td className="text-right text-orange-400">15.0 m</td>
                </tr>
                <tr>
                  <td className="py-1">Fire Truck</td>
                  <td className="text-right text-orange-400">11.5 m</td>
                </tr>
              </tbody>
            </table>
            <p className="text-gray-500 mt-2">Add 0.5m clearance to fixed objects</p>
          </div>
        )}
      </div>
    </div>
  );
}
