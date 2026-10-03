// app/admin/newsletter/subscribers/[id]/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, X, Loader2, Trash2 } from 'lucide-react';

interface Subscriber {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  country: string | null;
  status: string;
  source: string;
  opt_in: number;
  preferences: string | null;
  subscribed_at: string;
}

interface SubscriberResponse {
  success: boolean;
  subscriber?: Subscriber;
  error?: string;
}

interface SubscriberActionResponse {
  success: boolean;
  error?: string;
}

export default function EditSubscriberPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    country: '',
    status: 'active',
    source: 'website',
    opt_in: 1,
    preferences: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Charger les données de l'abonné
  useEffect(() => {
    const fetchSubscriber = async () => {
      try {
        const response = await fetch(`/api/admin/newsletter/subscribers?id=${id}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 404) {
            router.push('/admin/newsletter/subscribers?error=notfound');
            return;
          }
          throw new Error('Erreur lors du chargement');
        }

        const data = await response.json() as SubscriberResponse;
        if (data.success && data.subscriber) {
          const s = data.subscriber;
          setSubscriber(s);
          setFormData({
            email: s.email || '',
            name: s.name || '',
            phone: s.phone || '',
            country: s.country || '',
            status: s.status || 'active',
            source: s.source || 'website',
            opt_in: s.opt_in || 1,
            preferences: s.preferences || '',
          });
        }
      } catch (error) {
        console.error('Erreur:', error);
        setErrors({ submit: 'Erreur lors du chargement des données' });
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriber();
  }, [id, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked ? 1 : 0 : value,
    }));
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
    
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/newsletter/subscribers?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json() as SubscriberActionResponse;

      if (response.ok) {
        router.push('/admin/newsletter/subscribers?success=updated');
        router.refresh();
      } else {
        setErrors({ submit: data.error || 'Erreur lors de la mise à jour' });
      }
    } catch (error) {
      console.error('Erreur:', error);
      setErrors({ submit: 'Erreur réseau. Veuillez réessayer.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement cet abonné ?')) return;

    try {
      const response = await fetch(`/api/admin/newsletter/subscribers?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        router.push('/admin/newsletter/subscribers?success=deleted');
        router.refresh();
      } else {
        const data = await response.json() as SubscriberActionResponse;
        alert(data.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur réseau');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!subscriber) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Abonné non trouvé</p>
          <Link href="/admin/newsletter/subscribers" className="mt-4 inline-block text-blue-600 hover:underline">
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
              href="/admin/newsletter/subscribers"
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">✏️ Modifier l'abonné</h1>
              <p className="text-gray-600 text-sm">
                {subscriber.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition border border-red-200"
          >
            <Trash2 className="w-4 h-4" />
            Supprimer
          </button>
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
                disabled={saving}
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
                disabled={saving}
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
                disabled={saving}
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
                disabled={saving}
              />
            </div>

            {/* Statut et Opt-in */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Statut
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  disabled={saving}
                >
                  <option value="active">✅ Actif</option>
                  <option value="inactive">❌ Inactif</option>
                </select>
              </div>
              <div>
                <label htmlFor="opt_in" className="block text-sm font-medium text-gray-700 mb-1">
                  Opt-in
                </label>
                <select
                  id="opt_in"
                  name="opt_in"
                  value={formData.opt_in}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  disabled={saving}
                >
                  <option value={1}>✅ Accepté</option>
                  <option value={0}>❌ Refusé</option>
                </select>
              </div>
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
                disabled={saving}
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
                disabled={saving}
              />
            </div>

            {/* Info */}
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
              <p>Inscrit le : {new Date(subscriber.subscribed_at).toLocaleDateString()}</p>
              <p>ID : #{subscriber.id}</p>
            </div>

            {/* Boutons */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Sauvegarder
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