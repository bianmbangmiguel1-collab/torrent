'use client';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function UserForm({ isOpen, onClose, onSubmit, initialData, loading = false }: any) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    is_admin: false,
    is_active: true,
    is_verified: true,
    phone: ''
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || '',
        email: initialData.email || '',
        password: '',
        role: initialData.role || 'user',
        is_admin: !!initialData.is_admin,
        is_active: initialData.is_active !== undefined ? !!initialData.is_active : true,
        is_verified: initialData.is_verified !== undefined ? !!initialData.is_verified : true,
        phone: initialData.phone || '',
      });
    } else {
      setForm({
        name: '',
        email: '',
        password: '',
        role: 'user',
        is_admin: false,
        is_active: true,
        is_verified: true,
        phone: ''
      });
    }
  }, [initialData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{initialData ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input
                id="name"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoComplete="name"
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Jean Dupont"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="jean@email.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe {initialData ? '(laisser vide pour conserver)' : '*'}
            </label>
            <input
              id="password"
              type="password"
              required={!initialData}
              value={form.password || ''}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete={initialData ? 'current-password' : 'new-password'}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={initialData ? '••••••••' : 'Nouveau mot de passe'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
              <select
                id="role"
                value={form.role}
                onChange={(e) => {
                  const isAdmin = e.target.value === 'admin';
                  setForm({ ...form, role: e.target.value, is_admin: isAdmin });
                }}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="user">Utilisateur</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input
                id="phone"
                type="tel"
                value={form.phone || ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                autoComplete="tel"
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+237 6XX XX XX XX"
              />
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              Actif
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.is_verified}
                onChange={(e) => setForm({ ...form, is_verified: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              Vérifié
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enregistrement...' : initialData ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}