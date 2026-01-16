'use client';

import { useState } from 'react';
import {
  useSettingsStore,
  type UnitSystem,
  type LengthUnit,
  type NumberFormat,
  type DateFormat,
  type Language,
  type DesignStandard,
  type PavementMethod,
  type ExportFormat,
  type ReportTemplate,
} from '@/stores/settings-store';

interface SettingsPanelProps {
  onClose?: () => void;
}

type SettingsTab = 'display' | 'design' | 'defaults' | 'export' | 'ui';

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('display');
  const { settings, resetToDefaults, exportSettings, importSettings } = useSettingsStore();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleExportSettings = () => {
    const data = exportSettings();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lelecad-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        try {
          const data = JSON.parse(text);
          importSettings(data);
        } catch {
          alert('Error al importar configuración');
        }
      }
    };
    input.click();
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 shadow-xl w-[600px] max-h-[700px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-white">Configuracion</h2>
          <p className="text-xs text-gray-400">Preferencias de usuario y valores por defecto</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700 overflow-x-auto">
        {([
          { id: 'display', label: 'Visualizacion' },
          { id: 'design', label: 'Diseno' },
          { id: 'defaults', label: 'Valores' },
          { id: 'export', label: 'Exportar' },
          { id: 'ui', label: 'Interfaz' },
        ] as { id: SettingsTab; label: string }[]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
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
        {activeTab === 'display' && <DisplaySettingsTab />}
        {activeTab === 'design' && <DesignSettingsTab />}
        {activeTab === 'defaults' && <DefaultValuesTab />}
        {activeTab === 'export' && <ExportSettingsTab />}
        {activeTab === 'ui' && <UISettingsTab />}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-700 flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={handleExportSettings}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Exportar Config
          </button>
          <button
            onClick={handleImportSettings}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Importar Config
          </button>
        </div>
        <div className="flex gap-2">
          {showResetConfirm ? (
            <>
              <span className="text-sm text-yellow-400 mr-2">Confirmar reset?</span>
              <button
                onClick={() => {
                  resetToDefaults();
                  setShowResetConfirm(false);
                }}
                className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded"
              >
                Si
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 text-white rounded"
              >
                No
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
            >
              Restaurar Defaults
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// DISPLAY SETTINGS TAB
// ============================================

function DisplaySettingsTab() {
  const { settings, updateDisplaySettings } = useSettingsStore();
  const { display } = settings;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Sistema de Unidades</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Sistema</label>
            <select
              value={display.unitSystem}
              onChange={(e) => updateDisplaySettings({ unitSystem: e.target.value as UnitSystem })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            >
              <option value="metric">Metrico (SI)</option>
              <option value="imperial">Imperial (US)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Longitud</label>
            <select
              value={display.lengthUnit}
              onChange={(e) => updateDisplaySettings({ lengthUnit: e.target.value as LengthUnit })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            >
              <option value="m">Metros (m)</option>
              <option value="cm">Centimetros (cm)</option>
              <option value="km">Kilometros (km)</option>
              <option value="ft">Pies (ft)</option>
              <option value="in">Pulgadas (in)</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Formato de Numeros</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Separador Decimal</label>
            <select
              value={display.numberFormat}
              onChange={(e) => updateDisplaySettings({ numberFormat: e.target.value as NumberFormat })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            >
              <option value="decimal-comma">Coma (1.234,56)</option>
              <option value="decimal-point">Punto (1,234.56)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Decimales por Defecto</label>
            <select
              value={display.decimalPlaces}
              onChange={(e) => updateDisplaySettings({ decimalPlaces: parseInt(e.target.value) })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            >
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Formato de Fecha</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Formato</label>
            <select
              value={display.dateFormat}
              onChange={(e) => updateDisplaySettings({ dateFormat: e.target.value as DateFormat })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY (Chile)</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (USA)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Idioma</label>
            <select
              value={display.language}
              onChange={(e) => updateDisplaySettings({ language: e.target.value as Language })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            >
              <option value="es">Espanol</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// DESIGN SETTINGS TAB
// ============================================

function DesignSettingsTab() {
  const { settings, updateDesignSettings } = useSettingsStore();
  const { design } = settings;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Normativa de Diseno</h3>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Estandar Principal</label>
          <select
            value={design.defaultStandard}
            onChange={(e) => updateDesignSettings({ defaultStandard: e.target.value as DesignStandard })}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          >
            <option value="chile-mop">MOP Chile (Manual de Carreteras)</option>
            <option value="aashto">AASHTO (USA)</option>
            <option value="european">Eurocodes (EU)</option>
          </select>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Metodos de Calculo</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Pavimentos</label>
            <select
              value={design.pavementMethod}
              onChange={(e) => updateDesignSettings({ pavementMethod: e.target.value as PavementMethod })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            >
              <option value="aashto-93">AASHTO 93</option>
              <option value="mepdg">MEPDG</option>
              <option value="shell">Shell</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Alcantarillado</label>
            <select
              value={design.sewerMethod}
              onChange={(e) => updateDesignSettings({ sewerMethod: e.target.value as 'manning' | 'colebrook-white' })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            >
              <option value="manning">Manning</option>
              <option value="colebrook-white">Colebrook-White</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Hidrologia</label>
            <select
              value={design.hydrologyMethod}
              onChange={(e) => updateDesignSettings({ hydrologyMethod: e.target.value as 'rational' | 'scs-cn' | 'idf' })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            >
              <option value="rational">Metodo Racional</option>
              <option value="scs-cn">SCS Curva Numero</option>
              <option value="idf">Curvas IDF</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Factores de Seguridad</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Estructural</label>
            <input
              type="number"
              value={design.safetyFactorStructural}
              onChange={(e) => updateDesignSettings({ safetyFactorStructural: parseFloat(e.target.value) })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              step="0.1"
              min="1.0"
              max="3.0"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Hidraulico</label>
            <input
              type="number"
              value={design.safetyFactorHydraulic}
              onChange={(e) => updateDesignSettings({ safetyFactorHydraulic: parseFloat(e.target.value) })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              step="0.1"
              min="1.0"
              max="2.0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// DEFAULT VALUES TAB
// ============================================

function DefaultValuesTab() {
  const { settings, updateDefaultValues } = useSettingsStore();
  const { defaults } = settings;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Pavimentos (AASHTO 93)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Periodo de Diseno (anos)</label>
            <input
              type="number"
              value={defaults.designPeriodYears}
              onChange={(e) => updateDefaultValues({ designPeriodYears: parseInt(e.target.value) })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              min="5"
              max="40"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Confiabilidad (%)</label>
            <input
              type="number"
              value={defaults.reliabilityPercent}
              onChange={(e) => updateDefaultValues({ reliabilityPercent: parseInt(e.target.value) })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              min="50"
              max="99"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Desviacion Estandar (So)</label>
            <input
              type="number"
              value={defaults.standardDeviationSo}
              onChange={(e) => updateDefaultValues({ standardDeviationSo: parseFloat(e.target.value) })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              step="0.05"
              min="0.30"
              max="0.60"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Serviciabilidad Final (pt)</label>
            <input
              type="number"
              value={defaults.terminalServiceability}
              onChange={(e) => updateDefaultValues({ terminalServiceability: parseFloat(e.target.value) })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              step="0.5"
              min="1.5"
              max="3.5"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Hidraulica</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Manning n (PVC)</label>
            <input
              type="number"
              value={defaults.manningNPvc}
              onChange={(e) => updateDefaultValues({ manningNPvc: parseFloat(e.target.value) })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              step="0.001"
              min="0.008"
              max="0.015"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Manning n (Concreto)</label>
            <input
              type="number"
              value={defaults.manningNConcreto}
              onChange={(e) => updateDefaultValues({ manningNConcreto: parseFloat(e.target.value) })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              step="0.001"
              min="0.010"
              max="0.020"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Manning n (Corrugado)</label>
            <input
              type="number"
              value={defaults.manningNCorrugado}
              onChange={(e) => updateDefaultValues({ manningNCorrugado: parseFloat(e.target.value) })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              step="0.001"
              min="0.018"
              max="0.030"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Pendiente Minima (m/m)</label>
            <input
              type="number"
              value={defaults.minimumSlope}
              onChange={(e) => updateDefaultValues({ minimumSlope: parseFloat(e.target.value) })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              step="0.001"
              min="0.001"
              max="0.01"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Velocidad Max (m/s)</label>
            <input
              type="number"
              value={defaults.maximumVelocity}
              onChange={(e) => updateDefaultValues({ maximumVelocity: parseFloat(e.target.value) })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              step="0.5"
              min="3.0"
              max="8.0"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Geometria Vial</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Peralte Maximo (%)</label>
            <input
              type="number"
              value={defaults.maxSuperelevation}
              onChange={(e) => updateDefaultValues({ maxSuperelevation: parseFloat(e.target.value) })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              step="1"
              min="4"
              max="12"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Tiempo Reaccion (s)</label>
            <input
              type="number"
              value={defaults.perceptionReactionTime}
              onChange={(e) => updateDefaultValues({ perceptionReactionTime: parseFloat(e.target.value) })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              step="0.5"
              min="1.5"
              max="4.0"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Elementos Urbanos</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Ancho Min Vereda (m)</label>
            <input
              type="number"
              value={defaults.sidewalkMinWidth}
              onChange={(e) => updateDefaultValues({ sidewalkMinWidth: parseFloat(e.target.value) })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              step="0.1"
              min="0.9"
              max="3.0"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Pendiente Max Rampa (%)</label>
            <input
              type="number"
              value={defaults.rampMaxSlope}
              onChange={(e) => updateDefaultValues({ rampMaxSlope: parseFloat(e.target.value) })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              step="0.1"
              min="6"
              max="12"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// EXPORT SETTINGS TAB
// ============================================

function ExportSettingsTab() {
  const { settings, updateExportSettings } = useSettingsStore();
  const { export: exportSettings } = settings;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Formato de Exportacion</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Formato por Defecto</label>
            <select
              value={exportSettings.defaultFormat}
              onChange={(e) => updateExportSettings({ defaultFormat: e.target.value as ExportFormat })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            >
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="csv">CSV (.csv)</option>
              <option value="pdf">PDF (.pdf)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Plantilla de Informe</label>
            <select
              value={exportSettings.defaultTemplate}
              onChange={(e) => updateExportSettings({ defaultTemplate: e.target.value as ReportTemplate })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            >
              <option value="standard">Estandar</option>
              <option value="detailed">Detallado</option>
              <option value="summary">Resumen</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Contenido del Informe</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={exportSettings.includeCharts}
              onChange={(e) => updateExportSettings({ includeCharts: e.target.checked })}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600"
            />
            <span className="text-sm text-gray-300">Incluir graficos y diagramas</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={exportSettings.includeTechnicalNotes}
              onChange={(e) => updateExportSettings({ includeTechnicalNotes: e.target.checked })}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600"
            />
            <span className="text-sm text-gray-300">Incluir notas tecnicas</span>
          </label>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Informacion del Profesional</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nombre de Empresa</label>
            <input
              type="text"
              value={exportSettings.companyName}
              onChange={(e) => updateExportSettings({ companyName: e.target.value })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              placeholder="Ingenieria Civil XYZ Ltda."
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nombre del Ingeniero</label>
            <input
              type="text"
              value={exportSettings.engineerName}
              onChange={(e) => updateExportSettings({ engineerName: e.target.value })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              placeholder="Ing. Juan Perez"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">URL del Logo (opcional)</label>
            <input
              type="url"
              value={exportSettings.logoUrl}
              onChange={(e) => updateExportSettings({ logoUrl: e.target.value })}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              placeholder="https://..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// UI SETTINGS TAB
// ============================================

function UISettingsTab() {
  const { settings, updateUISettings } = useSettingsStore();
  const { ui } = settings;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Interfaz</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-300">Modo oscuro</span>
            <input
              type="checkbox"
              checked={ui.darkMode}
              onChange={(e) => updateUISettings({ darkMode: e.target.checked })}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-300">Mostrar lineas de grilla</span>
            <input
              type="checkbox"
              checked={ui.showGridLines}
              onChange={(e) => updateUISettings({ showGridLines: e.target.checked })}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-300">Mostrar puntos de snap</span>
            <input
              type="checkbox"
              checked={ui.showSnapPoints}
              onChange={(e) => updateUISettings({ showSnapPoints: e.target.checked })}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-300">Mostrar tooltips</span>
            <input
              type="checkbox"
              checked={ui.showTooltips}
              onChange={(e) => updateUISettings({ showTooltips: e.target.checked })}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-300">Confirmar al eliminar</span>
            <input
              type="checkbox"
              checked={ui.confirmOnDelete}
              onChange={(e) => updateUISettings({ confirmOnDelete: e.target.checked })}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600"
            />
          </label>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Auto-guardado</h3>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Intervalo (segundos)</label>
          <select
            value={ui.autoSaveInterval}
            onChange={(e) => updateUISettings({ autoSaveInterval: parseInt(e.target.value) })}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          >
            <option value="0">Desactivado</option>
            <option value="60">1 minuto</option>
            <option value="120">2 minutos</option>
            <option value="300">5 minutos</option>
            <option value="600">10 minutos</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            0 = desactivado, se guardara solo al cerrar
          </p>
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;
