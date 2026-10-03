// components/admin/newsletter/SubscribersTable.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Subscriber } from '@/lib/services/newsletter';

interface SubscribersTableProps {
  subscribers: Subscriber[];
  total: number;
  currentPage: number;
  totalPages: number;
}

interface SubscriberActionResponse {
  error?: string
}

export default function SubscribersTable({
  subscribers,
  total,
  currentPage,
  totalPages,
}: SubscribersTableProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const handleToggleStatus = async (subscriber: Subscriber) => {
    const newStatus = subscriber.status === 'active' ? 'inactive' : 'active';
    const newOptIn = subscriber.status === 'active' ? 0 : 1;

    if (!confirm(`Passer cet abonné en "${newStatus === 'active' ? 'actif' : 'inactif'}" ?`)) return;

    setLoading(subscriber.id);
    try {
      const res = await fetch(`/api/admin/newsletter/subscribers?id=${subscriber.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: newStatus,
          opt_in: newOptIn,
          unsubscribed_at: newStatus === 'inactive' ? new Date().toISOString() : null,
        }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const err = (await res.json()) as SubscriberActionResponse
        alert(err.error || 'Erreur')
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur réseau');
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer définitivement cet abonné ?')) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/newsletter/subscribers?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        router.refresh();
      } else {
        const err = (await res.json()) as SubscriberActionResponse
        alert(err.error || 'Erreur')
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur réseau');
    } finally {
      setDeleting(null);
    }
  };

  const goToPage = (page: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set('page', String(page));
    router.push(`/admin/newsletter/subscribers?${params.toString()}`);
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Nom</th>
              <th className="px-4 py-3 text-left font-medium">Pays</th>
              <th className="px-4 py-3 text-left font-medium">Source</th>
              <th className="px-4 py-3 text-left font-medium">Statut</th>
              <th className="px-4 py-3 text-left font-medium">Inscrit le</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {subscribers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Aucun abonné trouvé
                </td>
              </tr>
            ) : (
              subscribers.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-800">{sub.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{sub.name || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {sub.country ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        {sub.country}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                      {sub.source || 'website'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {sub.status === 'active' && sub.opt_in === 1 ? (
                      <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded-full text-xs font-medium">
                        <CheckCircle className="w-3 h-3" /> Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2 py-1 rounded-full text-xs font-medium">
                        <XCircle className="w-3 h-3" /> Inactif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {sub.subscribed_at ? new Date(sub.subscribed_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/admin/newsletter/subscribers/${sub.id}/edit`}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Modifier"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleToggleStatus(sub)}
                        disabled={loading === sub.id}
                        className={`p-1.5 rounded-lg transition ${
                          sub.status === 'active'
                            ? 'text-yellow-600 hover:bg-yellow-50'
                            : 'text-green-600 hover:bg-green-50'
                        } ${loading === sub.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={sub.status === 'active' ? 'Désactiver' : 'Activer'}
                      >
                        {loading === sub.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : sub.status === 'active' ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(sub.id)}
                        disabled={deleting === sub.id}
                        className={`p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition ${
                          deleting === sub.id ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title="Supprimer"
                      >
                        {deleting === sub.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="flex items-center gap-1 px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
          >
            <ChevronLeft className="w-4 h-4" /> Précédent
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} sur {totalPages}
          </span>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="flex items-center gap-1 px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
          >
            Suivant <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}