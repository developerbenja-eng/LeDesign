'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDisciplineStore } from '@/stores/discipline-store';
import type { StormwaterDesign } from '@/types/disciplines';
import {
  // Regional data
  SOIL_TYPES,
  RUNOFF_COEFFICIENTS,
  SUDS_TECHNIQUES,
  type SoilGroup,

  // Rational Method
  calculateRationalMethod,
  createMixedCatchment,
  formatDischarge,
  getRecommendedPipeDiameter,

  // Infiltration Trench
  designInfiltrationTrench,
  checkInfiltrationSuitability,
  formatTrenchDesign,

  // Detention Pond
  designPond,
  calculateDevelopmentPeaks,
  formatPondDesign,

  // SUDS Selection
  selectSUDS,
  quickSUDSSelection,
  formatSUDSSelection,
} from '@/lib/stormwater';

interface StormwaterPanelProps {
  projectId?: string;
  latitude: number;
  longitude: number;
  projectName?: string;
  onClose?: () => void;
}

type ToolMode = 'network' | 'rational' | 'trench' | 'pond' | 'suds' | 'reference';

export function StormwaterPanel({
  projectId,
  latitude,
  longitude,
  projectName,
  onClose,
}: StormwaterPanelProps) {
  const [toolMode, setToolMode] = useState<ToolMode>('network');

  // Discipline store
  const {
    stormwaterDesigns,
    activeStormwaterDesign,
    setActiveStormwaterDesign,
    loadDesigns,
    createDesign,
    saveActiveDesign,
    isLoading,
    isSaving,
  } = useDisciplineStore();

  // Load designs on mount
  useEffect(() => {
    if (projectId) {
      loadDesigns(projectId, 'stormwater');
    }
  }, [projectId, loadDesigns]);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 shadow-xl w-[480px] max-h-[700px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-white">Stormwater Design</h2>
          <p className="text-xs text-gray-400">
            {projectName || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}
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
          { id: 'rational', label: 'Rational' },
          { id: 'trench', label: 'Trench' },
          { id: 'pond', label: 'Pond' },
          { id: 'suds', label: 'SUDS' },
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
        {toolMode === 'network' && (
          <StormwaterDesignManagerView
            projectId={projectId}
            designs={stormwaterDesigns}
            activeDesign={activeStormwaterDesign}
            onSelectDesign={setActiveStormwaterDesign}
            onCreateDesign={(name) => projectId && createDesign('stormwater', { name })}
            onSaveDesign={() => saveActiveDesign('stormwater')}
            isLoading={isLoading}
            isSaving={isSaving}
          />
        )}
        {toolMode === 'rational' && (
          <RationalMethodTool latitude={latitude} longitude={longitude} />
        )}
        {toolMode === 'trench' && (
          <InfiltrationTrenchTool />
        )}
        {toolMode === 'pond' && (
          <DetentionPondTool />
        )}
        {toolMode === 'suds' && (
          <SUDSSelectionTool />
        )}
        {toolMode === 'reference' && (
          <ReferenceDataView />
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-700 text-xs text-gray-500 text-center">
        Based on MINVU/MOP Chilean Standards
      </div>
    </div>
  );
}

// ============================================
// RATIONAL METHOD TOOL
// ============================================

function RationalMethodTool({ latitude, longitude }: { latitude: number; longitude: number }) {
  const [area, setArea] = useState('1.0');
  const [surfaceType, setSurfaceType] = useState('residencial_denso');
  const [returnPeriod, setReturnPeriod] = useState('10');
  const [result, setResult] = useState<string | null>(null);

  const calculate = useCallback(() => {
    const catchment = createMixedCatchment(
      [{ type: surfaceType, area: parseFloat(area) }],
      'Design Catchment'
    );

    const calcResult = calculateRationalMethod({
      catchment,
      returnPeriod: parseInt(returnPeriod) as 2 | 5 | 10 | 25 | 50 | 100,
      latitude,
      longitude,
    });

    const pipeRec = getRecommendedPipeDiameter(calcResult.peakDischargeLps);

    const lines = [
      `Área: ${calcResult.catchmentArea.toFixed(2)} ha`,
      `Coef. C: ${calcResult.weightedC.toFixed(2)}`,
      `Intensidad: ${calcResult.intensity.toFixed(1)} mm/hr`,
      `Duración: ${calcResult.duration} min`,
      `Estación: ${calcResult.station}`,
      '',
      `CAUDAL PUNTA: ${formatDischarge(calcResult.peakDischargeLps)}`,
      `Volumen: ${calcResult.runoffVolume.toFixed(1)} m³`,
      '',
      `Tubo recomendado: Ø${pipeRec.diameter}mm`,
      `Velocidad: ${pipeRec.velocity.toFixed(2)} m/s ${pipeRec.velocityCheck ? '✓' : '⚠'}`,
    ];

    if (calcResult.warnings.length > 0) {
      lines.push('', '--- Advertencias ---');
      calcResult.warnings.forEach(w => lines.push(`⚠ ${w}`));
    }

    setResult(lines.join('\n'));
  }, [area, surfaceType, returnPeriod, latitude, longitude]);

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-300 mb-2">
        Método Racional: Q = C × i × A
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400">Área (ha)</label>
          <input
            type="number"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            step="0.1"
            min="0.01"
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">Periodo Retorno</label>
          <select
            value={returnPeriod}
            onChange={(e) => setReturnPeriod(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
          >
            <option value="2">2 años</option>
            <option value="5">5 años</option>
            <option value="10">10 años</option>
            <option value="25">25 años</option>
            <option value="50">50 años</option>
            <option value="100">100 años</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-400">Tipo de Superficie</label>
        <select
          value={surfaceType}
          onChange={(e) => setSurfaceType(e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
        >
          {RUNOFF_COEFFICIENTS.map((rc) => (
            <option key={rc.id} value={rc.id}>
              {rc.description} (C={rc.cTypical})
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={calculate}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm font-medium"
      >
        Calcular
      </button>

      {result && (
        <pre className="bg-gray-800 rounded-lg p-3 text-xs text-gray-300 whitespace-pre-wrap overflow-x-auto">
          {result}
        </pre>
      )}
    </div>
  );
}

// ============================================
// INFILTRATION TRENCH TOOL
// ============================================

function InfiltrationTrenchTool() {
  const [area, setArea] = useState('500');
  const [runoffC, setRunoffC] = useState('0.7');
  const [intensity, setIntensity] = useState('50');
  const [duration, setDuration] = useState('30');
  const [soilGroup, setSoilGroup] = useState<SoilGroup>('B');
  const [result, setResult] = useState<string | null>(null);

  const calculate = useCallback(() => {
    // First check suitability
    const suitability = checkInfiltrationSuitability(soilGroup, 3);

    const design = designInfiltrationTrench({
      contributingArea: parseFloat(area),
      runoffCoefficient: parseFloat(runoffC),
      rainfallIntensity: parseFloat(intensity),
      stormDuration: parseFloat(duration),
      returnPeriod: 10,
      soilType: soilGroup,
    });

    let output = formatTrenchDesign(design);

    // Add suitability check
    output = `=== APTITUD DEL SITIO ===\nPuntaje: ${suitability.score}/100\n` +
      suitability.factors.map(f => `${f.factor}: ${f.status} - ${f.note}`).join('\n') +
      '\n\n' + output;

    setResult(output);
  }, [area, runoffC, intensity, duration, soilGroup]);

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-300 mb-2">
        Diseño de Zanja de Infiltración
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400">Área aportante (m²)</label>
          <input
            type="number"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">Coef. C</label>
          <input
            type="number"
            value={runoffC}
            onChange={(e) => setRunoffC(e.target.value)}
            step="0.05"
            min="0.1"
            max="0.95"
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">Intensidad (mm/hr)</label>
          <input
            type="number"
            value={intensity}
            onChange={(e) => setIntensity(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">Duración (min)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-400">Grupo de Suelo</label>
        <select
          value={soilGroup}
          onChange={(e) => setSoilGroup(e.target.value as SoilGroup)}
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
        >
          {SOIL_TYPES.map((soil) => (
            <option key={soil.id} value={soil.group}>
              Grupo {soil.group} - {soil.name} ({soil.infiltrationRate.typical} mm/hr)
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={calculate}
        className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded text-sm font-medium"
      >
        Diseñar Zanja
      </button>

      {result && (
        <pre className="bg-gray-800 rounded-lg p-3 text-xs text-gray-300 whitespace-pre-wrap overflow-x-auto max-h-80 overflow-y-auto">
          {result}
        </pre>
      )}
    </div>
  );
}

// ============================================
// DETENTION POND TOOL
// ============================================

function DetentionPondTool() {
  const [area, setArea] = useState('2.0');
  const [preC, setPreC] = useState('0.3');
  const [postC, setPostC] = useState('0.7');
  const [intensity, setIntensity] = useState('45');
  const [duration, setDuration] = useState('60');
  const [pondType, setPondType] = useState<'detention' | 'retention'>('detention');
  const [result, setResult] = useState<string | null>(null);

  const calculate = useCallback(() => {
    // Quick peak comparison
    const peaks = calculateDevelopmentPeaks(
      parseFloat(area),
      parseFloat(preC),
      parseFloat(postC),
      parseFloat(intensity)
    );

    const design = designPond({
      catchmentAreaHa: parseFloat(area),
      preDevelopmentC: parseFloat(preC),
      postDevelopmentC: parseFloat(postC),
      returnPeriod: 10,
      rainfallIntensity: parseFloat(intensity),
      stormDuration: parseFloat(duration),
      pondType,
    });

    let output = `=== COMPARACIÓN PRE/POST DESARROLLO ===\n`;
    output += `Caudal pre-desarrollo: ${peaks.prePeak} L/s\n`;
    output += `Caudal post-desarrollo: ${peaks.postPeak} L/s\n`;
    output += `Aumento: ${peaks.increase}%\n`;
    output += `Almacenamiento necesario (est.): ${peaks.storageNeeded} m³\n\n`;
    output += formatPondDesign(design);

    setResult(output);
  }, [area, preC, postC, intensity, duration, pondType]);

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-300 mb-2">
        Dimensionamiento de Estanque
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400">Área cuenca (ha)</label>
          <input
            type="number"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            step="0.1"
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">Tipo</label>
          <select
            value={pondType}
            onChange={(e) => setPondType(e.target.value as 'detention' | 'retention')}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
          >
            <option value="detention">Detención</option>
            <option value="retention">Retención</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400">C pre-desarrollo</label>
          <input
            type="number"
            value={preC}
            onChange={(e) => setPreC(e.target.value)}
            step="0.05"
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">C post-desarrollo</label>
          <input
            type="number"
            value={postC}
            onChange={(e) => setPostC(e.target.value)}
            step="0.05"
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">Intensidad (mm/hr)</label>
          <input
            type="number"
            value={intensity}
            onChange={(e) => setIntensity(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">Duración (min)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
          />
        </div>
      </div>

      <button
        onClick={calculate}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded text-sm font-medium"
      >
        Diseñar Estanque
      </button>

      {result && (
        <pre className="bg-gray-800 rounded-lg p-3 text-xs text-gray-300 whitespace-pre-wrap overflow-x-auto max-h-80 overflow-y-auto">
          {result}
        </pre>
      )}
    </div>
  );
}

// ============================================
// SUDS SELECTION TOOL
// ============================================

function SUDSSelectionTool() {
  const [soilGroup, setSoilGroup] = useState<SoilGroup>('B');
  const [area, setArea] = useState('200');
  const [slope, setSlope] = useState('3');
  const [mainGoal, setMainGoal] = useState<'infiltrate' | 'detain' | 'treat' | 'multi-benefit'>('multi-benefit');
  const [result, setResult] = useState<string | null>(null);

  const analyze = useCallback(() => {
    // Quick selection
    const quick = quickSUDSSelection(soilGroup, parseFloat(area), mainGoal);

    // Full analysis
    const full = selectSUDS(
      {
        soilGroup,
        slopePercent: parseFloat(slope),
        availableAreaM2: parseFloat(area),
        landUse: 'residential',
        climateZone: 'sur',
      },
      {
        peakReduction: mainGoal === 'detain' ? 5 : 3,
        volumeReduction: mainGoal === 'infiltrate' ? 5 : 3,
        waterQuality: mainGoal === 'treat' ? 5 : 2,
        groundwaterRecharge: mainGoal === 'infiltrate' ? 4 : 2,
        amenityValue: mainGoal === 'multi-benefit' ? 4 : 2,
      },
      {
        budgetPriority: 'medium',
        maintenanceCapacity: 'moderate',
      },
      parseFloat(area) * 0.03 // assume 30mm storage needed
    );

    let output = `=== SELECCIÓN RÁPIDA ===\n`;
    output += `Recomendado: ${quick.recommended}\n`;
    output += `Alternativas: ${quick.alternatives.join(', ')}\n`;
    if (quick.notes.length > 0) {
      output += `Notas: ${quick.notes.join('; ')}\n`;
    }
    output += '\n' + formatSUDSSelection(full);

    setResult(output);
  }, [soilGroup, area, slope, mainGoal]);

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-300 mb-2">
        Selección de Sistemas SUDS
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400">Grupo de Suelo</label>
          <select
            value={soilGroup}
            onChange={(e) => setSoilGroup(e.target.value as SoilGroup)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
          >
            <option value="A">A - Alta infiltración</option>
            <option value="B">B - Moderada</option>
            <option value="C">C - Baja</option>
            <option value="D">D - Muy baja</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400">Área disponible (m²)</label>
          <input
            type="number"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">Pendiente (%)</label>
          <input
            type="number"
            value={slope}
            onChange={(e) => setSlope(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">Objetivo Principal</label>
          <select
            value={mainGoal}
            onChange={(e) => setMainGoal(e.target.value as typeof mainGoal)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
          >
            <option value="infiltrate">Infiltrar</option>
            <option value="detain">Detener</option>
            <option value="treat">Tratar</option>
            <option value="multi-benefit">Multi-beneficio</option>
          </select>
        </div>
      </div>

      <button
        onClick={analyze}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 rounded text-sm font-medium"
      >
        Analizar Opciones
      </button>

      {result && (
        <pre className="bg-gray-800 rounded-lg p-3 text-xs text-gray-300 whitespace-pre-wrap overflow-x-auto max-h-80 overflow-y-auto">
          {result}
        </pre>
      )}
    </div>
  );
}

// ============================================
// REFERENCE DATA VIEW
// ============================================

function ReferenceDataView() {
  const [tab, setTab] = useState<'soils' | 'coefficients' | 'suds'>('soils');

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setTab('soils')}
          className={`px-3 py-1 text-xs rounded ${
            tab === 'soils' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
          }`}
        >
          Suelos
        </button>
        <button
          onClick={() => setTab('coefficients')}
          className={`px-3 py-1 text-xs rounded ${
            tab === 'coefficients' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
          }`}
        >
          Coef. C
        </button>
        <button
          onClick={() => setTab('suds')}
          className={`px-3 py-1 text-xs rounded ${
            tab === 'suds' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
          }`}
        >
          SUDS
        </button>
      </div>

      {tab === 'soils' && (
        <div className="space-y-2">
          {SOIL_TYPES.map((soil) => (
            <div key={soil.id} className="bg-gray-800 rounded p-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-white">
                  Grupo {soil.group}: {soil.name}
                </span>
                <span className="text-xs text-blue-400">
                  {soil.infiltrationRate.typical} mm/hr
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{soil.description}</p>
              <div className="text-xs text-gray-500 mt-1">
                Rango: {soil.infiltrationRate.min}-{soil.infiltrationRate.max} mm/hr
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'coefficients' && (
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {RUNOFF_COEFFICIENTS.map((rc) => (
            <div key={rc.id} className="bg-gray-800 rounded px-2 py-1.5 flex justify-between items-center">
              <span className="text-xs text-gray-300">{rc.description}</span>
              <div className="text-xs">
                <span className="text-gray-500">{rc.cMin}-</span>
                <span className="text-blue-400 font-medium">{rc.cTypical}</span>
                <span className="text-gray-500">-{rc.cMax}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'suds' && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {SUDS_TECHNIQUES.map((tech) => (
            <div key={tech.id} className="bg-gray-800 rounded p-2">
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-white">{tech.name}</span>
                <span className="text-xs px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">
                  {tech.category}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{tech.description}</p>
              <div className="text-xs text-gray-500 mt-1">
                Suelos: {tech.suitableSoils.join(', ')} | Max pendiente: {tech.maxSlope}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// STORMWATER DESIGN MANAGER VIEW
// ============================================

interface StormwaterDesignManagerViewProps {
  projectId?: string;
  designs: StormwaterDesign[];
  activeDesign: StormwaterDesign | null;
  onSelectDesign: (design: StormwaterDesign | null) => void;
  onCreateDesign: (name: string) => void;
  onSaveDesign: () => void;
  isLoading: boolean;
  isSaving: boolean;
}

function StormwaterDesignManagerView({
  projectId,
  designs,
  activeDesign,
  onSelectDesign,
  onCreateDesign,
  onSaveDesign,
  isLoading,
  isSaving,
}: StormwaterDesignManagerViewProps) {
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
          Guarda el proyecto para habilitar el guardado de diseños de aguas lluvias.
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
        <h4 className="text-white font-medium text-sm">Diseños de Aguas Lluvias</h4>
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
                  ? 'bg-blue-900/30 border-blue-600'
                  : 'bg-gray-800 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-medium">{design.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  design.status === 'final' ? 'bg-blue-600 text-white' :
                  design.status === 'review' ? 'bg-yellow-600 text-white' :
                  'bg-gray-600 text-gray-300'
                }`}>
                  {design.status}
                </span>
              </div>
              <div className="text-gray-400 text-xs mt-1">
                {design.catchments.length} cuencas · {design.outlets.length} descargas · {design.storageUnits.length} almacenamientos
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
              Periodo retorno: <span className="text-blue-400">{activeDesign.returnPeriod} años</span>
            </div>
            <div className="text-gray-400">
              Área total: <span className="text-white">
                {activeDesign.catchments.reduce((sum, c) => sum + c.area, 0).toFixed(2)} ha
              </span>
            </div>
            <div className="text-gray-400">
              Método: <span className="text-white">{activeDesign.calculationMethod}</span>
            </div>
            <div className="text-gray-400">
              Escenario: <span className="text-white">{activeDesign.climateScenario}</span>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={onSaveDesign}
            disabled={isSaving}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
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
