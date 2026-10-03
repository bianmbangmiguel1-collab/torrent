// app/admin/newsletter/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Mail,
  Send,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Edit,
} from 'lucide-react';

// ============================================================
// Interfaces de données
// ============================================================

interface Subscriber {
  id: number;
  email: string;
  name: string;
  status: string;
  subscribed_at: string;
  last_sent_at: string | null;
  engagement_score: number;
  messages_count: number;
}

interface Template {
  id: number;
  name: string;
  subject: string;
  type: string;
  usage_count: number;
}

interface Stats {
  total_subscribers: number;
  active_subscribers: number;
  total_messages: number;
  sent_today: number;
  avg_engagement: number;
}

// ============================================================
// Interfaces de réponse API
// ============================================================

interface SubscribersResponse {
  success: boolean;
  subscribers?: Subscriber[];
  error?: string;
}

interface TemplatesResponse {
  success: boolean;
  templates?: Template[];
  error?: string;
}

interface StatsResponse {
  success: boolean;
  stats?: Stats;
  error?: string;
}

interface SendResultItem {
  email: string;
  status: string;
  error?: string | null;
}

interface SendNewsletterResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    sent?: number;
    failed?: number;
    results?: SendResultItem[];
  };
}

// ============================================================
// Type des onglets
// ============================================================

type NewsletterTab = 'overview' | 'subscribers' | 'templates' | 'send';

// ============================================================
// Composant principal
// ============================================================

export default function NewsletterAdminDashboard() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedSubscribers, setSelectedSubscribers] = useState<string[]>([]);
  const [sendResult, setSendResult] = useState<SendNewsletterResponse | null>(null);
  const [activeTab, setActiveTab] = useState<NewsletterTab>('overview');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Récupérer les abonnés
      const subscribersRes = await fetch('/api/admin/newsletter/subscribers');
      const subscribersData =
        (await subscribersRes.json()) as SubscribersResponse;
      if (subscribersData.success) {
        setSubscribers(subscribersData.subscribers ?? []);
      }

      // Récupérer les templates
      const templatesRes = await fetch('/api/admin/newsletter/templates');
      const templatesData =
        (await templatesRes.json()) as TemplatesResponse;
      if (templatesData.success) {
        setTemplates(templatesData.templates ?? []);
      }

      // Récupérer les stats
      const statsRes = await fetch('/api/admin/newsletter/stats');
      const statsData = (await statsRes.json()) as StatsResponse;
      if (statsData.success && statsData.stats) {
        setStats(statsData.stats);
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSendNewsletter = async () => {
    if (!selectedTemplate) {
      alert('Veuillez sélectionner un template');
      return;
    }

    const subscriberIds =
      selectedSubscribers.length > 0
        ? selectedSubscribers
        : subscribers.filter((s) => s.status === 'active').map((s) => String(s.id));

    if (subscriberIds.length === 0) {
      alert('Aucun abonné sélectionné');
      return;
    }

    setSending(true);
    setSendResult(null);

    try {
      const response = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: parseInt(selectedTemplate),
          subscriberIds: subscriberIds.map(Number),
          personalization: true,
          recipientType: 'specific',
        }),
      });

      const data = (await response.json()) as SendNewsletterResponse;
      setSendResult(data);

      if (data.success) {
        alert(`✅ Newsletter envoyée à ${data.data?.sent ?? 0} destinataires !`);
        fetchData(); // Rafraîchir les données
      } else {
        alert('❌ Erreur: ' + (data.error ?? 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('Erreur envoi:', error);
      alert("Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Actif
          </span>
        );
      case 'unsubscribed':
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Désabonné
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
            {status}
          </span>
        );
    }
  };

  // Définition typée des onglets
  const tabs: { id: NewsletterTab; label: string }[] = [
    { id: 'overview', label: "📊 Vue d'ensemble" },
    {
      id: 'subscribers',
      label: `👥 Abonnés (${subscribers.filter((s) => s.status === 'active').length})`,
    },
    { id: 'templates', label: `📝 Templates (${templates.length})` },
    { id: 'send', label: '📨 Envoyer' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-2" />
          <p className="text-gray-500">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Mail className="w-6 h-6 text-purple-600" />
              Newsletter
            </h1>
            <p className="text-gray-600 text-sm">
              Gérez vos abonnés et envoyez des newsletters
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/newsletter/templates/new"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" />
              Nouveau template
            </Link>
            <button
              onClick={() => setActiveTab('send')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition"
            >
              <Send className="w-4 h-4" />
              Envoyer
            </button>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-2 mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-2 rounded-lg transition text-sm font-medium ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'Abonnés actifs',
                  value: stats?.active_subscribers ?? 0,
                  icon: <Users className="w-5 h-5" />,
                  color: 'bg-blue-50 text-blue-600',
                },
                {
                  label: 'Messages envoyés',
                  value: stats?.total_messages ?? 0,
                  icon: <Mail className="w-5 h-5" />,
                  color: 'bg-purple-50 text-purple-600',
                },
                {
                  label: "Taux d'engagement",
                  value: `${stats?.avg_engagement ?? 0}%`,
                  icon: <TrendingUp className="w-5 h-5" />,
                  color: 'bg-green-50 text-green-600',
                },
                {
                  label: "Envoyés aujourd'hui",
                  value: stats?.sent_today ?? 0,
                  icon: <Clock className="w-5 h-5" />,
                  color: 'bg-orange-50 text-orange-600',
                },
              ].map((stat, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.color}`}>{stat.icon}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Derniers abonnés */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">📋 Derniers abonnés</h3>
              <div className="space-y-2">
                {subscribers.slice(0, 5).map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {sub.name
                          ? sub.name.charAt(0).toUpperCase()
                          : sub.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {sub.name || 'Sans nom'}
                        </p>
                        <p className="text-sm text-gray-500">{sub.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(sub.status)}
                      <span className="text-xs text-gray-400">
                        {new Date(sub.subscribed_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                ))}
                {subscribers.length === 0 && (
                  <p className="text-center text-gray-400 py-4">Aucun abonné</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'subscribers' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">👥 Liste des abonnés</h3>
              <span className="text-sm text-gray-500">{subscribers.length} abonnés</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Nom
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Statut
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Messages
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Inscrit le
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {subscribers.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {sub.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{sub.email}</td>
                      <td className="px-4 py-3">{getStatusBadge(sub.status)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {sub.messages_count || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {new Date(sub.subscribed_at).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {template.name}
                    </h4>
                    <p className="text-sm text-gray-500 truncate">{template.subject}</p>
                  </div>
                  <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700">
                    {template.type === 'ai'
                      ? '🤖 IA'
                      : template.type === 'admin'
                        ? '👤 Admin'
                        : '✨ Mixte'}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                  <span>📊 {template.usage_count || 0} utilisations</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Link
                    href={`/admin/newsletter/templates/${template.id}`}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Edit className="w-4 h-4" /> Modifier
                  </Link>
                  <button
                    onClick={() => {
                      setSelectedTemplate(String(template.id));
                      setActiveTab('send');
                    }}
                    className="flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {templates.length === 0 && (
              <div className="col-span-3 text-center py-12 text-gray-400">
                <Mail className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p>Aucun template</p>
                <Link
                  href="/admin/newsletter/templates/new"
                  className="text-purple-600 hover:underline"
                >
                  Créer un template
                </Link>
              </div>
            )}
          </div>
        )}

        {activeTab === 'send' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              📨 Envoyer une newsletter
            </h3>

            <div className="space-y-4">
              {/* Sélection du template */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Sélectionner un template...</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} - {template.subject}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sélection des abonnés */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destinataires
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const allIds = subscribers
                        .filter((s) => s.status === 'active')
                        .map((s) => String(s.id));
                      setSelectedSubscribers(allIds);
                    }}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                  >
                    Tous les actifs (
                    {subscribers.filter((s) => s.status === 'active').length})
                  </button>
                  <button
                    onClick={() => setSelectedSubscribers([])}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  >
                    Effacer
                  </button>
                </div>
                <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {subscribers
                    .filter((s) => s.status === 'active')
                    .map((sub) => (
                      <label
                        key={sub.id}
                        className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSubscribers.includes(String(sub.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSubscribers([
                                ...selectedSubscribers,
                                String(sub.id),
                              ]);
                            } else {
                              setSelectedSubscribers(
                                selectedSubscribers.filter(
                                  (id) => id !== String(sub.id),
                                ),
                              );
                            }
                          }}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        <span className="text-sm">{sub.email}</span>
                        {sub.name && (
                          <span className="text-xs text-gray-400">({sub.name})</span>
                        )}
                      </label>
                    ))}
                  {subscribers.filter((s) => s.status === 'active').length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-2">
                      Aucun abonné actif
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {selectedSubscribers.length} destinataires sélectionnés
                </p>
              </div>

              {/* Bouton d'envoi */}
              <button
                onClick={handleSendNewsletter}
                disabled={
                  sending || !selectedTemplate || selectedSubscribers.length === 0
                }
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Envoyer à {selectedSubscribers.length} destinataires
                  </>
                )}
              </button>

              {/* Résultat de l'envoi */}
              {sendResult && (
                <div
                  className={`p-4 rounded-lg ${
                    sendResult.success
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  <p className="font-medium">{sendResult.message}</p>
                  {sendResult.data && (
                    <div className="mt-2 text-sm">
                      <p>✅ Envoyés: {sendResult.data.sent ?? 0}</p>
                      <p>❌ Échoués: {sendResult.data.failed ?? 0}</p>
                      {sendResult.data.results?.map((r, i) => (
                        <div key={i} className="text-xs mt-1">
                          {r.email}: {r.status === 'sent' ? '✅' : '❌'}{' '}
                          {r.error ?? ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}