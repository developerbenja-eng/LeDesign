'use client';

import { useState, useEffect } from 'react';
import { useCubicacionStore } from '@/stores/cubicacion-store';
import { useInfrastructureStore } from '@/stores/infrastructure-store';
import { CATEGORY_LABELS } from '@/lib/cubicacion/types';
import type { CubicacionItem, CubicacionCategory } from '@/lib/cubicacion/types';
import { SERVIU_ITEMS, searchServiuItems } from '@/lib/cubicacion/serviu-itemizado';

interface CubicacionPanelProps {
  projectId?: string;
  projectName: string;
  onClose: () => void;
}

type TabType = 'overview' | 'items' | 'add' | 'config';

export function CubicacionPanel({ projectId, projectName, onClose }: CubicacionPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Cubicacion store
  const {
    cubicaciones,
    activeCubicacion,
    loadCubicaciones,
    createCubicacion,
    saveCubicacion,
    generateFromInfrastructure,
    isLoading,
    isSaving,
    isGenerating,
  } = useCubicacionStore();

  // Infrastructure store for entity count
  const { infrastructureEntities } = useInfrastructureStore();

  // Load cubicaciones on mount
  useEffect(() => {
    if (projectId) {
      loadCubicaciones(projectId);
    }
  }, [projectId, loadCubicaciones]);

  const entityCount = infrastructureEntities.size;

  return (
    <div className="bg-cad-panel border border-gray-700 rounded-lg shadow-xl w-[420px] max-h-[85vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div>
          <h3 className="text-white font-medium flex items-center gap-2">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Cubicaci&oacute;n
          </h3>
          <p className="text-gray-400 text-xs">{projectName} &bull; {entityCount} elementos</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {[
          { id: 'overview', label: 'Resumen' },
          { id: 'items', label: 'Partidas' },
          { id: 'add', label: 'Agregar' },
          { id: 'config', label: 'Config' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'overview' && (
          <OverviewView
            projectId={projectId}
            cubicaciones={cubicaciones}
            activeCubicacion={activeCubicacion}
            entityCount={entityCount}
            onCreateCubicacion={async (name) => {
              await createCubicacion(name);
            }}
            onGenerate={generateFromInfrastructure}
            onSave={saveCubicacion}
            isLoading={isLoading}
            isSaving={isSaving}
            isGenerating={isGenerating}
          />
        )}
        {activeTab === 'items' && <ItemsView activeCubicacion={activeCubicacion} />}
        {activeTab === 'add' && <AddItemView />}
        {activeTab === 'config' && <ConfigView />}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-700 text-xs text-gray-500 text-center">
        Itemizado SERVIU • Precios referencia 2024
      </div>
    </div>
  );
}

// ============================================================================
// Overview View
// ============================================================================

interface OverviewViewProps {
  projectId?: string;
  cubicaciones: ReturnType<typeof useCubicacionStore.getState>['cubicaciones'];
  activeCubicacion: ReturnType<typeof useCubicacionStore.getState>['activeCubicacion'];
  entityCount: number;
  onCreateCubicacion: (name: string) => Promise<void>;
  onGenerate: () => void;
  onSave: () => Promise<void>;
  isLoading: boolean;
  isSaving: boolean;
  isGenerating: boolean;
}

function OverviewView({
  projectId,
  cubicaciones,
  activeCubicacion,
  entityCount,
  onCreateCubicacion,
  onGenerate,
  onSave,
  isLoading,
  isSaving,
  isGenerating,
}: OverviewViewProps) {
  const [newName, setNewName] = useState('');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
      </div>
    );
  }

  // No cubicacion yet
  if (!activeCubicacion) {
    return (
      <div className="space-y-4">
        <div className="text-center py-4">
          <div className="text-gray-400 mb-4">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No hay cubicaci&oacute;n creada</p>
            <p className="text-xs mt-1">
              {entityCount > 0
                ? `${entityCount} elementos de infraestructura disponibles`
                : 'Dibuja elementos de infraestructura primero'}
            </p>
          </div>
        </div>

        {entityCount > 0 && (
          <div className="space-y-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre de la cubicaci&oacute;n..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
            />
            <button
              onClick={() => onCreateCubicacion(newName || 'Cubicaci&oacute;n Principal')}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Generar Cubicaci&oacute;n
            </button>
          </div>
        )}
      </div>
    );
  }

  // Has cubicacion - show summary
  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-white font-medium">{activeCubicacion.name}</h4>
          <p className="text-gray-400 text-xs">
            v{activeCubicacion.version} &bull; {activeCubicacion.status}
          </p>
        </div>
        <span className={`px-2 py-0.5 rounded text-xs ${
          activeCubicacion.status === 'approved' ? 'bg-green-900 text-green-300' :
          activeCubicacion.status === 'review' ? 'bg-yellow-900 text-yellow-300' :
          'bg-gray-700 text-gray-300'
        }`}>
          {activeCubicacion.status === 'draft' ? 'Borrador' :
           activeCubicacion.status === 'review' ? 'En revisi&oacute;n' :
           activeCubicacion.status === 'approved' ? 'Aprobado' : 'Final'}
        </span>
      </div>

      {/* Grand total */}
      <div className="bg-gray-800 rounded-lg p-4 text-center">
        <p className="text-gray-400 text-xs mb-1">Total Presupuesto</p>
        <p className="text-2xl font-bold text-green-400">
          ${activeCubicacion.grandTotal.toLocaleString('es-CL')}
        </p>
        <p className="text-gray-500 text-xs mt-1">
          {activeCubicacion.currency} &bull; {activeCubicacion.items.length} partidas
        </p>
      </div>

      {/* Subtotals by category */}
      <div className="space-y-2">
        <h5 className="text-gray-400 text-xs font-medium uppercase">Por Categor&iacute;a</h5>
        {activeCubicacion.subtotals.map((subtotal) => (
          <div key={subtotal.category} className="flex items-center justify-between py-1">
            <span className="text-gray-300 text-sm">{subtotal.categoryLabel}</span>
            <div className="text-right">
              <span className="text-white text-sm font-medium">
                ${subtotal.total.toLocaleString('es-CL')}
              </span>
              <span className="text-gray-500 text-xs ml-2">
                ({subtotal.percentage.toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-sm transition-colors flex items-center justify-center gap-1"
        >
          {isGenerating ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          Regenerar
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded text-sm transition-colors flex items-center justify-center gap-1"
        >
          {isSaving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          )}
          Guardar
        </button>
      </div>

      {/* Last generated */}
      {activeCubicacion.lastAutoGenerated && (
        <p className="text-gray-500 text-xs text-center">
          Generado: {new Date(activeCubicacion.lastAutoGenerated).toLocaleString('es-CL')}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Items View
// ============================================================================

interface ItemsViewProps {
  activeCubicacion: ReturnType<typeof useCubicacionStore.getState>['activeCubicacion'];
}

function ItemsView({ activeCubicacion }: ItemsViewProps) {
  const [filterCategory, setFilterCategory] = useState<CubicacionCategory | ''>('');
  const [searchTerm, setSearchTerm] = useState('');

  const { updateItemQuantity, deleteItem, setSelectedItem, selectedItemId } = useCubicacionStore();

  if (!activeCubicacion) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>Genera una cubicaci&oacute;n primero</p>
      </div>
    );
  }

  const filteredItems = activeCubicacion.items.filter((item) => {
    if (filterCategory && item.category !== filterCategory) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        item.description.toLowerCase().includes(term) ||
        item.serviuCode.toLowerCase().includes(term)
      );
    }
    return true;
  });

  // Group by category
  const itemsByCategory = new Map<CubicacionCategory, CubicacionItem[]>();
  for (const item of filteredItems) {
    const existing = itemsByCategory.get(item.category) || [];
    itemsByCategory.set(item.category, [...existing, item]);
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar partida..."
          className="flex-1 px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as CubicacionCategory | '')}
          className="px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-sm text-white focus:border-green-500 focus:outline-none"
        >
          <option value="">Todas</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Items list */}
      <div className="space-y-4">
        {Array.from(itemsByCategory.entries()).map(([category, items]) => (
          <div key={category}>
            <h5 className="text-gray-400 text-xs font-medium uppercase mb-2 flex items-center justify-between">
              <span>{CATEGORY_LABELS[category]}</span>
              <span className="text-gray-500">{items.length} items</span>
            </h5>
            <div className="space-y-1">
              {items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  isSelected={selectedItemId === item.id}
                  onSelect={() => setSelectedItem(item.id)}
                  onUpdateQuantity={(qty) => updateItemQuantity(item.id, qty)}
                  onDelete={() => deleteItem(item.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          No se encontraron partidas
        </div>
      )}
    </div>
  );
}

interface ItemRowProps {
  item: CubicacionItem;
  isSelected: boolean;
  onSelect: () => void;
  onUpdateQuantity: (qty: number) => void;
  onDelete: () => void;
}

function ItemRow({ item, isSelected, onSelect, onUpdateQuantity, onDelete }: ItemRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editQty, setEditQty] = useState(item.quantity.toString());

  return (
    <div
      onClick={onSelect}
      className={`p-2 rounded cursor-pointer transition-colors ${
        isSelected ? 'bg-gray-700 border border-green-500' : 'bg-gray-800 hover:bg-gray-750 border border-transparent'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xs font-mono">{item.serviuCode}</span>
            {item.isManualOverride && (
              <span className="px-1 py-0.5 bg-yellow-900 text-yellow-300 text-[10px] rounded">Manual</span>
            )}
          </div>
          <p className="text-gray-300 text-sm truncate">{item.shortDescription || item.description}</p>
        </div>
        <div className="text-right ml-2">
          <p className="text-white text-sm font-medium">${item.totalPrice.toLocaleString('es-CL')}</p>
          {isEditing ? (
            <input
              type="number"
              value={editQty}
              onChange={(e) => setEditQty(e.target.value)}
              onBlur={() => {
                const val = parseFloat(editQty);
                if (!isNaN(val) && val >= 0) {
                  onUpdateQuantity(val);
                }
                setIsEditing(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = parseFloat(editQty);
                  if (!isNaN(val) && val >= 0) {
                    onUpdateQuantity(val);
                  }
                  setIsEditing(false);
                }
              }}
              className="w-20 px-1 py-0.5 bg-gray-700 border border-green-500 rounded text-xs text-white text-right focus:outline-none"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <p
              className="text-gray-400 text-xs cursor-pointer hover:text-green-400"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
            >
              {item.quantity.toFixed(2)} {item.unit}
            </p>
          )}
        </div>
      </div>
      {isSelected && (
        <div className="mt-2 pt-2 border-t border-gray-600 flex justify-between items-center">
          <span className="text-gray-500 text-xs">P.U: ${item.unitPrice.toLocaleString('es-CL')}/{item.unit}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-red-400 hover:text-red-300 text-xs"
          >
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Add Item View
// ============================================================================

function AddItemView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<typeof SERVIU_ITEMS[0] | null>(null);
  const [quantity, setQuantity] = useState('1');
  const { addItem, activeCubicacion } = useCubicacionStore();

  const searchResults = searchTerm.length >= 2 ? searchServiuItems(searchTerm) : [];

  const handleAdd = () => {
    if (!selectedItem || !activeCubicacion) return;

    const qty = parseFloat(quantity) || 1;
    addItem({
      serviuCode: selectedItem.code,
      description: selectedItem.description,
      shortDescription: selectedItem.shortDescription,
      category: selectedItem.category,
      unit: selectedItem.unit,
      quantity: qty,
      unitPrice: selectedItem.basePrice,
      sourceEntityIds: [],
    });

    setSelectedItem(null);
    setQuantity('1');
    setSearchTerm('');
  };

  if (!activeCubicacion) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>Genera una cubicaci&oacute;n primero</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-gray-400 text-xs mb-1">Buscar Partida SERVIU</label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Ej: excavaci&oacute;n, tuber&iacute;a, c&aacute;mara..."
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
        />
      </div>

      {/* Search results */}
      {searchResults.length > 0 && !selectedItem && (
        <div className="max-h-48 overflow-y-auto space-y-1">
          {searchResults.slice(0, 10).map((item) => (
            <button
              key={item.code}
              onClick={() => setSelectedItem(item)}
              className="w-full text-left p-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-xs font-mono">{item.code}</span>
                <span className="text-gray-400 text-xs">{item.unit}</span>
              </div>
              <p className="text-gray-300 text-sm">{item.shortDescription}</p>
              <p className="text-green-400 text-xs">${item.basePrice.toLocaleString('es-CL')}</p>
            </button>
          ))}
        </div>
      )}

      {/* Selected item */}
      {selectedItem && (
        <div className="bg-gray-800 rounded p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs font-mono">{selectedItem.code}</span>
            <button
              onClick={() => setSelectedItem(null)}
              className="text-gray-400 hover:text-white text-xs"
            >
              Cambiar
            </button>
          </div>
          <p className="text-white text-sm">{selectedItem.description}</p>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-gray-400 text-xs mb-1">Cantidad ({selectedItem.unit})</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="0"
                step="0.01"
                className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:border-green-500 focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-gray-400 text-xs mb-1">P. Unitario</label>
              <p className="text-green-400 text-sm py-1.5">${selectedItem.basePrice.toLocaleString('es-CL')}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-700">
            <span className="text-gray-400 text-sm">Total:</span>
            <span className="text-white font-medium">
              ${(selectedItem.basePrice * (parseFloat(quantity) || 0)).toLocaleString('es-CL')}
            </span>
          </div>

          <button
            onClick={handleAdd}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium text-sm transition-colors"
          >
            Agregar Partida
          </button>
        </div>
      )}

      {searchTerm.length >= 2 && searchResults.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-4">
          No se encontraron partidas
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Config View
// ============================================================================

function ConfigView() {
  const {
    generatorConfig,
    region,
    terrainType,
    setGeneratorConfig,
    setRegion,
    setTerrainType,
  } = useCubicacionStore();

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-gray-400 text-xs mb-1">Regi&oacute;n</label>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="w-full px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-sm text-white focus:border-green-500 focus:outline-none"
        >
          <option value="Metropolitana">Metropolitana</option>
          <option value="Valpara&iacute;so">Valpara&iacute;so</option>
          <option value="Biob&iacute;o">Biob&iacute;o</option>
          <option value="Araucan&iacute;a">Araucan&iacute;a</option>
          <option value="Los Lagos">Los Lagos</option>
          <option value="Coquimbo">Coquimbo</option>
          <option value="Maule">Maule</option>
          <option value="O'Higgins">O&apos;Higgins</option>
        </select>
        <p className="text-gray-500 text-xs mt-1">Ajusta precios seg&uacute;n regi&oacute;n</p>
      </div>

      <div>
        <label className="block text-gray-400 text-xs mb-1">Tipo de Terreno</label>
        <select
          value={terrainType}
          onChange={(e) => setTerrainType(parseInt(e.target.value) as 1 | 2 | 3)}
          className="w-full px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-sm text-white focus:border-green-500 focus:outline-none"
        >
          <option value={1}>Tipo I - Blando (arena, tierra vegetal)</option>
          <option value={2}>Tipo II - Semi-duro (arcilla, grava)</option>
          <option value={3}>Tipo III - Duro (roca, bolones)</option>
        </select>
        <p className="text-gray-500 text-xs mt-1">Afecta costos de excavaci&oacute;n</p>
      </div>

      <div>
        <label className="block text-gray-400 text-xs mb-1">Ancho M&iacute;nimo Zanja (m)</label>
        <input
          type="number"
          value={generatorConfig.minTrenchWidth}
          onChange={(e) => setGeneratorConfig({ minTrenchWidth: parseFloat(e.target.value) || 0.6 })}
          step="0.1"
          min="0.4"
          className="w-full px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-sm text-white focus:border-green-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-gray-400 text-xs mb-1">Espesor Cama de Apoyo (m)</label>
        <input
          type="number"
          value={generatorConfig.defaultBeddingThickness}
          onChange={(e) => setGeneratorConfig({ defaultBeddingThickness: parseFloat(e.target.value) || 0.15 })}
          step="0.05"
          min="0.10"
          className="w-full px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-sm text-white focus:border-green-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-gray-400 text-xs mb-1">Overtapado (recubrimiento) (m)</label>
        <input
          type="number"
          value={generatorConfig.defaultOvertapado}
          onChange={(e) => setGeneratorConfig({ defaultOvertapado: parseFloat(e.target.value) || 1.0 })}
          step="0.1"
          min="0.6"
          className="w-full px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-sm text-white focus:border-green-500 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="applyContingency"
          checked={generatorConfig.applyContingency}
          onChange={(e) => setGeneratorConfig({ applyContingency: e.target.checked })}
          className="rounded bg-gray-700 border-gray-600 text-green-500 focus:ring-green-500"
        />
        <label htmlFor="applyContingency" className="text-gray-300 text-sm">
          Aplicar contingencia ({generatorConfig.contingencyPercent}%)
        </label>
      </div>

      <div className="pt-3 border-t border-gray-700">
        <p className="text-gray-500 text-xs">
          Los par&aacute;metros afectan los c&aacute;lculos de vol&uacute;menes para excavaci&oacute;n, cama de apoyo y relleno.
        </p>
      </div>
    </div>
  );
}

export default CubicacionPanel;
