// app/admin/newsletter/analytics/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Mail,
  Users,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Calendar,
  Download,
  RefreshCw,
  Loader2,
  Eye,
  MousePointer,
  UserCheck,
  UserX,
  Clock,
  Sparkles,
  Brain,
  ArrowUp,
  ArrowDown,
  Activity,
  Zap,
  Send
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    total_subscribers: number;
    active_subscribers: number;
    inactive_subscribers: number;
    new_subscribers: number;
    unsubscribes: number;
    growth_rate: number;
  };
  campaigns: {
    total: number;
    sent: number;
    scheduled: number;
    draft: number;
    failed: number;
    average_open_rate: number;
    average_click_rate: number;
  };
  engagement: {
    total_opens: number;
    total_clicks: number;
    total_unsubscribes: number;
    open_rate: number;
    click_rate: number;
    unsubscribe_rate: number;
  };
  trends: {
    daily: { date: string; opens: number; clicks: number; subscribers: number }[];
    weekly: { week: string; opens: number; clicks: number; subscribers: number }[];
    monthly: { month: string; opens: number; clicks: number; subscribers: number }[];
  };
  top_campaigns: {
    id: number;
    name: string;
    subject: string;
    sent_at: string;
    recipients: number;
    opens: number;
    clicks: number;
    open_rate: number;
    click_rate: number;
  }[];
  ai_insights: {
    best_time_to_send: string;
    best_day: string;
    most_engaged_segment: string;
    recommendation: string;
    engagement_score: number;
  };
}

interface AnalyticsResponse {
  success: boolean;
  data?: AnalyticsData;
  error?: string;
}

export default function NewsletterAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<'30days' | '90days' | 'year'>('30days');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/newsletter/analytics?period=${period}`);
      const result = (await response.json()) as AnalyticsResponse;
      if (result.success && result.data) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des analyses...</p>
        </div>
      </div>
    );
  }

  const { overview, campaigns, engagement, trends, top_campaigns, ai_insights } = data;

  return (
    <div className="min-h-screen bg-gray-50 p-6 admin-panel">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-purple-600" />
              Analytics Newsletter
            </h1>
            <p className="text-gray-600 text-sm">Analysez les performances de vos newsletters</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as '30days' | '90days' | 'year')}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500"
            >
              <option value="30days">30 derniers jours</option>
              <option value="90days">90 derniers jours</option>
              <option value="year">Cette année</option>
            </select>
            <button
              onClick={fetchAnalytics}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Rafraîchir
            </button>
            <button
              onClick={() => {
                // Export CSV
                window.location.href = '/api/admin/newsletter/analytics/export';
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <Download className="w-4 h-4" />
              Exporter
            </button>
          </div>
        </div>

        {/* Vue d'ensemble - Abonnés */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Total abonnés</p>
              <Users className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{overview.total_subscribers}</p>
            <div className="flex items-center gap-1 mt-1">
              <span className={`text-xs ${overview.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {overview.growth_rate >= 0 ? '+' : ''}{overview.growth_rate}%
              </span>
              <span className="text-xs text-gray-400">croissance</span>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Actifs</p>
              <UserCheck className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">{overview.active_subscribers}</p>
            <p className="text-xs text-gray-400 mt-1">{overview.new_subscribers} nouveaux</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Inactifs</p>
              <UserX className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600">{overview.inactive_subscribers}</p>
            <p className="text-xs text-gray-400 mt-1">{overview.unsubscribes} désabonnements</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Taux d'engagement</p>
              <Activity className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-purple-600">{ai_insights.engagement_score}%</p>
            <p className="text-xs text-gray-400 mt-1">Score global IA</p>
          </div>
        </div>

        {/* Engagement */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-blue-500" />
              <p className="text-sm text-gray-500">Taux d'ouverture</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{engagement.open_rate}%</p>
            <p className="text-xs text-gray-400">{engagement.total_opens} ouvertures totales</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <MousePointer className="w-4 h-4 text-green-500" />
              <p className="text-sm text-gray-500">Taux de clics</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{engagement.click_rate}%</p>
            <p className="text-xs text-gray-400">{engagement.total_clicks} clics totaux</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <UserX className="w-4 h-4 text-red-500" />
              <p className="text-sm text-gray-500">Taux de désabonnement</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{engagement.unsubscribe_rate}%</p>
            <p className="text-xs text-gray-400">{engagement.total_unsubscribes} désabonnements</p>
          </div>
        </div>

        {/* Campaign Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 text-center">
            <p className="text-sm text-gray-500">Total campagnes</p>
            <p className="text-xl font-bold text-gray-900">{campaigns.total}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 text-center">
            <p className="text-sm text-gray-500">Envoyées</p>
            <p className="text-xl font-bold text-green-600">{campaigns.sent}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 text-center">
            <p className="text-sm text-gray-500">Taux d'ouverture</p>
            <p className="text-xl font-bold text-blue-600">{campaigns.average_open_rate}%</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 text-center">
            <p className="text-sm text-gray-500">Taux de clics</p>
            <p className="text-xl font-bold text-green-600">{campaigns.average_click_rate}%</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 text-center">
            <p className="text-sm text-gray-500">Brouillons</p>
            <p className="text-xl font-bold text-gray-600">{campaigns.draft}</p>
          </div>
        </div>

        {/* Top campagnes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              Meilleures campagnes
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Campagne</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Sujet</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Envoyée</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Destinataires</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Ouvertures</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Clics</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Taux</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {top_campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      Aucune campagne envoyée
                    </td>
                  </tr>
                ) : (
                  top_campaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-gray-800">{campaign.name}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{campaign.subject}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(campaign.sent_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{campaign.recipients}</td>
                      <td className="px-4 py-3 text-gray-700">{campaign.opens}</td>
                      <td className="px-4 py-3 text-gray-700">{campaign.clicks}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-blue-600">{campaign.open_rate}%</span>
                          <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${Math.min(campaign.open_rate, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-purple-800">Insights IA</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-purple-500" />
                <span className="text-gray-700">
                  <span className="font-medium">Meilleur moment :</span> {ai_insights.best_time_to_send}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-purple-500" />
                <span className="text-gray-700">
                  <span className="font-medium">Meilleur jour :</span> {ai_insights.best_day}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Users className="w-4 h-4 text-purple-500" />
                <span className="text-gray-700">
                  <span className="font-medium">Segment le plus engagé :</span> {ai_insights.most_engaged_segment}
                </span>
              </div>
              <div className="p-3 bg-white/50 rounded-lg border border-purple-100">
                <p className="text-sm text-purple-700">
                  💡 <span className="font-medium">Recommandation :</span> {ai_insights.recommendation}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              Actions rapides
            </h3>
            <div className="space-y-3">
              <Link
                href="/admin/newsletter/campaigns/new"
                className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition"
              >
                <Send className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Créer une campagne</p>
                  <p className="text-xs text-blue-600">Envoyer une nouvelle newsletter</p>
                </div>
              </Link>
              <Link
                href="/admin/newsletter/subscribers"
                className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition"
              >
                <Users className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-purple-800">Gérer les abonnés</p>
                  <p className="text-xs text-purple-600">Voir et analyser votre liste</p>
                </div>
              </Link>
              <button
                onClick={() => {
                  // Lancer une analyse IA
                  fetch('/api/admin/newsletter/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                  }).then(() => {
                    alert('✅ Analyse IA lancée !');
                    fetchAnalytics();
                  });
                }}
                className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition w-full text-left"
              >
                <Brain className="w-4 h-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">Lancer l'analyse IA</p>
                  <p className="text-xs text-green-600">Analyser les abonnés avec IA</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}