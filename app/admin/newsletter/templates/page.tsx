// app/admin/newsletter/templates/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Mail, 
  Edit, 
  Trash2, 
  Copy, 
  Eye,
  Sparkles,
  Brain,
  Zap,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface Template {
  id: number;
  name: string;
  subject: string;
  content: string;
  type: 'admin' | 'ai' | 'both';
  category: string;
  variables: string[] | string; // Peut être un tableau ou une chaîne JSON
  usage_count: number;
  success_rate: number;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Types de réponses API
// ============================================================
interface TemplatesResponse {
  success?: boolean;
  templates?: Template[];
}

// 🔥 Fonction pour normaliser les variables (toujours retourner un tableau)
const normalizeVariables = (variables: unknown): string[] => {
  // Si c'est déjà un tableau
  if (Array.isArray(variables)) {
    return variables.map(String);
  }

  // Si c'est une chaîne
  if (typeof variables === 'string') {
    try {
      const parsed = JSON.parse(variables);
      if (Array.isArray(parsed)) {
        return parsed.map(String);
      }
      // Si c'est un objet, on retourne les clés
      if (typeof parsed === 'object' && parsed !== null) {
        return Object.keys(parsed);
      }
    } catch {
      // Ce n'est pas du JSON valide
    }

    // Supporte aussi : "name,email,product"
    if (variables.includes(',')) {
      return variables
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    }

    // Si c'est une chaîne simple, on la retourne comme un tableau d'un élément
    if (variables.trim()) {
      return [variables.trim()];
    }
  }

  return [];
};

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchTemplates();
  }, [filter]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/newsletter/templates?type=${filter}`);
      const data = (await response.json()) as TemplatesResponse;
      if (data.success) {
        // 🔥 Normaliser les variables dès la réception
        const formattedTemplates = (data.templates || []).map((template) => ({
          ...template,
          variables: normalizeVariables(template.variables)
        }));
        setTemplates(formattedTemplates);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (id: number) => {
    if (!confirm('Supprimer ce template ?')) return;
    try {
      await fetch(`/api/admin/newsletter/templates?id=${id}`, { method: 'DELETE' });
      fetchTemplates();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const getTypeBadge = (type: string) => {
    switch(type) {
      case 'ai':
        return <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs rounded-full flex items-center gap-1"><Brain className="w-3 h-3" /> IA</span>;
      case 'admin':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1"><Users className="w-3 h-3" /> Admin</span>;
      default:
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1"><Sparkles className="w-3 h-3" /> Mixte</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 admin-panel">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Mail className="w-6 h-6 text-purple-600" />
              Templates de messages
            </h1>
            <p className="text-gray-600 text-sm">Créez et gérez vos templates pour l'IA et l'admin</p>
          </div>
          <Link
            href="/admin/newsletter/templates/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Nouveau template
          </Link>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition ${filter === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Tous
            </button>
            <button
              onClick={() => setFilter('ai')}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${filter === 'ai' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <Brain className="w-4 h-4" /> IA
            </button>
            <button
              onClick={() => setFilter('admin')}
              className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${filter === 'admin' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <Users className="w-4 h-4" /> Admin
            </button>
          </div>
        </div>

        {/* Grille des templates */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-3 text-center py-12 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              Chargement...
            </div>
          ) : templates.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-gray-400">
              <Mail className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p>Aucun template trouvé</p>
              <Link href="/admin/newsletter/templates/new" className="text-purple-600 hover:underline">
                Créer votre premier template
              </Link>
            </div>
          ) : (
            templates.map((template) => {
              // 🔥 Normaliser les variables pour ce template
              const variables = normalizeVariables(template.variables);
              
              return (
                <div key={template.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
                        <p className="text-sm text-gray-500 truncate">{template.subject}</p>
                      </div>
                      {getTypeBadge(template.type)}
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {template.usage_count || 0} utilisations
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        {template.success_rate || 0}% succès
                      </span>
                    </div>
                    {/* 🔥 Utiliser variables (normalisé) au lieu de template.variables */}
                    {variables.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {variables.map((varName, i) => (
                          <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded">
                            {varName}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <Link
                        href={`/admin/newsletter/templates/${template.id}`}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Edit className="w-4 h-4" /> Modifier
                      </Link>
                      <button
                        onClick={() => {
                          // Prévisualiser
                          alert(`Sujet: ${template.subject}\n\nContenu: ${template.content.substring(0, 200)}...`);
                        }}
                        className="flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteTemplate(template.id)}
                        className="flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Templates IA suggérés */}
        <div className="mt-8 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-purple-800">Templates IA suggérés</h3>
          </div>
          <p className="text-sm text-purple-700 mb-3">
            L'IA peut générer automatiquement des messages personnalisés basés sur l'analyse de chaque abonné.
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm text-purple-700 hover:bg-purple-50 transition">
              🎯 Recommandation produit
            </button>
            <button className="px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm text-purple-700 hover:bg-purple-50 transition">
              📚 Nouveautés livres
            </button>
            <button className="px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm text-purple-700 hover:bg-purple-50 transition">
              🎉 Offre personnalisée
            </button>
            <button className="px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm text-purple-700 hover:bg-purple-50 transition">
              💡 Conseils lecture
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}