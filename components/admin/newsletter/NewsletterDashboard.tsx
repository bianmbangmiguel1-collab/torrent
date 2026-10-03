// components/admin/newsletter/NewsletterDashboard.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Mail,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Eye,
  MousePointer,
  AlertCircle,
} from 'lucide-react';

interface Stats {
  total_subscribers: number;
  active_subscribers: number;
  inactive_subscribers: number;
  total_campaigns: number;
  draft_campaigns: number;
  scheduled_campaigns: number;
}

interface Campaign {
  id: number;
  name: string;
  subject: string;
  status: string;
  sent_at: string | null;
  scheduled_at: string | null;
  recipients_count: number;
  opens_count: number;
  clicks_count: number;
  unsubscribes_count: number;
  created_at: string;
}

interface Subscriber {
  id: number;
  email: string;
  name: string | null;
  status: string;
  source: string;
  subscribed_at: string;
}

export default function NewsletterDashboard({
  stats,
  campaigns,
  recentSubscribers,
}: {
  stats: Stats;
  campaigns: Campaign[];
  recentSubscribers: Subscriber[];
}) {
  const [activeTab, setActiveTab] = useState<'stats' | 'campaigns' | 'subscribers'>('stats');

  const statCards = [
    {
      label: 'Abonnés actifs',
      value: stats.active_subscribers || 0,
      icon: Users,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Total campagnes',
      value: stats.total_campaigns || 0,
      icon: Send,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: 'Brouillons',
      value: stats.draft_campaigns || 0,
      icon: Mail,
      color: 'text-gray-600 bg-gray-50',
    },
    {
      label: 'Planifiées',
      value: stats.scheduled_campaigns || 0,
      icon: Clock,
      color: 'text-yellow-600 bg-yellow-50',
    },
  ];

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      draft: { label: '📝 Brouillon', color: 'bg-gray-100 text-gray-700' },
      sent: { label: '✅ Envoyé', color: 'bg-green-100 text-green-700' },
      scheduled: { label: '⏳ Planifié', color: 'bg-yellow-100 text-yellow-700' },
      failed: { label: '❌ Échec', color: 'bg-red-100 text-red-700' },
    };
    const badge = badges[status] || badges.draft;
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}>{badge.label}</span>;
  };

  return (
    <div>
      {/* Cartes statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div className={`p-3 rounded-full ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dernières campagnes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">📨 Dernières campagnes</h3>
            <Link href="/admin/newsletter/campaigns" className="text-sm text-blue-600 hover:underline">
              Voir toutes →
            </Link>
          </div>
          <div className="p-4">
            {campaigns.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Mail className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p>Aucune campagne</p>
                <Link href="/admin/newsletter/campaigns/new" className="text-blue-600 hover:underline text-sm">
                  Créer votre première campagne
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    href={`/admin/newsletter/campaigns/${campaign.id}`}
                    className="block p-3 hover:bg-gray-50 rounded-lg transition border border-gray-100"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{campaign.name}</p>
                        <p className="text-sm text-gray-500 truncate">{campaign.subject}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {getStatusBadge(campaign.status)}
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {campaign.sent_at
                            ? new Date(campaign.sent_at).toLocaleDateString()
                            : campaign.scheduled_at
                            ? `Planifié le ${new Date(campaign.scheduled_at).toLocaleDateString()}`
                            : new Date(campaign.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {campaign.status === 'sent' && (
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {campaign.recipients_count} destinataires
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {campaign.opens_count} ouvertures
                        </span>
                        <span className="flex items-center gap-1">
                          <MousePointer className="w-3 h-3" /> {campaign.clicks_count} clics
                        </span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Derniers abonnés */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">👥 Derniers abonnés</h3>
            <Link href="/admin/newsletter/subscribers" className="text-sm text-blue-600 hover:underline">
              Voir tous →
            </Link>
          </div>
          <div className="p-4">
            {recentSubscribers.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p>Aucun abonné</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentSubscribers.map((subscriber) => (
                  <div key={subscriber.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">{subscriber.name || subscriber.email}</p>
                      <p className="text-sm text-gray-500">{subscriber.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {new Date(subscriber.subscribed_at).toLocaleDateString()}
                      </span>
                      {subscriber.status === 'active' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}