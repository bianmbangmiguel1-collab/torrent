// app/admin/newsletter/campaigns/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Mail, 
  Send, 
  Eye, 
  Edit, 
  Trash2, 
  Copy,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Calendar,
  Users,
  TrendingUp,
  Sparkles,
  Brain,
  AlertCircle,
  LayoutDashboard,
  ArrowLeft
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
  created_at: string;
  updated_at: string;
}

// ============================================================
// Types de réponses API
// ============================================================
interface CampaignsResponse {
  success?: boolean;
  campaigns?: Campaign[];
  error?: string;
}

interface CampaignActionResponse {
  success?: boolean;
  error?: string;
}

// ============================================================
// Helper générique pour typer response.json()
// ============================================================
async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export default function CampaignsListPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 🔥 Éviter l'hydratation
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      fetchCampaigns();
    }
  }, [filter, isMounted]);

  // 🔥 Notification temporaire
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/newsletter/campaigns?status=${filter}`);
      const data = await parseJson<CampaignsResponse>(response);
      if (data.success) {
        setCampaigns(data.campaigns || []);
      } else {
        console.error('Erreur API:', data.error);
        showNotification('error', 'Erreur lors du chargement des campagnes');
      }
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('error', 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  // 🔥 FONCTION DE SUPPRESSION
  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/newsletter/campaigns/${id}`, {
        method: 'DELETE'
      });

      const data = await parseJson<CampaignActionResponse>(response);

      if (data.success) {
        setCampaigns(campaigns.filter(c => c.id !== id));
        showNotification('success', '✅ Campagne supprimée avec succès !');
        setShowDeleteModal(false);
        setCampaignToDelete(null);
      } else {
        showNotification('error', '❌ ' + (data.error || 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
      showNotification('error', '❌ Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  // 🔥 Fonction pour dupliquer une campagne
  const handleDuplicate = async (id: number) => {
    setDuplicatingId(id);
    try {
      const response = await fetch(`/api/admin/newsletter/campaigns/${id}/duplicate`, {
        method: 'POST'
      });
      const data = await parseJson<CampaignActionResponse>(response);
      if (data.success) {
        showNotification('success', '✅ Campagne dupliquée avec succès !');
        await fetchCampaigns();
      } else {
        showNotification('error', '❌ ' + (data.error || 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('Erreur duplication:', error);
      showNotification('error', '❌ Erreur lors de la duplication');
    } finally {
      setDuplicatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'sent':
        return <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Envoyée</span>;
      case 'draft':
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full flex items-center gap-1"><Clock className="w-3 h-3" /> Brouillon</span>;
      case 'scheduled':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1"><Calendar className="w-3 h-3" /> Planifiée</span>;
      case 'failed':
        return <span className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1"><XCircle className="w-3 h-3" /> Échouée</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">{status}</span>;
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 🔥 MODAL DE CONFIRMATION DE SUPPRESSION
  const DeleteConfirmModal = () => {
    if (!showDeleteModal || !campaignToDelete) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Confirmer la suppression</h3>
          </div>
          
          <p className="text-gray-600 mb-2">
            Êtes-vous sûr de vouloir supprimer la campagne :
          </p>
          <p className="font-semibold text-gray-900 mb-4">
            "{campaignToDelete.name}"
          </p>
          <p className="text-sm text-red-600 mb-6">
            ⚠️ Cette action est irréversible. Toutes les données associées seront supprimées.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setCampaignToDelete(null);
              }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                if (campaignToDelete) {
                  handleDelete(campaignToDelete.id);
                }
              }}
              disabled={deletingId !== null}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {deletingId === campaignToDelete?.id ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 🔥 Rendu conditionnel pour éviter l'hydratation
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-2" />
          <p className="text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-2" />
          <p className="text-gray-500">Chargement des campagnes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Notification */}
        {notification && (
          <div className={`mb-4 p-4 rounded-lg ${notification.type === 'success' ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'}`}>
            {notification.message}
          </div>
        )}

        {/* En-tête avec navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            {/* 🔥 BOUTON RETOUR VERS LE TABLEAU DE BORD ADMIN */}
            <Link
              href="/admin"
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
            >
              <LayoutDashboard className="w-4 h-4" />
              Tableau de bord
            </Link>
            <Link
              href="/admin/newsletter"
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Newsletter
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Mail className="w-6 h-6 text-purple-600" />
                Campagnes
              </h1>
              <p className="text-gray-600 text-sm">Gérez vos campagnes de newsletter</p>
            </div>
          </div>
          <Link
            href="/admin/newsletter/campaigns/new"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4" />
            Nouvelle campagne
          </Link>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: '📊 Toutes' },
              { id: 'draft', label: '📝 Brouillons' },
              { id: 'sent', label: '✅ Envoyées' },
              { id: 'scheduled', label: '📅 Planifiées' },
              { id: 'failed', label: '❌ Échouées' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-4 py-2 rounded-lg transition text-sm font-medium ${
                  filter === tab.id 
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Liste des campagnes */}
        {campaigns.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Aucune campagne</h3>
            <p className="text-gray-400 mb-4">
              {filter === 'all' 
                ? 'Commencez par créer votre première campagne' 
                : 'Aucune campagne avec ce statut'}
            </p>
            <Link
              href="/admin/newsletter/campaigns/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              <Plus className="w-4 h-4" />
              Créer une campagne
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{campaign.name}</h3>
                      <p className="text-sm text-gray-500 truncate">{campaign.subject}</p>
                    </div>
                    {getStatusBadge(campaign.status)}
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {campaign.recipients_count || 0} destinataires
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {campaign.opens_count || 0} ouvertures
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {formatDate(campaign.created_at)}
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <Link
                      href={`/admin/newsletter/campaigns/${campaign.id}`}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Eye className="w-4 h-4" /> Voir
                    </Link>
                    {campaign.status === 'draft' && (
                      <Link
                        href={`/admin/newsletter/campaigns/${campaign.id}/edit`}
                        className="flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                    )}
                    <button
                      onClick={() => handleDuplicate(campaign.id)}
                      disabled={duplicatingId === campaign.id}
                      className="flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition disabled:opacity-50"
                      title="Dupliquer"
                    >
                      {duplicatingId === campaign.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setCampaignToDelete(campaign);
                        setShowDeleteModal(true);
                      }}
                      disabled={deletingId === campaign.id}
                      className="flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                      title="Supprimer"
                    >
                      {deletingId === campaign.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de confirmation de suppression */}
        <DeleteConfirmModal />
      </div>
    </div>
  );
}