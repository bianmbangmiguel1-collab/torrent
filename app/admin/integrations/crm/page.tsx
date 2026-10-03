// app/admin/integrations/crm/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Field { key: string; label: string; placeholder: string }
interface Integration {
  id: string
  name: string
  icon: string
  description: string
  fields: Field[]
  docs: string
  installed: boolean
  is_enabled: boolean
  api_key: string
  api_url: string
  last_sync: string | null
  updated_at: string | null
}

// ============================================================
// Types
// ============================================================
interface CrmStats {
  total: number
  installed: number
  enabled: number
  lastSyncAll: string | null
}

interface CrmListResponse {
  integrations?: Integration[]
  stats?: CrmStats
}

interface CrmErrorResponse {
  error?: string
}

interface CrmForm {
  [key: string]: string | boolean
}

export default function AdminCrmIntegrationsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [stats, setStats] = useState<CrmStats>({
    total: 0,
    installed: 0,
    enabled: 0,
    lastSyncAll: null,
  })
  const [editing, setEditing] = useState<Integration | null>(null)
  const [form, setForm] = useState<CrmForm>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/integrations/crm', { credentials: 'include', cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as CrmListResponse

      setIntegrations(data.integrations ?? [])
      setStats(data.stats ?? {
        total: 0,
        installed: 0,
        enabled: 0,
        lastSyncAll: null,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des intégrations CRM')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openConfig = (i: Integration) => {
    setEditing(i)
    setForm({ api_key: i.api_key || '', api_url: i.api_url || '', is_enabled: i.is_enabled })
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/integrations/crm', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: editing.id, ...form }),
      })
      if (!res.ok) {
        const errorData = (await res.json()) as CrmErrorResponse

        throw new Error(
          errorData.error ?? 'Erreur lors de l’enregistrement de l’intégration'
        )
      }
      setEditing(null)
      load()
    } catch (err: unknown) {
      alert(
        'Erreur : ' +
          (err instanceof Error
            ? err.message
            : 'Erreur lors de l’enregistrement')
      )
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (i: Integration) => {
    await fetch('/api/admin/integrations/crm', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: i.id, api_key: i.api_key, api_url: i.api_url, is_enabled: !i.is_enabled }),
    })
    load()
  }

  const remove = async (i: Integration) => {
    if (!confirm(`Supprimer ${i.name} ?`)) return
    await fetch(`/api/admin/integrations/crm?provider=${i.id}`, { method: 'DELETE', credentials: 'include' })
    load()
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🤝 Intégrations CRM</h1>
          <p className="text-sm text-gray-500 mt-1">Connectez un CRM pour synchroniser vos clients et prospects</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/integrations" className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">← Intégrations</Link>
          <Link href="/admin" className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">Dashboard</Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase">Disponibles</div>
          <div className="text-2xl font-bold">{stats.total}</div>
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

      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement…</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map(i => (
            <div key={i.id} className={`bg-white border-2 rounded-lg p-5 ${i.is_enabled ? 'border-green-400 shadow-md' : i.installed ? 'border-blue-200' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{i.icon}</span>
                <div>
                  <div className="font-bold text-gray-900">{i.name}</div>
                  {i.installed ? (
                    i.is_enabled ? (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">✅ Actif</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">⏸️ Configuré</span>
                    )
                  ) : (
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">Non installé</span>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-600 mb-3 min-h-[32px]">{i.description}</p>

              {i.last_sync && (
                <div className="text-xs text-gray-500 mb-3">
                  Dernière sync : {new Date(i.last_sync).toLocaleDateString('fr-FR')}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-3 border-t">
                <button onClick={() => openConfig(i)} className="flex-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">
                  {i.installed ? '✏️ Configurer' : '➕ Installer'}
                </button>
                {i.installed && (
                  <>
                    <button onClick={() => toggle(i)} className={`px-3 py-1.5 text-xs rounded font-medium ${i.is_enabled ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                      {i.is_enabled ? '⏸️' : '▶️'}
                    </button>
                    <button onClick={() => remove(i)} className="px-2 py-1.5 text-xs bg-red-100 text-red-700 rounded">🗑️</button>
                  </>
                )}
                <a href={i.docs} target="_blank" rel="noopener noreferrer" className="px-2 py-1.5 text-xs bg-gray-100 text-gray-700 rounded">📖</a>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg">
            <div className="p-5 border-b flex items-center gap-3">
              <span className="text-3xl">{editing.icon}</span>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900">{editing.name}</h2>
                <p className="text-xs text-gray-500">{editing.description}</p>
              </div>
              <button onClick={() => setEditing(null)} className="text-gray-400 text-2xl">×</button>
            </div>
            <form onSubmit={save} className="p-5 space-y-4">
              {editing.fields.map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{f.label}</label>
                  <input
                    type="text"
                    value={(form[f.key] as string) || ''}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                  />
                </div>
              ))}
              <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-3 rounded-lg">
                <input type="checkbox" checked={!!form.is_enabled} onChange={e => setForm({ ...form, is_enabled: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm font-medium text-gray-700">Activer la synchronisation</span>
              </label>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Annuler</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
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