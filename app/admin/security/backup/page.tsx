// app/admin/security/backup/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Backup {
  name: string
  size: number
  sizeFormatted: string
  created_at: string
}

interface DbStats {
  users: number
  products: number
  orders: number
  reviews: number
}

interface CurrentDb {
  size: number
  sizeFormatted: string
  path: string
  stats: DbStats
}

// ============================================================
// Types de réponses API
// ============================================================
interface BackupListResponse {
  backups?: Backup[]
  currentDb?: CurrentDb | null
  nextAutoBackup?: string | null
}

interface CreateBackupResponse {
  backup?: Backup
  error?: string
}

export default function AdminBackupPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [backups, setBackups] = useState<Backup[]>([])
  const [currentDb, setCurrentDb] = useState<CurrentDb | null>(null)
  const [nextAutoBackup, setNextAutoBackup] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [label, setLabel] = useState('')

  const loadBackups = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/security/backup', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`)
      const data = (await res.json()) as BackupListResponse
      setBackups(data.backups || [])
      setCurrentDb(data.currentDb || null)
      setNextAutoBackup(data.nextAutoBackup || null)
    } catch (err: any) {
      console.error('❌ Erreur:', err)
      setError(err.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBackups()
  }, [loadBackups])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/admin/security/backup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      })
      const data = (await res.json()) as CreateBackupResponse

      if (!res.ok) {
        throw new Error(data.error || 'Erreur')
      }

      if (!data.backup) {
        throw new Error('Réponse invalide du serveur')
      }

      alert(`✅ Sauvegarde créée :\n${data.backup.name}\n(${data.backup.sizeFormatted})`)
      setLabel('')
      loadBackups()
    } catch (err: any) {
      alert('Erreur : ' + err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (name: string) => {
    if (!confirm(`Supprimer "${name}" ?`)) return
    try {
      await fetch(`/api/admin/security/backup?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      loadBackups()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDownload = (name: string) => {
    // Crée un lien direct vers le fichier de backup (si exposé)
    // Sinon, on peut créer un endpoint /api/admin/security/backup/download
    alert(
      `Le fichier ${name} est dans le dossier :\n\n` +
        `torrenttwist-backend/backups/${name}\n\n` +
        `Copiez-le manuellement pour le sauvegarder sur un autre disque.`
    )
  }

  const formatDate = (date: string) => {
    try {
      const d = new Date(date)
      const now = new Date()
      const diff = now.getTime() - d.getTime()
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const mins = Math.floor(diff / (1000 * 60))

      if (mins < 1) return 'À l\'instant'
      if (mins < 60) return `Il y a ${mins} min`
      if (hours < 24) return `Il y a ${hours} h`
      if (days < 7) return `Il y a ${days} j`

      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
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
          <h1 className="text-2xl font-bold text-gray-900">Sauvegardes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Créez et gérez les sauvegardes de votre base de données
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/security"
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            🔒 Sécurité
          </Link>
          <Link
            href="/admin"
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            ← Dashboard
          </Link>
        </div>
      </div>

      {/* Info DB actuelle */}
      {currentDb && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-xs uppercase opacity-90">Base de données actuelle</div>
              <div className="text-3xl font-bold mt-1">{currentDb.sizeFormatted}</div>
              <div className="text-xs opacity-80 mt-1 font-mono">
                {currentDb.path}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{currentDb.stats.users}</div>
                <div className="text-xs opacity-80">Users</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{currentDb.stats.products}</div>
                <div className="text-xs opacity-80">Produits</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{currentDb.stats.orders}</div>
                <div className="text-xs opacity-80">Commandes</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{currentDb.stats.reviews}</div>
                <div className="text-xs opacity-80">Avis</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Création */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          ➕ Créer une nouvelle sauvegarde
        </h2>

        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">
              Label (optionnel)
            </label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="ex: avant-mise-a-jour, pre-import..."
              className="w-full px-3 py-2 border rounded-lg text-sm"
              maxLength={40}
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
          >
            {creating ? '⏳ Création…' : '💾 Créer une sauvegarde'}
          </button>
        </div>

        {nextAutoBackup && (
          <div className="mt-4 text-xs text-gray-500">
            ⏰ Prochaine sauvegarde auto estimée :{' '}
            <span className="font-medium text-gray-700">
              {new Date(nextAutoBackup).toLocaleString('fr-FR')}
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase">Total backups</div>
          <div className="text-2xl font-bold text-gray-900">{backups.length}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase">Dernier backup</div>
          <div className="text-sm font-bold text-gray-900">
            {backups[0] ? formatDate(backups[0].created_at) : 'Aucun'}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase">Espace utilisé</div>
          <div className="text-2xl font-bold text-gray-900">
            {(
              backups.reduce((s, b) => s + b.size, 0) /
              (1024 * 1024)
            ).toFixed(1)}{' '}
            MB
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-green-600 uppercase">État</div>
          <div className="text-sm font-bold text-green-700">
            {backups.length > 0 ? '✅ Actif' : '⚠️ Aucun backup'}
          </div>
        </div>
      </div>

      {/* Liste des backups */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement…</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      ) : backups.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center text-gray-500">
          <div className="text-4xl mb-3">💾</div>
          <p className="font-medium">Aucune sauvegarde</p>
          <p className="text-sm mt-1">
            Créez votre première sauvegarde ci-dessus
          </p>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-600">
                <th className="px-4 py-3">Fichier</th>
                <th className="px-4 py-3 text-center">Taille</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b, idx) => (
                <tr
                  key={b.name}
                  className={`border-b hover:bg-gray-50 ${
                    idx === 0 ? 'bg-green-50/30' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs text-gray-800 truncate max-w-md">
                      {b.name}
                    </div>
                    {idx === 0 && (
                      <span className="text-[10px] text-green-700 font-medium">
                        🟢 Le plus récent
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-medium">
                    {b.sizeFormatted}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {formatDate(b.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleDownload(b.name)}
                        className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
                        title="Télécharger (info)"
                      >
                        📥
                      </button>
                      <button
                        onClick={() => handleDelete(b.name)}
                        className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded"
                        title="Supprimer"
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

      {/* Conseils */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-sm">
        <h2 className="text-lg font-bold text-yellow-900 mb-3">
          💡 Bonnes pratiques de sauvegarde
        </h2>
        <ul className="space-y-1 text-xs text-yellow-800 list-disc list-inside">
          <li>
            <strong>Automatisez</strong> : créez un cron job qui appelle{' '}
            <code className="bg-white px-1 rounded">POST /api/admin/security/backup</code>{' '}
            toutes les 24h
          </li>
          <li>
            <strong>Copiez ailleurs</strong> : les sauvegardes locales ne protègent pas
            contre un crash disque. Copiez-les sur un cloud (S3, Drive…)
          </li>
          <li>
            <strong>Testez la restauration</strong> : une sauvegarde non testée n'existe
            pas
          </li>
          <li>
            <strong>Nettoyez</strong> : gardez les 30 derniers backups max et supprimez
            les plus anciens
          </li>
          <li>
            <strong>Documentez</strong> : notez la procédure de restauration quelque part
            de sûr
          </li>
        </ul>
      </div>
    </div>
  )
}