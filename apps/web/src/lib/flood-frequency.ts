/**
 * Flood Frequency Analysis Module
 *
 * Statistical analysis of flood data for design flood estimation
 *
 * Implements:
 * - Probability distributions (Gumbel, Log-Pearson III, Log-Normal, GEV)
 * - Plotting position formulas (Weibull, Gringorten, Cunnane, Hazen)
 * - Parameter estimation (method of moments, L-moments, MLE)
 * - Return period calculations
 * - Confidence intervals
 * - Regional frequency analysis
 *
 * Based on:
 * - Bulletin 17C (USGS) Guidelines for Determining Flood Flow Frequency
 * - Hosking & Wallis (1997) Regional Frequency Analysis
 * - Chilean DGA hydrological analysis standards
 */

// ============================================================================
// Types
// ============================================================================

export type DistributionType =
  | 'gumbel'
  | 'log_pearson_iii'
  | 'log_normal_2p'
  | 'log_normal_3p'
  | 'gev'
  | 'normal'
  | 'exponential';

export type PlottingPositionMethod =
  | 'weibull'
  | 'gringorten'
  | 'cunnane'
  | 'hazen'
  | 'blom'
  | 'california';

export type ParameterEstimationMethod =
  | 'moments'
  | 'l_moments'
  | 'maximum_likelihood';

export interface FloodRecord {
  year: number;
  peak: number;           // Peak discharge (m³/s)
  isHistorical?: boolean; // Historical flood (not systematic record)
  volume?: number;        // Flood volume (m³)
  duration?: number;      // Flood duration (hours)
}

export interface DistributionParameters {
  distribution: DistributionType;
  location: number;       // ξ (xi) or μ
  scale: number;          // α (alpha) or σ
  shape?: number;         // κ (kappa) or γ (skewness)
}

export interface FloodQuantile {
  returnPeriod: number;
  probability: number;    // Annual exceedance probability
  discharge: number;      // Estimated discharge (m³/s)
  lowerBound: number;     // Lower confidence bound
  upperBound: number;     // Upper confidence bound
  standardError: number;
}

export interface FrequencyAnalysisResult {
  station: string;
  recordLength: number;
  recordPeriod: { start: number; end: number };
  statistics: {
    mean: number;
    standardDeviation: number;
    skewness: number;
    kurtosis: number;
    coefficientOfVariation: number;
    minimum: number;
    maximum: number;
  };
  distributionFit: DistributionParameters;
  goodnessOfFit: {
    chiSquare: number;
    kolmogorovSmirnov: number;
    probability: number;
    isAcceptable: boolean;
  };
  quantiles: FloodQuantile[];
  plottingData: Array<{
    year: number;
    observed: number;
    returnPeriod: number;
    probability: number;
    rank: number;
  }>;
  recommendations: string[];
}

export interface LMoments {
  l1: number;             // Mean
  l2: number;             // L-scale
  l3: number;             // L-skewness
  l4: number;             // L-kurtosis
  t3: number;             // L-skewness ratio
  t4: number;             // L-kurtosis ratio
}

export interface RegionalAnalysisResult {
  region: string;
  stations: string[];
  homogeneityTest: {
    statistic: number;
    isHomogeneous: boolean;
    discordantStations: string[];
  };
  regionalParameters: DistributionParameters;
  growthCurve: Array<{ returnPeriod: number; growthFactor: number }>;
  atSiteQuantiles: Map<string, FloodQuantile[]>;
}

// ============================================================================
// Constants
// ============================================================================

const STANDARD_RETURN_PERIODS = [2, 5, 10, 25, 50, 100, 200, 500, 1000];

/**
 * Plotting position constants a for P = (i - a) / (n + 1 - 2a)
 */
const PLOTTING_POSITION_A: Record<PlottingPositionMethod, number> = {
  weibull: 0,
  gringorten: 0.44,
  cunnane: 0.4,
  hazen: 0.5,
  blom: 0.375,
  california: 1,
};

/**
 * Frequency factor K for Gumbel distribution
 * K_T = -(√6/π)[0.5772 + ln(ln(T/(T-1)))]
 */
const SQRT6_PI = Math.sqrt(6) / Math.PI;
const EULER_GAMMA = 0.5772156649;

// ============================================================================
// Basic Statistical Functions
// ============================================================================

/**
 * Calculate sample mean
 */
export function mean(data: number[]): number {
  return data.reduce((sum, x) => sum + x, 0) / data.length;
}

/**
 * Calculate sample variance
 */
export function variance(data: number[], isSample: boolean = true): number {
  const m = mean(data);
  const sumSq = data.reduce((sum, x) => sum + Math.pow(x - m, 2), 0);
  return sumSq / (isSample ? data.length - 1 : data.length);
}

/**
 * Calculate sample standard deviation
 */
export function standardDeviation(data: number[], isSample: boolean = true): number {
  return Math.sqrt(variance(data, isSample));
}

/**
 * Calculate sample skewness (Fisher-Pearson)
 */
export function skewness(data: number[]): number {
  const n = data.length;
  const m = mean(data);
  const s = standardDeviation(data);

  const sumCubed = data.reduce((sum, x) => sum + Math.pow((x - m) / s, 3), 0);

  // Correction factor for sample skewness
  const correction = (n * (n - 1)) / (n - 2);
  return (sumCubed / n) * Math.sqrt(correction);
}

/**
 * Calculate sample kurtosis (excess)
 */
export function kurtosis(data: number[]): number {
  const n = data.length;
  const m = mean(data);
  const s = standardDeviation(data);

  const sumFourth = data.reduce((sum, x) => sum + Math.pow((x - m) / s, 4), 0);

  return (n * (n + 1) * sumFourth) / ((n - 1) * (n - 2) * (n - 3)) -
         (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3));
}

/**
 * Calculate coefficient of variation
 */
export function coefficientOfVariation(data: number[]): number {
  return standardDeviation(data) / mean(data);
}

// ============================================================================
// L-Moments Calculation
// ============================================================================

/**
 * Calculate L-moments from data
 * Reference: Hosking (1990)
 */
export function calculateLMoments(data: number[]): LMoments {
  const n = data.length;
  const sorted = [...data].sort((a, b) => a - b);

  // Calculate probability weighted moments
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0;

  for (let i = 0; i < n; i++) {
    const x = sorted[i];
    b0 += x;

    // Unbiased estimators
    b1 += x * i / (n - 1);
    if (n > 2) b2 += x * i * (i - 1) / ((n - 1) * (n - 2));
    if (n > 3) b3 += x * i * (i - 1) * (i - 2) / ((n - 1) * (n - 2) * (n - 3));
  }

  b0 /= n;
  b1 /= n;
  b2 /= n;
  b3 /= n;

  // L-moments from PWMs
  const l1 = b0;
  const l2 = 2 * b1 - b0;
  const l3 = 6 * b2 - 6 * b1 + b0;
  const l4 = 20 * b3 - 30 * b2 + 12 * b1 - b0;

  // L-moment ratios
  const t3 = l3 / l2;
  const t4 = l4 / l2;

  return { l1, l2, l3, l4, t3, t4 };
}

// ============================================================================
// Plotting Position Functions
// ============================================================================

/**
 * Calculate plotting position (exceedance probability)
 */
export function plottingPosition(
  rank: number,
  n: number,
  method: PlottingPositionMethod = 'gringorten'
): number {
  const a = PLOTTING_POSITION_A[method];
  return (rank - a) / (n + 1 - 2 * a);
}

/**
 * Calculate return period from exceedance probability
 */
export function returnPeriodFromProbability(probability: number): number {
  return 1 / probability;
}

/**
 * Calculate exceedance probability from return period
 */
export function probabilityFromReturnPeriod(returnPeriod: number): number {
  return 1 / returnPeriod;
}

/**
 * Rank flood data and assign plotting positions
 */
export function rankFloodData(
  records: FloodRecord[],
  method: PlottingPositionMethod = 'gringorten'
): Array<{ year: number; observed: number; rank: number; probability: number; returnPeriod: number }> {
  const sorted = [...records].sort((a, b) => b.peak - a.peak);  // Descending
  const n = sorted.length;

  return sorted.map((record, index) => {
    const rank = index + 1;
    const probability = plottingPosition(rank, n, method);
    const returnPeriod = returnPeriodFromProbability(probability);

    return {
      year: record.year,
      observed: record.peak,
      rank,
      probability,
      returnPeriod,
    };
  });
}

// ============================================================================
// Distribution Functions
// ============================================================================

/**
 * Standard normal CDF (Abramowitz & Stegun approximation)
 */
export function normalCDF(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z);

  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Standard normal inverse CDF (Hastings approximation)
 */
export function normalInverseCDF(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  const a = [
    -3.969683028665376e+01,
    2.209460984245205e+02,
    -2.759285104469687e+02,
    1.383577518672690e+02,
    -3.066479806614716e+01,
    2.506628277459239e+00
  ];
  const b = [
    -5.447609879822406e+01,
    1.615858368580409e+02,
    -1.556989798598866e+02,
    6.680131188771972e+01,
    -1.328068155288572e+01
  ];
  const c = [
    -7.784894002430293e-03,
    -3.223964580411365e-01,
    -2.400758277161838e+00,
    -2.549732539343734e+00,
    4.374664141464968e+00,
    2.938163982698783e+00
  ];
  const d = [
    7.784695709041462e-03,
    3.224671290700398e-01,
    2.445134137142996e+00,
    3.754408661907416e+00
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q: number, r: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
           (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

/**
 * Gumbel frequency factor
 */
export function gumbelFrequencyFactor(returnPeriod: number): number {
  const y = -Math.log(-Math.log(1 - 1 / returnPeriod));
  return (y - EULER_GAMMA) * SQRT6_PI;
}

/**
 * Log-Pearson III frequency factor (Wilson-Hilferty approximation)
 */
export function logPearsonIIIFrequencyFactor(returnPeriod: number, skewness: number): number {
  const z = normalInverseCDF(1 - 1 / returnPeriod);

  if (Math.abs(skewness) < 0.001) {
    return z;
  }

  const g = skewness;
  const k = g / 6;

  // Wilson-Hilferty approximation
  const K = (2 / g) * (
    Math.pow(1 + k * z - k * k / 3, 3) - 1
  );

  return K;
}

/**
 * GEV (Generalized Extreme Value) quantile
 */
export function gevQuantile(
  returnPeriod: number,
  location: number,
  scale: number,
  shape: number
): number {
  const p = 1 - 1 / returnPeriod;
  const y = -Math.log(p);

  if (Math.abs(shape) < 0.001) {
    // Gumbel limit
    return location - scale * Math.log(y);
  }

  return location + (scale / shape) * (1 - Math.pow(y, shape));
}

// ============================================================================
// Parameter Estimation
// ============================================================================

/**
 * Fit Gumbel distribution using method of moments
 */
export function fitGumbelMoM(data: number[]): DistributionParameters {
  const m = mean(data);
  const s = standardDeviation(data);

  // α = (√6 × σ) / π
  const scale = (s * Math.sqrt(6)) / Math.PI;

  // ξ = μ - γ × α  (γ = Euler's constant)
  const location = m - EULER_GAMMA * scale;

  return {
    distribution: 'gumbel',
    location,
    scale,
  };
}

/**
 * Fit Gumbel distribution using L-moments
 */
export function fitGumbelLMoments(data: number[]): DistributionParameters {
  const lm = calculateLMoments(data);

  // α = l2 / ln(2)
  const scale = lm.l2 / Math.log(2);

  // ξ = l1 - γ × α
  const location = lm.l1 - EULER_GAMMA * scale;

  return {
    distribution: 'gumbel',
    location,
    scale,
  };
}

/**
 * Fit Log-Pearson Type III distribution
 */
export function fitLogPearsonIII(data: number[]): DistributionParameters {
  // Work with log-transformed data
  const logData = data.map(x => Math.log10(x));

  const m = mean(logData);
  const s = standardDeviation(logData);
  const g = skewness(logData);

  return {
    distribution: 'log_pearson_iii',
    location: m,
    scale: s,
    shape: g,
  };
}

/**
 * Fit Log-Normal distribution (2-parameter)
 */
export function fitLogNormal2P(data: number[]): DistributionParameters {
  const logData = data.map(x => Math.log(x));

  const m = mean(logData);
  const s = standardDeviation(logData);

  return {
    distribution: 'log_normal_2p',
    location: m,
    scale: s,
  };
}

/**
 * Fit GEV distribution using L-moments
 */
export function fitGEVLMoments(data: number[]): DistributionParameters {
  const lm = calculateLMoments(data);

  // Approximate shape parameter from t3
  const t3 = lm.t3;

  // Approximation for shape parameter
  const c = (2 / (3 + t3)) - (Math.log(2) / Math.log(3));
  const shape = 7.8590 * c + 2.9554 * c * c;

  // Scale and location
  const gamma1 = gammaFunction(1 + shape);
  const gamma2 = gammaFunction(1 + 2 * shape);

  const scale = (lm.l2 * shape) / ((1 - Math.pow(2, -shape)) * gamma1);
  const location = lm.l1 - scale * (1 - gamma1) / shape;

  return {
    distribution: 'gev',
    location,
    scale,
    shape,
  };
}

/**
 * Gamma function approximation (Lanczos)
 */
function gammaFunction(z: number): number {
  const g = 7;
  const C = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];

  if (z < 0.5) {
    return Math.PI / (Math.sin(Math.PI * z) * gammaFunction(1 - z));
  }

  z -= 1;
  let x = C[0];
  for (let i = 1; i < g + 2; i++) {
    x += C[i] / (z + i);
  }

  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

// ============================================================================
// Quantile Estimation
// ============================================================================

/**
 * Calculate flood quantile for given distribution and return period
 */
export function calculateQuantile(
  params: DistributionParameters,
  returnPeriod: number
): number {
  switch (params.distribution) {
    case 'gumbel': {
      const K = gumbelFrequencyFactor(returnPeriod);
      return params.location + K * params.scale / SQRT6_PI;
    }

    case 'log_pearson_iii': {
      const K = logPearsonIIIFrequencyFactor(returnPeriod, params.shape || 0);
      const logQ = params.location + K * params.scale;
      return Math.pow(10, logQ);
    }

    case 'log_normal_2p': {
      const z = normalInverseCDF(1 - 1 / returnPeriod);
      const logQ = params.location + z * params.scale;
      return Math.exp(logQ);
    }

    case 'gev': {
      return gevQuantile(
        returnPeriod,
        params.location,
        params.scale,
        params.shape || 0
      );
    }

    case 'normal': {
      const z = normalInverseCDF(1 - 1 / returnPeriod);
      return params.location + z * params.scale;
    }

    default:
      throw new Error(`Unsupported distribution: ${params.distribution}`);
  }
}

/**
 * Calculate quantiles with confidence intervals
 */
export function calculateQuantileWithConfidence(
  params: DistributionParameters,
  returnPeriod: number,
  recordLength: number,
  confidenceLevel: number = 0.95
): FloodQuantile {
  const discharge = calculateQuantile(params, returnPeriod);
  const probability = 1 / returnPeriod;

  // Standard error (approximate)
  // Uses asymptotic formula for Gumbel-like distributions
  const alpha = 1 - confidenceLevel;
  const z = normalInverseCDF(1 - alpha / 2);

  // Approximate standard error
  const K = gumbelFrequencyFactor(returnPeriod);
  const se = (params.scale / SQRT6_PI) *
    Math.sqrt((1 + 1.14 * K + 1.1 * K * K) / recordLength);

  const lowerBound = discharge - z * se;
  const upperBound = discharge + z * se;

  return {
    returnPeriod,
    probability,
    discharge,
    lowerBound: Math.max(0, lowerBound),
    upperBound,
    standardError: se,
  };
}

// ============================================================================
// Goodness of Fit Tests
// ============================================================================

/**
 * Chi-square goodness of fit test
 */
export function chiSquareTest(
  observed: number[],
  params: DistributionParameters,
  numBins: number = 5
): { statistic: number; pValue: number; degreesOfFreedom: number } {
  const n = observed.length;
  const sorted = [...observed].sort((a, b) => a - b);

  // Create bins with equal expected frequency
  const expectedPerBin = n / numBins;
  const binCounts = new Array(numBins).fill(0);

  // Assign observations to bins based on CDF
  for (const x of sorted) {
    // Calculate cumulative probability
    let p: number;
    if (params.distribution === 'gumbel') {
      const y = (x - params.location) / (params.scale / SQRT6_PI);
      p = Math.exp(-Math.exp(-y));
    } else {
      // Approximate using rank
      const rank = sorted.indexOf(x) + 1;
      p = rank / (n + 1);
    }

    const binIndex = Math.min(Math.floor(p * numBins), numBins - 1);
    binCounts[binIndex]++;
  }

  // Calculate chi-square statistic
  let chiSquare = 0;
  for (const count of binCounts) {
    chiSquare += Math.pow(count - expectedPerBin, 2) / expectedPerBin;
  }

  // Degrees of freedom = bins - 1 - parameters
  const numParams = params.shape !== undefined ? 3 : 2;
  const df = Math.max(1, numBins - 1 - numParams);

  // Approximate p-value (using Wilson-Hilferty)
  const pValue = 1 - normalCDF(Math.pow(chiSquare / df, 1/3));

  return { statistic: chiSquare, pValue, degreesOfFreedom: df };
}

/**
 * Kolmogorov-Smirnov test
 */
export function kolmogorovSmirnovTest(
  observed: number[],
  params: DistributionParameters
): { statistic: number; pValue: number } {
  const n = observed.length;
  const sorted = [...observed].sort((a, b) => a - b);

  let maxD = 0;

  for (let i = 0; i < n; i++) {
    const x = sorted[i];

    // Empirical CDF
    const Fn = (i + 1) / n;

    // Theoretical CDF
    let F: number;
    if (params.distribution === 'gumbel') {
      const y = (x - params.location) / (params.scale / SQRT6_PI);
      F = Math.exp(-Math.exp(-y));
    } else if (params.distribution === 'log_normal_2p') {
      const z = (Math.log(x) - params.location) / params.scale;
      F = normalCDF(z);
    } else {
      F = i / n;  // Fallback
    }

    maxD = Math.max(maxD, Math.abs(Fn - F));
  }

  // Approximate p-value
  const lambda = (Math.sqrt(n) + 0.12 + 0.11 / Math.sqrt(n)) * maxD;
  const pValue = 2 * Math.exp(-2 * lambda * lambda);

  return { statistic: maxD, pValue: Math.max(0, Math.min(1, pValue)) };
}

// ============================================================================
// Complete Frequency Analysis
// ============================================================================

/**
 * Perform complete flood frequency analysis
 */
export function analyzeFloodFrequency(
  records: FloodRecord[],
  options: {
    distribution?: DistributionType;
    plottingPosition?: PlottingPositionMethod;
    confidenceLevel?: number;
    returnPeriods?: number[];
  } = {}
): FrequencyAnalysisResult {
  const recommendations: string[] = [];

  // Default options
  const dist = options.distribution || 'log_pearson_iii';
  const plotMethod = options.plottingPosition || 'gringorten';
  const confLevel = options.confidenceLevel || 0.95;
  const returnPeriods = options.returnPeriods || STANDARD_RETURN_PERIODS;

  // Extract peak values
  const peaks = records.map(r => r.peak).filter(p => p > 0);
  const n = peaks.length;

  if (n < 10) {
    recommendations.push('Registro < 10 años - considerar análisis regional');
  }

  // Calculate statistics
  const stats = {
    mean: mean(peaks),
    standardDeviation: standardDeviation(peaks),
    skewness: skewness(peaks),
    kurtosis: kurtosis(peaks),
    coefficientOfVariation: coefficientOfVariation(peaks),
    minimum: Math.min(...peaks),
    maximum: Math.max(...peaks),
  };

  // Fit distribution
  let params: DistributionParameters;
  switch (dist) {
    case 'gumbel':
      params = fitGumbelLMoments(peaks);
      break;
    case 'log_pearson_iii':
      params = fitLogPearsonIII(peaks);
      break;
    case 'log_normal_2p':
      params = fitLogNormal2P(peaks);
      break;
    case 'gev':
      params = fitGEVLMoments(peaks);
      break;
    default:
      params = fitLogPearsonIII(peaks);
  }

  // Goodness of fit tests
  const chiTest = chiSquareTest(peaks, params);
  const ksTest = kolmogorovSmirnovTest(peaks, params);

  const goodnessOfFit = {
    chiSquare: chiTest.statistic,
    kolmogorovSmirnov: ksTest.statistic,
    probability: ksTest.pValue,
    isAcceptable: ksTest.pValue > 0.05,
  };

  if (!goodnessOfFit.isAcceptable) {
    recommendations.push('Ajuste estadístico pobre - considerar otra distribución');
  }

  // Calculate quantiles
  const quantiles = returnPeriods.map(T =>
    calculateQuantileWithConfidence(params, T, n, confLevel)
  );

  // Plotting data
  const plottingData = rankFloodData(records, plotMethod);

  // Additional recommendations
  if (stats.skewness < -0.5 || stats.skewness > 0.5) {
    if (dist === 'gumbel') {
      recommendations.push('Asimetría significativa - considerar Log-Pearson III');
    }
  }
  if (stats.coefficientOfVariation > 0.5) {
    recommendations.push('Alta variabilidad - aumentar margen de seguridad');
  }

  // Record period
  const years = records.map(r => r.year).sort((a, b) => a - b);

  return {
    station: 'Analysis',
    recordLength: n,
    recordPeriod: { start: years[0], end: years[years.length - 1] },
    statistics: stats,
    distributionFit: params,
    goodnessOfFit,
    quantiles,
    plottingData,
    recommendations,
  };
}

/**
 * Quick flood estimate for a single return period
 */
export function quickFloodEstimate(
  records: FloodRecord[],
  returnPeriod: number,
  distribution: DistributionType = 'log_pearson_iii'
): { discharge: number; lowerBound: number; upperBound: number } {
  const peaks = records.map(r => r.peak).filter(p => p > 0);

  let params: DistributionParameters;
  switch (distribution) {
    case 'gumbel':
      params = fitGumbelLMoments(peaks);
      break;
    case 'log_pearson_iii':
      params = fitLogPearsonIII(peaks);
      break;
    default:
      params = fitLogPearsonIII(peaks);
  }

  const quantile = calculateQuantileWithConfidence(params, returnPeriod, peaks.length);

  return {
    discharge: quantile.discharge,
    lowerBound: quantile.lowerBound,
    upperBound: quantile.upperBound,
  };
}

// ============================================================================
// Regional Frequency Analysis
// ============================================================================

/**
 * Calculate index flood for a station (mean annual maximum)
 */
export function calculateIndexFlood(records: FloodRecord[]): number {
  const peaks = records.map(r => r.peak).filter(p => p > 0);
  return mean(peaks);
}

/**
 * Standardize flood data by index flood
 */
export function standardizeByIndexFlood(records: FloodRecord[]): number[] {
  const indexFlood = calculateIndexFlood(records);
  return records.map(r => r.peak / indexFlood);
}

/**
 * Check regional homogeneity (Hosking & Wallis H statistic)
 */
export function checkRegionalHomogeneity(
  stationData: Map<string, FloodRecord[]>
): { H: number; isHomogeneous: boolean; discordantStations: string[] } {
  const discordant: string[] = [];

  // Calculate L-moments for each station
  const stationLMoments: Map<string, LMoments> = new Map();
  const stationLengths: Map<string, number> = new Map();

  for (const [name, records] of stationData) {
    const standardized = standardizeByIndexFlood(records);
    stationLMoments.set(name, calculateLMoments(standardized));
    stationLengths.set(name, records.length);
  }

  // Calculate regional weighted average L-moments
  let totalN = 0;
  let regionalT3 = 0;
  let regionalT4 = 0;

  for (const [name, lm] of stationLMoments) {
    const n = stationLengths.get(name) || 0;
    totalN += n;
    regionalT3 += n * lm.t3;
    regionalT4 += n * lm.t4;
  }

  regionalT3 /= totalN;
  regionalT4 /= totalN;

  // Calculate H statistic (simplified)
  let V = 0;
  for (const [name, lm] of stationLMoments) {
    const n = stationLengths.get(name) || 0;
    V += n * Math.pow(lm.t3 - regionalT3, 2);
  }
  V = Math.sqrt(V / totalN);

  // H statistic (approximation)
  const H = V / 0.1;  // Simplified - actual requires simulation

  // Check for discordant stations
  for (const [name, lm] of stationLMoments) {
    const D = Math.pow(lm.t3 - regionalT3, 2) + Math.pow(lm.t4 - regionalT4, 2);
    if (D > 3) {
      discordant.push(name);
    }
  }

  return {
    H,
    isHomogeneous: H < 2,
    discordantStations: discordant,
  };
}

/**
 * Perform regional frequency analysis
 */
export function performRegionalAnalysis(
  stationData: Map<string, FloodRecord[]>,
  distribution: DistributionType = 'gev'
): RegionalAnalysisResult {
  // Check homogeneity
  const homogeneity = checkRegionalHomogeneity(stationData);

  // Pool standardized data
  const allStandardized: number[] = [];
  for (const [, records] of stationData) {
    allStandardized.push(...standardizeByIndexFlood(records));
  }

  // Fit regional distribution
  let regionalParams: DistributionParameters;
  switch (distribution) {
    case 'gev':
      regionalParams = fitGEVLMoments(allStandardized);
      break;
    case 'gumbel':
      regionalParams = fitGumbelLMoments(allStandardized);
      break;
    default:
      regionalParams = fitGEVLMoments(allStandardized);
  }

  // Generate growth curve
  const growthCurve = STANDARD_RETURN_PERIODS.map(T => ({
    returnPeriod: T,
    growthFactor: calculateQuantile(regionalParams, T),
  }));

  // Calculate at-site quantiles
  const atSiteQuantiles: Map<string, FloodQuantile[]> = new Map();

  for (const [name, records] of stationData) {
    const indexFlood = calculateIndexFlood(records);
    const quantiles = growthCurve.map(gc => ({
      returnPeriod: gc.returnPeriod,
      probability: 1 / gc.returnPeriod,
      discharge: indexFlood * gc.growthFactor,
      lowerBound: indexFlood * gc.growthFactor * 0.8,
      upperBound: indexFlood * gc.growthFactor * 1.2,
      standardError: indexFlood * gc.growthFactor * 0.1,
    }));
    atSiteQuantiles.set(name, quantiles);
  }

  return {
    region: 'Regional Analysis',
    stations: Array.from(stationData.keys()),
    homogeneityTest: {
      statistic: homogeneity.H,
      isHomogeneous: homogeneity.isHomogeneous,
      discordantStations: homogeneity.discordantStations,
    },
    regionalParameters: regionalParams,
    growthCurve,
    atSiteQuantiles,
  };
}

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Format frequency analysis result
 */
export function formatFrequencyAnalysis(result: FrequencyAnalysisResult): string {
  const lines = [
    '═══════════════════════════════════════════════════════',
    '         ANÁLISIS DE FRECUENCIA DE CRECIDAS',
    '═══════════════════════════════════════════════════════',
    '',
    `Estación: ${result.station}`,
    `Período: ${result.recordPeriod.start} - ${result.recordPeriod.end}`,
    `Longitud de registro: ${result.recordLength} años`,
    '',
    '--- ESTADÍSTICAS ---',
    `  Media: ${result.statistics.mean.toFixed(1)} m³/s`,
    `  Desviación estándar: ${result.statistics.standardDeviation.toFixed(1)} m³/s`,
    `  Coef. variación: ${(result.statistics.coefficientOfVariation * 100).toFixed(1)}%`,
    `  Asimetría: ${result.statistics.skewness.toFixed(3)}`,
    `  Mínimo: ${result.statistics.minimum.toFixed(1)} m³/s`,
    `  Máximo: ${result.statistics.maximum.toFixed(1)} m³/s`,
    '',
    '--- DISTRIBUCIÓN AJUSTADA ---',
    `  Tipo: ${result.distributionFit.distribution}`,
    `  Parámetro de posición: ${result.distributionFit.location.toFixed(4)}`,
    `  Parámetro de escala: ${result.distributionFit.scale.toFixed(4)}`,
  ];

  if (result.distributionFit.shape !== undefined) {
    lines.push(`  Parámetro de forma: ${result.distributionFit.shape.toFixed(4)}`);
  }

  lines.push(
    '',
    '--- BONDAD DE AJUSTE ---',
    `  Chi-cuadrado: ${result.goodnessOfFit.chiSquare.toFixed(2)}`,
    `  Kolmogorov-Smirnov: ${result.goodnessOfFit.kolmogorovSmirnov.toFixed(4)}`,
    `  Valor-p: ${result.goodnessOfFit.probability.toFixed(4)}`,
    `  Ajuste: ${result.goodnessOfFit.isAcceptable ? 'Aceptable' : 'No aceptable'}`,
    '',
    '--- CUANTILES DE DISEÑO ---',
    '  T (años)    Q (m³/s)    Límite inf.    Límite sup.',
    '  ─────────────────────────────────────────────────────'
  );

  for (const q of result.quantiles) {
    lines.push(
      `  ${q.returnPeriod.toString().padStart(6)}     ` +
      `${q.discharge.toFixed(1).padStart(8)}     ` +
      `${q.lowerBound.toFixed(1).padStart(10)}     ` +
      `${q.upperBound.toFixed(1).padStart(10)}`
    );
  }

  if (result.recommendations.length > 0) {
    lines.push('', '--- RECOMENDACIONES ---');
    result.recommendations.forEach(r => lines.push(`  • ${r}`));
  }

  lines.push('═══════════════════════════════════════════════════════');
  return lines.join('\n');
}

/**
 * Format plotting position data for export
 */
export function formatPlottingData(
  plottingData: FrequencyAnalysisResult['plottingData']
): string {
  const lines = [
    'Año,Caudal (m³/s),Rango,Probabilidad,Período Retorno (años)',
  ];

  for (const p of plottingData) {
    lines.push(
      `${p.year},${p.observed.toFixed(1)},${p.rank},${p.probability.toFixed(4)},${p.returnPeriod.toFixed(1)}`
    );
  }

  return lines.join('\n');
}
