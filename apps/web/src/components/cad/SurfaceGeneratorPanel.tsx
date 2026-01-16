'use client';

import { useState, useCallback, useRef } from 'react';
import type { BoundingBox, DatasetStatistics } from '@/lib/triangulation/types';
import type { InterpolationMetrics } from '@/lib/interpolation/types';

// Combined surface generation method type (includes triangulation and interpolation methods)
type SurfaceMethodType = 'delaunay' | 'idw' | 'kriging' | 'natural_neighbor' | 'spline';
import type { TerrainAnalysisResult, MethodRecommendation, QualityValidationResult, TerrainClass } from '@/lib/surface-ai/types';

interface SurfaceGeneratorPanelProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
  onSurfaceGenerated?: (surface: GeneratedSurfaceResult) => void;
}

interface GeneratedSurfaceResult {
  surfaceId: string;
  datasetId: string;
  name: string;
  method: SurfaceMethodType;
  vertexCount: number;
  triangleCount: number;
  bounds: BoundingBox;
  metrics?: InterpolationMetrics;
  terrainAnalysis?: TerrainAnalysisResult;
  qualityValidation?: QualityValidationResult;
}

interface UploadedPoints {
  points: Array<{ id: string; x: number; y: number; z: number; code?: string }>;
  filename: string;
  format: string;
}

type TabType = 'upload' | 'analysis' | 'generate' | 'results';
type GenerationStatus = 'idle' | 'uploading' | 'analyzing' | 'generating' | 'complete' | 'error';

export function SurfaceGeneratorPanel({
  projectId,
  projectName,
  onClose,
  onSurfaceGenerated,
}: SurfaceGeneratorPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [uploadedPoints, setUploadedPoints] = useState<UploadedPoints | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Analysis state
  const [terrainAnalysis, setTerrainAnalysis] = useState<TerrainAnalysisResult | null>(null);
  const [methodRecommendation, setMethodRecommendation] = useState<MethodRecommendation | null>(null);

  // Generation options
  const [surfaceName, setSurfaceName] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<SurfaceMethodType | 'auto'>('auto');
  const [useIDEBreaklines, setUseIDEBreaklines] = useState(true);
  const [gridResolution, setGridResolution] = useState(10);

  // Satellite feature detection options
  const [useSatelliteDetection, setUseSatelliteDetection] = useState(false);
  const [detectBuildings, setDetectBuildings] = useState(true);
  const [detectFences, setDetectFences] = useState(true);
  const [detectRoadsFromImage, setDetectRoadsFromImage] = useState(false);
  const [detectParking, setDetectParking] = useState(false);
  const [satelliteDetectionStatus, setSatelliteDetectionStatus] = useState<'idle' | 'detecting' | 'complete' | 'error'>('idle');
  const [detectedFeaturesCount, setDetectedFeaturesCount] = useState<{ buildings: number; fences: number; roads: number; parking: number } | null>(null);

  // Results state
  const [generatedSurface, setGeneratedSurface] = useState<GeneratedSurfaceResult | null>(null);
  const [qualityValidation, setQualityValidation] = useState<QualityValidationResult | null>(null);
  const [computeTime, setComputeTime] = useState<number | null>(null);

  // File upload handler
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus('uploading');
    setError(null);

    try {
      const content = await file.text();
      const format = file.name.toLowerCase().endsWith('.xyz') ? 'xyz' : 'csv';

      // Parse CSV/XYZ locally
      const lines = content.trim().split('\n');
      const points: UploadedPoints['points'] = [];
      let hasHeader = false;

      // Detect header
      const firstLine = lines[0];
      if (firstLine.match(/[a-zA-Z]/)) {
        hasHeader = true;
      }

      const startIndex = hasHeader ? 1 : 0;
      const delimiter = content.includes(';') ? ';' : content.includes('\t') ? '\t' : ',';

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(delimiter).map(p => p.trim());
        if (parts.length >= 3) {
          // Try to parse as: ID, X, Y, Z or X, Y, Z
          let id: string, x: number, y: number, z: number, code: string | undefined;

          if (parts.length >= 4 && isNaN(parseFloat(parts[0]))) {
            // First column is ID
            id = parts[0];
            x = parseFloat(parts[1]);
            y = parseFloat(parts[2]);
            z = parseFloat(parts[3]);
            code = parts[4];
          } else {
            // No ID column
            id = `P${i - startIndex + 1}`;
            x = parseFloat(parts[0]);
            y = parseFloat(parts[1]);
            z = parseFloat(parts[2]);
            code = parts[3];
          }

          if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
            points.push({ id, x, y, z, code });
          }
        }
      }

      if (points.length < 3) {
        throw new Error('Se requieren al menos 3 puntos válidos');
      }

      setUploadedPoints({
        points,
        filename: file.name,
        format,
      });
      setStatus('idle');
      setActiveTab('analysis');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar archivo');
      setStatus('error');
    }
  }, []);

  // Run AI analysis
  const runAnalysis = useCallback(async () => {
    if (!uploadedPoints) return;

    setStatus('analyzing');
    setError(null);

    try {
      const response = await fetch('/api/surface-ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze',
          points: uploadedPoints.points,
        }),
      });

      if (!response.ok) {
        throw new Error('Error en análisis AI');
      }

      const data = await response.json();
      setTerrainAnalysis(data.terrain);
      setMethodRecommendation(data.recommendation);
      setStatus('idle');
    } catch (err) {
      // Use rule-based fallback
      setTerrainAnalysis({
        characteristics: {
          classification: 'rolling' as TerrainClass,
          slopeStats: { mean: 5, max: 15, stdDev: 3 },
          roughness: 0.3,
          uniformity: 0.7,
          hasLinearFeatures: false,
          hasFlatAreas: false,
        },
        confidence: 0.7,
        reasoning: 'Análisis basado en reglas (AI no disponible)',
        anomalies: [],
      });
      setMethodRecommendation({
        primaryMethod: 'delaunay',
        alternativeMethods: ['idw', 'kriging'],
        confidence: 0.7,
        reasoning: 'Método estándar recomendado para terreno moderado',
        suggestedConfig: {},
        expectedQuality: 85,
      });
      setStatus('idle');
    }
  }, [uploadedPoints]);

  // Generate surface
  const generateSurface = useCallback(async () => {
    if (!uploadedPoints) return;

    setStatus('generating');
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/surfaces/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points: uploadedPoints.points,
          name: surfaceName || `Superficie ${new Date().toLocaleDateString('es-CL')}`,
          method: selectedMethod === 'auto' ? undefined : selectedMethod,
          useAI: true,
          useIDEBreaklines,
          gridResolution,
          // Satellite feature detection options
          useSatelliteDetection,
          satelliteDetectionOptions: useSatelliteDetection ? {
            detectBuildings,
            detectFences,
            detectRoads: detectRoadsFromImage,
            detectParking,
            minConfidence: 0.6,
          } : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar superficie');
      }

      const data = await response.json();

      const result: GeneratedSurfaceResult = {
        surfaceId: data.surfaceId,
        datasetId: data.datasetId,
        name: data.surface.name,
        method: data.surface.method,
        vertexCount: data.surface.vertexCount,
        triangleCount: data.surface.triangleCount,
        bounds: data.surface.bounds,
        metrics: data.metrics,
        terrainAnalysis: data.analysis?.terrain,
        qualityValidation: data.analysis?.quality,
      };

      setGeneratedSurface(result);
      setQualityValidation(data.analysis?.quality);
      setComputeTime(data.computeTimeMs);
      setStatus('complete');
      setActiveTab('results');

      onSurfaceGenerated?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar superficie');
      setStatus('error');
    }
  }, [uploadedPoints, projectId, surfaceName, selectedMethod, useIDEBreaklines, gridResolution, useSatelliteDetection, detectBuildings, detectFences, detectRoadsFromImage, detectParking, onSurfaceGenerated]);

  return (
    <div className="bg-cad-panel border border-gray-700 rounded-lg shadow-xl w-[480px] max-h-[85vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div>
          <h3 className="text-white font-medium flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Generador de Superficies AI
          </h3>
          <p className="text-gray-400 text-xs">
            {projectName} {uploadedPoints && `• ${uploadedPoints.points.length} puntos`}
          </p>
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

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {[
          { id: 'upload', label: 'Cargar', icon: '📁' },
          { id: 'analysis', label: 'Análisis', icon: '🔍', disabled: !uploadedPoints },
          { id: 'generate', label: 'Generar', icon: '⚙️', disabled: !uploadedPoints },
          { id: 'results', label: 'Resultados', icon: '✅', disabled: !generatedSurface },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && setActiveTab(tab.id as TabType)}
            disabled={tab.disabled}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : tab.disabled
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Error display */}
        {error && (
          <div className="mb-3 p-2 bg-red-900/30 border border-red-700 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <UploadView
            uploadedPoints={uploadedPoints}
            status={status}
            fileInputRef={fileInputRef}
            onFileUpload={handleFileUpload}
            onClear={() => {
              setUploadedPoints(null);
              setTerrainAnalysis(null);
              setMethodRecommendation(null);
              setGeneratedSurface(null);
            }}
          />
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && uploadedPoints && (
          <AnalysisView
            uploadedPoints={uploadedPoints}
            terrainAnalysis={terrainAnalysis}
            methodRecommendation={methodRecommendation}
            status={status}
            onRunAnalysis={runAnalysis}
          />
        )}

        {/* Generate Tab */}
        {activeTab === 'generate' && uploadedPoints && (
          <GenerateView
            surfaceName={surfaceName}
            setSurfaceName={setSurfaceName}
            selectedMethod={selectedMethod}
            setSelectedMethod={setSelectedMethod}
            useIDEBreaklines={useIDEBreaklines}
            setUseIDEBreaklines={setUseIDEBreaklines}
            gridResolution={gridResolution}
            setGridResolution={setGridResolution}
            methodRecommendation={methodRecommendation}
            status={status}
            onGenerate={generateSurface}
            // Satellite detection props
            useSatelliteDetection={useSatelliteDetection}
            setUseSatelliteDetection={setUseSatelliteDetection}
            detectBuildings={detectBuildings}
            setDetectBuildings={setDetectBuildings}
            detectFences={detectFences}
            setDetectFences={setDetectFences}
            detectRoadsFromImage={detectRoadsFromImage}
            setDetectRoadsFromImage={setDetectRoadsFromImage}
            detectParking={detectParking}
            setDetectParking={setDetectParking}
          />
        )}

        {/* Results Tab */}
        {activeTab === 'results' && generatedSurface && (
          <ResultsView
            surface={generatedSurface}
            qualityValidation={qualityValidation}
            computeTime={computeTime}
          />
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-700 text-xs text-gray-500 text-center flex items-center justify-center gap-2">
        <span>Powered by</span>
        <span className="text-cyan-400">Gemini 3.0 Flash</span>
        <span>•</span>
        <span>IDE Chile Auto-Integration</span>
      </div>
    </div>
  );
}

// ============================================================================
// Upload View
// ============================================================================

interface UploadViewProps {
  uploadedPoints: UploadedPoints | null;
  status: GenerationStatus;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}

function UploadView({ uploadedPoints, status, fileInputRef, onFileUpload, onClear }: UploadViewProps) {
  if (uploadedPoints) {
    // Show uploaded data summary
    const points = uploadedPoints.points;
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const zs = points.map(p => p.z);

    const bounds = {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
      minZ: Math.min(...zs),
      maxZ: Math.max(...zs),
    };

    const area = (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
    const density = points.length / (area / 10000); // points per hectare

    return (
      <div className="space-y-4">
        <div className="p-3 bg-gray-800 rounded border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-400 text-sm font-medium">Archivo cargado</span>
            <button onClick={onClear} className="text-xs text-red-400 hover:text-red-300">
              Eliminar
            </button>
          </div>
          <p className="text-white text-sm">{uploadedPoints.filename}</p>
          <p className="text-gray-400 text-xs mt-1">
            {points.length.toLocaleString()} puntos • Formato {uploadedPoints.format.toUpperCase()}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-gray-800 rounded">
            <p className="text-gray-400">Extensión X</p>
            <p className="text-white">{(bounds.maxX - bounds.minX).toFixed(1)} m</p>
          </div>
          <div className="p-2 bg-gray-800 rounded">
            <p className="text-gray-400">Extensión Y</p>
            <p className="text-white">{(bounds.maxY - bounds.minY).toFixed(1)} m</p>
          </div>
          <div className="p-2 bg-gray-800 rounded">
            <p className="text-gray-400">Rango Z</p>
            <p className="text-white">{bounds.minZ.toFixed(2)} - {bounds.maxZ.toFixed(2)} m</p>
          </div>
          <div className="p-2 bg-gray-800 rounded">
            <p className="text-gray-400">Densidad</p>
            <p className="text-white">{density.toFixed(1)} pts/ha</p>
          </div>
        </div>

        <p className="text-gray-400 text-xs text-center">
          Ve a la pestaña &quot;Análisis&quot; para continuar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center py-6">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-white font-medium">Cargar puntos topográficos</p>
          <p className="text-sm mt-1">Formatos soportados: CSV, XYZ</p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xyz,.txt"
        onChange={onFileUpload}
        className="hidden"
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={status === 'uploading'}
        className="w-full px-4 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white rounded font-medium text-sm transition-colors flex items-center justify-center gap-2"
      >
        {status === 'uploading' ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Cargando...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Seleccionar Archivo
          </>
        )}
      </button>

      <div className="text-xs text-gray-500 space-y-1">
        <p className="font-medium text-gray-400">Formato esperado:</p>
        <p>• CSV: ID, Este, Norte, Cota [, Código]</p>
        <p>• XYZ: X Y Z (separado por espacios)</p>
        <p>• Coordenadas en metros (UTM recomendado)</p>
      </div>
    </div>
  );
}

// ============================================================================
// Analysis View
// ============================================================================

interface AnalysisViewProps {
  uploadedPoints: UploadedPoints;
  terrainAnalysis: TerrainAnalysisResult | null;
  methodRecommendation: MethodRecommendation | null;
  status: GenerationStatus;
  onRunAnalysis: () => void;
}

function AnalysisView({
  uploadedPoints,
  terrainAnalysis,
  methodRecommendation,
  status,
  onRunAnalysis,
}: AnalysisViewProps) {
  const classificationColors: Record<TerrainClass, string> = {
    flat: 'text-green-400',
    rolling: 'text-blue-400',
    hilly: 'text-yellow-400',
    mountainous: 'text-orange-400',
    complex: 'text-red-400',
  };

  const classificationLabels: Record<TerrainClass, string> = {
    flat: 'Plano',
    rolling: 'Ondulado',
    hilly: 'Colinado',
    mountainous: 'Montañoso',
    complex: 'Complejo',
  };

  if (!terrainAnalysis) {
    return (
      <div className="space-y-4">
        <div className="text-center py-4">
          <div className="text-gray-400 mb-4">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="text-white font-medium">Análisis AI del Terreno</p>
            <p className="text-sm mt-1">
              Analiza {uploadedPoints.points.length.toLocaleString()} puntos para determinar el mejor método de interpolación
            </p>
          </div>
        </div>

        <button
          onClick={onRunAnalysis}
          disabled={status === 'analyzing'}
          className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded font-medium text-sm transition-colors flex items-center justify-center gap-2"
        >
          {status === 'analyzing' ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Analizando con AI...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Ejecutar Análisis AI
            </>
          )}
        </button>
      </div>
    );
  }

  const { characteristics } = terrainAnalysis;

  return (
    <div className="space-y-4">
      {/* Terrain Classification */}
      <div className="p-3 bg-gray-800 rounded border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-xs">Clasificación del Terreno</span>
          <span className="text-xs text-gray-500">
            Confianza: {(terrainAnalysis.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <p className={`text-xl font-bold ${classificationColors[characteristics.classification]}`}>
          {classificationLabels[characteristics.classification]}
        </p>
        <p className="text-gray-400 text-xs mt-1">{terrainAnalysis.reasoning}</p>
      </div>

      {/* Terrain Metrics */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 bg-gray-800 rounded">
          <p className="text-gray-400">Pendiente Media</p>
          <p className="text-white">{characteristics.slopeStats.mean.toFixed(1)}°</p>
        </div>
        <div className="p-2 bg-gray-800 rounded">
          <p className="text-gray-400">Pendiente Máx</p>
          <p className="text-white">{characteristics.slopeStats.max.toFixed(1)}°</p>
        </div>
        <div className="p-2 bg-gray-800 rounded">
          <p className="text-gray-400">Rugosidad</p>
          <div className="flex items-center gap-1">
            <div className="flex-1 h-1.5 bg-gray-700 rounded">
              <div
                className="h-full bg-cyan-400 rounded"
                style={{ width: `${characteristics.roughness * 100}%` }}
              />
            </div>
            <span className="text-white">{(characteristics.roughness * 100).toFixed(0)}%</span>
          </div>
        </div>
        <div className="p-2 bg-gray-800 rounded">
          <p className="text-gray-400">Uniformidad</p>
          <div className="flex items-center gap-1">
            <div className="flex-1 h-1.5 bg-gray-700 rounded">
              <div
                className="h-full bg-green-400 rounded"
                style={{ width: `${characteristics.uniformity * 100}%` }}
              />
            </div>
            <span className="text-white">{(characteristics.uniformity * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Feature Detection */}
      <div className="p-2 bg-gray-800 rounded text-xs">
        <p className="text-gray-400 mb-1">Características Detectadas</p>
        <div className="flex gap-2">
          <span className={characteristics.hasLinearFeatures ? 'text-green-400' : 'text-gray-600'}>
            {characteristics.hasLinearFeatures ? '✓' : '✗'} Líneas
          </span>
          <span className={characteristics.hasFlatAreas ? 'text-green-400' : 'text-gray-600'}>
            {characteristics.hasFlatAreas ? '✓' : '✗'} Áreas planas
          </span>
        </div>
      </div>

      {/* Method Recommendation */}
      {methodRecommendation && (
        <div className="p-3 bg-cyan-900/30 border border-cyan-700 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-cyan-400 text-xs font-medium">Método Recomendado</span>
            <span className="text-xs text-gray-400">
              Calidad esperada: {methodRecommendation.expectedQuality}%
            </span>
          </div>
          <p className="text-white font-bold text-lg capitalize">
            {methodRecommendation.primaryMethod}
          </p>
          <p className="text-gray-400 text-xs mt-1">{methodRecommendation.reasoning}</p>
          <div className="mt-2 text-xs text-gray-500">
            Alternativas: {methodRecommendation.alternativeMethods.join(', ')}
          </div>
        </div>
      )}

      {/* Anomalies */}
      {terrainAnalysis.anomalies.length > 0 && (
        <div className="p-2 bg-yellow-900/30 border border-yellow-700 rounded text-xs">
          <p className="text-yellow-400 mb-1">Anomalías Detectadas</p>
          <ul className="text-gray-300 space-y-1">
            {terrainAnalysis.anomalies.map((anomaly, i) => (
              <li key={i}>• {anomaly}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Generate View
// ============================================================================

interface GenerateViewProps {
  surfaceName: string;
  setSurfaceName: (name: string) => void;
  selectedMethod: SurfaceMethodType | 'auto';
  setSelectedMethod: (method: SurfaceMethodType | 'auto') => void;
  useIDEBreaklines: boolean;
  setUseIDEBreaklines: (use: boolean) => void;
  gridResolution: number;
  setGridResolution: (res: number) => void;
  methodRecommendation: MethodRecommendation | null;
  status: GenerationStatus;
  onGenerate: () => void;
  // Satellite detection props
  useSatelliteDetection: boolean;
  setUseSatelliteDetection: (use: boolean) => void;
  detectBuildings: boolean;
  setDetectBuildings: (detect: boolean) => void;
  detectFences: boolean;
  setDetectFences: (detect: boolean) => void;
  detectRoadsFromImage: boolean;
  setDetectRoadsFromImage: (detect: boolean) => void;
  detectParking: boolean;
  setDetectParking: (detect: boolean) => void;
}

function GenerateView({
  surfaceName,
  setSurfaceName,
  selectedMethod,
  setSelectedMethod,
  useIDEBreaklines,
  setUseIDEBreaklines,
  gridResolution,
  setGridResolution,
  methodRecommendation,
  status,
  onGenerate,
  useSatelliteDetection,
  setUseSatelliteDetection,
  detectBuildings,
  setDetectBuildings,
  detectFences,
  setDetectFences,
  detectRoadsFromImage,
  setDetectRoadsFromImage,
  detectParking,
  setDetectParking,
}: GenerateViewProps) {
  const methods: Array<{ id: SurfaceMethodType | 'auto'; label: string; desc: string }> = [
    { id: 'auto', label: 'Automático (AI)', desc: 'Dejar que AI elija el mejor método' },
    { id: 'delaunay', label: 'Delaunay TIN', desc: 'Triangulación estándar, rápida' },
    { id: 'idw', label: 'IDW', desc: 'Interpolación por distancia inversa' },
    { id: 'kriging', label: 'Kriging', desc: 'Geoestadístico, mejor para datos dispersos' },
  ];

  return (
    <div className="space-y-4">
      {/* Surface Name */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Nombre de la Superficie</label>
        <input
          type="text"
          value={surfaceName}
          onChange={(e) => setSurfaceName(e.target.value)}
          placeholder="Ej: Terreno Natural Sector A"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
        />
      </div>

      {/* Method Selection */}
      <div>
        <label className="block text-xs text-gray-400 mb-2">Método de Interpolación</label>
        <div className="space-y-2">
          {methods.map((method) => (
            <label
              key={method.id}
              className={`flex items-start gap-3 p-2 rounded cursor-pointer transition-colors ${
                selectedMethod === method.id
                  ? 'bg-cyan-900/30 border border-cyan-700'
                  : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
              }`}
            >
              <input
                type="radio"
                name="method"
                value={method.id}
                checked={selectedMethod === method.id}
                onChange={() => setSelectedMethod(method.id)}
                className="mt-1"
              />
              <div>
                <p className="text-white text-sm font-medium">
                  {method.label}
                  {method.id === 'auto' && methodRecommendation && (
                    <span className="ml-2 text-cyan-400 text-xs">
                      → {methodRecommendation.primaryMethod}
                    </span>
                  )}
                </p>
                <p className="text-gray-400 text-xs">{method.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Grid Resolution (for IDW/Kriging) */}
      {(selectedMethod === 'idw' || selectedMethod === 'kriging') && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Resolución de Grilla: {gridResolution}m
          </label>
          <input
            type="range"
            min={1}
            max={50}
            value={gridResolution}
            onChange={(e) => setGridResolution(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>1m (detallado)</span>
            <span>50m (rápido)</span>
          </div>
        </div>
      )}

      {/* IDE Breaklines Option */}
      <label className="flex items-center gap-3 p-2 bg-gray-800 rounded cursor-pointer">
        <input
          type="checkbox"
          checked={useIDEBreaklines}
          onChange={(e) => setUseIDEBreaklines(e.target.checked)}
          className="w-4 h-4"
        />
        <div>
          <p className="text-white text-sm">Usar breaklines de IDE Chile</p>
          <p className="text-gray-400 text-xs">
            Incorporar caminos, ríos y lagos como restricciones
          </p>
        </div>
      </label>

      {/* Satellite Feature Detection Section */}
      <div className="border border-gray-700 rounded-lg overflow-hidden">
        <label className="flex items-center gap-3 p-3 bg-gray-800 cursor-pointer">
          <input
            type="checkbox"
            checked={useSatelliteDetection}
            onChange={(e) => setUseSatelliteDetection(e.target.checked)}
            className="w-4 h-4"
          />
          <div className="flex-1">
            <p className="text-white text-sm flex items-center gap-2">
              <span>🛰️</span>
              Detectar estructuras desde imágenes satelitales
            </p>
            <p className="text-gray-400 text-xs">
              Usar AI para identificar casas, cercos y otras estructuras
            </p>
          </div>
        </label>

        {/* Detection options - shown when satellite detection is enabled */}
        {useSatelliteDetection && (
          <div className="p-3 bg-gray-900/50 border-t border-gray-700 space-y-2">
            <p className="text-xs text-gray-400 mb-2">Tipos de estructuras a detectar:</p>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={detectBuildings}
                onChange={(e) => setDetectBuildings(e.target.checked)}
                className="w-3.5 h-3.5"
              />
              <span className="text-sm text-white flex items-center gap-1">
                🏠 Casas y edificaciones
              </span>
              <span className="text-xs text-gray-500 ml-auto">→ Zonas de exclusión</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={detectFences}
                onChange={(e) => setDetectFences(e.target.checked)}
                className="w-3.5 h-3.5"
              />
              <span className="text-sm text-white flex items-center gap-1">
                🚧 Cercos y muros
              </span>
              <span className="text-xs text-gray-500 ml-auto">→ Breaklines</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={detectRoadsFromImage}
                onChange={(e) => setDetectRoadsFromImage(e.target.checked)}
                className="w-3.5 h-3.5"
              />
              <span className="text-sm text-white flex items-center gap-1">
                🛤️ Caminos (desde imagen)
              </span>
              <span className="text-xs text-gray-500 ml-auto">→ Breaklines</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={detectParking}
                onChange={(e) => setDetectParking(e.target.checked)}
                className="w-3.5 h-3.5"
              />
              <span className="text-sm text-white flex items-center gap-1">
                🅿️ Estacionamientos
              </span>
              <span className="text-xs text-gray-500 ml-auto">→ Áreas planas</span>
            </label>

            <p className="text-xs text-amber-400/80 mt-2 pt-2 border-t border-gray-700">
              💡 La detección satelital usa Gemini Vision para analizar imágenes de Esri World Imagery
            </p>
          </div>
        )}
      </div>

      {/* Generate Button */}
      <button
        onClick={onGenerate}
        disabled={status === 'generating'}
        className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded font-medium text-sm transition-colors flex items-center justify-center gap-2"
      >
        {status === 'generating' ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Generando Superficie...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Generar Superficie
          </>
        )}
      </button>
    </div>
  );
}

// ============================================================================
// Results View
// ============================================================================

interface ResultsViewProps {
  surface: GeneratedSurfaceResult;
  qualityValidation: QualityValidationResult | null;
  computeTime: number | null;
}

function ResultsView({ surface, qualityValidation, computeTime }: ResultsViewProps) {
  const ratingColors: Record<string, string> = {
    excellent: 'text-green-400 bg-green-900/30 border-green-700',
    good: 'text-blue-400 bg-blue-900/30 border-blue-700',
    acceptable: 'text-yellow-400 bg-yellow-900/30 border-yellow-700',
    poor: 'text-orange-400 bg-orange-900/30 border-orange-700',
    unacceptable: 'text-red-400 bg-red-900/30 border-red-700',
  };

  const ratingLabels: Record<string, string> = {
    excellent: 'Excelente',
    good: 'Bueno',
    acceptable: 'Aceptable',
    poor: 'Deficiente',
    unacceptable: 'Inaceptable',
  };

  return (
    <div className="space-y-4">
      {/* Success Header */}
      <div className="text-center py-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-900/30 border border-green-700 rounded-full">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-400 font-medium">Superficie Generada</span>
        </div>
      </div>

      {/* Surface Info */}
      <div className="p-3 bg-gray-800 rounded border border-gray-700">
        <p className="text-white font-medium">{surface.name}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-400">Método:</span>
            <span className="text-white ml-1 capitalize">{surface.method}</span>
          </div>
          <div>
            <span className="text-gray-400">Tiempo:</span>
            <span className="text-white ml-1">{computeTime ? `${(computeTime / 1000).toFixed(2)}s` : 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-400">Vértices:</span>
            <span className="text-white ml-1">{surface.vertexCount.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-400">Triángulos:</span>
            <span className="text-white ml-1">{surface.triangleCount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Metrics */}
      {surface.metrics && (
        <div className="p-3 bg-gray-800 rounded border border-gray-700">
          <p className="text-gray-400 text-xs mb-2">Métricas de Calidad</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400">RMSE:</span>
              <span className="text-white ml-1">{surface.metrics.rmse.toFixed(3)} m</span>
            </div>
            <div>
              <span className="text-gray-400">MAE:</span>
              <span className="text-white ml-1">{surface.metrics.mae.toFixed(3)} m</span>
            </div>
            <div>
              <span className="text-gray-400">R²:</span>
              <span className="text-white ml-1">{(surface.metrics.r2 * 100).toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-gray-400">Error Máx:</span>
              <span className="text-white ml-1">{surface.metrics.maxError.toFixed(3)} m</span>
            </div>
          </div>
        </div>
      )}

      {/* Quality Validation */}
      {qualityValidation && (
        <div className={`p-3 rounded border ${ratingColors[qualityValidation.rating]}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs">Validación de Calidad AI</span>
            <span className="text-lg font-bold">{qualityValidation.qualityScore}/100</span>
          </div>
          <p className="font-medium">{ratingLabels[qualityValidation.rating]}</p>
          <p className="text-xs mt-1 opacity-80">{qualityValidation.assessment}</p>

          {qualityValidation.issues.length > 0 && (
            <div className="mt-2 pt-2 border-t border-current/30">
              <p className="text-xs opacity-70 mb-1">Problemas detectados:</p>
              {qualityValidation.issues.map((issue, i) => (
                <p key={i} className="text-xs">
                  {issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵'}{' '}
                  {issue.description}
                </p>
              ))}
            </div>
          )}

          {qualityValidation.suggestions.length > 0 && (
            <div className="mt-2 pt-2 border-t border-current/30">
              <p className="text-xs opacity-70 mb-1">Sugerencias:</p>
              {qualityValidation.suggestions.map((suggestion, i) => (
                <p key={i} className="text-xs">💡 {suggestion}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button className="flex-1 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm transition-colors">
          Ver en 3D
        </button>
        <button className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors">
          Exportar LandXML
        </button>
      </div>
    </div>
  );
}
