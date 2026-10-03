// app/admin/gdpr/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface User {
  id: number
  name: string
  email: string
  phone: string | null
  country: string | null
  city: string | null
  whatsapp_opt_in: number
  email_notifications: number
  push_notifications: number
  created_at: string
  last_login: string | null
  is_active: number
  is_verified: number
  hasConsent: boolean
  daysSinceLogin: number | null
  isInactive: boolean
}

interface Stats {
  totalUsers: number
  usersWithConsent: number
  usersWithPhone: number
  usersInactive30d: number
  usersInactive90d: number
  usersNeverLoggedIn: number
  deletionRequests: number
}

interface GdprExportData {
  orders?: unknown[]
  favorites?: unknown[]
  reviews?: unknown[]
  activities?: unknown[]
  [key: string]: unknown
}

interface GdprResponse {
  users?: User[]
  stats?: Stats
  error?: string
}

interface GdprExportResponse {
  success?: boolean
  exported_at?: string
  data?: GdprExportData
  error?: string
  message?: string
}

interface ExportedDataState {
  user: User
  exported_at?: string
  data?: GdprExportData
  success?: boolean
  message?: string
  error?: string
}

export default function AdminGdprPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    usersWithConsent: 0,
    usersWithPhone: 0,
    usersInactive30d: 0,
    usersInactive90d: 0,
    usersNeverLoggedIn: 0,
    deletionRequests: 0,
  })
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [filter, setFilter] = useState<'all' | 'no-consent' | 'inactive'>('all')
  const [actionInProgress, setActionInProgress] = useState<number | null>(null)
  const [exportedData, setExportedData] = useState<ExportedDataState | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)

      const res = await fetch(`/api/admin/gdpr?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`)
      const data = await res.json() as GdprResponse
      setUsers(data.users || [])
      setStats(data.stats || stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput.trim())
  }

  const handleExport = async (user: User) => {
    setActionInProgress(user.id)
    try {
      const res = await fetch('/api/admin/gdpr', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export', user_id: user.id }),
      })
      const data = await res.json() as GdprExportResponse
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setExportedData({ ...data, user })
    } catch (err) {
      alert('Erreur : ' + (err instanceof Error ? err.message : 'Erreur inconnue'))
    } finally {
      setActionInProgress(null)
    }
  }

  const handleAnonymize = async (user: User) => {
    if (!confirm(
      `⚠️ Anonymiser "${user.email}" ?\n\n` +
      `Cette action va :\n` +
      `- Effacer nom, email, téléphone, adresse\n` +
      `- Désactiver le compte\n` +
      `- CONSERVER les commandes (obligations légales)\n\n` +
      `Cette action est IRRÉVERSIBLE.`
    )) return

    setActionInProgress(user.id)
    try {
      const res = await fetch('/api/admin/gdpr', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'anonymize', user_id: user.id }),
      })
      const data = await res.json() as GdprExportResponse
      if (!res.ok) throw new Error(data.error || 'Erreur')
      alert('✅ ' + data.message)
      loadUsers()
    } catch (err) {
      alert('Erreur : ' + (err instanceof Error ? err.message : 'Erreur inconnue'))
    } finally {
      setActionInProgress(null)
    }
  }

  const handleDelete = async (user: User) => {
    if (!confirm(
      `🗑️ SUPPRIMER "${user.email}" ?\n\n` +
      `Cette action va :\n` +
      `- Supprimer le compte utilisateur\n` +
      `- Effacer favoris, avis, panier, notifications, activité\n` +
      `- Détacher les commandes (conservées pour la comptabilité)\n\n` +
      `⚠️ CETTE ACTION EST DÉFINITIVE ET IRRÉVERSIBLE.`
    )) return

    const confirmText = prompt(
      `Tapez "SUPPRIMER" en majuscules pour confirmer la suppression de ${user.email}`
    )
    if (confirmText !== 'SUPPRIMER') {
      alert('Annulé')
      return
    }

    setActionInProgress(user.id)
    try {
      const res = await fetch('/api/admin/gdpr', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', user_id: user.id }),
      })
      const data = await res.json() as GdprExportResponse
      if (!res.ok) throw new Error(data.error || 'Erreur')
      alert('✅ ' + data.message)
      loadUsers()
    } catch (err) {
      alert('Erreur : ' + (err instanceof Error ? err.message : 'Erreur inconnue'))
    } finally {
      setActionInProgress(null)
    }
  }

  const downloadExport = () => {
    if (!exportedData) return
    const blob = new Blob([JSON.stringify(exportedData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gdpr-export-user-${exportedData.user.id}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'Jamais'
    try {
      return new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return date
    }
  }

  const filteredUsers = users.filter(u => {
    if (filter === 'no-consent') return !u.hasConsent
    if (filter === 'inactive') return u.isInactive
    return true
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            🔒 Conformité RGPD
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestion des données personnelles et droits des utilisateurs
          </p>
        </div>
        <Link
          href="/admin"
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Info RGPD */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
        <div className="font-bold mb-1">📋 Le RGPD en bref</div>
        <ul className="text-xs space-y-0.5 list-disc list-inside">
          <li>
            <strong>Droit d'accès</strong> : un utilisateur peut demander une copie de ses
            données
          </li>
          <li>
            <strong>Droit à l'oubli</strong> : il peut demander la suppression de son
            compte
          </li>
          <li>
            <strong>Droit de rectification</strong> : il peut corriger ses données
          </li>
          <li>
            <strong>Droit de portabilité</strong> : il peut récupérer ses données au
            format JSON
          </li>
        </ul>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase">Total utilisateurs</div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-green-600 uppercase">Avec consentement</div>
          <div className="text-2xl font-bold text-green-700">
            {stats.usersWithConsent}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-orange-600 uppercase">Inactifs 30j</div>
          <div className="text-2xl font-bold text-orange-700">
            {stats.usersInactive30d}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-red-600 uppercase">Inactifs 90j</div>
          <div className="text-2xl font-bold text-red-700">
            {stats.usersInactive90d}
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end mb-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">Rechercher</label>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Email, nom…"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
          >
            Rechercher
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              filter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Tous ({users.length})
          </button>
          <button
            onClick={() => setFilter('no-consent')}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              filter === 'no-consent'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Sans consentement ({users.filter(u => !u.hasConsent).length})
          </button>
          <button
            onClick={() => setFilter('inactive')}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              filter === 'inactive'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Inactifs 90j+ ({users.filter(u => u.isInactive).length})
          </button>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement…</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center text-gray-500">
          <div className="text-4xl mb-3">👥</div>
          <p className="font-medium">Aucun utilisateur</p>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-600">
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3 text-center">Consentement</th>
                <th className="px-4 py-3 text-center">Téléphone</th>
                <th className="px-4 py-3 text-center">Dernière connexion</th>
                <th className="px-4 py-3 text-center">Statut</th>
                <th className="px-4 py-3 text-right">Actions RGPD</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr
                  key={u.id}
                  className={`border-b hover:bg-gray-50 ${
                    u.isInactive ? 'bg-orange-50/30' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {u.name || 'Anonyme'}
                    </div>
                    <div className="text-xs text-gray-500">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.hasConsent ? (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                        ✅ Oui
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                        ❌ Non
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-xs">
                    {u.phone ? (
                      <span className="font-mono">{u.phone}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">
                    {u.last_login ? (
                      <>
                        {formatDate(u.last_login)}
                        {u.daysSinceLogin !== null && (
                          <div className="text-[10px] text-gray-400">
                            Il y a {u.daysSinceLogin}j
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-red-500">Jamais connecté</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.is_active === 1 ? (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                        Actif
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                        Inactif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleExport(u)}
                        disabled={actionInProgress === u.id}
                        className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded disabled:opacity-50"
                        title="Exporter les données (RGPD)"
                      >
                        📤 Export
                      </button>
                      <button
                        onClick={() => handleAnonymize(u)}
                        disabled={actionInProgress === u.id}
                        className="px-2 py-1 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded disabled:opacity-50"
                        title="Anonymiser"
                      >
                        🎭
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        disabled={actionInProgress === u.id}
                        className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded disabled:opacity-50"
                        title="Supprimer définitivement"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Export */}
      {exportedData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  📤 Export RGPD
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {exportedData.user.email} · ID #{exportedData.user.id}
                </p>
              </div>
              <button
                onClick={() => setExportedData(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="bg-green-50 border border-green-200 rounded p-3 mb-4 text-sm text-green-800">
                ✅ Données exportées le{' '}
                {exportedData.exported_at
                  ? new Date(exportedData.exported_at).toLocaleString('fr-FR')
                  : '—'}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                <div className="bg-gray-50 p-2 rounded">
                  <span className="font-medium">Commandes</span> :{' '}
                  {exportedData.data?.orders?.length || 0}
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="font-medium">Favoris</span> :{' '}
                  {exportedData.data?.favorites?.length || 0}
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="font-medium">Avis</span> :{' '}
                  {exportedData.data?.reviews?.length || 0}
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="font-medium">Activités</span> :{' '}
                  {exportedData.data?.activities?.length || 0}
                </div>
              </div>

              <div className="bg-gray-900 text-green-400 p-4 rounded text-xs font-mono overflow-x-auto max-h-64 mb-4">
                <pre>{JSON.stringify(exportedData.data, null, 2).slice(0, 5000)}
                  {JSON.stringify(exportedData.data, null, 2).length > 5000 && '\n… (tronqué)'}
                </pre>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setExportedData(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                >
                  Fermer
                </button>
                <button
                  onClick={downloadExport}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                >
                  📥 Télécharger JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conseils */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-sm">
        <h2 className="text-lg font-bold text-yellow-900 mb-3">
          ⚖️ Obligations RGPD
        </h2>
        <ul className="space-y-1 text-xs text-yellow-800 list-disc list-inside">
          <li>
            <strong>Réponse en 30 jours</strong> : à toute demande d'accès/suppression
          </li>
          <li>
            <strong>Registre des traitements</strong> : documentez quels types de données
            vous collectez et pourquoi
          </li>
          <li>
            <strong>Politique de confidentialité</strong> : publique et accessible (page
            /confidentialite)
          </li>
          <li>
            <strong>Consentement explicite</strong> : pour newsletter, tracking, cookies
            non-essentiels
          </li>
          <li>
            <strong>Droit à l'oubli</strong> : suppression dans un délai raisonnable
          </li>
          <li>
            <strong>Notification de fuite</strong> : sous 72h en cas de violation de
            données
          </li>
        </ul>
      </div>
    </div>
  )
}