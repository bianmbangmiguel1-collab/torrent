// app/admin/returns/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface ReturnOrder {
  id: number
  order_number: string
  user_email: string | null
  user_name: string | null
  product_title: string | null
  total: number
  currency: string
  status: string
  payment_status: string
  payment_method: string | null
  transaction_id: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

interface Stats {
  total: number
  refunded: number
  canceled: number
  amountRefunded: number
}

// ============================================================
// Types de réponses API
// ============================================================
interface ReturnsResponse {
  returns?: ReturnOrder[]
  stats?: Stats
  pagination?: {
    pages?: number
  }
}

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<ReturnOrder[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, refunded: 0, canceled: 0, amountRefunded: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const loadReturns = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      })
      if (status) params.set('status', status)
      if (search) params.set('search', search)

      const res = await fetch(`/api/admin/returns?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      })

      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`)

      const data = (await res.json()) as ReturnsResponse
      setReturns(data.returns || [])
      setStats(data.stats || stats)
      setTotalPages(data.pagination?.pages || 1)
    } catch (err: any) {
      console.error('❌ Erreur:', err)
      setError(err.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [page, status, search])

  useEffect(() => {
    loadReturns()
  }, [loadReturns])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  const formatPrice = (amount: number, currency: string = 'XOF') => {
    return `${Number(amount || 0).toLocaleString('fr-FR')} ${currency}`
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

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      refunded: { label: '↩️ Remboursé', color: 'bg-blue-100 text-blue-700 border-blue-300' },
      canceled: { label: '🚫 Annulé', color: 'bg-gray-100 text-gray-700 border-gray-300' },
      cancelled: { label: '🚫 Annulé', color: 'bg-gray-100 text-gray-700 border-gray-300' },
    }
    const v = map[status] || { label: status, color: 'bg-gray-100 text-gray-700 border-gray-300' }
    return <span className={`px-2 py-1 text-xs rounded border ${v.color}`}>{v.label}</span>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Remboursements</h1>
          <p className="text-sm text-gray-500 mt-1">
            Commandes remboursées ou annulées
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase">Total</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-blue-600 uppercase">Remboursés</div>
          <div className="text-2xl font-bold text-blue-700">{stats.refunded}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-600 uppercase">Annulés</div>
          <div className="text-2xl font-bold text-gray-700">{stats.canceled}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-red-600 uppercase">Montant remboursé</div>
          <div className="text-xl font-bold text-red-700">
            {formatPrice(stats.amountRefunded)}
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">Rechercher</label>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="N° commande, email, produit…"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Statut</label>
            <select
              value={status}
              onChange={e => { setStatus(e.target.value); setPage(1) }}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Tous</option>
              <option value="refunded">Remboursé</option>
              <option value="canceled">Annulé</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            Filtrer
          </button>

          <button
            type="button"
            onClick={() => {
              setSearchInput('')
              setSearch('')
              setStatus('')
              setPage(1)
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
          >
            Réinitialiser
          </button>
        </form>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement…</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      ) : returns.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center text-gray-500">
          <div className="text-4xl mb-3">↩️</div>
          <p className="font-medium">Aucun remboursement</p>
          <p className="text-sm mt-1">
            Les commandes remboursées ou annulées apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-600">
                <th className="px-4 py-3">Commande</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Produit</th>
                <th className="px-4 py-3 text-right">Montant</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {returns.map(r => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs text-gray-700">{r.order_number}</div>
                    <div className="text-xs text-gray-400">#{r.id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{r.user_name || 'Anonyme'}</div>
                    <div className="text-xs text-gray-500">{r.user_email || '—'}</div>
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate">
                    {r.product_title || '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">
                    -{formatPrice(r.total, r.currency)}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(r.payment_status)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {formatDate(r.updated_at || r.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
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
        </div>
      )}
    </div>
  )
}