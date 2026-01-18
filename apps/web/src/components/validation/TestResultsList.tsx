'use client';

import { useValidationStore } from '@/stores/validation-store';
import { VERIFICATION_STATUS_LABELS } from '@/types/validation';
import type { TestResult } from '@/types/validation';

function StatusIcon({ status }: { status: TestResult['status'] }) {
  switch (status) {
    case 'passed':
      return <span className="text-green-400 text-lg">✓</span>;
    case 'failed':
      return <span className="text-red-400 text-lg">✗</span>;
    case 'skipped':
      return <span className="text-yellow-400 text-lg">○</span>;
  }
}

function VerificationBadge({ result }: { result: TestResult }) {
  if (!result.verification_count || result.verification_count === 0) {
    return null;
  }

  const latestStatus = result.latest_verification?.verification_status;
  const statusInfo = latestStatus ? VERIFICATION_STATUS_LABELS[latestStatus] : null;

  if (!statusInfo) return null;

  const colorClasses: Record<string, string> = {
    verified: 'bg-blue-900/50 text-blue-400 border-blue-700',
    disputed: 'bg-orange-900/50 text-orange-400 border-orange-700',
    needs_review: 'bg-purple-900/50 text-purple-400 border-purple-700',
  };

  return (
    <span className={`px-2 py-0.5 text-xs rounded border ${colorClasses[latestStatus] || ''}`}>
      {statusInfo.label}
      {result.verification_count > 1 && ` (${result.verification_count})`}
    </span>
  );
}

export function TestResultsList() {
  const { getFilteredResults, selectedResultId, selectResult, isLoadingRun } = useValidationStore();
  const results = getFilteredResults();

  if (isLoadingRun) {
    return (
      <div className="p-8 text-center text-gray-400">
        Cargando resultados...
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400">
        No hay resultados que coincidan con los filtros
      </div>
    );
  }

  // Group results by suite
  const groupedResults = results.reduce((acc, result) => {
    const key = result.suite;
    if (!acc[key]) acc[key] = [];
    acc[key].push(result);
    return acc;
  }, {} as Record<string, TestResult[]>);

  return (
    <div className="divide-y divide-gray-700">
      {Object.entries(groupedResults).map(([suite, suiteResults]) => (
        <div key={suite}>
          {/* Suite header */}
          <div className="bg-gray-800/50 px-4 py-2 text-sm font-medium text-gray-400 sticky top-0">
            {suite}
            <span className="ml-2 text-xs">
              ({suiteResults.filter(r => r.status === 'passed').length}/{suiteResults.length})
            </span>
          </div>

          {/* Tests in suite */}
          {suiteResults.map((result) => (
            <button
              key={result.id}
              onClick={() => selectResult(result.id)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                selectedResultId === result.id
                  ? 'bg-blue-900/30 border-l-2 border-blue-500'
                  : 'hover:bg-gray-800/50'
              }`}
            >
              <StatusIcon status={result.status} />

              <div className="flex-1 min-w-0">
                <div className="text-white truncate">{result.test_name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">
                    {result.duration_ms}ms
                  </span>
                  {result.reference_standard && (
                    <span className="text-xs text-gray-500">
                      {result.reference_standard}
                    </span>
                  )}
                </div>
              </div>

              <VerificationBadge result={result} />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
