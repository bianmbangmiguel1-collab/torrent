// app/admin/newsletter/subscribers/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Mail,
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  LayoutDashboard,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================
interface Subscriber {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  country: string | null;
  status: string;
  source: string;
  opt_in: number;
  preferences: string | null;
  engagement_score: number;
  messages_count: number;
  subscribed_at: string;
  last_sent_at: string | null;
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  unsubscribed: number;
  totalMessages: number;
  avgEngagement: number;
}

interface SubscribersResponse {
  subscribers?: Subscriber[];
  stats?: Stats;
  total?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  error?: string;
}

interface TemplatesResponse {
  templates?: Array<{ id: number; name: string }>;
  error?: string;
}

// ============================================================
// Composant principal
// ============================================================
export default function AdminSubscribersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    inactive: 0,
    unsubscribed: 0,
    totalMessages: 0,
    avgEngagement: 0,
  });
  const [templates, setTemplates] = useState<Array<{ id: number; name: string }>>([]);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'unsubscribed'>('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // ============================================================
  // Éviter l'hydratation
  // ============================================================
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ============================================================
  // Charger les données
  // ============================================================
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (filterStatus !== 'all') params.set('status', filterStatus);

      const [subscribersRes, templatesRes] = await Promise.all([
        fetch(`/api/admin/newsletter/subscribers?${params.toString()}`, {
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch('/api/admin/newsletter/templates', {
          credentials: 'include',
          cache: 'no-store',
        }),
      ]);

      if (!subscribersRes.ok) {
        throw new Error(`Erreur HTTP ${subscribersRes.status}`);
      }

      const subscribersData = (await subscribersRes.json()) as SubscribersResponse;
      setSubscribers(subscribersData.subscribers || []);
      setTotal(subscribersData.total || 0);
      setTotalPages(subscribersData.pagination?.pages || 1);
      if (subscribersData.stats) setStats(subscribersData.stats);

      if (templatesRes.ok) {
        const templatesData = (await templatesRes.json()) as TemplatesResponse;
        setTemplates(templatesData.templates || []);
      }
    } catch (err: unknown) {
      console.error('❌ Erreur chargement:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, filterStatus]);

  useEffect(() => {
    if (isMounted) {
      loadData();
    }
  }, [isMounted, loadData]);

  // ============================================================
  // Recherche
  // ============================================================
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setFilterStatus('all');
    setPage(1);
  };

  // ============================================================
  // Suppression
  // ============================================================
  const handleDelete = async (id: number, email: string) => {
    if (!confirm(`Supprimer définitivement l'abonné "${email}" ?`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/newsletter/subscribers?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        await loadData();
      } else {
        const data = (await res.json()) as { error?: string };
        alert('❌ ' + (data.error || 'Erreur lors de la suppression'));
      }
    } catch (err) {
      console.error('❌ Erreur suppression:', err);
      alert('Erreur réseau');
    } finally {
      setDeletingId(null);
    }
  };

  // ============================================================
  // Formatage
  // ============================================================
  const formatDate = (date: string | null) => {
    if (!date) return '—';
    try {
      return new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return date;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
            <CheckCircle className="w-3 h-3" /> Actif
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
            <Clock className="w-3 h-3" /> Inactif
          </span>
        );
      case 'unsubscribed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
            <XCircle className="w-3 h-3" /> Désabonné
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
            {status}
          </span>
        );
    }
  };

  const getEngagementColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    if (score > 0) return 'text-orange-600';
    return 'text-gray-400';
  };

  // ============================================================
  // Rendu conditionnel
  // ============================================================
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
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
                <Users className="w-6 h-6 text-purple-600" />
                Abonnés
              </h1>
              <p className="text-gray-600 text-sm">
                Gérez vos abonnés et leurs préférences
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/newsletter/subscribers/new"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition"
            >
              <Plus className="w-4 h-4" />
              Nouvel abonné
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase">Total</span>
              <Users className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.total || total}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-green-600 uppercase">Actifs</span>
              <UserCheck className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-700">{stats.active}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-yellow-600 uppercase">Inactifs</span>
              <Clock className="w-4 h-4 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-yellow-700">{stats.inactive}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-purple-600 uppercase">Engagement moy.</span>
              <TrendingUp className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-purple-700">
              {Math.round(stats.avgEngagement || 0)}%
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end mb-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-gray-500 mb-1">Rechercher</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Email, nom…"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium"
            >
              Rechercher
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
            >
              Réinitialiser
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'all', label: 'Tous', icon: Users },
                { id: 'active', label: 'Actifs', icon: UserCheck },
                { id: 'inactive', label: 'Inactifs', icon: Clock },
                { id: 'unsubscribed', label: 'Désabonnés', icon: UserX },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setFilterStatus(tab.id);
                    setPage(1);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition text-sm font-medium ${
                    filterStatus === tab.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-2" />
            <p className="text-gray-500">Chargement des abonnés…</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        ) : subscribers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Aucun abonné trouvé
            </h3>
            <p className="text-gray-400 mb-4">
              {search || filterStatus !== 'all'
                ? 'Essayez de modifier vos filtres'
                : 'Commencez par ajouter votre premier abonné'}
            </p>
            <Link
              href="/admin/newsletter/subscribers/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              <Plus className="w-4 h-4" />
              Ajouter un abonné
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-gray-600">
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Nom</th>
                    <th className="px-4 py-3 font-medium">Pays</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium text-center">Engagement</th>
                    <th className="px-4 py-3 font-medium text-center">Messages</th>
                    <th className="px-4 py-3 font-medium">Inscrit le</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subscribers.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {sub.name
                              ? sub.name.charAt(0).toUpperCase()
                              : sub.email.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900 truncate">
                            {sub.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {sub.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {sub.country || '—'}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(sub.status)}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-bold ${getEngagementColor(
                            sub.engagement_score || 0
                          )}`}
                        >
                          {Math.round(sub.engagement_score || 0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {sub.messages_count || 0}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {formatDate(sub.subscribed_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/newsletter/subscribers/${sub.id}/edit`}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(sub.id, sub.email)}
                            disabled={deletingId === sub.id}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                            title="Supprimer"
                          >
                            {deletingId === sub.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-600">
                  Page {page} sur {totalPages} • {total} abonné{total > 1 ? 's' : ''}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg hover:bg-white disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Précédent
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg hover:bg-white disabled:opacity-50"
                  >
                    Suivant
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Astuce */}
        <div className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 text-sm">
          <div className="flex items-start gap-2">
            <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-purple-800">💡 Astuce</p>
              <p className="text-xs text-purple-700 mt-0.5">
                Segmentez vos abonnés par engagement pour envoyer des campagnes
                ciblées et améliorer votre taux d'ouverture.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}