// app/admin/newsletter/templates/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  Sparkles, 
  Brain,
  Users,
  Loader2,
  Plus,
  X,
  Eye
} from 'lucide-react';

// ============================================================
// Types de réponses API
// ============================================================
interface CreateTemplateResponse {
  success?: boolean;
  error?: string;
}

export default function NewTemplatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    content: '',
    type: 'both' as 'admin' | 'ai' | 'both',
    category: 'general',
    variables: [] as string[]
  });
  const [newVariable, setNewVariable] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/newsletter/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = (await response.json()) as CreateTemplateResponse;
      if (data.success) {
        router.push('/admin/newsletter/templates');
      } else {
        alert(data.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const addVariable = () => {
    if (newVariable.trim() && !formData.variables.includes(newVariable.trim())) {
      setFormData(prev => ({
        ...prev,
        variables: [...prev.variables, newVariable.trim()]
      }));
      setNewVariable('');
    }
  };

  const removeVariable = (varName: string) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter(v => v !== varName)
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 admin-panel">
      <div className="max-w-4xl mx-auto">
        {/* En-tête */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/admin/newsletter/templates"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📝 Nouveau template</h1>
            <p className="text-gray-600 text-sm">Créez un template pour l'IA ou l'administration</p>
          </div>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nom */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du template <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Bienvenue, Offre spéciale..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Sujet */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sujet <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Sujet de l'email..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de template
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: 'admin' }))}
                  className={`p-3 border rounded-lg transition flex items-center justify-center gap-2 ${
                    formData.type === 'admin' 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: 'ai' }))}
                  className={`p-3 border rounded-lg transition flex items-center justify-center gap-2 ${
                    formData.type === 'ai' 
                      ? 'border-purple-500 bg-purple-50 text-purple-700' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Brain className="w-4 h-4" />
                  IA
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: 'both' }))}
                  className={`p-3 border rounded-lg transition flex items-center justify-center gap-2 ${
                    formData.type === 'both' 
                      ? 'border-green-500 bg-green-50 text-green-700' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Mixte
                </button>
              </div>
            </div>

            {/* Catégorie */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catégorie
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="general">Général</option>
                <option value="welcome">Bienvenue</option>
                <option value="promotion">Promotion</option>
                <option value="newsletter">Newsletter</option>
                <option value="followup">Relance</option>
                <option value="event">Événement</option>
              </select>
            </div>

            {/* Contenu */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contenu <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                rows={8}
                placeholder="Écrivez votre message ici... Utilisez {{nom}} pour personnaliser"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 Utilisez {'{{nom}}'} pour le prénom, {'{{email}}'} pour l'email, {'{{interet}}'} pour un intérêt
              </p>
            </div>

            {/* Variables */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Variables disponibles
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newVariable}
                  onChange={(e) => setNewVariable(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addVariable())}
                  placeholder="Ajouter une variable..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addVariable}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.variables.map((varName) => (
                  <span key={varName} className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                    {varName}
                    <button
                      type="button"
                      onClick={() => removeVariable(varName)}
                      className="hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Boutons */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Créer le template
              </button>
              <Link
                href="/admin/newsletter/templates"
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Annuler
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}