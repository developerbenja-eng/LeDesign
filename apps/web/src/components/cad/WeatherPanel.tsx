'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  getWeatherDescription,
  getWeatherIcon,
  getPrecipitationIntensity,
  getRiverAlertLevel,
  calculateWeatherStats,
  calculateDischargeStats,
  type WeatherData,
  type HistoricalWeatherData,
  type RiverDischargeData,
} from '@/lib/open-meteo';

interface WeatherPanelProps {
  latitude: number;
  longitude: number;
  projectName?: string;
  onClose?: () => void;
}

type ViewMode = 'current' | 'forecast' | 'historical' | 'river';

export function WeatherPanel({
  latitude,
  longitude,
  projectName,
  onClose,
}: WeatherPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('current');
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalWeatherData | null>(null);
  const [riverData, setRiverData] = useState<RiverDischargeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date range for historical data
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Fetch current weather
  const fetchCurrentWeather = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/weather?lat=${latitude}&lng=${longitude}&type=current&days=7`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }

      const data = await response.json();
      setCurrentWeather(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude]);

  // Fetch historical weather
  const fetchHistoricalWeather = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/weather?lat=${latitude}&lng=${longitude}&type=historical&start=${startDate}&end=${endDate}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch historical data');
      }

      const data = await response.json();
      setHistoricalData(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude, startDate, endDate]);

  // Fetch river discharge
  const fetchRiverDischarge = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/weather?lat=${latitude}&lng=${longitude}&type=river&pastDays=30&forecastDays=10`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch river data');
      }

      const data = await response.json();
      setRiverData(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude]);

  // Fetch data on mount and when view mode changes
  useEffect(() => {
    if (viewMode === 'current' || viewMode === 'forecast') {
      fetchCurrentWeather();
    } else if (viewMode === 'historical') {
      fetchHistoricalWeather();
    } else if (viewMode === 'river') {
      fetchRiverDischarge();
    }
  }, [viewMode, fetchCurrentWeather, fetchHistoricalWeather, fetchRiverDischarge]);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 shadow-xl w-96 max-h-[600px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-white">Weather & Hydrology</h2>
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

      {/* View Mode Tabs */}
      <div className="flex border-b border-gray-700">
        {(['current', 'forecast', 'historical', 'river'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === mode
                ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {mode === 'current' && 'Now'}
            {mode === 'forecast' && '7-Day'}
            {mode === 'historical' && 'History'}
            {mode === 'river' && 'River'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && viewMode === 'current' && currentWeather?.current && (
          <CurrentWeatherView data={currentWeather} />
        )}

        {!loading && !error && viewMode === 'forecast' && currentWeather?.daily && (
          <ForecastView data={currentWeather} />
        )}

        {!loading && !error && viewMode === 'historical' && (
          <HistoricalView
            data={historicalData}
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onFetch={fetchHistoricalWeather}
          />
        )}

        {!loading && !error && viewMode === 'river' && (
          <RiverView data={riverData} />
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-700 text-xs text-gray-500 text-center">
        Data from Open-Meteo (free, no API key)
      </div>
    </div>
  );
}

// Current Weather View
function CurrentWeatherView({ data }: { data: WeatherData }) {
  const current = data.current!;
  const icon = getWeatherIcon(current.weather_code);
  const description = getWeatherDescription(current.weather_code);
  const precip = getPrecipitationIntensity(current.precipitation);

  return (
    <div className="space-y-4">
      {/* Main Weather */}
      <div className="flex items-center gap-4">
        <span className="text-5xl">{icon}</span>
        <div>
          <div className="text-4xl font-bold text-white">
            {current.temperature_2m.toFixed(1)}°C
          </div>
          <div className="text-gray-400">{description}</div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3">
        <WeatherStat
          label="Humidity"
          value={`${current.relative_humidity_2m}%`}
          icon="💧"
        />
        <WeatherStat
          label="Wind"
          value={`${current.wind_speed_10m.toFixed(1)} km/h`}
          icon="💨"
        />
        <WeatherStat
          label="Precipitation"
          value={`${current.precipitation} mm`}
          icon="🌧️"
        />
        <WeatherStat
          label="Intensity"
          value={precip.description}
          icon={precip.category === 'none' ? '✓' : '⚠️'}
        />
      </div>

      {/* Location Info */}
      <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
        <div>Elevation: {data.elevation}m</div>
        <div>Timezone: {data.timezone}</div>
        <div>Updated: {new Date(current.time).toLocaleString()}</div>
      </div>
    </div>
  );
}

// 7-Day Forecast View
function ForecastView({ data }: { data: WeatherData }) {
  const daily = data.daily!;

  return (
    <div className="space-y-2">
      {daily.time.map((date, i) => (
        <div
          key={date}
          className="flex items-center justify-between p-2 rounded bg-gray-800 hover:bg-gray-750"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-300 w-20">
              {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-blue-400">
              {daily.precipitation_sum[i].toFixed(1)} mm
            </span>
            <div className="text-sm">
              <span className="text-red-400">{daily.temperature_2m_max[i].toFixed(0)}°</span>
              <span className="text-gray-500 mx-1">/</span>
              <span className="text-blue-300">{daily.temperature_2m_min[i].toFixed(0)}°</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Historical View
function HistoricalView({
  data,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onFetch,
}: {
  data: HistoricalWeatherData | null;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onFetch: () => void;
}) {
  const stats = data ? calculateWeatherStats(data) : null;

  return (
    <div className="space-y-4">
      {/* Date Range Selector */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-400">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
          />
        </div>
      </div>

      <button
        onClick={onFetch}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm font-medium"
      >
        Load Historical Data
      </button>

      {stats && (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-medium text-gray-300">Period Statistics</h3>

          <div className="grid grid-cols-2 gap-3">
            <WeatherStat
              label="Total Precip"
              value={`${stats.totalPrecipitation.toFixed(1)} mm`}
              icon="🌧️"
            />
            <WeatherStat
              label="Rainy Days"
              value={stats.rainyDays.toString()}
              icon="📅"
            />
            <WeatherStat
              label="Max Temp"
              value={`${stats.maxTemp.toFixed(1)}°C`}
              icon="🌡️"
            />
            <WeatherStat
              label="Min Temp"
              value={`${stats.minTemp.toFixed(1)}°C`}
              icon="❄️"
            />
            <WeatherStat
              label="Avg High"
              value={`${stats.avgMaxTemp.toFixed(1)}°C`}
              icon="☀️"
            />
            <WeatherStat
              label="Avg Low"
              value={`${stats.avgMinTemp.toFixed(1)}°C`}
              icon="🌙"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// River Discharge View
function RiverView({ data }: { data: RiverDischargeData | null }) {
  if (!data) return null;

  const stats = calculateDischargeStats(data);
  const currentDischarge = data.daily.river_discharge[data.daily.river_discharge.length - 1] || 0;
  const alertLevel = getRiverAlertLevel(currentDischarge, stats.avgDischarge);

  const alertColors = {
    normal: 'bg-green-900/50 border-green-700 text-green-300',
    elevated: 'bg-yellow-900/50 border-yellow-700 text-yellow-300',
    high: 'bg-orange-900/50 border-orange-700 text-orange-300',
    critical: 'bg-red-900/50 border-red-700 text-red-300',
  };

  return (
    <div className="space-y-4">
      {/* Alert Level */}
      <div className={`rounded-lg border p-3 ${alertColors[alertLevel.level]}`}>
        <div className="text-sm font-medium">{alertLevel.description}</div>
        <div className="text-xs mt-1 opacity-75">
          Current: {currentDischarge.toFixed(2)} m³/s
          {alertLevel.ratio && ` (${(alertLevel.ratio * 100).toFixed(0)}% of avg)`}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <WeatherStat
          label="Current Flow"
          value={`${currentDischarge.toFixed(2)} m³/s`}
          icon="🌊"
        />
        <WeatherStat
          label="Average"
          value={`${stats.avgDischarge.toFixed(2)} m³/s`}
          icon="📊"
        />
        <WeatherStat
          label="Peak Flow"
          value={`${stats.maxDischarge.toFixed(2)} m³/s`}
          icon="📈"
        />
        <WeatherStat
          label="Minimum"
          value={`${stats.minDischarge.toFixed(2)} m³/s`}
          icon="📉"
        />
      </div>

      {stats.peakDate && (
        <div className="text-xs text-gray-500">
          Peak occurred: {new Date(stats.peakDate).toLocaleDateString()}
        </div>
      )}

      {/* Recent discharge values */}
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-gray-300">Recent Discharge</h3>
        <div className="max-h-40 overflow-y-auto space-y-1">
          {data.daily.time.slice(-10).map((date, i) => {
            const idx = data.daily.time.length - 10 + i;
            const discharge = data.daily.river_discharge[idx];
            return (
              <div
                key={date}
                className="flex justify-between text-xs p-1 rounded bg-gray-800"
              >
                <span className="text-gray-400">
                  {new Date(date).toLocaleDateString()}
                </span>
                <span className="text-blue-400 font-mono">
                  {discharge.toFixed(2)} m³/s
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
        Data source: GloFAS (Global Flood Awareness System)
      </div>
    </div>
  );
}

// Reusable stat component
function WeatherStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-2">
      <div className="flex items-center gap-1 text-xs text-gray-400">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="text-sm font-medium text-white mt-1">{value}</div>
    </div>
  );
}
