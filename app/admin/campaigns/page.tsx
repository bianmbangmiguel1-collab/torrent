// app/admin/campaigns/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCampaigns, duplicateCampaign, deleteCampaign } from '@/lib/admin-actions';
import {
  Plus,
  Image as ImageIcon,
  BarChart,
  Copy,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
} from 'lucide-react';

const STATUS_CONFIG = {
  draft: {
    label: 'Brouillon',
    icon: AlertCircle,
    color: 'bg-gray-100 text-gray-700 border-gray-300',
  },
  scheduled: {
    label: 'Programmée',
    icon: Calendar,
    color: 'bg-blue-100 text-blue-700 border-blue-300',
  },
  active: {
    label: 'Active',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-700 border-green-300',
  },
  ended: {
    label: 'Terminée',
    icon: XCircle,
    color: 'bg-red-100 text-red-700 border-red-300',
  },
};

interface Campaign {
  id: number;
  name: string;
  status: 'draft' | 'scheduled' | 'active' | 'ended';
  type: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

function CampaignCard({ campaign, onDuplicate, onDelete }: { campaign: Campaign; onDuplicate: (id: number) => void; onDelete: (id: number) => void }) {
  const status = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
  const StatusIcon = status.icon;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{campaign.name}</h3>
          <p className="text-sm text-gray-500 mt-1">
            Type: <span className="capitalize">{campaign.type}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.color}`}
          >
            <StatusIcon size={12} />
            {status.label}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
        {campaign.start_date && (
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {new Date(campaign.start_date).toLocaleDateString('fr-FR')}
            {campaign.end_date &&
              ` → ${new Date(campaign.end_date).toLocaleDateString('fr-FR')}`}
          </span>
        )}
        <span>Créée le {new Date(campaign.created_at).toLocaleDateString('fr-FR')}</span>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t pt-3">
        <Link
          href={`/admin/campaigns/${campaign.id}`}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
        >
          <Edit2 size={14} />
          Modifier
        </Link>
        <button
          onClick={() => onDuplicate(campaign.id)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
          title="Dupliquer"
        >
          <Copy size={14} />
          Dupliquer
        </button>
        <button
          onClick={() => onDelete(campaign.id)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition ml-auto"
          title="Supprimer"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

const statusFilters = [
  { value: 'all', label: 'Toutes' },
  { value: 'active', label: 'Actives' },
  { value: 'scheduled', label: 'Programmées' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'ended', label: 'Terminées' },
];

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'scheduled' | 'draft' | 'ended'>('all');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = async () => {
    try {
      const result = await getCampaigns();
      setCampaigns(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error('Erreur lors du chargement des campagnes:', err);
      setError('Impossible de charger les campagnes. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleDuplicate = async (id: number) => {
    try {
      await duplicateCampaign(id);
      await fetchCampaigns();
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la duplication');
    }
  };

  const handleDelete = async (id: number) => {
    const campaign = campaigns.find(c => c.id === id);
    if (!campaign) return;
    if (!confirm(`Supprimer la campagne "${campaign.name}" ?`)) return;
    try {
      await deleteCampaign(id);
      await fetchCampaigns();
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la suppression');
    }
  };

  const filteredCampaigns = filter === 'all' 
    ? campaigns 
    : campaigns.filter(c => c.status === filter);

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'active').length,
    scheduled: campaigns.filter(c => c.status === 'scheduled').length,
    draft: campaigns.filter(c => c.status === 'draft').length,
    ended: campaigns.filter(c => c.status === 'ended').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des campagnes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Campagnes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gérez toutes vos campagnes publicitaires et promotionnelles
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/campaigns/create"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <Plus size={18} />
            Nouvelle campagne
          </Link>
          <Link
            href="/admin/media-library"
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            <ImageIcon size={18} />
            Bibliothèque média
          </Link>
          <Link
            href="/admin/campaigns/analytics"
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            <BarChart size={18} />
            Analytics
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-xs text-gray-500">Actives</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
          <div className="text-xs text-gray-500">Programmées</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
          <div className="text-xs text-gray-500">Brouillons</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.ended}</div>
          <div className="text-xs text-gray-500">Terminées</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {statusFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value as any)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
              filter === f.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredCampaigns.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-lg font-medium text-gray-800">Aucune campagne</h3>
          <p className="text-sm text-gray-500 mt-1">
            Créez votre première campagne publicitaire
          </p>
          <Link
            href="/admin/campaigns/create"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={18} />
            Créer une campagne
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}