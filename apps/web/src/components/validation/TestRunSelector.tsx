'use client';

import { useValidationStore } from '@/stores/validation-store';

export function TestRunSelector() {
  const { runs, selectedRunId, selectRun, currentRun } = useValidationStore();

  if (runs.length === 0) {
    return (
      <div className="text-gray-400 text-sm">
        No hay ejecuciones de tests disponibles
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex items-center gap-4">
      <select
        value={selectedRunId || ''}
        onChange={(e) => selectRun(e.target.value)}
        className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white min-w-[280px]"
      >
        {runs.map((run) => (
          <option key={run.id} value={run.id}>
            {formatDate(run.timestamp)} - {run.branch || 'N/A'} ({run.passed}/{run.total_tests})
          </option>
        ))}
      </select>

      {currentRun && (
        <div className="flex items-center gap-3 text-sm">
          <span className="px-2 py-1 bg-green-900/50 text-green-400 rounded">
            {currentRun.passed} pasados
          </span>
          {currentRun.failed > 0 && (
            <span className="px-2 py-1 bg-red-900/50 text-red-400 rounded">
              {currentRun.failed} fallidos
            </span>
          )}
          {currentRun.skipped > 0 && (
            <span className="px-2 py-1 bg-yellow-900/50 text-yellow-400 rounded">
              {currentRun.skipped} omitidos
            </span>
          )}
        </div>
      )}
    </div>
  );
}
