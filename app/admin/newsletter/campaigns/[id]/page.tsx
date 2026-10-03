// app/admin/newsletter/campaigns/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Mail, 
  Users, 
  Eye, 
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Send,
  RefreshCw,
  Download,
  Printer,
  Share2,
  Copy,
  Sparkles,
  Brain
} from 'lucide-react';

interface Campaign {
  id: number;
  name: string;
  subject: string;
  content: string;
  template_id: number | null;
  template_name?: string;
  status: 'draft' | 'sent' | 'scheduled' | 'failed';
  sent_at: string | null;
  scheduled_at: string | null;
  recipients_count: number;
  opens_count: number;
  clicks_count: number;
  unsubscribes_count: number;
  segment: string | null;
  created_by: number | null;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

interface CampaignStats {
  total_recipients: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
  open_rate: number;
  click_rate: number;
  unsubscribe_rate: number;
  bounce_rate: number;
  sent_at: string | null;
  delivered: number;
}

interface CampaignRecipient {
  id: number;
  email: string;
  name: string;
  status: 'sent' | 'opened' | 'clicked' | 'unsubscribed' | 'bounced';
  opened_at: string | null;
  clicked_at: string | null;
  sent_at: string;
}

interface CampaignDetailsResponse {
  success: boolean;
  campaign?: Campaign;
  stats?: CampaignStats;
  recipients?: CampaignRecipient[];
  error?: string;
}

interface RecipientsResponse {
  success: boolean;
  recipients?: CampaignRecipient[];
  error?: string;
}

type CampaignTab = 'overview' | 'recipients' | 'content';

export default function CampaignDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [activeTab, setActiveTab] = useState<CampaignTab>('overview');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCampaignData();
    }
  }, [id]);

  const fetchCampaignData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/newsletter/campaigns/${id}`);
      const data = await response.json() as CampaignDetailsResponse;
      if (data.success) {
        if (data.campaign) setCampaign(data.campaign);
        if (data.stats) setStats(data.stats);
        if (data.recipients) {
          setRecipients(data.recipients);
        }
      } else {
        alert('Campagne non trouvée');
        router.push('/admin/newsletter/campaigns');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du chargement de la campagne');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipients = async () => {
    setLoadingRecipients(true);
    try {
      const response = await fetch(`/api/admin/newsletter/campaigns/${id}/recipients`);
      const data = await response.json() as RecipientsResponse;
      if (data.success && data.recipients) {
        setRecipients(data.recipients);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCampaignData();
    setRefreshing(false);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'sent':
        return <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Envoyée</span>;
      case 'draft':
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full flex items-center gap-1"><Clock className="w-4 h-4" /> Brouillon</span>;
      case 'scheduled':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full flex items-center gap-1"><Calendar className="w-4 h-4" /> Planifiée</span>;
      case 'failed':
        return <span className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full flex items-center gap-1"><XCircle className="w-4 h-4" /> Échouée</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">{status}</span>;
    }
  };

  const getRecipientStatusBadge = (status: string) => {
    switch(status) {
      case 'sent':
        return <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">📨 Envoyé</span>;
      case 'opened':
        return <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">👁️ Ouvert</span>;
      case 'clicked':
        return <span className="px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded-full">🖱️ Cliqué</span>;
      case 'unsubscribed':
        return <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full">🚫 Désabonné</span>;
      case 'bounced':
        return <span className="px-2 py-1 bg-orange-100 text-orange-600 text-xs rounded-full">📤 Rebond</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">{status}</span>;
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-2" />
          <p className="text-gray-500">Chargement de la campagne...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">Campagne non trouvée</p>
          <Link href="/admin/newsletter/campaigns" className="text-purple-600 hover:underline">
            Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  const tabs: { id: CampaignTab; label: string }[] = [
    { id: 'overview', label: '📊 Vue d\'ensemble' },
    { id: 'recipients', label: `👥 Destinataires (${campaign.recipients_count || 0})` },
    { id: 'content', label: '📝 Contenu' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div className="flex items-start gap-4">
            <Link
              href="/admin/newsletter/campaigns"
              className="p-2 hover:bg-gray-200 rounded-lg transition mt-1"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
                {getStatusBadge(campaign.status)}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {campaign.subject}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-400">
                <span>ID: #{campaign.id}</span>
                <span>•</span>
                <span>Créée le {formatDate(campaign.created_at)}</span>
                {campaign.sent_at && (
                  <>
                    <span>•</span>
                    <span>Envoyée le {formatDate(campaign.sent_at)}</span>
                  </>
                )}
                {campaign.template_name && (
                  <>
                    <span>•</span>
                    <span>Template: {campaign.template_name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Rafraîchir
            </button>
            <button
              onClick={() => {
                // Exporter les données
                const csv = [
                  ['Email', 'Nom', 'Statut', 'Ouvert le', 'Cliqué le'],
                  ...recipients.map(r => [
                    r.email,
                    r.name || '',
                    r.status,
                    r.opened_at || '',
                    r.clicked_at || ''
                  ])
                ].map(row => row.join(',')).join('\n');
                
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `campagne_${campaign.id}_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              <Download className="w-4 h-4" />
              Exporter
            </button>
            {campaign.status === 'draft' && (
              <button
                onClick={() => {
                  if (confirm('Envoyer cette campagne maintenant ?')) {
                    // Logique d'envoi
                    alert('Fonctionnalité d\'envoi à implémenter');
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition"
              >
                <Send className="w-4 h-4" />
                Envoyer
              </button>
            )}
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-2 mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'recipients' && recipients.length === 0) {
                  fetchRecipients();
                }
              }}
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
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Statistiques */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { 
                  label: 'Destinataires', 
                  value: stats.total_recipients, 
                  icon: <Users className="w-5 h-5" />, 
                  color: 'bg-blue-50 text-blue-600' 
                },
                { 
                  label: 'Ouvertures', 
                  value: stats.opened, 
                  icon: <Eye className="w-5 h-5" />, 
                  color: 'bg-green-50 text-green-600',
                  rate: stats.open_rate ? `${stats.open_rate.toFixed(1)}%` : '0%'
                },
                { 
                  label: 'Clics', 
                  value: stats.clicked, 
                  icon: <TrendingUp className="w-5 h-5" />, 
                  color: 'bg-purple-50 text-purple-600',
                  rate: stats.click_rate ? `${stats.click_rate.toFixed(1)}%` : '0%'
                },
                { 
                  label: 'Désabonnements', 
                  value: stats.unsubscribed, 
                  icon: <TrendingDown className="w-5 h-5" />, 
                  color: 'bg-red-50 text-red-600',
                  rate: stats.unsubscribe_rate ? `${stats.unsubscribe_rate.toFixed(1)}%` : '0%'
                }
              ].map((stat, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      {stat.rate && (
                        <p className="text-xs text-gray-400">{stat.rate}</p>
                      )}
                    </div>
                    <div className={`p-3 rounded-lg ${stat.color}`}>
                      {stat.icon}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Graphique simplifié */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">📈 Performance</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Taux d'ouverture</span>
                    <span className="font-medium text-gray-900">{stats.open_rate ? stats.open_rate.toFixed(1) : 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 rounded-full h-2 transition-all"
                      style={{ width: `${Math.min(stats.open_rate || 0, 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Taux de clics</span>
                    <span className="font-medium text-gray-900">{stats.click_rate ? stats.click_rate.toFixed(1) : 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-500 rounded-full h-2 transition-all"
                      style={{ width: `${Math.min(stats.click_rate || 0, 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Taux de désabonnement</span>
                    <span className="font-medium text-gray-900">{stats.unsubscribe_rate ? stats.unsubscribe_rate.toFixed(1) : 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-500 rounded-full h-2 transition-all"
                      style={{ width: `${Math.min(stats.unsubscribe_rate || 0, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'recipients' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">👥 Destinataires</h3>
              <span className="text-sm text-gray-500">{recipients.length} destinataires</span>
            </div>
            <div className="overflow-x-auto">
              {loadingRecipients ? (
                <div className="text-center py-12 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Chargement des destinataires...
                </div>
              ) : recipients.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p>Aucun destinataire</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Envoyé le</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ouvert le</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recipients.map((recipient) => (
                      <tr key={recipient.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm text-gray-900">{recipient.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{recipient.name || '-'}</td>
                        <td className="px-4 py-3">{getRecipientStatusBadge(recipient.status)}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{formatDate(recipient.sent_at)}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{formatDate(recipient.opened_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">📝 Contenu de la campagne</h3>
              <button
                onClick={() => {
                  const win = window.open('', '_blank', 'width=800,height=600');
                  if (win) {
                    win.document.write(`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <title>Aperçu: ${campaign.subject}</title>
                          <style>
                            body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; background: #f9f9f9; }
                            .preview-container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                            .preview-header { border-bottom: 2px solid #7c3aed; padding-bottom: 20px; margin-bottom: 20px; }
                            .preview-header h2 { color: #1a1a2e; margin: 0; }
                            .preview-content { color: #333; line-height: 1.8; }
                          </style>
                        </head>
                        <body>
                          <div class="preview-container">
                            <div class="preview-header">
                              <h2>📧 ${campaign.subject}</h2>
                              <p style="color:#666;">De: TorrentTwist Newsletter</p>
                            </div>
                            <div class="preview-content">
                              ${campaign.content}
                            </div>
                          </div>
                        </body>
                      </html>
                    `);
                    win.document.close();
                  }
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
              >
                <Eye className="w-4 h-4" />
                Aperçu
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700">Sujet</h4>
                <p className="text-gray-900">{campaign.subject}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Contenu</h4>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
                  <div dangerouslySetInnerHTML={{ __html: campaign.content }} />
                </div>
              </div>
              {campaign.template_name && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    <Sparkles className="w-4 h-4 inline mr-1" />
                    Template utilisé: <strong>{campaign.template_name}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}