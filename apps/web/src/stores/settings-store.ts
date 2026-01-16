/**
 * User Settings Store
 *
 * Manages user preferences and application settings with localStorage persistence.
 * Settings include display preferences, design standards, default values, and UI options.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================
// TYPES
// ============================================

export type UnitSystem = 'metric' | 'imperial';
export type LengthUnit = 'm' | 'cm' | 'mm' | 'km' | 'ft' | 'in' | 'mi';
export type AreaUnit = 'm2' | 'ha' | 'km2' | 'ft2' | 'ac';
export type VolumeUnit = 'm3' | 'L' | 'ft3' | 'gal';
export type FlowUnit = 'L/s' | 'm3/s' | 'ft3/s' | 'gpm' | 'mgd';
export type PressureUnit = 'mca' | 'kPa' | 'bar' | 'psi';

export type DesignStandard = 'chile-mop' | 'aashto' | 'european';
export type PavementMethod = 'aashto-93' | 'mepdg' | 'shell';
export type SewerMethod = 'manning' | 'colebrook-white';
export type HydrologyMethod = 'rational' | 'scs-cn' | 'idf';

export type NumberFormat = 'decimal-point' | 'decimal-comma';
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
export type Language = 'es' | 'en';

export type ExportFormat = 'xlsx' | 'csv' | 'pdf';
export type ReportTemplate = 'standard' | 'detailed' | 'summary';

export interface DisplaySettings {
  unitSystem: UnitSystem;
  lengthUnit: LengthUnit;
  areaUnit: AreaUnit;
  volumeUnit: VolumeUnit;
  flowUnit: FlowUnit;
  pressureUnit: PressureUnit;
  numberFormat: NumberFormat;
  dateFormat: DateFormat;
  language: Language;
  decimalPlaces: number;
}

export interface DesignSettings {
  defaultStandard: DesignStandard;
  pavementMethod: PavementMethod;
  sewerMethod: SewerMethod;
  hydrologyMethod: HydrologyMethod;
  // Default safety factors
  safetyFactorStructural: number;
  safetyFactorHydraulic: number;
}

export interface DefaultValues {
  // Pavement defaults
  designPeriodYears: number;
  reliabilityPercent: number;
  standardDeviationSo: number;
  terminalServiceability: number;
  // Hydraulic defaults
  manningNPvc: number;
  manningNConcreto: number;
  manningNCorrugado: number;
  minimumSlope: number;
  maximumVelocity: number;
  // Road geometry defaults
  maxSuperelevation: number;
  perceptionReactionTime: number;
  // Urban defaults
  sidewalkMinWidth: number;
  rampMaxSlope: number;
}

export interface ExportSettings {
  defaultFormat: ExportFormat;
  defaultTemplate: ReportTemplate;
  includeCharts: boolean;
  includeTechnicalNotes: boolean;
  companyName: string;
  engineerName: string;
  logoUrl: string;
}

export interface UISettings {
  sidebarCollapsed: boolean;
  showGridLines: boolean;
  showSnapPoints: boolean;
  darkMode: boolean;
  autoSaveInterval: number; // in seconds, 0 = disabled
  confirmOnDelete: boolean;
  showTooltips: boolean;
}

export interface UserSettings {
  display: DisplaySettings;
  design: DesignSettings;
  defaults: DefaultValues;
  export: ExportSettings;
  ui: UISettings;
}

// ============================================
// DEFAULT VALUES
// ============================================

const defaultDisplaySettings: DisplaySettings = {
  unitSystem: 'metric',
  lengthUnit: 'm',
  areaUnit: 'ha',
  volumeUnit: 'm3',
  flowUnit: 'L/s',
  pressureUnit: 'mca',
  numberFormat: 'decimal-comma',
  dateFormat: 'DD/MM/YYYY',
  language: 'es',
  decimalPlaces: 2,
};

const defaultDesignSettings: DesignSettings = {
  defaultStandard: 'chile-mop',
  pavementMethod: 'aashto-93',
  sewerMethod: 'manning',
  hydrologyMethod: 'rational',
  safetyFactorStructural: 1.5,
  safetyFactorHydraulic: 1.2,
};

const defaultDefaultValues: DefaultValues = {
  // Pavement
  designPeriodYears: 20,
  reliabilityPercent: 90,
  standardDeviationSo: 0.45,
  terminalServiceability: 2.5,
  // Hydraulic
  manningNPvc: 0.010,
  manningNConcreto: 0.013,
  manningNCorrugado: 0.024,
  minimumSlope: 0.003,
  maximumVelocity: 5.0,
  // Road geometry
  maxSuperelevation: 8,
  perceptionReactionTime: 2.5,
  // Urban
  sidewalkMinWidth: 1.5,
  rampMaxSlope: 8.33,
};

const defaultExportSettings: ExportSettings = {
  defaultFormat: 'xlsx',
  defaultTemplate: 'standard',
  includeCharts: true,
  includeTechnicalNotes: true,
  companyName: '',
  engineerName: '',
  logoUrl: '',
};

const defaultUISettings: UISettings = {
  sidebarCollapsed: false,
  showGridLines: true,
  showSnapPoints: true,
  darkMode: true,
  autoSaveInterval: 300, // 5 minutes
  confirmOnDelete: true,
  showTooltips: true,
};

// ============================================
// STORE INTERFACE
// ============================================

interface SettingsState {
  settings: UserSettings;

  // Display settings
  setUnitSystem: (unit: UnitSystem) => void;
  setLengthUnit: (unit: LengthUnit) => void;
  setNumberFormat: (format: NumberFormat) => void;
  setLanguage: (lang: Language) => void;
  setDecimalPlaces: (places: number) => void;
  updateDisplaySettings: (updates: Partial<DisplaySettings>) => void;

  // Design settings
  setDesignStandard: (standard: DesignStandard) => void;
  setPavementMethod: (method: PavementMethod) => void;
  updateDesignSettings: (updates: Partial<DesignSettings>) => void;

  // Default values
  updateDefaultValues: (updates: Partial<DefaultValues>) => void;

  // Export settings
  setExportFormat: (format: ExportFormat) => void;
  setReportTemplate: (template: ReportTemplate) => void;
  updateExportSettings: (updates: Partial<ExportSettings>) => void;

  // UI settings
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
  updateUISettings: (updates: Partial<UISettings>) => void;

  // Bulk operations
  resetToDefaults: () => void;
  importSettings: (settings: Partial<UserSettings>) => void;
  exportSettings: () => UserSettings;
}

// ============================================
// STORE IMPLEMENTATION
// ============================================

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: {
        display: defaultDisplaySettings,
        design: defaultDesignSettings,
        defaults: defaultDefaultValues,
        export: defaultExportSettings,
        ui: defaultUISettings,
      },

      // Display settings
      setUnitSystem: (unitSystem) =>
        set((state) => ({
          settings: {
            ...state.settings,
            display: { ...state.settings.display, unitSystem },
          },
        })),

      setLengthUnit: (lengthUnit) =>
        set((state) => ({
          settings: {
            ...state.settings,
            display: { ...state.settings.display, lengthUnit },
          },
        })),

      setNumberFormat: (numberFormat) =>
        set((state) => ({
          settings: {
            ...state.settings,
            display: { ...state.settings.display, numberFormat },
          },
        })),

      setLanguage: (language) =>
        set((state) => ({
          settings: {
            ...state.settings,
            display: { ...state.settings.display, language },
          },
        })),

      setDecimalPlaces: (decimalPlaces) =>
        set((state) => ({
          settings: {
            ...state.settings,
            display: { ...state.settings.display, decimalPlaces },
          },
        })),

      updateDisplaySettings: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            display: { ...state.settings.display, ...updates },
          },
        })),

      // Design settings
      setDesignStandard: (defaultStandard) =>
        set((state) => ({
          settings: {
            ...state.settings,
            design: { ...state.settings.design, defaultStandard },
          },
        })),

      setPavementMethod: (pavementMethod) =>
        set((state) => ({
          settings: {
            ...state.settings,
            design: { ...state.settings.design, pavementMethod },
          },
        })),

      updateDesignSettings: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            design: { ...state.settings.design, ...updates },
          },
        })),

      // Default values
      updateDefaultValues: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            defaults: { ...state.settings.defaults, ...updates },
          },
        })),

      // Export settings
      setExportFormat: (defaultFormat) =>
        set((state) => ({
          settings: {
            ...state.settings,
            export: { ...state.settings.export, defaultFormat },
          },
        })),

      setReportTemplate: (defaultTemplate) =>
        set((state) => ({
          settings: {
            ...state.settings,
            export: { ...state.settings.export, defaultTemplate },
          },
        })),

      updateExportSettings: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            export: { ...state.settings.export, ...updates },
          },
        })),

      // UI settings
      toggleSidebar: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            ui: {
              ...state.settings.ui,
              sidebarCollapsed: !state.settings.ui.sidebarCollapsed,
            },
          },
        })),

      toggleDarkMode: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            ui: { ...state.settings.ui, darkMode: !state.settings.ui.darkMode },
          },
        })),

      updateUISettings: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ui: { ...state.settings.ui, ...updates },
          },
        })),

      // Bulk operations
      resetToDefaults: () =>
        set({
          settings: {
            display: defaultDisplaySettings,
            design: defaultDesignSettings,
            defaults: defaultDefaultValues,
            export: defaultExportSettings,
            ui: defaultUISettings,
          },
        }),

      importSettings: (importedSettings) =>
        set((state) => ({
          settings: {
            display: { ...state.settings.display, ...importedSettings.display },
            design: { ...state.settings.design, ...importedSettings.design },
            defaults: { ...state.settings.defaults, ...importedSettings.defaults },
            export: { ...state.settings.export, ...importedSettings.export },
            ui: { ...state.settings.ui, ...importedSettings.ui },
          },
        })),

      exportSettings: () => get().settings,
    }),
    {
      name: 'lelecad-settings',
      version: 1,
    }
  )
);

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format a number according to user settings
 */
export function formatNumber(
  value: number,
  settings: DisplaySettings,
  decimals?: number
): string {
  const places = decimals ?? settings.decimalPlaces;
  const formatted = value.toFixed(places);

  if (settings.numberFormat === 'decimal-comma') {
    return formatted.replace('.', ',');
  }
  return formatted;
}

/**
 * Parse a number string according to user settings
 */
export function parseNumber(
  value: string,
  settings: DisplaySettings
): number {
  if (settings.numberFormat === 'decimal-comma') {
    return parseFloat(value.replace(',', '.'));
  }
  return parseFloat(value);
}

/**
 * Format a date according to user settings
 */
export function formatDate(
  date: Date,
  settings: DisplaySettings
): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  switch (settings.dateFormat) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    default:
      return `${day}/${month}/${year}`;
  }
}

/**
 * Get the display label for a design standard
 */
export function getStandardLabel(standard: DesignStandard): string {
  switch (standard) {
    case 'chile-mop':
      return 'MOP Chile (Manual de Carreteras)';
    case 'aashto':
      return 'AASHTO (USA)';
    case 'european':
      return 'Eurocodes (EU)';
    default:
      return standard;
  }
}

/**
 * Convert length between units
 */
export function convertLength(
  value: number,
  from: LengthUnit,
  to: LengthUnit
): number {
  // Convert to meters first
  const toMeters: Record<LengthUnit, number> = {
    m: 1,
    cm: 0.01,
    mm: 0.001,
    km: 1000,
    ft: 0.3048,
    in: 0.0254,
    mi: 1609.344,
  };

  const meters = value * toMeters[from];
  return meters / toMeters[to];
}

/**
 * Get unit suffix for display
 */
export function getUnitSuffix(unit: LengthUnit | AreaUnit | VolumeUnit | FlowUnit | PressureUnit): string {
  const suffixes: Record<string, string> = {
    m: 'm',
    cm: 'cm',
    mm: 'mm',
    km: 'km',
    ft: 'ft',
    in: 'in',
    mi: 'mi',
    m2: 'm²',
    ha: 'ha',
    km2: 'km²',
    ft2: 'ft²',
    ac: 'ac',
    m3: 'm³',
    L: 'L',
    ft3: 'ft³',
    gal: 'gal',
    'L/s': 'L/s',
    'm3/s': 'm³/s',
    'ft3/s': 'ft³/s',
    gpm: 'gpm',
    mgd: 'mgd',
    mca: 'm.c.a.',
    kPa: 'kPa',
    bar: 'bar',
    psi: 'psi',
  };

  return suffixes[unit] || unit;
}
