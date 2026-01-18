'use client';

import { useValidationStore } from '@/stores/validation-store';
import { VERIFICATION_STATUS_LABELS } from '@/types/validation';

export function TestDetailPanel() {
  const { getSelectedResult, selectResult, openVerificationModal } = useValidationStore();
  const result = getSelectedResult();

  if (!result) {
    return (
      <div className="p-8 text-center text-gray-400">
        Selecciona un test para ver detalles
      </div>
    );
  }

  const statusColors = {
    passed: 'text-green-400 bg-green-900/30',
    failed: 'text-red-400 bg-red-900/30',
    skipped: 'text-yellow-400 bg-yellow-900/30',
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">{result.test_name}</h2>
          <p className="text-gray-400 text-sm mt-1">{result.suite}</p>
        </div>
        <button
          onClick={() => selectResult(null)}
          className="text-gray-400 hover:text-white p-1"
        >
          ✕
        </button>
      </div>

      {/* Status Badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${statusColors[result.status]} mb-6`}>
        <span className="font-medium capitalize">
          {result.status === 'passed' ? 'Pasado' : result.status === 'failed' ? 'Fallido' : 'Omitido'}
        </span>
        <span className="text-sm opacity-70">{result.duration_ms}ms</span>
      </div>

      {/* Error Info (if failed) */}
      {result.status === 'failed' && result.error_message && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
          <h3 className="text-red-400 font-medium mb-2">Error</h3>
          <p className="text-gray-300 font-mono text-sm">{result.error_message}</p>
          {result.error_stack && (
            <details className="mt-2">
              <summary className="text-sm text-gray-400 cursor-pointer">Stack trace</summary>
              <pre className="mt-2 text-xs text-gray-500 overflow-x-auto">{result.error_stack}</pre>
            </details>
          )}
        </div>
      )}

      {/* Values Section */}
      <div className="space-y-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Valores
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {result.expected_value !== null && (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-xs text-gray-400 mb-1">Esperado</div>
              <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                {formatValue(result.expected_value)}
              </pre>
            </div>
          )}

          {result.actual_value !== null && (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-xs text-gray-400 mb-1">Actual</div>
              <pre className={`text-sm font-mono whitespace-pre-wrap ${
                result.status === 'passed' ? 'text-green-400' : 'text-red-400'
              }`}>
                {formatValue(result.actual_value)}
              </pre>
            </div>
          )}
        </div>

        {result.tolerance && (
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">Tolerancia</div>
            <div className="text-white">{result.tolerance}</div>
          </div>
        )}
      </div>

      {/* Formula & Reference */}
      {(result.formula || result.reference_standard) && (
        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Referencia
          </h3>

          {result.formula && (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-xs text-gray-400 mb-1">Fórmula</div>
              <div className="text-white font-mono">{result.formula}</div>
            </div>
          )}

          {result.reference_standard && (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-xs text-gray-400 mb-1">Estándar de Referencia</div>
              <div className="text-white">{result.reference_standard}</div>
            </div>
          )}

          {result.reference_example && (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-xs text-gray-400 mb-1">Ejemplo de Referencia</div>
              <div className="text-white">{result.reference_example}</div>
            </div>
          )}
        </div>
      )}

      {/* Input Parameters */}
      {result.input_parameters && (
        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Parámetros de Entrada
          </h3>
          <div className="bg-gray-800 rounded-lg p-4">
            <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
              {formatValue(result.input_parameters)}
            </pre>
          </div>
        </div>
      )}

      {/* File Location */}
      {result.file_path && (
        <div className="text-sm text-gray-500 mb-6">
          {result.file_path}
          {result.line_number && `:${result.line_number}`}
        </div>
      )}

      {/* Verifications */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Verificaciones
          </h3>
          <button
            onClick={openVerificationModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Añadir Verificación
          </button>
        </div>

        {result.verifications && result.verifications.length > 0 ? (
          <div className="space-y-3">
            {result.verifications.map((verification) => {
              const statusInfo = VERIFICATION_STATUS_LABELS[verification.verification_status];
              return (
                <div
                  key={verification.id}
                  className="bg-gray-800 rounded-lg p-4 border-l-2"
                  style={{ borderColor: statusInfo?.color || '#6b7280' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: `${statusInfo?.color}20`, color: statusInfo?.color }}
                    >
                      {statusInfo?.label || verification.verification_status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(verification.verification_date).toLocaleDateString('es-CL', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="text-sm text-white">
                    <strong>{verification.verified_by_name}</strong>
                    {verification.verified_by_role && (
                      <span className="text-gray-400 ml-2">({verification.verified_by_role})</span>
                    )}
                  </div>
                  {verification.comment && (
                    <p className="text-sm text-gray-400 mt-2">{verification.comment}</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-gray-500 text-sm bg-gray-800 rounded-lg p-4">
            Este test aún no ha sido verificado por el equipo.
          </div>
        )}
      </div>
    </div>
  );
}
