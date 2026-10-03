'use client';
import { X } from 'lucide-react';

export default function UserDeleteModal({ isOpen, onClose, onConfirm, userName, loading = false }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold">Confirmation</h3><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <p className="text-gray-600 mb-6">Supprimer <strong>{userName}</strong> ? Cette action est irréversible.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Annuler</button>
          <button onClick={onConfirm} disabled={loading} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">{loading ? '...' : 'Supprimer'}</button>
        </div>
      </div>
    </div>
  );
}