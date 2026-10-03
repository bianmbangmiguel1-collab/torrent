// app/admin/newsletter/templates/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  Eye, 
  Sparkles,
  Brain,
  Loader2,
  Mail,
  Tag,
  Type,
  FileText,
  Users,
  Clock
} from 'lucide-react';

interface Template {
  id: number;
  name: string;
  subject: string;
  content: string;
  type: 'admin' | 'ai' | 'both';
  category: string;
  variables: string[];
  usage_count: number;
  success_rate: number;
  created_at: string;
  updated_at: string;
}

interface TemplateResponse {
  success: boolean;
  template?: Template;
  error?: string;
}

interface TemplateActionResponse {
  success: boolean;
  error?: string;
}

// 🔥 Fonction pour parser les variables
const parseVariables = (variables: unknown): string[] => {
  if (Array.isArray(variables)) {
    return variables.map(String);
  }

  if (typeof variables === 'string') {
    try {
      const parsed = JSON.parse(variables);
      if (Array.isArray(parsed)) {
        return parsed.map(String);
      }
      if (typeof parsed === 'object' && parsed !== null) {
        return Object.keys(parsed);
      }
    } catch {
      if (variables.includes(',')) {
        return variables
          .split(',')
          .map(v => v.trim())
          .filter(Boolean);
      }
      if (variables.trim()) {
        return [variables.trim()];
      }
    }
  }

  return [];
};

// 🔥 Fonction pour formater les variables en string
const formatVariables = (variables: string[]): string => {
  return variables.filter(v => v.trim()).join(',');
};

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    content: '',
    type: 'both' as 'admin' | 'ai' | 'both',
    category: 'general',
    variables: ''
  });

  useEffect(() => {
    if (id) {
      fetchTemplate();
    }
  }, [id]);

  const fetchTemplate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/newsletter/templates/${id}`);
      const data = await response.json() as TemplateResponse;
      if (data.success && data.template) {
        const templateData = data.template;
        setTemplate(templateData);
        
        // Remplir le formulaire
        const variables = parseVariables(templateData.variables);
        setFormData({
          name: templateData.name || '',
          subject: templateData.subject || '',
          content: templateData.content || '',
          type: templateData.type || 'both',
          category: templateData.category || 'general',
          variables: variables.join(', ')
        });
      } else {
        alert('Template non trouvé');
        router.push('/admin/newsletter/templates');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du chargement du template');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Transformer les variables en tableau
      const variablesArray = formData.variables
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);

      const payload = {
        ...formData,
        variables: variablesArray
      };

      const response = await fetch(`/api/admin/newsletter/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json() as TemplateActionResponse;
      if (data.success) {
        alert('✅ Template mis à jour avec succès !');
        router.push('/admin/newsletter/templates');
      } else {
        alert('❌ Erreur: ' + (data.error || 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer ce template définitivement ?')) return;

    try {
      const response = await fetch(`/api/admin/newsletter/templates/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json() as TemplateActionResponse;
      if (data.success) {
        alert('✅ Template supprimé');
        router.push('/admin/newsletter/templates');
      } else {
        alert('❌ Erreur: ' + (data.error || 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const previewTemplate = () => {
    if (!template) return;
    
    // Simuler le rendu avec des variables
    let previewContent = template.content;
    const previewVars = {
      nom: 'Jean Dupont',
      email: 'jean@example.com',
      interet: 'les livres de mathématiques',
      engagement: '75%',
      date: new Date().toLocaleDateString('fr-FR')
    };

    for (const [key, value] of Object.entries(previewVars)) {
      previewContent = previewContent.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    // Ouvrir une fenêtre de prévisualisation
    const win = window.open('', '_blank', 'width=800,height=600');
    if (win) {
      win.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Aperçu: ${template.subject}</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; background: #f9f9f9; }
              .preview-container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .preview-header { border-bottom: 2px solid #7c3aed; padding-bottom: 20px; margin-bottom: 20px; }
              .preview-header h2 { color: #1a1a2e; margin: 0; }
              .preview-header p { color: #666; margin: 5px 0 0 0; }
              .preview-content { color: #333; line-height: 1.8; }
              .preview-footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; }
              .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
              .badge-ai { background: #7c3aed; color: white; }
              .badge-admin { background: #3b82f6; color: white; }
              .badge-both { background: #10b981; color: white; }
            </style>
          </head>
          <body>
            <div class="preview-container">
              <div class="preview-header">
                <h2>📧 ${template.subject}</h2>
                <p>De: TorrentTwist Newsletter</p>
                <p>À: Jean Dupont (jean@example.com)</p>
                <div style="margin-top: 10px;">
                  <span class="badge ${template.type === 'ai' ? 'badge-ai' : template.type === 'admin' ? 'badge-admin' : 'badge-both'}">
                    ${template.type === 'ai' ? '🤖 IA' : template.type === 'admin' ? '👤 Admin' : '✨ Mixte'}
                  </span>
                  <span style="margin-left: 8px; font-size: 12px; color: #666;">Catégorie: ${template.category}</span>
                </div>
              </div>
              <div class="preview-content">
                ${previewContent}
              </div>
              <div class="preview-footer">
                <p>📬 Ceci est un aperçu du template #${template.id}</p>
                <p>Variables disponibles: ${(parseVariables(template.variables) || []).join(', ')}</p>
              </div>
            </div>
          </body>
        </html>
      `);
      win.document.close();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-2" />
          <p className="text-gray-500">Chargement du template...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">Template non trouvé</p>
          <Link href="/admin/newsletter/templates" className="text-purple-600 hover:underline">
            Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/newsletter/templates"
              className="p-2 hover:bg-gray-200 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Mail className="w-6 h-6 text-purple-600" />
                Modifier le template
              </h1>
              <p className="text-sm text-gray-500">
                ID: #{template.id} • Créé le {new Date(template.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={previewTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              <Eye className="w-4 h-4" />
              Aperçu
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="space-y-6">
            {/* Nom */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Tag className="w-4 h-4 inline mr-1" />
                Nom du template *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Ex: Newsletter bienvenue"
                required
              />
            </div>

            {/* Sujet */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Type className="w-4 h-4 inline mr-1" />
                Sujet *
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Ex: Bienvenue sur TorrentTwist !"
                required
              />
            </div>

            {/* Contenu */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FileText className="w-4 h-4 inline mr-1" />
                Contenu (HTML) *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                rows={12}
                placeholder="<h1>Bonjour {{nom}} !</h1><p>Bienvenue sur TorrentTwist...</p>"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Utilisez {'{{nom}}'}, {'{{email}}'}, {'{{interet}}'}, {'{{engagement}}'} pour personnaliser
              </p>
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Users className="w-4 h-4 inline mr-1" />
                Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="admin"
                    checked={formData.type === 'admin'}
                    onChange={(e) => setFormData({ ...formData, type: 'admin' as 'admin' })}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-sm">👤 Admin</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="ai"
                    checked={formData.type === 'ai'}
                    onChange={(e) => setFormData({ ...formData, type: 'ai' as 'ai' })}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-sm">🤖 IA</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="both"
                    checked={formData.type === 'both'}
                    onChange={(e) => setFormData({ ...formData, type: 'both' as 'both' })}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-sm">✨ Mixte</span>
                </label>
              </div>
            </div>

            {/* Catégorie */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Tag className="w-4 h-4 inline mr-1" />
                Catégorie
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="general">📋 Général</option>
                <option value="welcome">👋 Bienvenue</option>
                <option value="promotion">🎉 Promotion</option>
                <option value="recommendation">📚 Recommandation</option>
                <option value="newsletter">📰 Newsletter</option>
                <option value="event">🎪 Événement</option>
              </select>
            </div>

            {/* Variables */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Sparkles className="w-4 h-4 inline mr-1" />
                Variables (séparées par des virgules)
              </label>
              <input
                type="text"
                value={formData.variables}
                onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="nom, email, interet, engagement"
              />
              <p className="text-xs text-gray-400 mt-1">
                Variables disponibles: {'{{nom}}'}, {'{{email}}'}, {'{{interet}}'}, {'{{engagement}}'}, {'{{date}}'}
              </p>
            </div>

            {/* Statistiques */}
            <div className="flex flex-wrap gap-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4 text-gray-400" />
                <span>Utilisé <strong>{template.usage_count || 0}</strong> fois</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>Taux de succès: <strong>{template.success_rate || 0}%</strong></span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>Dernière modification: {new Date(template.updated_at).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>

            {/* Boutons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <Link
                href="/admin/newsletter/templates"
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Annuler
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Variables disponibles */}
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-purple-800">Variables disponibles</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-white border border-purple-200 rounded-lg text-sm text-purple-700">
              {'{{nom}}'} - Nom de l'abonné
            </span>
            <span className="px-3 py-1 bg-white border border-purple-200 rounded-lg text-sm text-purple-700">
              {'{{email}}'} - Email de l'abonné
            </span>
            <span className="px-3 py-1 bg-white border border-purple-200 rounded-lg text-sm text-purple-700">
              {'{{interet}}'} - Centre d'intérêt
            </span>
            <span className="px-3 py-1 bg-white border border-purple-200 rounded-lg text-sm text-purple-700">
              {'{{engagement}}'} - Taux d'engagement
            </span>
            <span className="px-3 py-1 bg-white border border-purple-200 rounded-lg text-sm text-purple-700">
              {'{{date}}'} - Date du jour
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}