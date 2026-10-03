// app/admin/users/[id]/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

// ============================================================
// Types
// ============================================================
interface AdminUser {
  name?: string
  email?: string
  phone?: string
  role?: string
  is_admin?: boolean | number
  is_active?: boolean | number
  is_verified?: boolean | number
  country?: string
  city?: string
  timezone?: string
  language?: string
  currency?: string
  whatsapp_opt_in?: boolean | number
}

interface UserResponse {
  success?: boolean
  user?: AdminUser
  error?: string
}

export default function EditUserPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const userId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'user',
    is_admin: false,
    is_active: true,
    is_verified: true,
    country: '',
    city: '',
    timezone: '',
    language: 'fr',
    currency: 'XAF',
    whatsapp_opt_in: false,
  });

  // Charger les données de l'utilisateur
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/admin/users?id=${userId}`, {
          credentials: 'include',
        });

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Utilisateur non trouvé');
          }
          throw new Error('Erreur lors du chargement');
        }

        const data = (await res.json()) as UserResponse

        if (data.success && data.user) {
          const user = data.user;
          setForm({
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            role: user.role || 'user',
            is_admin: !!user.is_admin,
            is_active: !!user.is_active,
            is_verified: !!user.is_verified,
            country: user.country || '',
            city: user.city || '',
            timezone: user.timezone || '',
            language: user.language || 'fr',
            currency: user.currency || 'XAF',
            whatsapp_opt_in: !!user.whatsapp_opt_in,
          });
        } else {
          throw new Error('Données utilisateur invalides');
        }
      } catch (err: any) {
        console.error('Erreur chargement:', err);
        setError(err.message || 'Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };

    if (userId && !isNaN(userId)) {
      fetchUser();
    }
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          role: form.role,
          is_admin: form.is_admin,
          is_active: form.is_active,
          is_verified: form.is_verified,
          country: form.country,
          city: form.city,
          timezone: form.timezone,
          language: form.language,
          currency: form.currency,
          whatsapp_opt_in: form.whatsapp_opt_in ? 1 : 0,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as UserResponse
        throw new Error(data.error || 'Erreur lors de la mise à jour')
      }

      router.push(`/admin/users/${userId}`);
      router.refresh();
    } catch (err: any) {
      console.error('Erreur mise à jour:', err);
      setError(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Chargement de l'utilisateur...</p>
        </div>
      </div>
    );
  }

  if (error && !form.name) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
          <Link href="/admin/users" className="mt-4 inline-block text-blue-600 hover:underline">
            Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/users/${userId}`}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Modifier l'utilisateur
            </h1>
          </div>
          <Link
            href="/admin/users"
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition"
          >
            Liste des utilisateurs
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nom */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Téléphone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                value={form.phone || ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+237 6XX XX XX XX"
              />
            </div>

            {/* Rôle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rôle
              </label>
              <select
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

            {/* Pays */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pays
              </label>
              <input
                type="text"
                value={form.country || ''}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Cameroun"
              />
            </div>

            {/* Ville */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ville
              </label>
              <input
                type="text"
                value={form.city || ''}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Douala"
              />
            </div>

            {/* Fuseau horaire */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fuseau horaire
              </label>
              <input
                type="text"
                value={form.timezone || ''}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Africa/Douala"
              />
            </div>

            {/* Langue */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Langue
              </label>
              <select
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>

            {/* Devise */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Devise
              </label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="XAF">FCFA (XAF)</option>
                <option value="NGN">Naira (NGN)</option>
                <option value="USD">Dollar (USD)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            </div>
          </div>

          {/* Options */}
          <div className="flex flex-wrap gap-6 pt-4 border-t">
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
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.whatsapp_opt_in}
                onChange={(e) => setForm({ ...form, whatsapp_opt_in: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              WhatsApp Opt-In
            </label>
          </div>

          {/* Boutons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Link
              href={`/admin/users/${userId}`}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer les modifications'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}