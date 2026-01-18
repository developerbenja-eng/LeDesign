'use client';

/**
 * Calculation Display Component
 *
 * Displays auto-generated calculations from infrastructure entities.
 * Shows inputs, formula, and results with proper formatting.
 */

import type { CalculationContent } from '@/types/documents';
import { LatexPreview } from './LatexPreview';
import { HYDRAULIC_EQUATIONS } from '@/types/documents';

interface CalculationDisplayProps {
  content: CalculationContent;
  onChange?: (content: CalculationContent) => void;
  readOnly?: boolean;
}

// Format numbers for display
function formatNumber(value: number, decimals: number = 4): string {
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString('es-CL', { maximumFractionDigits: decimals });
  }
  if (Math.abs(value) < 0.001 && value !== 0) {
    return value.toExponential(2);
  }
  return value.toFixed(decimals);
}

// Get calculation type display name
function getCalculationTypeName(type: string): string {
  const names: Record<string, string> = {
    manning_flow: 'Cálculo de Caudal (Manning)',
    manning_velocity: 'Cálculo de Velocidad (Manning)',
    hazen_williams: 'Pérdida de Carga (Hazen-Williams)',
    darcy_weisbach: 'Pérdida de Carga (Darcy-Weisbach)',
    rational_method: 'Método Racional',
    harmon: 'Factor de Harmon',
    froude: 'Número de Froude',
    custom: 'Cálculo Personalizado',
  };
  return names[type] || type;
}

// Get the equation latex for a calculation type
function getEquationLatex(type: string): string | null {
  const mapping: Record<string, keyof typeof HYDRAULIC_EQUATIONS> = {
    manning_flow: 'manning',
    manning_velocity: 'manning',
    hazen_williams: 'hazenWilliams',
    darcy_weisbach: 'darcyWeisbach',
    rational_method: 'rational',
    harmon: 'harmon',
    froude: 'froude',
  };

  const key = mapping[type];
  return key ? HYDRAULIC_EQUATIONS[key].latex : null;
}

export function CalculationDisplay({ content, onChange, readOnly = false }: CalculationDisplayProps) {
  const equationLatex = getEquationLatex(content.calculationType);
  const inputEntries = Object.entries(content.inputs);
  const resultEntries = Object.entries(content.results);

  const handleInputChange = (key: string, value: string) => {
    if (readOnly || !onChange) return;
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    onChange({
      ...content,
      inputs: {
        ...content.inputs,
        [key]: {
          ...content.inputs[key],
          value: numValue
        }
      }
    });
  };

  return (
    <div className="calculation-display space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-800">
          {getCalculationTypeName(content.calculationType)}
        </h4>
        {content.sourceEntityIds && content.sourceEntityIds.length > 0 && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
            {content.sourceEntityIds.length} entidad(es) vinculada(s)
          </span>
        )}
      </div>

      {/* Equation */}
      {equationLatex && (
        <div className="p-4 bg-gray-50 rounded-lg text-center">
          <LatexPreview latex={equationLatex} displayMode />
        </div>
      )}

      {/* Inputs */}
      {inputEntries.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-gray-700">Datos de entrada:</h5>
          <div className="grid grid-cols-2 gap-3">
            {inputEntries.map(([key, input]) => (
              <div
                key={key}
                className="flex items-center justify-between p-2 bg-white border rounded"
              >
                <span className="text-sm text-gray-600">{input.label}</span>
                <div className="flex items-center gap-1">
                  {readOnly ? (
                    <span className="font-mono text-sm">
                      {formatNumber(input.value)}
                    </span>
                  ) : (
                    <input
                      type="number"
                      value={input.value}
                      onChange={(e) => handleInputChange(key, e.target.value)}
                      className="w-20 px-2 py-1 text-sm font-mono text-right border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      step="any"
                    />
                  )}
                  <span className="text-xs text-gray-500 min-w-[40px]">
                    {input.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {resultEntries.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-gray-700">Resultados:</h5>
          <div className="space-y-2">
            {resultEntries.map(([key, result]) => (
              <div
                key={key}
                className="p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">
                    {result.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-mono font-semibold text-green-700">
                      {formatNumber(result.value)}
                    </span>
                    <span className="text-sm text-gray-500">{result.unit}</span>
                  </div>
                </div>
                {result.formula && (
                  <div className="mt-2 pt-2 border-t border-green-200">
                    <p className="text-xs text-gray-500">
                      <LatexPreview latex={result.formula} displayMode={false} />
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NCh Reference */}
      {content.nchReference && (
        <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
          Referencia normativa: {content.nchReference}
        </div>
      )}
    </div>
  );
}

export default CalculationDisplay;
