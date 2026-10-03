// app/admin/integrations/analytics/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Field {
  key: string
  label: string
  placeholder: string
}

interface Integration {
  id: string
  name: string
  icon: string
  description: string
  fields: Field[]
  docs: string
  installed: boolean
  is_enabled: boolean
  tracking_id: string
  config: any
  updated_at: string | null
}

interface Stats {
  total: number
  installed: number
  enabled: number
}

// ============================================================
// Types de réponses API
// ============================================================
interface AnalyticsResponse {
  integrations?: Integration[]
  stats?: Stats
  error?: string
}

export default function AdminAnalyticsIntegrationsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, installed: 0, enabled: 0 })
  const [editing, setEditing] = useState<Integration | null>(null)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/integrations/analytics', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`)
      const data: AnalyticsResponse = await res.json()
      setIntegrations(data.integrations || [])
      setStats(data.stats || stats)
    } catch (err: any) {
      setError(err.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openConfig = (integration: Integration) => {
    setEditing(integration)
    setForm({
      tracking_id: integration.tracking_id || '',
      is_enabled: integration.is_enabled,
      ...integration.config,
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    setSaving(true)

    try {
      const res = await fetch('/api/admin/integrations/analytics', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: editing.id,
          tracking_id: form.tracking_id,
          config: form,
          is_enabled: form.is_enabled,
        }),
      })
      const data: AnalyticsResponse = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')

      setEditing(null)
      load()
    } catch (err: any) {
      alert('Erreur : ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (integration: Integration) => {
    try {
      await fetch('/api/admin/integrations/analytics', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: integration.id,
          tracking_id: integration.tracking_id,
          config: integration.config,
          is_enabled: !integration.is_enabled,
        }),
      })
      load()
    } catch (err) {
      console.error(err)
    }
  }

  const handleRemove = async (integration: Integration) => {
    if (!confirm(`Supprimer la configuration "${integration.name}" ?`)) return
    try {
      await fetch(
        `/api/admin/integrations/analytics?provider=${integration.id}`,
        { method: 'DELETE', credentials: 'include' }
      )
      load()
    } catch (err) {
      console.error(err)
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return '—'
    try {
      return new Date(date).toLocaleDateString('fr-FR', {
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
          <h1 className="text-2xl font-bold text-gray-900">
            📊 Intégrations Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Connectez des outils de mesure d'audience à votre boutique
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/integrations"
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            ← Intégrations
          </Link>
          <Link
            href="/admin"
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Dashboard
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase">Disponibles</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-blue-600 uppercase">Installées</div>
          <div className="text-2xl font-bold text-blue-700">{stats.installed}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-green-600 uppercase">Actives</div>
          <div className="text-2xl font-bold text-green-700">{stats.enabled}</div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
        <div className="font-bold mb-1">💡 Comment ça marche ?</div>
        <p className="text-xs">
          Configurez un outil d'analytics ici, activez-le, et le script de tracking sera
          automatiquement injecté dans toutes les pages de votre boutique. Vérifiez que
          votre site est bien accessible publiquement.
        </p>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement…</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map(i => (
            <div
              key={i.id}
              className={`bg-white border-2 rounded-lg p-5 transition ${
                i.is_enabled
                  ? 'border-green-400 shadow-md'
                  : i.installed
                  ? 'border-blue-200'
                  : 'border-gray-200'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{i.icon}</div>
                  <div>
                    <div className="font-bold text-gray-900">{i.name}</div>
                    {i.installed ? (
                      i.is_enabled ? (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                          ✅ Actif
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                          ⏸️ Configuré
                        </span>
                      )
                    ) : (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        Non installé
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-gray-600 mb-3 min-h-[32px]">
                {i.description}
              </p>

              {/* Tracking ID */}
              {i.installed && i.tracking_id && (
                <div className="bg-gray-50 rounded p-2 mb-3 text-xs">
                  <span className="text-gray-500">ID:</span>{' '}
                  <span className="font-mono text-gray-800">{i.tracking_id}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-3 border-t">
                <button
                  onClick={() => openConfig(i)}
                  className="flex-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
                >
                  {i.installed ? '✏️ Configurer' : '➕ Installer'}
                </button>

                {i.installed && (
                  <>
                    <button
                      onClick={() => handleToggle(i)}
                      className={`px-3 py-1.5 text-xs rounded font-medium ${
                        i.is_enabled
                          ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800'
                          : 'bg-green-100 hover:bg-green-200 text-green-800'
                      }`}
                    >
                      {i.is_enabled ? '⏸️' : '▶️'}
                    </button>
                    <button
                      onClick={() => handleRemove(i)}
                      className="px-2 py-1.5 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded"
                    >
                      🗑️
                    </button>
                  </>
                )}

                <a
                  href={i.docs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
                  title="Documentation"
                >
                  📖
                </a>
              </div>

              {i.updated_at && (
                <div className="text-[10px] text-gray-400 mt-2">
                  Modifié : {formatDate(i.updated_at)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de configuration */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg">
            <div className="p-5 border-b flex items-center gap-3">
              <span className="text-3xl">{editing.icon}</span>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900">
                  {editing.name}
                </h2>
                <p className="text-xs text-gray-500">{editing.description}</p>
              </div>
              <button
                onClick={() => setEditing(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {editing.fields.map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={form[field.key] || ''}
                    onChange={e =>
                      setForm({ ...form, [field.key]: e.target.value })
                    }
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                  />
                </div>
              ))}

              <div className="bg-gray-50 rounded-lg p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_enabled || false}
                    onChange={e =>
                      setForm({ ...form, is_enabled: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Activer le tracking immédiatement
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-2 ml-6">
                  Une fois activé, le script sera injecté sur toutes les pages publiques.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                >
                  {saving ? 'Enregistrement…' : '💾 Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}