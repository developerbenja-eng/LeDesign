'use client';

import { X, Lightbulb, AlertTriangle, Info, CheckCircle, Wrench } from 'lucide-react';
import {
  useWaterNetworkStore,
  useAISuggestions,
  usePanelActions,
} from '@/stores/water-network/waterNetworkStore';
import type { AISuggestion, SuggestionSeverity } from '@/stores/water-network/types';

const severityIcons: Record<SuggestionSeverity, React.ReactNode> = {
  info: <Info size={16} className="text-blue-400" />,
  warning: <AlertTriangle size={16} className="text-yellow-400" />,
  error: <AlertTriangle size={16} className="text-red-400" />,
};

const severityColors: Record<SuggestionSeverity, string> = {
  info: 'border-blue-500/30 bg-blue-500/10',
  warning: 'border-yellow-500/30 bg-yellow-500/10',
  error: 'border-red-500/30 bg-red-500/10',
};

export function AIAssistantPanel() {
  const suggestions = useAISuggestions();
  const aiEnabled = useWaterNetworkStore((s) => s.aiEnabled);
  const setAIEnabled = useWaterNetworkStore((s) => s.setAIEnabled);
  const dismissSuggestion = useWaterNetworkStore((s) => s.dismissSuggestion);
  const applyAutoFix = useWaterNetworkStore((s) => s.applyAutoFix);
  const { togglePanel } = usePanelActions();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Lightbulb size={20} className="text-yellow-400" />
          <h2 className="text-lg font-semibold text-white">Asistente AI</h2>
        </div>
        <button
          onClick={() => togglePanel('ai')}
          className="p-1 text-slate-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* AI Toggle */}
      <div className="p-4 border-b border-slate-700">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={aiEnabled}
            onChange={(e) => setAIEnabled(e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-300">Activar sugerencias automáticas</span>
        </label>
      </div>

      {/* Suggestions List */}
      <div className="flex-1 overflow-y-auto p-4">
        {suggestions.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            <CheckCircle size={48} className="mx-auto mb-4 opacity-50 text-green-400" />
            <p className="text-sm">Sin sugerencias</p>
            <p className="text-xs mt-1 text-slate-500">
              El asistente analizará tu red automáticamente
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onDismiss={() => dismissSuggestion(suggestion.id)}
                onApplyFix={() => applyAutoFix(suggestion.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="p-4 border-t border-slate-700 bg-slate-900/50">
        <p className="text-xs text-slate-500">
          El asistente AI analiza tu red basándose en la norma NCh 691 y buenas prácticas de diseño.
        </p>
      </div>
    </div>
  );
}

interface SuggestionCardProps {
  suggestion: AISuggestion;
  onDismiss: () => void;
  onApplyFix: () => void;
}

function SuggestionCard({ suggestion, onDismiss, onApplyFix }: SuggestionCardProps) {
  return (
    <div className={`p-3 border rounded-lg ${severityColors[suggestion.severity]}`}>
      <div className="flex items-start gap-2">
        {severityIcons[suggestion.severity]}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white">{suggestion.message}</p>
          <p className="text-xs text-slate-400 mt-1">{suggestion.recommendation}</p>

          {suggestion.elementId && (
            <p className="text-xs text-slate-500 mt-1">
              Elemento: <span className="text-slate-300">{suggestion.elementId}</span>
            </p>
          )}

          <div className="flex gap-2 mt-3">
            {suggestion.autoFixAvailable && (
              <button
                onClick={onApplyFix}
                className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs text-white transition-colors"
              >
                <Wrench size={12} />
                Aplicar corrección
              </button>
            )}
            <button
              onClick={onDismiss}
              className="px-2 py-1 text-xs text-slate-400 hover:text-white transition-colors"
            >
              Ignorar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
