// app/admin/newsletter/subscribers/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, X, Loader2 } from 'lucide-react';

// ============================================================
// Types de réponses API
// ============================================================
interface CreateSubscriberResponse {
  error?: string;
}

export default function NewSubscriberPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    country: '',
    source: 'website',
    preferences: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Effacer l'erreur du champ modifié
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }
    
    if (formData.phone && !/^[+]?[\d\s()-]{8,20}$/.test(formData.phone)) {
      newErrors.phone = 'Numéro de téléphone invalide';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/admin/newsletter/subscribers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = (await response.json()) as CreateSubscriberResponse;

      if (response.ok) {
        // Rediriger vers la liste des abonnés
        router.push('/admin/newsletter/subscribers?success=created');
        router.refresh();
      } else {
        setErrors({ submit: data.error || 'Erreur lors de la création' });
      }
    } catch (error) {
      console.error('Erreur:', error);
      setErrors({ submit: 'Erreur réseau. Veuillez réessayer.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/newsletter/subscribers"
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">➕ Nouvel abonné</h1>
              <p className="text-gray-600 text-sm">Ajoutez un nouveau contact à votre liste de diffusion</p>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {errors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="exemple@email.com"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Nom */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nom complet
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Jean Dupont"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                disabled={loading}
              />
            </div>

            {/* Téléphone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+33 6 12 34 56 78"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
              )}
            </div>

            {/* Pays */}
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                Pays
              </label>
              <input
                type="text"
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="France, Belgique, Suisse..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                disabled={loading}
              />
            </div>

            {/* Source */}
            <div>
              <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-1">
                Source
              </label>
              <select
                id="source"
                name="source"
                value={formData.source}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                disabled={loading}
              >
                <option value="website">Site web</option>
                <option value="newsletter">Newsletter</option>
                <option value="social">Réseaux sociaux</option>
                <option value="manual">Saisie manuelle</option>
                <option value="partner">Partenaire</option>
                <option value="event">Événement</option>
                <option value="other">Autre</option>
              </select>
            </div>

            {/* Préférences */}
            <div>
              <label htmlFor="preferences" className="block text-sm font-medium text-gray-700 mb-1">
                Préférences
              </label>
              <textarea
                id="preferences"
                name="preferences"
                value={formData.preferences}
                onChange={handleChange}
                rows={3}
                placeholder="Catégories d'email préférées, fréquence, etc."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                disabled={loading}
              />
            </div>

            {/* Boutons */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Créer l'abonné
                  </>
                )}
              </button>
              <Link
                href="/admin/newsletter/subscribers"
                className="flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <X className="w-4 h-4" />
                Annuler
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}