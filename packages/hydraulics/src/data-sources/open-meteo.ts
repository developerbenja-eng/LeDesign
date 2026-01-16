/**
 * Open-Meteo API Integration
 * Free weather and hydrological data API - no API key required
 * https://open-meteo.com/
 */

// ============================================
// TYPES
// ============================================

export interface WeatherData {
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
  current?: CurrentWeather;
  hourly?: HourlyWeather;
  daily?: DailyWeather;
}

export interface CurrentWeather {
  time: string;
  temperature_2m: number;
  relative_humidity_2m: number;
  precipitation: number;
  rain: number;
  weather_code: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
}

export interface HourlyWeather {
  time: string[];
  temperature_2m: number[];
  relative_humidity_2m: number[];
  precipitation: number[];
  rain: number[];
  weather_code: number[];
  wind_speed_10m: number[];
}

export interface DailyWeather {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  rain_sum: number[];
  precipitation_probability_max: number[];
  wind_speed_10m_max: number[];
}

export interface HistoricalWeatherParams {
  latitude: number;
  longitude: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  variables?: HistoricalVariable[];
  timezone?: string;
}

export type HistoricalVariable =
  | 'temperature_2m_max'
  | 'temperature_2m_min'
  | 'temperature_2m_mean'
  | 'precipitation_sum'
  | 'rain_sum'
  | 'snowfall_sum'
  | 'wind_speed_10m_max'
  | 'wind_gusts_10m_max'
  | 'et0_fao_evapotranspiration';

export interface HistoricalWeatherData {
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
  daily: {
    time: string[];
    [key: string]: string[] | number[];
  };
}

export interface RiverDischargeData {
  latitude: number;
  longitude: number;
  elevation: number;
  daily: {
    time: string[];
    river_discharge: number[];       // m³/s
    river_discharge_mean?: number[]; // m³/s
    river_discharge_max?: number[];  // m³/s
    river_discharge_min?: number[];  // m³/s
  };
}

export interface RiverDischargeParams {
  latitude: number;
  longitude: number;
  pastDays?: number;      // Historical days (default: 92)
  forecastDays?: number;  // Forecast days (default: 92)
  dailyVariables?: ('river_discharge' | 'river_discharge_mean' | 'river_discharge_max' | 'river_discharge_min')[];
}

// ============================================
// API ENDPOINTS
// ============================================

const BASE_URL = 'https://api.open-meteo.com/v1';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1';
const FLOOD_URL = 'https://flood-api.open-meteo.com/v1';

// ============================================
// WEATHER FUNCTIONS
// ============================================

/**
 * Get current weather and forecast for a location
 */
export async function getCurrentWeather(
  latitude: number,
  longitude: number,
  options?: {
    timezone?: string;
    forecastDays?: number;
  }
): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: 'temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum,precipitation_probability_max,wind_speed_10m_max',
    timezone: options?.timezone || 'America/Santiago',
    forecast_days: (options?.forecastDays || 7).toString(),
  });

  const response = await fetch(`${BASE_URL}/forecast?${params}`);

  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Get historical weather data for a location
 */
export async function getHistoricalWeather(
  params: HistoricalWeatherParams
): Promise<HistoricalWeatherData> {
  const variables = params.variables || [
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_sum',
  ];

  const searchParams = new URLSearchParams({
    latitude: params.latitude.toString(),
    longitude: params.longitude.toString(),
    start_date: params.startDate,
    end_date: params.endDate,
    daily: variables.join(','),
    timezone: params.timezone || 'America/Santiago',
  });

  const response = await fetch(`${ARCHIVE_URL}/archive?${searchParams}`);

  if (!response.ok) {
    throw new Error(`Open-Meteo Archive API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Get hourly weather data (current + forecast)
 */
export async function getHourlyForecast(
  latitude: number,
  longitude: number,
  options?: {
    timezone?: string;
    forecastDays?: number;
  }
): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    hourly: 'temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m',
    timezone: options?.timezone || 'America/Santiago',
    forecast_days: (options?.forecastDays || 3).toString(),
  });

  const response = await fetch(`${BASE_URL}/forecast?${params}`);

  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status}`);
  }

  return response.json();
}

// ============================================
// RIVER DISCHARGE / FLOOD FUNCTIONS
// ============================================

/**
 * Get river discharge data from GloFAS model
 * Returns estimated river flow in m³/s for any location
 */
export async function getRiverDischarge(
  params: RiverDischargeParams
): Promise<RiverDischargeData> {
  const variables = params.dailyVariables || ['river_discharge'];

  const searchParams = new URLSearchParams({
    latitude: params.latitude.toString(),
    longitude: params.longitude.toString(),
    daily: variables.join(','),
  });

  if (params.pastDays) {
    searchParams.set('past_days', params.pastDays.toString());
  }
  if (params.forecastDays) {
    searchParams.set('forecast_days', params.forecastDays.toString());
  }

  const response = await fetch(`${FLOOD_URL}/flood?${searchParams}`);

  if (!response.ok) {
    throw new Error(`Open-Meteo Flood API error: ${response.status}`);
  }

  return response.json();
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Weather code to description mapping (WMO codes)
 */
export function getWeatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };

  return descriptions[code] || 'Unknown';
}

/**
 * Get weather icon based on WMO code
 */
export function getWeatherIcon(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 48) return '🌫️';
  if (code <= 57) return '🌧️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  if (code <= 86) return '🌨️';
  if (code >= 95) return '⛈️';
  return '🌤️';
}

/**
 * Calculate precipitation intensity category
 */
export function getPrecipitationIntensity(mmPerHour: number): {
  category: 'none' | 'light' | 'moderate' | 'heavy' | 'violent';
  description: string;
} {
  if (mmPerHour === 0) return { category: 'none', description: 'No precipitation' };
  if (mmPerHour < 2.5) return { category: 'light', description: 'Light rain' };
  if (mmPerHour < 7.5) return { category: 'moderate', description: 'Moderate rain' };
  if (mmPerHour < 50) return { category: 'heavy', description: 'Heavy rain' };
  return { category: 'violent', description: 'Violent rain' };
}

/**
 * Calculate river discharge alert level
 */
export function getRiverAlertLevel(
  currentDischarge: number,
  historicalAverage?: number
): {
  level: 'normal' | 'elevated' | 'high' | 'critical';
  ratio?: number;
  description: string;
} {
  if (!historicalAverage) {
    // Without historical data, use absolute thresholds
    if (currentDischarge < 10) return { level: 'normal', description: 'Normal flow' };
    if (currentDischarge < 50) return { level: 'elevated', description: 'Elevated flow' };
    if (currentDischarge < 200) return { level: 'high', description: 'High flow' };
    return { level: 'critical', description: 'Critical flow level' };
  }

  const ratio = currentDischarge / historicalAverage;

  if (ratio < 1.5) return { level: 'normal', ratio, description: 'Normal flow' };
  if (ratio < 2.5) return { level: 'elevated', ratio, description: 'Above average flow' };
  if (ratio < 4) return { level: 'high', ratio, description: 'High flow warning' };
  return { level: 'critical', ratio, description: 'Critical flood level' };
}

// ============================================
// AGGREGATION HELPERS
// ============================================

/**
 * Calculate statistics from historical data
 */
export function calculateWeatherStats(data: HistoricalWeatherData): {
  totalPrecipitation: number;
  avgMaxTemp: number;
  avgMinTemp: number;
  maxTemp: number;
  minTemp: number;
  rainyDays: number;
} {
  const daily = data.daily;
  const precipSum = daily.precipitation_sum as number[] || [];
  const tempMax = daily.temperature_2m_max as number[] || [];
  const tempMin = daily.temperature_2m_min as number[] || [];

  return {
    totalPrecipitation: precipSum.reduce((a, b) => a + b, 0),
    avgMaxTemp: tempMax.length > 0 ? tempMax.reduce((a, b) => a + b, 0) / tempMax.length : 0,
    avgMinTemp: tempMin.length > 0 ? tempMin.reduce((a, b) => a + b, 0) / tempMin.length : 0,
    maxTemp: tempMax.length > 0 ? Math.max(...tempMax) : 0,
    minTemp: tempMin.length > 0 ? Math.min(...tempMin) : 0,
    rainyDays: precipSum.filter(p => p > 0.1).length,
  };
}

/**
 * Calculate river discharge statistics
 */
export function calculateDischargeStats(data: RiverDischargeData): {
  avgDischarge: number;
  maxDischarge: number;
  minDischarge: number;
  peakDate: string | null;
} {
  const discharge = data.daily.river_discharge;
  const times = data.daily.time;

  if (discharge.length === 0) {
    return { avgDischarge: 0, maxDischarge: 0, minDischarge: 0, peakDate: null };
  }

  const maxValue = Math.max(...discharge);
  const maxIndex = discharge.indexOf(maxValue);

  return {
    avgDischarge: discharge.reduce((a, b) => a + b, 0) / discharge.length,
    maxDischarge: maxValue,
    minDischarge: Math.min(...discharge),
    peakDate: times[maxIndex] || null,
  };
}
