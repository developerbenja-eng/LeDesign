'use client';

import { useValidationStore } from '@/stores/validation-store';

export function ModuleFilter() {
  const { modules, filters, setFilter } = useValidationStore();

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Módulos
      </h3>

      <div className="space-y-1">
        {/* All modules option */}
        <button
          onClick={() => setFilter('module', null)}
          className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
            !filters.module
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>Todos</span>
            <span className="text-xs opacity-70">
              {modules.reduce((sum, m) => sum + m.total, 0)}
            </span>
          </div>
        </button>

        {/* Individual modules */}
        {modules.map((module) => (
          <button
            key={module.module}
            onClick={() => setFilter('module', module.module)}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
              filters.module === module.module
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="truncate">{module.module}</span>
              <div className="flex items-center gap-1 text-xs">
                {module.failed > 0 && (
                  <span className="text-red-400">{module.failed}</span>
                )}
                {module.failed > 0 && module.passed > 0 && <span className="text-gray-500">/</span>}
                <span className={module.failed > 0 ? 'text-green-400' : 'opacity-70'}>
                  {module.passed}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500"
                style={{ width: `${module.pass_rate}%` }}
              />
            </div>

            {/* Verification indicator */}
            {module.verified > 0 && (
              <div className="mt-1 text-xs text-blue-400">
                {module.verified} verificados
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
