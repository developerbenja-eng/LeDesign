'use client';

import { useState } from 'react';
import { useValidationStore } from '@/stores/validation-store';
import { VERIFICATION_ROLES, VERIFICATION_STATUS_LABELS, type VerificationStatus } from '@/types/validation';

export function VerificationModal() {
  const { closeVerificationModal, submitVerification, getSelectedResult } = useValidationStore();
  const result = getSelectedResult();

  const [formData, setFormData] = useState({
    verified_by_name: '',
    verified_by_email: '',
    verified_by_role: '',
    verification_status: 'verified' as VerificationStatus,
    comment: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await submitVerification(formData);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!result) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Verificar Test</h2>
          <button
            onClick={closeVerificationModal}
            className="text-gray-400 hover:text-white p-1"
          >
            ✕
          </button>
        </div>

        {/* Test Info */}
        <div className="px-6 py-4 bg-gray-750 border-b border-gray-700">
          <div className="text-sm text-gray-400">{result.suite}</div>
          <div className="text-white font-medium">{result.test_name}</div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Nombre <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.verified_by_name}
              onChange={(e) => setFormData({ ...formData, verified_by_name: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="Tu nombre completo"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email (opcional)
            </label>
            <input
              type="email"
              value={formData.verified_by_email}
              onChange={(e) => setFormData({ ...formData, verified_by_email: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="tu@email.com"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Rol (opcional)
            </label>
            <select
              value={formData.verified_by_role}
              onChange={(e) => setFormData({ ...formData, verified_by_role: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Seleccionar rol...</option>
              {VERIFICATION_ROLES.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Estado de Verificación <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(VERIFICATION_STATUS_LABELS) as [VerificationStatus, { label: string; color: string }][]).map(([status, info]) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFormData({ ...formData, verification_status: status })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                    formData.verification_status === status
                      ? 'border-2'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                  style={{
                    borderColor: formData.verification_status === status ? info.color : undefined,
                    backgroundColor: formData.verification_status === status ? `${info.color}20` : 'transparent',
                    color: formData.verification_status === status ? info.color : '#9ca3af',
                  }}
                >
                  {info.label}
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Comentario (opcional)
            </label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              rows={3}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 resize-none"
              placeholder="Añade notas sobre la verificación..."
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={closeVerificationModal}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Verificación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
