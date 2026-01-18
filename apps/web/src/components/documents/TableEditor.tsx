'use client';

/**
 * Table Editor Component
 *
 * Editable table with add/remove rows and columns.
 * Supports caption and alignment options.
 */

import { useState, useCallback } from 'react';
import type { TableContent } from '@/types/documents';

interface TableEditorProps {
  content: TableContent;
  onChange: (content: TableContent) => void;
}

export function TableEditor({ content, onChange }: TableEditorProps) {
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);

  const updateHeader = useCallback((colIndex: number, value: string) => {
    const newHeaders = [...content.headers];
    newHeaders[colIndex] = value;
    onChange({ ...content, headers: newHeaders });
  }, [content, onChange]);

  const updateCell = useCallback((rowIndex: number, colIndex: number, value: string) => {
    const newRows = content.rows.map((row, rIdx) =>
      rIdx === rowIndex
        ? row.map((cell, cIdx) => cIdx === colIndex ? value : cell)
        : row
    );
    onChange({ ...content, rows: newRows });
  }, [content, onChange]);

  const addColumn = useCallback(() => {
    const newHeaders = [...content.headers, `Columna ${content.headers.length + 1}`];
    const newRows = content.rows.map(row => [...row, '']);
    onChange({ ...content, headers: newHeaders, rows: newRows });
  }, [content, onChange]);

  const removeColumn = useCallback((colIndex: number) => {
    if (content.headers.length <= 1) return;
    const newHeaders = content.headers.filter((_, idx) => idx !== colIndex);
    const newRows = content.rows.map(row => row.filter((_, idx) => idx !== colIndex));
    onChange({ ...content, headers: newHeaders, rows: newRows });
  }, [content, onChange]);

  const addRow = useCallback(() => {
    const newRow = content.headers.map(() => '');
    onChange({ ...content, rows: [...content.rows, newRow] });
  }, [content, onChange]);

  const removeRow = useCallback((rowIndex: number) => {
    const newRows = content.rows.filter((_, idx) => idx !== rowIndex);
    onChange({ ...content, rows: newRows });
  }, [content, onChange]);

  const updateCaption = useCallback((caption: string) => {
    onChange({ ...content, caption });
  }, [content, onChange]);

  return (
    <div className="table-editor space-y-3">
      {/* Caption */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">Título de tabla:</label>
        <input
          type="text"
          value={content.caption || ''}
          onChange={(e) => updateCaption(e.target.value)}
          placeholder="Tabla 1: Descripción..."
          className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              {content.headers.map((header, colIdx) => (
                <th key={colIdx} className="relative group">
                  <input
                    type="text"
                    value={header}
                    onChange={(e) => updateHeader(colIdx, e.target.value)}
                    className="w-full px-3 py-2 bg-transparent text-center font-medium focus:outline-none focus:bg-blue-50"
                  />
                  {content.headers.length > 1 && (
                    <button
                      onClick={() => removeColumn(colIdx)}
                      className="absolute top-0 right-0 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                      title="Eliminar columna"
                    >
                      ×
                    </button>
                  )}
                </th>
              ))}
              <th className="w-10">
                <button
                  onClick={addColumn}
                  className="p-1 text-gray-400 hover:text-blue-500"
                  title="Agregar columna"
                >
                  +
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {content.rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-t group">
                {row.map((cell, colIdx) => (
                  <td key={colIdx} className="relative">
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => updateCell(rowIdx, colIdx, e.target.value)}
                      onFocus={() => setEditingCell({ row: rowIdx, col: colIdx })}
                      onBlur={() => setEditingCell(null)}
                      className={`w-full px-3 py-2 text-center focus:outline-none ${
                        editingCell?.row === rowIdx && editingCell?.col === colIdx
                          ? 'bg-blue-50'
                          : ''
                      }`}
                    />
                  </td>
                ))}
                <td className="w-10 text-center">
                  <button
                    onClick={() => removeRow(rowIdx)}
                    className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                    title="Eliminar fila"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add row button */}
      <button
        onClick={addRow}
        className="w-full py-2 text-sm text-gray-500 border border-dashed rounded hover:bg-gray-50 hover:text-gray-700"
      >
        + Agregar fila
      </button>

      {/* Summary */}
      <p className="text-xs text-gray-400 text-right">
        {content.headers.length} columnas × {content.rows.length} filas
      </p>
    </div>
  );
}

export default TableEditor;
