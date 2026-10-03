// app/admin/newsletter/campaigns/new/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Send, 
  Loader2, 
  Users,
  Mail,
  Sparkles,
  Brain,
  CheckCircle,
  X,
  Calendar,
  Clock,
  Eye
} from 'lucide-react';

interface Template {
  id: number;
  name: string;
  subject: string;
  content: string;
  type: string;
  category: string;
}

interface Subscriber {
  id: number;
  email: string;
  name: string | null;
  status: string;
  engagement_score?: number;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    content: '',
    template_id: '',
    scheduled_at: '',
    status: 'draft'
  });
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedSubscribers, setSelectedSubscribers] = useState<string[]>([]);
  const [personalization, setPersonalization] = useState(true);
  const [preview, setPreview] = useState<{ subject: string; content: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [templatesRes, subscribersRes] = await Promise.all([
        fetch('/api/admin/newsletter/templates'),
        fetch('/api/admin/newsletter/subscribers?status=active')
      ]);
      
      const templatesData: {
        success?: boolean;
        templates?: Template[];
      } = await templatesRes.json();

      const subscribersData: {
        success?: boolean;
        subscribers?: Subscriber[];
      } = await subscribersRes.json();
      
      if (templatesData.success) setTemplates(templatesData.templates || []);
      if (subscribersData.success) setSubscribers(subscribersData.subscribers || []);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === Number(templateId));
    if (template) {
      setFormData(prev => ({
        ...prev,
        subject: template.subject,
        content: template.content,
        template_id: templateId
      }));
      setPreview({
        subject: template.subject,
        content: template.content
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTemplate) {
      alert('Veuillez sélectionner un template');
      return;
    }
    
    if (selectedSubscribers.length === 0) {
      alert('Veuillez sélectionner au moins un abonné');
      return;
    }

    if (!formData.name.trim()) {
      alert('Veuillez donner un nom à votre campagne');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/newsletter/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          subject: formData.subject,
          content: formData.content,
          template_id: parseInt(selectedTemplate),
          status: formData.scheduled_at ? 'scheduled' : 'sent',
          scheduled_at: formData.scheduled_at || null,
          recipients: selectedSubscribers,
          ai_personalization: personalization
        })
      });

      const data: {
        success?: boolean;
        error?: string;
      } = await response.json();

      if (data.success) {
        alert(`✅ Campagne créée avec succès !`);
        router.push('/admin/newsletter/campaigns');
      } else {
        alert('❌ ' + (data.error || 'Erreur lors de la création'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const previewTemplate = () => {
    setShowPreview(!showPreview);
    if (!showPreview && selectedTemplate) {
      const template = templates.find(t => t.id === Number(selectedTemplate));
      if (template) {
        setPreview({
          subject: template.subject,
          content: template.content
        });
      }
    }
  };

  const toggleSelectAll = () => {
    if (selectedSubscribers.length === subscribers.length) {
      setSelectedSubscribers([]);
    } else {
      setSelectedSubscribers(subscribers.map(s => String(s.id)));
    }
  };

  const selectActiveOnly = () => {
    const activeIds = subscribers
      .filter(s => s.status === 'active')
      .map(s => String(s.id));
    setSelectedSubscribers(activeIds);
  };

  const selectHighEngagement = () => {
    const highEngagement = subscribers
      .filter(s => (s.engagement_score || 0) > 50)
      .map(s => String(s.id));
    setSelectedSubscribers(highEngagement);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 admin-panel">
      <div className="max-w-5xl mx-auto">
        {/* En-tête */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/admin/newsletter/campaigns"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Send className="w-6 h-6 text-blue-600" />
              Nouvelle campagne
            </h1>
            <p className="text-gray-600 text-sm">Envoyez une campagne personnalisée à vos abonnés</p>
          </div>
        </div>

        {/* Formulaire */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulaire principal */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nom de la campagne */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de la campagne <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Newsletter du mois de Mars 2024"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Template */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedTemplate}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Sélectionner un template...</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.type})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={previewTemplate}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      Aperçu
                    </button>
                  </div>
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

                {/* Contenu */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contenu <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    rows={8}
                    placeholder="Écrivez votre message ici..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Utilisez {'{{nom}}'} pour le prénom, {'{{email}}'} pour l'email
                  </p>
                </div>

                {/* Personnalisation IA */}
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <input
                    type="checkbox"
                    id="personalization"
                    checked={personalization}
                    onChange={(e) => setPersonalization(e.target.checked)}
                    className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="personalization" className="text-sm text-gray-700 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-600" />
                    Personnalisation IA
                    <span className="text-xs text-purple-600">(adapté à chaque abonné)</span>
                  </label>
                </div>

                {/* Programmation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Clock className="w-4 h-4 inline mr-1 text-gray-400" />
                    Programmer l'envoi
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduled_at: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Laissez vide pour envoyer immédiatement
                  </p>
                </div>

                {/* Destinataires */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Destinataires <span className="text-red-500">*</span>
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100 flex-wrap">
                      <input
                        type="checkbox"
                        checked={selectedSubscribers.length === subscribers.length && subscribers.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-600">Tout sélectionner ({subscribers.length})</span>
                      <button
                        type="button"
                        onClick={selectActiveOnly}
                        className="text-xs text-green-600 hover:text-green-700 ml-2"
                      >
                        ✅ Actifs
                      </button>
                      <button
                        type="button"
                        onClick={selectHighEngagement}
                        className="text-xs text-purple-600 hover:text-purple-700 ml-1"
                      >
                        🎯 Engagement élevé
                      </button>
                    </div>
                    {subscribers.map((sub) => (
                      <div key={sub.id} className="flex items-center gap-2 py-1.5 hover:bg-gray-50 rounded px-2">
                        <input
                          type="checkbox"
                          checked={selectedSubscribers.includes(String(sub.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSubscribers([...selectedSubscribers, String(sub.id)]);
                            } else {
                              setSelectedSubscribers(selectedSubscribers.filter(id => id !== String(sub.id)));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{sub.email}</span>
                        {sub.name && <span className="text-xs text-gray-400">({sub.name})</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {sub.status}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedSubscribers.length} abonnés sélectionnés sur {subscribers.length}
                  </p>
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
                      <Send className="w-4 h-4" />
                    )}
                    {formData.scheduled_at ? 'Programmer' : 'Envoyer'}
                  </button>
                  <Link
                    href="/admin/newsletter/campaigns"
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Annuler
                  </Link>
                </div>
              </form>
            </div>
          </div>

          {/* Aperçu / Commandes rapides */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                Commandes rapides
              </h3>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={selectActiveOnly}
                  className="w-full text-left text-sm text-green-600 hover:bg-green-50 p-2 rounded-lg transition"
                >
                  ✅ Sélectionner les actifs
                </button>
                <button
                  type="button"
                  onClick={selectHighEngagement}
                  className="w-full text-left text-sm text-purple-600 hover:bg-purple-50 p-2 rounded-lg transition"
                >
                  🎯 Engagement élevé (&gt;50%)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSubscribers([])}
                  className="w-full text-left text-sm text-gray-500 hover:bg-gray-50 p-2 rounded-lg transition"
                >
                  ❌ Désélectionner tout
                </button>
              </div>
            </div>

            {/* Aperçu du template */}
            {showPreview && preview && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mt-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-500" />
                  Aperçu
                </h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Sujet</p>
                  <p className="text-sm font-medium text-gray-800">{preview.subject}</p>
                  <p className="text-xs text-gray-400 mt-2">Contenu</p>
                  <div className="text-sm text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {preview.content}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="mt-2 text-xs text-red-500 hover:text-red-600"
                >
                  Fermer l'aperçu
                </button>
              </div>
            )}

            {/* Conseils */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200 mt-4">
              <h4 className="text-sm font-medium text-blue-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                💡 Astuce
              </h4>
              <p className="text-xs text-blue-700 mt-1">
                Utilisez la personnalisation IA pour adapter le message à chaque abonné et améliorer votre taux d'engagement.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}