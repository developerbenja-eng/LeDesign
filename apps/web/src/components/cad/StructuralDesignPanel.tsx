'use client';

import { useState } from 'react';
import { useModuleTracking } from '@/hooks/useModuleTracking';
import {
  Building2,
  Plus,
  Trash2,
  Grid3x3,
  Box,
  Columns3,
  Layers,
  Calculator,
  FileBarChart,
  Settings,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface StructuralDesignPanelProps {
  projectId: string;
}

type StructuralTab = 'nodes' | 'members' | 'materials' | 'loads' | 'analysis' | 'design';

export function StructuralDesignPanel({ projectId }: StructuralDesignPanelProps) {
  const [activeTab, setActiveTab] = useState<StructuralTab>('nodes');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['nodes']));

  // Track module usage for reporting
  useModuleTracking(projectId, 'structural');

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const tabs = [
    { id: 'nodes' as const, label: 'Nudos', icon: <Grid3x3 size={14} /> },
    { id: 'members' as const, label: 'Elementos', icon: <Columns3 size={14} /> },
    { id: 'materials' as const, label: 'Materiales', icon: <Box size={14} /> },
    { id: 'loads' as const, label: 'Cargas', icon: <Layers size={14} /> },
    { id: 'analysis' as const, label: 'Análisis', icon: <Calculator size={14} /> },
    { id: 'design' as const, label: 'Diseño', icon: <FileBarChart size={14} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-white">Diseño Estructural</h2>
        </div>
        <button
          className="p-1 text-slate-400 hover:text-white transition-colors"
          title="Settings"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-2 py-2 border-b border-slate-800 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors
              ${activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeTab === 'nodes' && <NodesSection projectId={projectId} />}
        {activeTab === 'members' && <MembersSection projectId={projectId} />}
        {activeTab === 'materials' && <MaterialsSection projectId={projectId} />}
        {activeTab === 'loads' && <LoadsSection projectId={projectId} />}
        {activeTab === 'analysis' && <AnalysisSection projectId={projectId} />}
        {activeTab === 'design' && <DesignSection projectId={projectId} />}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/50">
        <p className="text-xs text-slate-500">
          Diseño según NCh 430, NCh 433, NCh 2369, ACI 318, AISC 360
        </p>
      </div>
    </div>
  );
}

function NodesSection({ projectId }: { projectId: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-slate-300">Nudos Estructurales</h3>
        <button className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors">
          <Plus size={12} />
          Agregar
        </button>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-3 text-center">
        <Grid3x3 size={32} className="mx-auto mb-2 text-slate-600" />
        <p className="text-xs text-slate-400 mb-2">Sin nudos definidos</p>
        <p className="text-xs text-slate-500">
          Agrega nudos estructurales para comenzar el modelado
        </p>
      </div>

      {/* Example: Node List would go here */}
      <div className="space-y-2">
        {/* Future: List of nodes with coordinates, restraints, etc. */}
      </div>
    </div>
  );
}

function MembersSection({ projectId }: { projectId: string }) {
  const [memberType, setMemberType] = useState<'beam' | 'column' | 'brace'>('beam');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-slate-300">Elementos Estructurales</h3>
        <button className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors">
          <Plus size={12} />
          Agregar
        </button>
      </div>

      {/* Member Type Selector */}
      <div className="flex items-center gap-2 bg-slate-800/50 rounded p-1">
        <button
          onClick={() => setMemberType('beam')}
          className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
            memberType === 'beam'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Vigas
        </button>
        <button
          onClick={() => setMemberType('column')}
          className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
            memberType === 'column'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Columnas
        </button>
        <button
          onClick={() => setMemberType('brace')}
          className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
            memberType === 'brace'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Riostras
        </button>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-3 text-center">
        <Columns3 size={32} className="mx-auto mb-2 text-slate-600" />
        <p className="text-xs text-slate-400 mb-2">Sin elementos definidos</p>
        <p className="text-xs text-slate-500">
          Conecta nudos para crear {memberType === 'beam' ? 'vigas' : memberType === 'column' ? 'columnas' : 'riostras'}
        </p>
      </div>
    </div>
  );
}

function MaterialsSection({ projectId }: { projectId: string }) {
  const [materialType, setMaterialType] = useState<'concrete' | 'steel'>('concrete');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-slate-300">Materiales</h3>
        <button className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors">
          <Plus size={12} />
          Agregar
        </button>
      </div>

      {/* Material Type Selector */}
      <div className="flex items-center gap-2 bg-slate-800/50 rounded p-1">
        <button
          onClick={() => setMaterialType('concrete')}
          className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
            materialType === 'concrete'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Hormigón
        </button>
        <button
          onClick={() => setMaterialType('steel')}
          className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
            materialType === 'steel'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Acero
        </button>
      </div>

      {/* Standard Materials */}
      <div className="space-y-2">
        <p className="text-xs text-slate-400">Materiales Estándar (NCh 430, NCh 433)</p>

        {materialType === 'concrete' && (
          <div className="space-y-1">
            {['H20', 'H25', 'H30', 'H35', 'H40'].map((grade) => (
              <button
                key={grade}
                className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-750 rounded text-left text-xs text-slate-300 transition-colors"
              >
                <div className="font-medium">{grade}</div>
                <div className="text-slate-500">
                  {grade === 'H20' && 'f\'c = 20 MPa'}
                  {grade === 'H25' && 'f\'c = 25 MPa'}
                  {grade === 'H30' && 'f\'c = 30 MPa'}
                  {grade === 'H35' && 'f\'c = 35 MPa'}
                  {grade === 'H40' && 'f\'c = 40 MPa'}
                </div>
              </button>
            ))}
          </div>
        )}

        {materialType === 'steel' && (
          <div className="space-y-1">
            {['A630-420H', 'A630-420N', 'A36', 'A572 Gr.50'].map((grade) => (
              <button
                key={grade}
                className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-750 rounded text-left text-xs text-slate-300 transition-colors"
              >
                <div className="font-medium">{grade}</div>
                <div className="text-slate-500">
                  {grade.includes('A630-420H') && 'fy = 420 MPa (alta adherencia)'}
                  {grade.includes('A630-420N') && 'fy = 420 MPa (normal)'}
                  {grade === 'A36' && 'fy = 250 MPa'}
                  {grade === 'A572 Gr.50' && 'fy = 345 MPa'}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadsSection({ projectId }: { projectId: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-slate-300">Casos de Carga</h3>
        <button className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors">
          <Plus size={12} />
          Agregar
        </button>
      </div>

      {/* Standard Load Cases (NCh 1537, NCh 433) */}
      <div className="space-y-2">
        <p className="text-xs text-slate-400">Casos de Carga Estándar (NCh 1537)</p>

        <div className="space-y-1">
          {[
            { name: 'PP', desc: 'Peso Propio', color: 'bg-slate-600' },
            { name: 'SC', desc: 'Sobrecarga', color: 'bg-blue-600' },
            { name: 'Sx', desc: 'Sismo X', color: 'bg-red-600' },
            { name: 'Sy', desc: 'Sismo Y', color: 'bg-orange-600' },
            { name: 'W', desc: 'Viento', color: 'bg-cyan-600' },
            { name: 'N', desc: 'Nieve', color: 'bg-indigo-600' },
          ].map((loadCase) => (
            <div
              key={loadCase.name}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded"
            >
              <div className={`w-3 h-3 rounded ${loadCase.color}`} />
              <div className="flex-1">
                <div className="text-xs font-medium text-slate-300">{loadCase.name}</div>
                <div className="text-xs text-slate-500">{loadCase.desc}</div>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnalysisSection({ projectId }: { projectId: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-slate-300">Análisis Estructural</h3>
      </div>

      <div className="space-y-2">
        {/* Analysis Type */}
        <div className="bg-slate-800/50 rounded-lg p-3">
          <p className="text-xs font-medium text-slate-300 mb-2">Tipo de Análisis</p>
          <select className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-blue-500">
            <option>Estático Lineal</option>
            <option>Análisis Modal</option>
            <option>Análisis Sísmico (NCh 433)</option>
            <option>P-Delta</option>
          </select>
        </div>

        {/* Run Analysis Button */}
        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors">
          <Calculator size={16} />
          Ejecutar Análisis
        </button>

        {/* Results Summary */}
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <Calculator size={32} className="mx-auto mb-2 text-slate-600" />
          <p className="text-xs text-slate-400 mb-2">Sin resultados</p>
          <p className="text-xs text-slate-500">
            Ejecuta el análisis para ver resultados
          </p>
        </div>
      </div>
    </div>
  );
}

function DesignSection({ projectId }: { projectId: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-slate-300">Diseño de Elementos</h3>
      </div>

      <div className="space-y-2">
        {/* Design Code */}
        <div className="bg-slate-800/50 rounded-lg p-3">
          <p className="text-xs font-medium text-slate-300 mb-2">Norma de Diseño</p>
          <select className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-blue-500">
            <option>NCh 430 (Hormigón)</option>
            <option>NCh 433 (Sismo)</option>
            <option>NCh 2369 (Acero)</option>
            <option>ACI 318-19</option>
            <option>AISC 360-22</option>
          </select>
        </div>

        {/* Combination Method */}
        <div className="bg-slate-800/50 rounded-lg p-3">
          <p className="text-xs font-medium text-slate-300 mb-2">Combinaciones</p>
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600" />
              LRFD (NCh 1537)
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600" />
              ASD
            </label>
          </div>
        </div>

        {/* Run Design Button */}
        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded transition-colors">
          <FileBarChart size={16} />
          Ejecutar Diseño
        </button>

        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <FileBarChart size={32} className="mx-auto mb-2 text-slate-600" />
          <p className="text-xs text-slate-400 mb-2">Sin diseño</p>
          <p className="text-xs text-slate-500">
            Ejecuta el diseño para ver memorias de cálculo
          </p>
        </div>
      </div>
    </div>
  );
}
