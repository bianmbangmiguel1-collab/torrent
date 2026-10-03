// app/admin/push-notifications/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Notification {
  id: number
  user_id: number
  type: string
  title: string
  message: string
  is_read: number
  link: string | null
  icon: string | null
  created_at: string
  user_name: string | null
  user_email: string | null
}

interface Stats {
  totalSent: number
  totalRead: number
  totalUnread: number
  totalUsers: number
  readRate: number
}

// ============================================================
// Types de réponses API
// ============================================================
interface NotificationsResponse {
  notifications?: Notification[]
  stats?: Stats
  pagination?: {
    pages?: number
  }
}

interface SendNotificationResponse {
  message?: string
  error?: string
}

export default function PushNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState<Stats>({
    totalSent: 0,
    totalRead: 0,
    totalUnread: 0,
    totalUsers: 0,
    readRate: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Formulaire d'envoi
  const [form, setForm] = useState({
    title: '',
    message: '',
    link: '',
    icon: '🔔',
    target: 'all' as 'all' | 'email',
    email: '',
  })
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/push-notifications?page=${page}&limit=20`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`)
      const data = (await res.json()) as NotificationsResponse
      setNotifications(data.notifications || [])
      setStats(data.stats || stats)
      setTotalPages(data.pagination?.pages || 1)
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setSendResult(null)

    try {
      const res = await fetch('/api/admin/push-notifications', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = (await res.json()) as SendNotificationResponse

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l\'envoi')
      }

      setSendResult(`✅ ${data.message || 'Notification envoyée'}`)
      setForm({ ...form, title: '', message: '', link: '' })
      loadNotifications()
    } catch (err: any) {
      setSendResult(`❌ ${err.message}`)
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette notification ?')) return
    try {
      await fetch(`/api/admin/push-notifications?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      loadNotifications()
    } catch (err) {
      console.error(err)
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return '—'
    try {
      return new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return date
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications Push</h1>
          <p className="text-sm text-gray-500 mt-1">
            Envoyez des notifications aux utilisateurs
          </p>
        </div>
        <Link
          href="/admin"
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase">Envoyées</div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalSent}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-green-600 uppercase">Lues</div>
          <div className="text-2xl font-bold text-green-700">{stats.totalRead}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-yellow-600 uppercase">Non lues</div>
          <div className="text-2xl font-bold text-yellow-700">{stats.totalUnread}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-blue-600 uppercase">Utilisateurs</div>
          <div className="text-2xl font-bold text-blue-700">{stats.totalUsers}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-purple-600 uppercase">Taux de lecture</div>
          <div className="text-2xl font-bold text-purple-700">{stats.readRate}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulaire d'envoi */}
        <div className="lg:col-span-1">
          <div className="bg-white border rounded-lg p-6 sticky top-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              ➕ Nouvelle notification
            </h2>

            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Icône
                </label>
                <input
                  type="text"
                  value={form.icon}
                  onChange={e => setForm({ ...form, icon: e.target.value })}
                  maxLength={4}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="🔔"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Titre *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Nouvelle promo disponible !"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Message *
                </label>
                <textarea
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Découvrez -50% sur tous les produits cette semaine."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Lien (optionnel)
                </label>
                <input
                  type="text"
                  value={form.link}
                  onChange={e => setForm({ ...form, link: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="/products"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Destinataires
                </label>
                <select
                  value={form.target}
                  onChange={e => setForm({ ...form, target: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="all">Tous les utilisateurs actifs</option>
                  <option value="email">Un utilisateur précis</option>
                </select>
              </div>

              {form.target === 'email' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email de l'utilisateur
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="user@example.com"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={sending}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
              >
                {sending ? 'Envoi en cours…' : '📤 Envoyer la notification'}
              </button>

              {sendResult && (
                <div
                  className={`text-xs p-3 rounded ${
                    sendResult.startsWith('✅')
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {sendResult}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Historique */}
        <div className="lg:col-span-2">
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">
                📋 Historique des envois
              </h2>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-500">Chargement…</div>
            ) : error ? (
              <div className="p-4 text-red-600 text-sm">{error}</div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                <div className="text-4xl mb-3">📭</div>
                <p>Aucune notification envoyée</p>
              </div>
            ) : (
              <>
                <div className="divide-y">
                  {notifications.map(n => (
                    <div key={n.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl">{n.icon || '🔔'}</span>
                            <span className="font-semibold text-gray-900 text-sm">
                              {n.title}
                            </span>
                            {n.is_read === 1 ? (
                              <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                                Lu
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                                Non lu
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {n.message}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
                            <span>👤 {n.user_name || n.user_email || 'Utilisateur #' + n.user_id}</span>
                            <span>📅 {formatDate(n.created_at)}</span>
                            {n.link && (
                              <span className="text-blue-600">🔗 {n.link}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(n.id)}
                          className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                    <div className="text-sm text-gray-600">
                      Page {page} sur {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 text-sm border rounded hover:bg-white disabled:opacity-50"
                      >
                        ← Précédent
                      </button>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="px-3 py-1 text-sm border rounded hover:bg-white disabled:opacity-50"
                      >
                        Suivant →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}