'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useDisciplineStore } from '@/stores/discipline-store';
import type { ChannelDesign } from '@/types/disciplines';
import {
  // Geometry
  type PrismaticShape,
  createTrapezoidalSection,
  createRectangularSection,
  createTriangularSection,
  createCircularSection,

  // Hydraulics
  type ChannelMaterial,
  MANNING_N_CHANNELS,
  PERMISSIBLE_VELOCITY,
  SIDE_SLOPES,
  FREEBOARD_REQUIREMENTS,
  analyzePrismaticFlow,
  calculateCriticalDepthPrismatic,
  calculateNormalDepthPrismatic,
  calculateConjugateDepth,
  formatPrismaticResult,
  getManningsN,

  // GVF
  type ProfileType,
  classifyChannelSlope,
  classifyProfileType,

  // Structures
  type CulvertShape,
  type CulvertMaterial,
  type InletType,
  type WeirType,
  CULVERT_MANNING_N,
  WEIR_COEFFICIENTS,
  analyzeCulvert,
  sizeCulvert,
  calculateWeirFlow,
  formatCulvertResult,
  formatWeirResult,

  // Design
  type ChannelType,
  type SoilType,
  type LiningType,
  sizeChannel,
  designBestHydraulicSection,
  compareChannelShapes,
  calculateFreeboard,
  formatChannelDesign,
  formatSectionComparison,
} from '@/lib/open-channel';
import type { ChannelGeometry, ChannelHydraulics, ChannelShape } from './HydraulicsViewer3D';

// Dynamic import for 3D viewer to avoid SSR issues
const HydraulicsViewer3D = dynamic(() => import('./HydraulicsViewer3D'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-cad-bg">
      <div className="text-gray-400">Loading 3D viewer...</div>
    </div>
  ),
});

interface OpenChannelPanelProps {
  projectId?: string;
  projectName?: string;
  onClose?: () => void;
}

type ToolMode = 'network' | 'flow' | 'depths' | 'structures' | 'design' | 'reference';

// Shared context for 3D visualization
interface Channel3DData {
  geometry: ChannelGeometry;
  hydraulics?: ChannelHydraulics;
}

export function OpenChannelPanel({
  projectId,
  projectName,
  onClose,
}: OpenChannelPanelProps) {
  const [toolMode, setToolMode] = useState<ToolMode>('network');
  const [show3DViewer, setShow3DViewer] = useState(false);
  const [channel3DData, setChannel3DData] = useState<Channel3DData>({
    geometry: {
      shape: 'trapezoidal',
      bottomWidth: 2.0,
      sideSlope: 1.5,
      depth: 1.5,
      waterDepth: 1.0,
    },
  });

  // Discipline store
  const {
    channelDesigns,
    activeChannelDesign,
    setActiveChannelDesign,
    loadDesigns,
    createDesign,
    saveActiveDesign,
    isLoading,
    isSaving,
  } = useDisciplineStore();

  // Load designs on mount
  useEffect(() => {
    if (projectId) {
      loadDesigns(projectId, 'channel');
    }
  }, [projectId, loadDesigns]);

  const update3DData = useCallback((data: Partial<Channel3DData>) => {
    setChannel3DData((prev) => ({
      ...prev,
      ...data,
      geometry: data.geometry ? { ...prev.geometry, ...data.geometry } : prev.geometry,
    }));
  }, []);

  return (
    <>
      <div className="bg-cad-panel border border-gray-700 rounded-lg shadow-xl w-96 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-700">
          <div>
            <h3 className="text-white font-medium">Open Channel Design</h3>
            <p className="text-gray-400 text-xs">{projectName || 'HEC-RAS Style'}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* 3D View Button */}
            <button
              onClick={() => setShow3DViewer(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-teal-600 hover:bg-teal-700 text-white rounded transition-colors"
              title="Open 3D Viewer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
              </svg>
              3D
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Tool Mode Tabs */}
        <div className="flex border-b border-gray-700">
          {([
            { id: 'network', label: 'Red' },
            { id: 'flow', label: 'Flow' },
            { id: 'depths', label: 'Depths' },
            { id: 'structures', label: 'Structs' },
            { id: 'design', label: 'Design' },
            { id: 'reference', label: 'Ref' },
          ] as { id: ToolMode; label: string }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setToolMode(tab.id)}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                toolMode === tab.id
                  ? 'text-teal-400 border-b-2 border-teal-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {toolMode === 'network' && (
            <ChannelDesignManagerView
              projectId={projectId}
              designs={channelDesigns}
              activeDesign={activeChannelDesign}
              onSelectDesign={setActiveChannelDesign}
              onCreateDesign={(name) => projectId && createDesign('channel', { name })}
              onSaveDesign={() => saveActiveDesign('channel')}
              isLoading={isLoading}
              isSaving={isSaving}
            />
          )}
          {toolMode === 'flow' && <ChannelFlowTool onUpdate3D={update3DData} />}
          {toolMode === 'depths' && <DepthCalculatorTool onUpdate3D={update3DData} />}
          {toolMode === 'structures' && <StructuresTool />}
          {toolMode === 'design' && <ChannelDesignTool onUpdate3D={update3DData} />}
          {toolMode === 'reference' && <ReferenceView />}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-gray-700 text-xs text-gray-500 text-center">
          Based on HEC-RAS, USBR & Chilean Standards (MOP)
        </div>
      </div>

      {/* 3D Viewer Modal */}
      {show3DViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="relative w-[90vw] h-[80vh] bg-cad-bg rounded-lg shadow-2xl overflow-hidden border border-gray-700">
            {/* Viewer Header */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-3 bg-gradient-to-b from-gray-900/90 to-transparent">
              <h3 className="text-white font-medium">3D Channel Visualization</h3>
              <button
                onClick={() => setShow3DViewer(false)}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close
              </button>
            </div>

            {/* 3D Viewer */}
            <HydraulicsViewer3D
              channel={channel3DData.geometry}
              hydraulics={channel3DData.hydraulics}
              showWaterSurface={true}
              showFlowAnimation={true}
              showDimensions={true}
              showHydraulicGrades={true}
            />
          </div>
        </div>
      )}
    </>
  );
}

// ============================================
// CHANNEL FLOW TOOL
// ============================================

interface ChannelFlowToolProps {
  onUpdate3D?: (data: Partial<Channel3DData>) => void;
}

function ChannelFlowTool({ onUpdate3D }: ChannelFlowToolProps) {
  const [shape, setShape] = useState<PrismaticShape>('trapezoidal');
  const [bottomWidth, setBottomWidth] = useState('2.0');
  const [sideSlope, setSideSlope] = useState('1.5');
  const [depth, setDepth] = useState('1.0');
  const [slope, setSlope] = useState('0.1');
  const [material, setMaterial] = useState<ChannelMaterial>('concrete_smooth');
  const [result, setResult] = useState<string | null>(null);

  const calculate = useCallback(() => {
    let section;
    const y = parseFloat(depth);
    const S = parseFloat(slope) / 100;
    const n = getManningsN(material);
    const b = parseFloat(bottomWidth);
    const z = parseFloat(sideSlope);

    switch (shape) {
      case 'rectangular':
        section = createRectangularSection(b);
        break;
      case 'triangular':
        section = createTriangularSection(z);
        break;
      case 'circular':
        section = createCircularSection(b);
        break;
      case 'trapezoidal':
      default:
        section = createTrapezoidalSection(b, z);
        break;
    }

    const flowResult = analyzePrismaticFlow(section, y, S, n);
    setResult(formatPrismaticResult(flowResult));

    // Update 3D viewer with calculated data
    if (onUpdate3D) {
      const totalDepth = y * 1.5; // Add some freeboard for display
      const yc = calculateCriticalDepthPrismatic(section, flowResult.flowRate);
      const yn = S > 0 ? calculateNormalDepthPrismatic(section, flowResult.flowRate, S, n) : y;

      onUpdate3D({
        geometry: {
          shape: shape as ChannelShape,
          bottomWidth: shape === 'triangular' ? 0 : b,
          sideSlope: shape === 'rectangular' ? 0 : z,
          depth: totalDepth,
          waterDepth: y,
          diameter: shape === 'circular' ? b : undefined,
        },
        hydraulics: {
          flowRate: flowResult.flowRate,
          velocity: flowResult.velocity,
          froudeNumber: flowResult.froudeNumber,
          criticalDepth: yc,
          normalDepth: yn,
          specificEnergy: flowResult.specificEnergy,
          slope: S,
        },
      });
    }
  }, [shape, bottomWidth, sideSlope, depth, slope, material, onUpdate3D]);

  return (
    <div className="space-y-3">
      <h4 className="text-white font-medium text-sm">Manning Flow Analysis</h4>

      {/* Shape & Material */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-gray-400 text-xs mb-1">Shape</label>
          <select
            value={shape}
            onChange={(e) => setShape(e.target.value as PrismaticShape)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
          >
            <option value="trapezoidal">Trapezoidal</option>
            <option value="rectangular">Rectangular</option>
            <option value="triangular">Triangular</option>
            <option value="circular">Circular</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Material</label>
          <select
            value={material}
            onChange={(e) => setMaterial(e.target.value as ChannelMaterial)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
          >
            <option value="concrete_smooth">Concrete (smooth)</option>
            <option value="concrete_rough">Concrete (rough)</option>
            <option value="shotcrete">Shotcrete</option>
            <option value="riprap">Riprap</option>
            <option value="gabions">Gabions</option>
            <option value="earth_clean">Earth (clean)</option>
            <option value="earth_gravel">Earth (gravel)</option>
            <option value="natural_clean_straight">Natural (straight)</option>
            <option value="mountain_gravel_cobbles">Mountain</option>
          </select>
        </div>
      </div>

      {/* Dimensions */}
      <div className="grid grid-cols-2 gap-2">
        {shape !== 'triangular' && (
          <div>
            <label className="block text-gray-400 text-xs mb-1">
              {shape === 'circular' ? 'Diameter (m)' : 'Bottom W (m)'}
            </label>
            <input
              type="number"
              value={bottomWidth}
              onChange={(e) => setBottomWidth(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
              step="0.1"
              min="0"
            />
          </div>
        )}

        {(shape === 'trapezoidal' || shape === 'triangular') && (
          <div>
            <label className="block text-gray-400 text-xs mb-1">Side Slope (H:V)</label>
            <input
              type="number"
              value={sideSlope}
              onChange={(e) => setSideSlope(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
              step="0.1"
              min="0"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-gray-400 text-xs mb-1">Flow Depth (m)</label>
          <input
            type="number"
            value={depth}
            onChange={(e) => setDepth(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            step="0.1"
            min="0"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Slope (%)</label>
          <input
            type="number"
            value={slope}
            onChange={(e) => setSlope(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            step="0.01"
            min="0"
          />
        </div>
      </div>

      {/* Calculate Button */}
      <button
        onClick={calculate}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded py-2 text-sm font-medium transition-colors"
      >
        Calculate Flow
      </button>

      {/* Results */}
      {result && (
        <div className="bg-gray-800 rounded p-3">
          <pre className="text-green-400 text-xs whitespace-pre-wrap font-mono">{result}</pre>
        </div>
      )}

      {/* Quick Info */}
      <div className="text-gray-400 text-xs">
        <p>n = {getManningsN(material).toFixed(3)} | Q = (1/n)AR^(2/3)S^(1/2)</p>
      </div>
    </div>
  );
}

// ============================================
// DEPTH CALCULATOR TOOL
// ============================================

interface DepthCalculatorToolProps {
  onUpdate3D?: (data: Partial<Channel3DData>) => void;
}

function DepthCalculatorTool({ onUpdate3D }: DepthCalculatorToolProps) {
  const [calcType, setCalcType] = useState<'normal' | 'critical' | 'conjugate'>('normal');
  const [shape, setShape] = useState<PrismaticShape>('trapezoidal');
  const [bottomWidth, setBottomWidth] = useState('2.0');
  const [sideSlope, setSideSlope] = useState('1.5');
  const [flowRate, setFlowRate] = useState('5.0');
  const [slope, setSlope] = useState('0.1');
  const [initialDepth, setInitialDepth] = useState('0.5');
  const [manningsN, setManningsN] = useState('0.015');
  const [result, setResult] = useState<string | null>(null);

  const calculate = useCallback(() => {
    let section;
    const Q = parseFloat(flowRate);
    const S = parseFloat(slope) / 100;
    const n = parseFloat(manningsN);
    const b = parseFloat(bottomWidth);
    const z = parseFloat(sideSlope);

    switch (shape) {
      case 'rectangular':
        section = createRectangularSection(b);
        break;
      case 'triangular':
        section = createTriangularSection(z);
        break;
      case 'trapezoidal':
      default:
        section = createTrapezoidalSection(b, z);
        break;
    }

    let output: string[] = [];
    let calculatedDepth = 0;
    let yc = 0;
    let yn = 0;

    switch (calcType) {
      case 'normal': {
        yn = calculateNormalDepthPrismatic(section, Q, S, n);
        yc = calculateCriticalDepthPrismatic(section, Q);
        const slopeClass = classifyChannelSlope(yn, yc, S);
        calculatedDepth = yn;

        output = [
          `Normal Depth Analysis`,
          `========================================`,
          `Q = ${Q.toFixed(3)} m³/s  |  S = ${(S * 100).toFixed(3)}%`,
          `n = ${n.toFixed(4)}`,
          ``,
          `Normal Depth (yn): ${yn.toFixed(4)} m`,
          `Critical Depth (yc): ${yc.toFixed(4)} m`,
          ``,
          `Slope Type: ${slopeClass.toUpperCase()}`,
          yn > yc ? 'Flow: Subcritical (yn > yc)' : 'Flow: Supercritical (yn < yc)',
        ];
        break;
      }

      case 'critical': {
        yc = calculateCriticalDepthPrismatic(section, Q);
        yn = S > 0 ? calculateNormalDepthPrismatic(section, Q, S, n) : Infinity;
        calculatedDepth = yc;

        output = [
          `Critical Depth Analysis`,
          `========================================`,
          `Q = ${Q.toFixed(3)} m³/s`,
          ``,
          `Critical Depth (yc): ${yc.toFixed(4)} m`,
          ``,
          `At critical depth:`,
          `  Froude Number = 1.0`,
          `  Minimum specific energy`,
        ];

        if (S > 0 && isFinite(yn)) {
          output.push('', `Normal Depth (yn): ${yn.toFixed(4)} m`);
        }
        break;
      }

      case 'conjugate': {
        const y1 = parseFloat(initialDepth);
        const y2 = calculateConjugateDepth(section, y1, Q);
        yc = calculateCriticalDepthPrismatic(section, Q);
        yn = S > 0 ? calculateNormalDepthPrismatic(section, Q, S, n) : y2;
        calculatedDepth = y2;

        output = [
          `Conjugate Depth (Hydraulic Jump)`,
          `========================================`,
          `Q = ${Q.toFixed(3)} m³/s`,
          `Initial Depth (y1): ${y1.toFixed(4)} m`,
          ``,
          `Sequent Depth (y2): ${y2.toFixed(4)} m`,
          `Ratio y2/y1: ${(y2 / y1).toFixed(2)}`,
        ];
        break;
      }
    }

    setResult(output.join('\n'));

    // Update 3D viewer
    if (onUpdate3D && calculatedDepth > 0) {
      const totalDepth = calculatedDepth * 1.5;
      const flowResult = analyzePrismaticFlow(section, calculatedDepth, S, n);

      onUpdate3D({
        geometry: {
          shape: shape as ChannelShape,
          bottomWidth: shape === 'triangular' ? 0 : b,
          sideSlope: shape === 'rectangular' ? 0 : z,
          depth: totalDepth,
          waterDepth: calculatedDepth,
        },
        hydraulics: {
          flowRate: Q,
          velocity: flowResult.velocity,
          froudeNumber: flowResult.froudeNumber,
          criticalDepth: yc,
          normalDepth: isFinite(yn) ? yn : calculatedDepth,
          specificEnergy: flowResult.specificEnergy,
          slope: S,
        },
      });
    }
  }, [calcType, shape, bottomWidth, sideSlope, flowRate, slope, initialDepth, manningsN, onUpdate3D]);

  return (
    <div className="space-y-3">
      <h4 className="text-white font-medium text-sm">Depth Calculations</h4>

      {/* Calculation Type */}
      <div className="flex gap-1">
        {(['normal', 'critical', 'conjugate'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setCalcType(type)}
            className={`flex-1 py-1 text-xs rounded capitalize ${
              calcType === type
                ? 'bg-teal-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            {type === 'conjugate' ? 'Jump' : type}
          </button>
        ))}
      </div>

      {/* Shape & Dimensions */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-gray-400 text-xs mb-1">Shape</label>
          <select
            value={shape}
            onChange={(e) => setShape(e.target.value as PrismaticShape)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
          >
            <option value="trapezoidal">Trapezoidal</option>
            <option value="rectangular">Rectangular</option>
            <option value="triangular">Triangular</option>
          </select>
        </div>
        {shape !== 'triangular' && (
          <div>
            <label className="block text-gray-400 text-xs mb-1">Bottom W (m)</label>
            <input
              type="number"
              value={bottomWidth}
              onChange={(e) => setBottomWidth(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
              step="0.1"
              min="0"
            />
          </div>
        )}
        {(shape === 'trapezoidal' || shape === 'triangular') && shape === 'triangular' && (
          <div>
            <label className="block text-gray-400 text-xs mb-1">Side Slope</label>
            <input
              type="number"
              value={sideSlope}
              onChange={(e) => setSideSlope(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
              step="0.1"
              min="0"
            />
          </div>
        )}
      </div>

      {shape === 'trapezoidal' && (
        <div>
          <label className="block text-gray-400 text-xs mb-1">Side Slope (H:V)</label>
          <input
            type="number"
            value={sideSlope}
            onChange={(e) => setSideSlope(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            step="0.1"
            min="0"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-gray-400 text-xs mb-1">Flow (m³/s)</label>
          <input
            type="number"
            value={flowRate}
            onChange={(e) => setFlowRate(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            step="0.1"
            min="0"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Manning n</label>
          <input
            type="number"
            value={manningsN}
            onChange={(e) => setManningsN(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            step="0.001"
            min="0.001"
          />
        </div>
      </div>

      {calcType === 'normal' && (
        <div>
          <label className="block text-gray-400 text-xs mb-1">Channel Slope (%)</label>
          <input
            type="number"
            value={slope}
            onChange={(e) => setSlope(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            step="0.01"
            min="0"
          />
        </div>
      )}

      {calcType === 'conjugate' && (
        <div>
          <label className="block text-gray-400 text-xs mb-1">Initial Depth y1 (m)</label>
          <input
            type="number"
            value={initialDepth}
            onChange={(e) => setInitialDepth(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            step="0.1"
            min="0"
          />
        </div>
      )}

      {/* Calculate Button */}
      <button
        onClick={calculate}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded py-2 text-sm font-medium transition-colors"
      >
        Calculate Depth
      </button>

      {/* Results */}
      {result && (
        <div className="bg-gray-800 rounded p-3">
          <pre className="text-green-400 text-xs whitespace-pre-wrap font-mono">{result}</pre>
        </div>
      )}
    </div>
  );
}

// ============================================
// STRUCTURES TOOL
// ============================================

function StructuresTool() {
  const [structureType, setStructureType] = useState<'culvert' | 'weir'>('culvert');

  return (
    <div className="space-y-3">
      <h4 className="text-white font-medium text-sm">Hydraulic Structures</h4>

      {/* Structure Type Toggle */}
      <div className="flex gap-1">
        <button
          onClick={() => setStructureType('culvert')}
          className={`flex-1 py-1 text-xs rounded ${
            structureType === 'culvert'
              ? 'bg-teal-600 text-white'
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          Culvert
        </button>
        <button
          onClick={() => setStructureType('weir')}
          className={`flex-1 py-1 text-xs rounded ${
            structureType === 'weir'
              ? 'bg-teal-600 text-white'
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          Weir
        </button>
      </div>

      {structureType === 'culvert' ? <CulvertTool /> : <WeirTool />}
    </div>
  );
}

function CulvertTool() {
  const [mode, setMode] = useState<'analyze' | 'size'>('analyze');
  const [shape, setShape] = useState<CulvertShape>('circular');
  const [diameter, setDiameter] = useState('1.0');
  const [length, setLength] = useState('20');
  const [slope, setSlope] = useState('1.0');
  const [inlet, setInlet] = useState<InletType>('headwall');
  const [material, setMaterial] = useState<CulvertMaterial>('concrete');
  const [flowRate, setFlowRate] = useState('5.0');
  const [tailwater, setTailwater] = useState('100.5');
  const [invertUp, setInvertUp] = useState('100.0');
  const [maxHW, setMaxHW] = useState('102.0');
  const [result, setResult] = useState<string | null>(null);

  const calculate = useCallback(() => {
    const Q = parseFloat(flowRate);
    const TW = parseFloat(tailwater);
    const L = parseFloat(length);
    const invUp = parseFloat(invertUp);
    const S = parseFloat(slope) / 100;
    const invDown = invUp - S * L;

    if (mode === 'analyze') {
      const culvert = {
        id: 'analysis',
        geometry: shape === 'circular'
          ? { shape: 'circular' as const, diameter: parseFloat(diameter) }
          : { shape: shape as CulvertShape, span: parseFloat(diameter) * 1.5, rise: parseFloat(diameter) },
        length: L,
        inlet,
        edgeCondition: 'square' as const,
        material,
        manningsN: CULVERT_MANNING_N[material],
        invertElevationUpstream: invUp,
        invertElevationDownstream: invDown,
        numberOfBarrels: 1,
      };

      const culvertResult = analyzeCulvert(culvert, Q, TW);
      setResult(formatCulvertResult(culvertResult));
    } else {
      const { size, result: sizingResult } = sizeCulvert(
        Q,
        parseFloat(maxHW),
        invUp,
        invDown,
        L,
        TW,
        shape,
        material
      );

      const lines = [
        `Culvert Sizing Results`,
        `========================================`,
        `Design Flow: ${Q.toFixed(2)} m³/s`,
        `Max Headwater: ${parseFloat(maxHW).toFixed(2)} m`,
        ``,
        shape === 'circular'
          ? `Selected Diameter: ${(size * 1000).toFixed(0)} mm`
          : `Dimensions: ${(size * 1.5).toFixed(2)} x ${size.toFixed(2)} m`,
        ``,
        `Computed HW: ${sizingResult.headwater.toFixed(3)} m`,
        `HW/D: ${sizingResult.hwToD.toFixed(2)}`,
        `Control: ${sizingResult.controlType === 'inlet' ? 'Inlet' : 'Outlet'}`,
        `Velocity: ${sizingResult.velocity.toFixed(2)} m/s`,
        `Rating: ${sizingResult.performanceRating.toUpperCase()}`,
      ];

      if (sizingResult.warnings.length > 0) {
        lines.push('', '--- Warnings ---');
        sizingResult.warnings.forEach(w => lines.push(`! ${w}`));
      }

      setResult(lines.join('\n'));
    }
  }, [mode, shape, diameter, length, slope, inlet, material, flowRate, tailwater, invertUp, maxHW]);

  return (
    <div className="space-y-3">
      {/* Mode Toggle */}
      <div className="flex gap-1">
        <button
          onClick={() => setMode('analyze')}
          className={`flex-1 py-1 text-xs rounded ${
            mode === 'analyze' ? 'bg-teal-600 text-white' : 'bg-gray-700 text-gray-300'
          }`}
        >
          Analyze
        </button>
        <button
          onClick={() => setMode('size')}
          className={`flex-1 py-1 text-xs rounded ${
            mode === 'size' ? 'bg-teal-600 text-white' : 'bg-gray-700 text-gray-300'
          }`}
        >
          Size
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-gray-400 text-xs mb-1">Shape</label>
          <select
            value={shape}
            onChange={(e) => setShape(e.target.value as CulvertShape)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
          >
            <option value="circular">Circular</option>
            <option value="box">Box</option>
            <option value="arch">Arch</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Inlet</label>
          <select
            value={inlet}
            onChange={(e) => setInlet(e.target.value as InletType)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
          >
            <option value="headwall">Headwall</option>
            <option value="headwall_wingwall">HW+Wingwall</option>
            <option value="projecting">Projecting</option>
            <option value="mitered">Mitered</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {mode === 'analyze' && (
          <div>
            <label className="block text-gray-400 text-xs mb-1">
              {shape === 'circular' ? 'Dia (m)' : 'Rise (m)'}
            </label>
            <input
              type="number"
              value={diameter}
              onChange={(e) => setDiameter(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
              step="0.1"
              min="0.1"
            />
          </div>
        )}
        <div>
          <label className="block text-gray-400 text-xs mb-1">Length (m)</label>
          <input
            type="number"
            value={length}
            onChange={(e) => setLength(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            step="1"
            min="1"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Slope (%)</label>
          <input
            type="number"
            value={slope}
            onChange={(e) => setSlope(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            step="0.1"
            min="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-gray-400 text-xs mb-1">Flow (m³/s)</label>
          <input
            type="number"
            value={flowRate}
            onChange={(e) => setFlowRate(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            step="0.5"
            min="0"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Tailwater (m)</label>
          <input
            type="number"
            value={tailwater}
            onChange={(e) => setTailwater(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            step="0.1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-gray-400 text-xs mb-1">Invert US (m)</label>
          <input
            type="number"
            value={invertUp}
            onChange={(e) => setInvertUp(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            step="0.1"
          />
        </div>
        {mode === 'size' && (
          <div>
            <label className="block text-gray-400 text-xs mb-1">Max HW (m)</label>
            <input
              type="number"
              value={maxHW}
              onChange={(e) => setMaxHW(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
              step="0.1"
            />
          </div>
        )}
      </div>

      <button
        onClick={calculate}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded py-2 text-sm font-medium transition-colors"
      >
        {mode === 'analyze' ? 'Analyze' : 'Size'} Culvert
      </button>

      {result && (
        <div className="bg-gray-800 rounded p-3">
          <pre className="text-green-400 text-xs whitespace-pre-wrap font-mono">{result}</pre>
        </div>
      )}
    </div>
  );
}

function WeirTool() {
  const [weirType, setWeirType] = useState<WeirType>('broad_crested');
  const [crestLength, setCrestLength] = useState('5.0');
  const [crestElev, setCrestElev] = useState('100.0');
  const [head, setHead] = useState('0.5');
  const [tailwater, setTailwater] = useState('');
  const [notchAngle, setNotchAngle] = useState('90');
  const [result, setResult] = useState<string | null>(null);

  const calculate = useCallback(() => {
    const weir = {
      type: weirType,
      crestElevation: parseFloat(crestElev),
      crestLength: parseFloat(crestLength),
      notchAngle: weirType === 'v_notch' ? parseFloat(notchAngle) : undefined,
    };

    const H = parseFloat(head);
    const TW = tailwater ? parseFloat(tailwater) : undefined;

    const weirResult = calculateWeirFlow(weir, H, TW);
    setResult(formatWeirResult(weirResult));
  }, [weirType, crestLength, crestElev, head, tailwater, notchAngle]);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-gray-400 text-xs mb-1">Weir Type</label>
        <select
          value={weirType}
          onChange={(e) => setWeirType(e.target.value as WeirType)}
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
        >
          <option value="broad_crested">Broad Crested</option>
          <option value="sharp_crested">Sharp Crested</option>
          <option value="ogee">Ogee</option>
          <option value="v_notch">V-Notch</option>
          <option value="cipolletti">Cipolletti</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {weirType !== 'v_notch' && (
          <div>
            <label className="block text-gray-400 text-xs mb-1">Crest L (m)</label>
            <input
              type="number"
              value={crestLength}
              onChange={(e) => setCrestLength(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
              step="0.1"
              min="0"
            />
          </div>
        )}
        {weirType === 'v_notch' && (
          <div>
            <label className="block text-gray-400 text-xs mb-1">Notch (°)</label>
            <input
              type="number"
              value={notchAngle}
              onChange={(e) => setNotchAngle(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
              step="1"
              min="10"
              max="120"
            />
          </div>
        )}
        <div>
          <label className="block text-gray-400 text-xs mb-1">Crest El (m)</label>
          <input
            type="number"
            value={crestElev}
            onChange={(e) => setCrestElev(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            step="0.1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-gray-400 text-xs mb-1">Head (m)</label>
          <input
            type="number"
            value={head}
            onChange={(e) => setHead(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            step="0.05"
            min="0"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">TW (m)</label>
          <input
            type="number"
            value={tailwater}
            onChange={(e) => setTailwater(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            step="0.1"
            placeholder="Optional"
          />
        </div>
      </div>

      <button
        onClick={calculate}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded py-2 text-sm font-medium transition-colors"
      >
        Calculate Weir
      </button>

      {result && (
        <div className="bg-gray-800 rounded p-3">
          <pre className="text-green-400 text-xs whitespace-pre-wrap font-mono">{result}</pre>
        </div>
      )}
    </div>
  );
}

// ============================================
// CHANNEL DESIGN TOOL
// ============================================

interface ChannelDesignToolProps {
  onUpdate3D?: (data: Partial<Channel3DData>) => void;
}

function ChannelDesignTool({ onUpdate3D }: ChannelDesignToolProps) {
  const [designFlow, setDesignFlow] = useState('10.0');
  const [channelSlope, setChannelSlope] = useState('0.1');
  const [channelType, setChannelType] = useState<ChannelType>('irrigation');
  const [soilType, setSoilType] = useState<SoilType>('firm_soil');
  const [lined, setLined] = useState(false);
  const [shape, setShape] = useState<PrismaticShape>('trapezoidal');
  const [result, setResult] = useState<string | null>(null);

  const calculate = useCallback(() => {
    const Q = parseFloat(designFlow);
    const S = parseFloat(channelSlope) / 100;
    const n = lined ? 0.015 : 0.025;

    const input = {
      designFlow: Q,
      channelSlope: S,
      manningsN: n,
      channelType,
      soilType,
      lined,
    };

    const designResult = sizeChannel(input, shape);
    setResult(formatChannelDesign(designResult));

    // Update 3D viewer with design result
    if (onUpdate3D && designResult) {
      const { bottomWidth: b, depth: H, sideSlope: z, velocity: V, froudeNumber: Fr } = designResult;
      // Calculate critical depth for the design flow
      const yc = calculateCriticalDepthPrismatic(designResult.section, Q);
      const yn = H; // Normal depth is the design depth

      onUpdate3D({
        geometry: {
          shape: shape as ChannelShape,
          bottomWidth: shape === 'triangular' ? 0 : b,
          sideSlope: shape === 'rectangular' ? 0 : z,
          depth: H * 1.3, // Add freeboard
          waterDepth: H,
        },
        hydraulics: {
          flowRate: Q,
          velocity: V,
          froudeNumber: Fr,
          criticalDepth: yc,
          normalDepth: yn,
          specificEnergy: H + V ** 2 / (2 * 9.81),
          slope: S,
        },
      });
    }
  }, [designFlow, channelSlope, channelType, soilType, lined, shape, onUpdate3D]);

  const compareShapes = useCallback(() => {
    const Q = parseFloat(designFlow);
    const S = parseFloat(channelSlope) / 100;
    const n = lined ? 0.015 : 0.025;

    const comparison = compareChannelShapes(Q, S, n);
    setResult(formatSectionComparison(comparison));
  }, [designFlow, channelSlope, lined]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-gray-400 text-xs mb-1">Q (m³/s)</label>
          <input
            type="number"
            value={designFlow}
            onChange={(e) => setDesignFlow(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            step="0.5"
            min="0"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Slope (%)</label>
          <input
            type="number"
            value={channelSlope}
            onChange={(e) => setChannelSlope(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            step="0.01"
            min="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-gray-400 text-xs mb-1">Type</label>
          <select
            value={channelType}
            onChange={(e) => setChannelType(e.target.value as ChannelType)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
          >
            <option value="irrigation">Irrigation</option>
            <option value="drainage">Drainage</option>
            <option value="flood_control">Flood Control</option>
            <option value="urban">Urban</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Soil</label>
          <select
            value={soilType}
            onChange={(e) => setSoilType(e.target.value as SoilType)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
          >
            <option value="rock">Rock</option>
            <option value="stiff_clay">Stiff Clay</option>
            <option value="firm_soil">Firm Soil</option>
            <option value="loose_sandy">Loose Sandy</option>
            <option value="sandy_loam">Sandy Loam</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-gray-400 text-xs mb-1">Shape</label>
          <select
            value={shape}
            onChange={(e) => setShape(e.target.value as PrismaticShape)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
          >
            <option value="trapezoidal">Trapezoidal</option>
            <option value="rectangular">Rectangular</option>
            <option value="triangular">Triangular</option>
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={lined}
              onChange={(e) => setLined(e.target.checked)}
              className="w-4 h-4 rounded bg-gray-700 border-gray-600"
            />
            Lined
          </label>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={calculate}
          className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded py-2 text-sm font-medium transition-colors"
        >
          Design
        </button>
        <button
          onClick={compareShapes}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded py-2 text-sm font-medium transition-colors"
        >
          Compare
        </button>
      </div>

      {result && (
        <div className="bg-gray-800 rounded p-3">
          <pre className="text-green-400 text-xs whitespace-pre-wrap font-mono">{result}</pre>
        </div>
      )}
    </div>
  );
}

// ============================================
// REFERENCE VIEW
// ============================================

function ReferenceView() {
  const [refType, setRefType] = useState<'manning' | 'velocity' | 'slopes' | 'freeboard' | 'weirs'>('manning');

  return (
    <div className="space-y-3">
      {/* Reference Type Selection */}
      <div className="flex flex-wrap gap-1">
        {([
          { id: 'manning', label: 'n' },
          { id: 'velocity', label: 'V' },
          { id: 'slopes', label: 'Z' },
          { id: 'freeboard', label: 'FB' },
          { id: 'weirs', label: 'Cw' },
        ] as { id: typeof refType; label: string }[]).map((ref) => (
          <button
            key={ref.id}
            onClick={() => setRefType(ref.id)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              refType === ref.id
                ? 'bg-teal-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {ref.label}
          </button>
        ))}
      </div>

      <div className="bg-gray-800 rounded p-2 text-xs overflow-auto max-h-80">
        {refType === 'manning' && <ManningTable />}
        {refType === 'velocity' && <VelocityTable />}
        {refType === 'slopes' && <SlopesTable />}
        {refType === 'freeboard' && <FreeboardTable />}
        {refType === 'weirs' && <WeirCoeffTable />}
      </div>
    </div>
  );
}

function ManningTable() {
  const categories = [
    { name: 'Lined', materials: ['concrete_smooth', 'concrete_rough', 'shotcrete', 'asphalt', 'riprap', 'gabions'] },
    { name: 'Earth', materials: ['earth_clean', 'earth_gravel', 'earth_weedy', 'earth_stony'] },
    { name: 'Natural', materials: ['natural_clean_straight', 'natural_clean_winding', 'mountain_gravel_cobbles', 'mountain_boulders'] },
  ];

  return (
    <div className="space-y-3">
      <h4 className="text-teal-400 font-medium text-sm">Manning's n Values</h4>
      {categories.map((cat) => (
        <div key={cat.name}>
          <h5 className="text-gray-400 text-xs mb-1">{cat.name}</h5>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-gray-500">
                <th className="py-0.5">Material</th>
                <th className="py-0.5 text-center">Min</th>
                <th className="py-0.5 text-center">Typ</th>
                <th className="py-0.5 text-center">Max</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {cat.materials.map((mat) => {
                const values = MANNING_N_CHANNELS[mat as ChannelMaterial];
                if (!values) return null;
                return (
                  <tr key={mat} className="border-t border-gray-700/50">
                    <td className="py-0.5">{mat.replace(/_/g, ' ')}</td>
                    <td className="py-0.5 text-center text-gray-500">{values.min.toFixed(3)}</td>
                    <td className="py-0.5 text-center text-teal-400">{values.typical.toFixed(3)}</td>
                    <td className="py-0.5 text-center text-gray-500">{values.max.toFixed(3)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function VelocityTable() {
  const soilTypes = [
    { name: 'Fine Sand', key: 'fine_sand' },
    { name: 'Sandy Loam', key: 'sandy_loam' },
    { name: 'Firm Loam', key: 'firm_loam' },
    { name: 'Stiff Clay', key: 'stiff_clay' },
    { name: 'Gravel', key: 'gravel' },
    { name: 'Cobbles/Gravel', key: 'cobbles_gravel' },
    { name: 'Concrete', key: 'concrete' },
    { name: 'Riprap 150mm', key: 'riprap_150mm' },
    { name: 'Riprap 300mm', key: 'riprap_300mm' },
    { name: 'Gabions', key: 'gabions' },
    { name: 'Grass (good)', key: 'grass_good' },
  ];

  return (
    <div>
      <h4 className="text-teal-400 font-medium text-sm mb-2">Permissible Velocities (m/s)</h4>
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="text-gray-500">
            <th className="py-0.5">Material</th>
            <th className="py-0.5 text-center">Vmax</th>
          </tr>
        </thead>
        <tbody className="text-gray-300">
          {soilTypes.map((soil) => (
            <tr key={soil.key} className="border-t border-gray-700/50">
              <td className="py-0.5">{soil.name}</td>
              <td className="py-0.5 text-center text-teal-400">
                {PERMISSIBLE_VELOCITY[soil.key]?.toFixed(2) ?? '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SlopesTable() {
  const soilTypes = [
    'rock_solid', 'rock_fissured', 'stiff_clay_concrete_lined',
    'stiff_clay_earth', 'firm_soil', 'loose_sandy', 'sandy_loam'
  ];

  return (
    <div>
      <h4 className="text-teal-400 font-medium text-sm mb-2">Side Slopes Z (H:V)</h4>
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="text-gray-500">
            <th className="py-0.5">Soil</th>
            <th className="py-0.5 text-center">Min</th>
            <th className="py-0.5 text-center">Rec</th>
            <th className="py-0.5 text-center">Max</th>
          </tr>
        </thead>
        <tbody className="text-gray-300">
          {soilTypes.map((soil) => {
            const values = SIDE_SLOPES[soil];
            if (!values) return null;
            return (
              <tr key={soil} className="border-t border-gray-700/50">
                <td className="py-0.5">{soil.replace(/_/g, ' ')}</td>
                <td className="py-0.5 text-center text-gray-500">{values.min.toFixed(2)}</td>
                <td className="py-0.5 text-center text-teal-400">{values.recommended.toFixed(2)}</td>
                <td className="py-0.5 text-center text-gray-500">{values.max.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FreeboardTable() {
  const channelTypes = Object.keys(FREEBOARD_REQUIREMENTS);

  return (
    <div>
      <h4 className="text-teal-400 font-medium text-sm mb-2">Freeboard (m)</h4>
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="text-gray-500">
            <th className="py-0.5">Type</th>
            <th className="py-0.5 text-center">Min</th>
            <th className="py-0.5 text-center">Typ</th>
          </tr>
        </thead>
        <tbody className="text-gray-300">
          {channelTypes.map((type) => {
            const values = FREEBOARD_REQUIREMENTS[type];
            return (
              <tr key={type} className="border-t border-gray-700/50">
                <td className="py-0.5">{type.replace(/_/g, ' ')}</td>
                <td className="py-0.5 text-center text-gray-500">{values.min.toFixed(2)}</td>
                <td className="py-0.5 text-center text-teal-400">{values.typical.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function WeirCoeffTable() {
  const weirTypes = Object.keys(WEIR_COEFFICIENTS) as WeirType[];

  return (
    <div>
      <h4 className="text-teal-400 font-medium text-sm mb-1">Weir Coefficients Cw</h4>
      <p className="text-gray-500 text-xs mb-2">Q = Cw × L × H^1.5</p>
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="text-gray-500">
            <th className="py-0.5">Type</th>
            <th className="py-0.5 text-center">Min</th>
            <th className="py-0.5 text-center">Typ</th>
            <th className="py-0.5 text-center">Max</th>
          </tr>
        </thead>
        <tbody className="text-gray-300">
          {weirTypes.map((type) => {
            const values = WEIR_COEFFICIENTS[type];
            return (
              <tr key={type} className="border-t border-gray-700/50">
                <td className="py-0.5">{type.replace(/_/g, ' ')}</td>
                <td className="py-0.5 text-center text-gray-500">{values.min.toFixed(2)}</td>
                <td className="py-0.5 text-center text-teal-400">{values.typical.toFixed(2)}</td>
                <td className="py-0.5 text-center text-gray-500">{values.max.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// CHANNEL DESIGN MANAGER VIEW
// ============================================

interface ChannelDesignManagerViewProps {
  projectId?: string;
  designs: ChannelDesign[];
  activeDesign: ChannelDesign | null;
  onSelectDesign: (design: ChannelDesign | null) => void;
  onCreateDesign: (name: string) => void;
  onSaveDesign: () => void;
  isLoading: boolean;
  isSaving: boolean;
}

function ChannelDesignManagerView({
  projectId,
  designs,
  activeDesign,
  onSelectDesign,
  onCreateDesign,
  onSaveDesign,
  isLoading,
  isSaving,
}: ChannelDesignManagerViewProps) {
  const [newDesignName, setNewDesignName] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);

  const handleCreate = () => {
    if (newDesignName.trim()) {
      onCreateDesign(newDesignName.trim());
      setNewDesignName('');
      setShowNewForm(false);
    }
  };

  if (!projectId) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-sm mb-2">No project selected</div>
        <p className="text-gray-500 text-xs">
          Open a project to save and load channel designs
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-white font-medium text-sm">Channel Designs</h4>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="text-teal-400 hover:text-teal-300 text-xs"
        >
          {showNewForm ? 'Cancel' : '+ New'}
        </button>
      </div>

      {/* New Design Form */}
      {showNewForm && (
        <div className="bg-gray-800 rounded p-3 space-y-2">
          <input
            type="text"
            value={newDesignName}
            onChange={(e) => setNewDesignName(e.target.value)}
            placeholder="Design name..."
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button
            onClick={handleCreate}
            disabled={!newDesignName.trim()}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 text-white rounded py-1 text-sm"
          >
            Create Design
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-4">
          <div className="text-gray-400 text-sm">Loading designs...</div>
        </div>
      )}

      {/* Designs List */}
      {!isLoading && designs.length === 0 && (
        <div className="text-center py-4">
          <div className="text-gray-400 text-sm">No designs yet</div>
          <p className="text-gray-500 text-xs mt-1">
            Create a new design to get started
          </p>
        </div>
      )}

      {!isLoading && designs.length > 0 && (
        <div className="space-y-2">
          {designs.map((design) => (
            <button
              key={design.id}
              onClick={() => onSelectDesign(design)}
              className={`w-full text-left p-2 rounded border transition-colors ${
                activeDesign?.id === design.id
                  ? 'bg-teal-600/20 border-teal-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
              }`}
            >
              <div className="font-medium text-sm">{design.name}</div>
              <div className="text-xs text-gray-500 mt-1">
                {design.channels?.length || 0} channels | {design.structures?.length || 0} structures
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Active Design Stats */}
      {activeDesign && (
        <div className="bg-gray-800 rounded p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs">Active:</span>
            <span className="text-white text-sm font-medium">{activeDesign.name}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-700 rounded p-2">
              <div className="text-gray-400">Channels</div>
              <div className="text-white font-medium">{activeDesign.channels?.length || 0}</div>
            </div>
            <div className="bg-gray-700 rounded p-2">
              <div className="text-gray-400">Structures</div>
              <div className="text-white font-medium">{activeDesign.structures?.length || 0}</div>
            </div>
          </div>
          <button
            onClick={onSaveDesign}
            disabled={isSaving}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 text-white rounded py-2 text-sm font-medium"
          >
            {isSaving ? 'Saving...' : 'Save Design'}
          </button>
        </div>
      )}

      {/* DOH Reference */}
      <div className="text-gray-500 text-xs text-center pt-2 border-t border-gray-700">
        Compliant with DOH Manual de Carreteras
      </div>
    </div>
  );
}
