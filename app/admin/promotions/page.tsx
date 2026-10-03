// app/admin/promotions/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Promotion {
  id: number
  name: string
  code: string | null
  description: string | null
  type: string
  value: number
  min_order_amount: number
  max_discount_amount: number | null
  usage_limit: number
  used_count: number
  user_limit: number
  start_date: string | null
  end_date: string | null
  is_active: number
  created_at: string
}

interface Stats {
  total: number
  active: number
  scheduled: number
  expired: number
  inactive: number
  totalUses: number
}

// ============================================================
// Types de réponses API
// ============================================================
interface PromotionsResponse {
  promotions?: Promotion[]
  stats?: Stats
}

interface PromotionActionResponse {
  error?: string
}

const TYPES = [
  { value: 'percentage', label: 'Pourcentage (%)', symbol: '%' },
  { value: 'fixed', label: 'Montant fixe (FCFA)', symbol: 'FCFA' },
  { value: 'free_shipping', label: 'Livraison gratuite', symbol: '🚚' },
]

export default function AdminPromotionsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, scheduled: 0, expired: 0, inactive: 0, totalUses: 0 })
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    type: 'percentage',
    value: 10,
    min_order_amount: 0,
    max_discount_amount: 0,
    usage_limit: 0,
    user_limit: 1,
    start_date: '',
    end_date: '',
    is_active: true,
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filter) params.set('status', filter)
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/promotions?${params}`, { credentials: 'include', cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as PromotionsResponse
      setPromotions(data.promotions || [])
      setStats(data.stats || stats)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filter, search])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({
      name: '', code: '', description: '', type: 'percentage', value: 10,
      min_order_amount: 0, max_discount_amount: 0, usage_limit: 0, user_limit: 1,
      start_date: '', end_date: '', is_active: true,
    })
    setIsModalOpen(true)
  }

  const openEdit = (p: Promotion) => {
    setEditing(p)
    setForm({
      name: p.name,
      code: p.code || '',
      description: p.description || '',
      type: p.type,
      value: p.value,
      min_order_amount: p.min_order_amount || 0,
      max_discount_amount: p.max_discount_amount || 0,
      usage_limit: p.usage_limit || 0,
      user_limit: p.user_limit || 1,
      start_date: p.start_date ? p.start_date.substring(0, 16) : '',
      end_date: p.end_date ? p.end_date.substring(0, 16) : '',
      is_active: p.is_active === 1,
    })
    setIsModalOpen(true)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: any = { ...form }
      if (editing) payload.id = editing.id
      const res = await fetch('/api/admin/promotions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = (await res.json()) as PromotionActionResponse
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setIsModalOpen(false)
      load()
    } catch (err: any) {
      alert('Erreur : ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (p: Promotion) => {
    await fetch('/api/admin/promotions', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id }),
    })
    load()
  }

  const remove = async (p: Promotion) => {
    if (!confirm(`Supprimer "${p.name}" ?`)) return
    await fetch(`/api/admin/promotions?id=${p.id}`, { method: 'DELETE', credentials: 'include' })
    load()
  }

  const getPromoStatus = (p: Promotion) => {
    if (!p.is_active) return { label: 'Inactive', color: 'bg-gray-100 text-gray-700' }
    const now = new Date()
    if (p.start_date && new Date(p.start_date) > now) return { label: 'Programmée', color: 'bg-blue-100 text-blue-700' }
    if (p.end_date && new Date(p.end_date) < now) return { label: 'Expirée', color: 'bg-red-100 text-red-700' }
    return { label: 'Active', color: 'bg-green-100 text-green-700' }
  }

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    try {
      return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch { return d }
  }

  const formatValue = (p: Promotion) => {
    if (p.type === 'percentage') return `-${p.value}%`
    if (p.type === 'fixed') return `-${p.value.toLocaleString('fr-FR')} F`
    if (p.type === 'free_shipping') return 'Livraison offerte'
    return `${p.value}`
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🎁 Promotions</h1>
          <p className="text-sm text-gray-500 mt-1">Créez et gérez vos codes promo et réductions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openCreate} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
            ➕ Nouvelle promotion
          </button>
          <Link href="/admin" className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">← Dashboard</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <div className="bg-white border rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase">Total</div>
          <div className="text-xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white border rounded-lg p-3">
          <div className="text-xs text-green-600 uppercase">Actives</div>
          <div className="text-xl font-bold text-green-700">{stats.active}</div>
        </div>
        <div className="bg-white border rounded-lg p-3">
          <div className="text-xs text-blue-600 uppercase">Programmées</div>
          <div className="text-xl font-bold text-blue-700">{stats.scheduled}</div>
        </div>
        <div className="bg-white border rounded-lg p-3">
          <div className="text-xs text-red-600 uppercase">Expirées</div>
          <div className="text-xl font-bold text-red-700">{stats.expired}</div>
        </div>
        <div className="bg-white border rounded-lg p-3">
          <div className="text-xs text-gray-600 uppercase">Inactives</div>
          <div className="text-xl font-bold text-gray-700">{stats.inactive}</div>
        </div>
        <div className="bg-white border rounded-lg p-3">
          <div className="text-xs text-purple-600 uppercase">Utilisations</div>
          <div className="text-xl font-bold text-purple-700">{stats.totalUses}</div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <form onSubmit={e => { e.preventDefault(); setSearch(searchInput.trim()) }} className="flex flex-wrap gap-3 items-end mb-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">Rechercher</label>
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Nom, code, description…" className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">Rechercher</button>
          <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setFilter('') }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">Réinitialiser</button>
        </form>
        <div className="flex flex-wrap gap-2">
          {[
            { v: '', l: 'Toutes', c: 'bg-gray-100' },
            { v: 'active', l: 'Actives', c: 'bg-green-100' },
            { v: 'scheduled', l: 'Programmées', c: 'bg-blue-100' },
            { v: 'expired', l: 'Expirées', c: 'bg-red-100' },
            { v: 'inactive', l: 'Inactives', c: 'bg-gray-200' },
          ].map(f => (
            <button key={f.v} onClick={() => setFilter(f.v)} className={`px-3 py-1.5 text-sm rounded-lg ${filter === f.v ? 'bg-blue-500 text-white' : `${f.c} hover:brightness-95`}`}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement…</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">{error}</div>
      ) : promotions.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center text-gray-500">
          <div className="text-4xl mb-3">🎁</div>
          <p className="font-medium">Aucune promotion</p>
          <button onClick={openCreate} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">➕ Créer la première</button>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-600">
                <th className="px-4 py-3">Promotion</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3 text-center">Réduction</th>
                <th className="px-4 py-3 text-center">Utilisations</th>
                <th className="px-4 py-3">Période</th>
                <th className="px-4 py-3 text-center">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map(p => {
                const st = getPromoStatus(p)
                return (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{p.name}</div>
                      {p.description && <div className="text-xs text-gray-500 truncate max-w-xs">{p.description}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {p.code ? (
                        <code className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-mono">{p.code}</code>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-green-700">{formatValue(p)}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      {p.used_count || 0} / {p.usage_limit > 0 ? p.usage_limit : '∞'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {p.start_date || p.end_date ? (
                        <>
                          <div>Du {formatDate(p.start_date)}</div>
                          <div>Au {formatDate(p.end_date)}</div>
                        </>
                      ) : (
                        <span className="text-gray-400">Illimitée</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded ${st.color}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => toggle(p)} className={`px-2 py-1 text-xs rounded ${p.is_active ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`} title={p.is_active ? 'Désactiver' : 'Activer'}>
                          {p.is_active ? '⏸️' : '▶️'}
                        </button>
                        <button onClick={() => openEdit(p)} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">✏️</button>
                        <button onClick={() => remove(p)} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">🗑️</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-900">
                {editing ? '✏️ Modifier la promotion' : '➕ Nouvelle promotion'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 text-2xl">×</button>
            </div>

            <form onSubmit={save} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nom *</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Code promo</label>
                  <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="PROMO2026" className="w-full px-3 py-2 border rounded-lg text-sm font-mono" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type *</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                    {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Valeur * {form.type === 'percentage' && '(%)'}
                    {form.type === 'fixed' && '(FCFA)'}
                  </label>
                  <input type="number" value={form.value} onChange={e => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} min="0" className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Commande min.</label>
                  <input type="number" value={form.min_order_amount} onChange={e => setForm({ ...form, min_order_amount: parseInt(e.target.value) || 0 })} min="0" className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Réduction max.</label>
                  <input type="number" value={form.max_discount_amount} onChange={e => setForm({ ...form, max_discount_amount: parseInt(e.target.value) || 0 })} min="0" className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Limite globale</label>
                  <input type="number" value={form.usage_limit} onChange={e => setForm({ ...form, usage_limit: parseInt(e.target.value) || 0 })} min="0" placeholder="0 = illimité" className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date de début</label>
                  <input type="datetime-local" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date de fin</label>
                  <input type="datetime-local" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-3 rounded-lg">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm font-medium text-gray-700">Activer immédiatement</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Annuler</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? 'Enregistrement…' : editing ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}