// app/admin/campaigns/analytics/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { getCampaignStats, getCampaignStatsPerCampaign } from '@/lib/admin-actions';
import {
  TrendingUp,
  Users,
  ShoppingCart,
  DollarSign,
  Eye,
  MousePointer,
  Package,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface CampaignStats {
  total_impressions: number;
  total_views: number;
  total_clicks: number;
  total_add_to_cart: number;
  total_purchases: number;
  total_revenue: number;
  avg_ctr: number;
}

interface PerCampaignStats {
  id: number;
  name: string;
  status: string;
  impressions: number;
  views: number;
  clicks: number;
  add_to_cart: number;
  purchases: number;
  revenue: number;
  ctr: number;
}

interface DailyStats {
  date: string;
  impressions: number;
  clicks: number;
  add_to_cart: number;
  purchases: number;
  revenue: number;
}

function StatCard({ icon: Icon, label, value, color, subtitle }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );
}

function CampaignRow({ campaign }: { campaign: PerCampaignStats }) {
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'scheduled': return 'bg-blue-100 text-blue-700';
      case 'ended': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'scheduled': return 'Programmée';
      case 'ended': return 'Terminée';
      default: return 'Brouillon';
    }
  };

  return (
    <div className="border-b border-gray-100 hover:bg-gray-50 transition">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-600 w-8">{campaign.id}</span>
          <span className="font-medium text-gray-800 flex-1 truncate">{campaign.name}</span>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(campaign.status)}`}>
            {getStatusLabel(campaign.status)}
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm text-gray-600 flex-shrink-0">
          <span className="flex items-center gap-1">
            <Eye size={14} className="text-gray-400" />
            {campaign.impressions?.toLocaleString() || 0}
          </span>
          <span className="flex items-center gap-1">
            <MousePointer size={14} className="text-gray-400" />
            {campaign.clicks?.toLocaleString() || 0}
          </span>
          <span className="font-medium text-green-600">
            {campaign.revenue?.toLocaleString() || 0} FCFA
          </span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-0 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-gray-100 bg-gray-50/50">
          <div>
            <p className="text-xs text-gray-500">CTR</p>
            <p className="text-sm font-semibold text-gray-800">
              {campaign.ctr ? (campaign.ctr * 100).toFixed(2) : 0}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Ajouts panier</p>
            <p className="text-sm font-semibold text-gray-800">
              {campaign.add_to_cart || 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Achats</p>
            <p className="text-sm font-semibold text-gray-800">
              {campaign.purchases || 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Conversion</p>
            <p className="text-sm font-semibold text-gray-800">
              {campaign.clicks > 0 
                ? ((campaign.purchases / campaign.clicks) * 100).toFixed(2) 
                : 0}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const [globalStats, setGlobalStats] = useState<CampaignStats | null>(null);
  const [perCampaignStats, setPerCampaignStats] = useState<PerCampaignStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [global, per] = await Promise.all([
          getCampaignStats(),
          getCampaignStatsPerCampaign()
        ]);
        setGlobalStats(global);
        setPerCampaignStats(per);
      } catch (err) {
        console.error('Erreur chargement analytics:', err);
        setError('Impossible de charger les statistiques.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!globalStats) return null;

  // Calculer les totaux depuis perCampaignStats
  const totalImpressions = perCampaignStats.reduce((sum, c) => sum + (c.impressions || 0), 0);
  const totalClicks = perCampaignStats.reduce((sum, c) => sum + (c.clicks || 0), 0);
  const totalRevenue = perCampaignStats.reduce((sum, c) => sum + (c.revenue || 0), 0);
  const totalPurchases = perCampaignStats.reduce((sum, c) => sum + (c.purchases || 0), 0);
  const avgCTR = totalClicks > 0 && totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  // Compter les campagnes par statut
  const totalCampaigns = perCampaignStats.length;
  const activeCampaigns = perCampaignStats.filter(c => c.status === 'active').length;
  const scheduledCampaigns = perCampaignStats.filter(c => c.status === 'scheduled').length;
  const draftCampaigns = perCampaignStats.filter(c => c.status === 'draft').length;
  const endedCampaigns = perCampaignStats.filter(c => c.status === 'ended').length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Analytics des campagnes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Statistiques et performances de vos campagnes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Mise à jour: {new Date().toLocaleDateString('fr-FR')}</span>
        </div>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Eye}
          label="Impressions totales"
          value={totalImpressions.toLocaleString()}
          color="bg-blue-500"
          subtitle={`${totalCampaigns} campagnes`}
        />
        <StatCard
          icon={MousePointer}
          label="Clics totaux"
          value={totalClicks.toLocaleString()}
          color="bg-indigo-500"
          subtitle={`CTR: ${avgCTR.toFixed(2)}%`}
        />
        <StatCard
          icon={ShoppingCart}
          label="Achats"
          value={totalPurchases.toLocaleString()}
          color="bg-green-500"
        />
        <StatCard
          icon={DollarSign}
          label="Revenu total"
          value={`${totalRevenue.toLocaleString()} FCFA`}
          color="bg-yellow-500"
        />
      </div>

      {/* Deuxième ligne de stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-500">Total campagnes</p>
          <p className="text-2xl font-bold text-gray-800">{totalCampaigns}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-500">Actives</p>
          <p className="text-2xl font-bold text-green-600">{activeCampaigns}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-500">Programmées</p>
          <p className="text-2xl font-bold text-blue-600">{scheduledCampaigns}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-500">Brouillons</p>
          <p className="text-2xl font-bold text-gray-600">{draftCampaigns}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-500">Terminées</p>
          <p className="text-2xl font-bold text-red-600">{endedCampaigns}</p>
        </div>
      </div>

      {/* Liste des campagnes */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">Performance par campagne</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {perCampaignStats.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Package size={32} className="mx-auto mb-2 text-gray-300" />
              <p>Aucune campagne trouvée</p>
            </div>
          ) : (
            perCampaignStats.map((campaign) => (
              <CampaignRow key={campaign.id} campaign={campaign} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}