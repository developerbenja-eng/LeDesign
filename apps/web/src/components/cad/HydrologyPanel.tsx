'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  STATIONS,
  findNearestStation,
  generateIDFCurve,
  getIDFTable,
  generateDesignStorm,
  generateChicagoStorm,
  getIntensityCategory,
  formatDuration,
  DESIGN_STANDARDS,
  type StationCoefficients,
  type ReturnPeriod,
  type DesignStorm,
} from '@/lib/hydrology';

interface HydrologyPanelProps {
  latitude: number;
  longitude: number;
  projectName?: string;
  onClose?: () => void;
}

type ViewMode = 'stations' | 'idf' | 'storm' | 'standards';

export function HydrologyPanel({
  latitude,
  longitude,
  projectName,
  onClose,
}: HydrologyPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('idf');
  const [selectedStation, setSelectedStation] = useState<StationCoefficients | null>(null);
  const [loading, setLoading] = useState(false);

  // IDF curve state
  const [idfTable, setIdfTable] = useState<{
    returnPeriods: number[];
    durations: number[];
    intensities: number[][];
  } | null>(null);

  // Design storm state
  const [returnPeriod, setReturnPeriod] = useState<ReturnPeriod>(10);
  const [stormDuration, setStormDuration] = useState(120);
  const [timeStep, setTimeStep] = useState(5);
  const [stormMethod, setStormMethod] = useState<'alternating' | 'chicago'>('alternating');
  const [designStorm, setDesignStorm] = useState<DesignStorm | null>(null);

  // Find nearest station on mount
  useEffect(() => {
    const station = findNearestStation(latitude, longitude);
    setSelectedStation(station);
    const table = getIDFTable(station);
    setIdfTable(table);
  }, [latitude, longitude]);

  // Generate design storm
  const generateStorm = useCallback(() => {
    if (!selectedStation) return;

    setLoading(true);
    try {
      const storm = stormMethod === 'chicago'
        ? generateChicagoStorm(selectedStation, returnPeriod, stormDuration, timeStep)
        : generateDesignStorm(selectedStation, returnPeriod, stormDuration, timeStep);
      setDesignStorm(storm);
    } finally {
      setLoading(false);
    }
  }, [selectedStation, returnPeriod, stormDuration, timeStep, stormMethod]);

  // Update IDF table when station changes
  useEffect(() => {
    if (selectedStation) {
      const table = getIDFTable(selectedStation);
      setIdfTable(table);
    }
  }, [selectedStation]);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 shadow-xl w-[500px] max-h-[650px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-white">Hidrología de Diseño</h2>
          <p className="text-xs text-gray-400">
            {selectedStation?.name || 'Seleccione estación'}
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

      {/* View Mode Tabs */}
      <div className="flex border-b border-gray-700">
        {(['idf', 'storm', 'stations', 'standards'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === mode
                ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {mode === 'idf' && 'Curvas IDF'}
            {mode === 'storm' && 'Tormenta'}
            {mode === 'stations' && 'Estaciones'}
            {mode === 'standards' && 'Normas'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {viewMode === 'idf' && selectedStation && idfTable && (
          <IDFView station={selectedStation} table={idfTable} />
        )}

        {viewMode === 'storm' && selectedStation && (
          <StormView
            station={selectedStation}
            returnPeriod={returnPeriod}
            stormDuration={stormDuration}
            timeStep={timeStep}
            stormMethod={stormMethod}
            designStorm={designStorm}
            loading={loading}
            onReturnPeriodChange={setReturnPeriod}
            onDurationChange={setStormDuration}
            onTimeStepChange={setTimeStep}
            onMethodChange={setStormMethod}
            onGenerate={generateStorm}
          />
        )}

        {viewMode === 'stations' && (
          <StationsView
            stations={STATIONS}
            selectedStation={selectedStation}
            onSelect={setSelectedStation}
            currentLat={latitude}
            currentLng={longitude}
          />
        )}

        {viewMode === 'standards' && <StandardsView />}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-700 text-xs text-gray-500 text-center">
        Basado en metodología Universidad de Talca / FONDEF D08I1054
      </div>
    </div>
  );
}

// IDF Curves View
function IDFView({
  station,
  table,
}: {
  station: StationCoefficients;
  table: {
    returnPeriods: number[];
    durations: number[];
    intensities: number[][];
  };
}) {
  return (
    <div className="space-y-4">
      {/* Station Info */}
      <div className="bg-gray-800 rounded-lg p-3">
        <div className="text-sm font-medium text-white mb-2">{station.name}</div>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
          <div>Lat: {station.latitude.toFixed(4)}°</div>
          <div>Lng: {station.longitude.toFixed(4)}°</div>
          <div>Elevación: {station.elevation}m</div>
          <div>Precip. anual: {station.annualPrecip || 'N/A'}mm</div>
        </div>
      </div>

      {/* IDF Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-800">
              <th className="p-2 text-left text-gray-400">T (años)</th>
              {table.durations.map(d => (
                <th key={d} className="p-2 text-right text-gray-400">
                  {formatDuration(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.returnPeriods.map((T, i) => (
              <tr key={T} className="border-t border-gray-700 hover:bg-gray-800">
                <td className="p-2 font-medium text-blue-400">{T}</td>
                {table.intensities[i].map((intensity, j) => {
                  const category = getIntensityCategory(intensity);
                  return (
                    <td key={j} className="p-2 text-right" style={{ color: category.color }}>
                      {intensity.toFixed(1)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-500 text-center">
        Intensidades en mm/hr
      </div>

      {/* Coefficients */}
      <div className="bg-gray-800 rounded-lg p-3 text-xs">
        <div className="text-gray-400 mb-2">Coeficientes Gumbel:</div>
        <div className="grid grid-cols-2 gap-2 font-mono text-gray-300">
          <div>β₁ = {station.beta1.toFixed(3)}</div>
          <div>α₁ = {station.alfa1.toFixed(3)}</div>
          <div>β₂ = {station.beta2.toFixed(3)}</div>
          <div>α₂ = {station.alfa2.toFixed(3)}</div>
        </div>
      </div>
    </div>
  );
}

// Design Storm View
function StormView({
  station,
  returnPeriod,
  stormDuration,
  timeStep,
  stormMethod,
  designStorm,
  loading,
  onReturnPeriodChange,
  onDurationChange,
  onTimeStepChange,
  onMethodChange,
  onGenerate,
}: {
  station: StationCoefficients;
  returnPeriod: ReturnPeriod;
  stormDuration: number;
  timeStep: number;
  stormMethod: 'alternating' | 'chicago';
  designStorm: DesignStorm | null;
  loading: boolean;
  onReturnPeriodChange: (v: ReturnPeriod) => void;
  onDurationChange: (v: number) => void;
  onTimeStepChange: (v: number) => void;
  onMethodChange: (v: 'alternating' | 'chicago') => void;
  onGenerate: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Parameters */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400">Período de retorno</label>
          <select
            value={returnPeriod}
            onChange={(e) => onReturnPeriodChange(parseInt(e.target.value) as ReturnPeriod)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
          >
            <option value={2}>2 años</option>
            <option value={5}>5 años</option>
            <option value={10}>10 años</option>
            <option value={25}>25 años</option>
            <option value={50}>50 años</option>
            <option value={100}>100 años</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-400">Duración total (min)</label>
          <select
            value={stormDuration}
            onChange={(e) => onDurationChange(parseInt(e.target.value))}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
          >
            <option value={30}>30 min</option>
            <option value={60}>1 hora</option>
            <option value={120}>2 horas</option>
            <option value={180}>3 horas</option>
            <option value={360}>6 horas</option>
            <option value={720}>12 horas</option>
            <option value={1440}>24 horas</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-400">Paso de tiempo (min)</label>
          <select
            value={timeStep}
            onChange={(e) => onTimeStepChange(parseInt(e.target.value))}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
          >
            <option value={5}>5 min</option>
            <option value={10}>10 min</option>
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-400">Método</label>
          <select
            value={stormMethod}
            onChange={(e) => onMethodChange(e.target.value as 'alternating' | 'chicago')}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
          >
            <option value="alternating">Bloques Alternados</option>
            <option value="chicago">Chicago</option>
          </select>
        </div>
      </div>

      <button
        onClick={onGenerate}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded text-sm font-medium"
      >
        {loading ? 'Generando...' : 'Generar Tormenta de Diseño'}
      </button>

      {/* Storm Results */}
      {designStorm && (
        <div className="space-y-3">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800 rounded-lg p-2">
              <div className="text-xs text-gray-400">Precipitación Total</div>
              <div className="text-lg font-bold text-blue-400">
                {designStorm.totalDepth.toFixed(1)} mm
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-2">
              <div className="text-xs text-gray-400">Intensidad Pico</div>
              <div className="text-lg font-bold text-red-400">
                {designStorm.peakIntensity.toFixed(1)} mm/hr
              </div>
            </div>
          </div>

          {/* Hyetograph Visualization */}
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-2">Hietograma</div>
            <div className="h-32 flex items-end gap-0.5">
              {designStorm.intensities.map((intensity, i) => {
                const maxIntensity = designStorm.peakIntensity;
                const height = (intensity / maxIntensity) * 100;
                const category = getIntensityCategory(intensity);
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t"
                    style={{
                      height: `${height}%`,
                      backgroundColor: category.color,
                      minWidth: '2px',
                    }}
                    title={`${designStorm.times[i]} min: ${intensity.toFixed(1)} mm/hr`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0</span>
              <span>{designStorm.totalDuration} min</span>
            </div>
          </div>

          {/* Data Table */}
          <div className="max-h-40 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-800 sticky top-0">
                <tr>
                  <th className="p-1.5 text-left text-gray-400">Tiempo</th>
                  <th className="p-1.5 text-right text-gray-400">Intensidad</th>
                  <th className="p-1.5 text-right text-gray-400">Precipitación</th>
                  <th className="p-1.5 text-right text-gray-400">Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {designStorm.times.map((time, i) => (
                  <tr key={i} className="border-t border-gray-700">
                    <td className="p-1.5 text-gray-300">{time} min</td>
                    <td className="p-1.5 text-right text-blue-400">
                      {designStorm.intensities[i].toFixed(1)}
                    </td>
                    <td className="p-1.5 text-right text-gray-300">
                      {designStorm.depths[i].toFixed(2)}
                    </td>
                    <td className="p-1.5 text-right text-green-400">
                      {designStorm.cumulativeDepth[i].toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Stations View
function StationsView({
  stations,
  selectedStation,
  onSelect,
  currentLat,
  currentLng,
}: {
  stations: StationCoefficients[];
  selectedStation: StationCoefficients | null;
  onSelect: (s: StationCoefficients) => void;
  currentLat: number;
  currentLng: number;
}) {
  // Calculate distance to each station
  const stationsWithDistance = stations.map(s => ({
    ...s,
    distance: Math.sqrt(
      Math.pow((s.latitude - currentLat) * 111, 2) +
      Math.pow((s.longitude - currentLng) * 85, 2) // ~85km per degree at -37° lat
    ),
  })).sort((a, b) => a.distance - b.distance);

  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-400 mb-2">
        Ubicación: {currentLat.toFixed(4)}°, {currentLng.toFixed(4)}°
      </div>

      {stationsWithDistance.map((station) => (
        <button
          key={station.code}
          onClick={() => onSelect(station)}
          className={`w-full text-left p-3 rounded-lg border transition-colors ${
            selectedStation?.code === station.code
              ? 'bg-blue-900/50 border-blue-600'
              : 'bg-gray-800 border-gray-700 hover:border-gray-600'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="font-medium text-white">{station.name}</div>
              <div className="text-xs text-gray-400">
                {station.region === 'biobio' ? 'Biobío' : 'Ñuble'} • {station.elevation}m
              </div>
            </div>
            <div className="text-sm text-blue-400">
              {station.distance.toFixed(0)} km
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// Design Standards View
function StandardsView() {
  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-300 mb-4">
        Períodos de retorno recomendados según normativa chilena (MOP)
      </div>

      {/* Stormwater */}
      <div className="bg-gray-800 rounded-lg p-3">
        <h3 className="text-sm font-medium text-blue-400 mb-2">Aguas Lluvias</h3>
        <div className="space-y-1 text-xs">
          {Object.entries(DESIGN_STANDARDS.stormwater).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-gray-400">{value.description}</span>
              <span className="text-white font-medium">T = {value.returnPeriod} años</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sewerage */}
      <div className="bg-gray-800 rounded-lg p-3">
        <h3 className="text-sm font-medium text-green-400 mb-2">Alcantarillado</h3>
        <div className="space-y-1 text-xs">
          {Object.entries(DESIGN_STANDARDS.sewerage).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-gray-400">{value.description}</span>
              <span className="text-white font-medium">T = {value.returnPeriod} años</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hydraulic Works */}
      <div className="bg-gray-800 rounded-lg p-3">
        <h3 className="text-sm font-medium text-orange-400 mb-2">Obras Hidráulicas</h3>
        <div className="space-y-1 text-xs">
          {Object.entries(DESIGN_STANDARDS.hydraulic).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-gray-400">{value.description}</span>
              <span className="text-white font-medium">T = {value.returnPeriod} años</span>
            </div>
          ))}
        </div>
      </div>

      {/* Typical Durations */}
      <div className="bg-gray-800 rounded-lg p-3">
        <h3 className="text-sm font-medium text-purple-400 mb-2">Duraciones Típicas</h3>
        <div className="space-y-1 text-xs">
          {Object.entries(DESIGN_STANDARDS.durations).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-gray-400">{value.description}</span>
              <span className="text-white font-medium">{formatDuration(value.minutes)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-gray-500 p-2 bg-gray-800 rounded">
        <strong>Nota:</strong> Para proyectos específicos, verificar normativa vigente
        según NCh y manuales MOP correspondientes.
      </div>
    </div>
  );
}
