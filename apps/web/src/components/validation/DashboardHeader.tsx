'use client';

import { useValidationStore } from '@/stores/validation-store';

export function DashboardHeader() {
  const { filters, setFilter, resetFilters, getFilteredResults, currentRun } = useValidationStore();
  const filteredCount = getFilteredResults().length;

  return (
    <div className="bg-gray-800/50 border-b border-gray-700 px-6 py-3">
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Buscar tests..."
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Status Filter */}
        <select
          value={filters.status}
          onChange={(e) => setFilter('status', e.target.value as typeof filters.status)}
          className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
        >
          <option value="all">Todos los estados</option>
          <option value="passed">Pasados</option>
          <option value="failed">Fallidos</option>
          <option value="skipped">Omitidos</option>
        </select>

        {/* Verification Filter */}
        <select
          value={filters.verification}
          onChange={(e) => setFilter('verification', e.target.value as typeof filters.verification)}
          className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
        >
          <option value="all">Todas las verificaciones</option>
          <option value="verified">Verificados</option>
          <option value="unverified">Sin verificar</option>
          <option value="disputed">Disputados</option>
          <option value="needs_review">Necesita revisión</option>
        </select>

        {/* Reset Filters */}
        {(filters.search || filters.status !== 'all' || filters.verification !== 'all' || filters.module) && (
          <button
            onClick={resetFilters}
            className="px-3 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Limpiar filtros
          </button>
        )}

        {/* Results count */}
        <div className="text-gray-400 text-sm">
          {filteredCount} de {currentRun?.total_tests || 0} tests
        </div>
      </div>
    </div>
  );
}
