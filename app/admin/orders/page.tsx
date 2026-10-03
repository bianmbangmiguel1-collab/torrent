// app/admin/orders/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Order {
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
  download_count: number
  download_limit: number
  paid_at: string | null
  created_at: string
}

interface Stats {
  total: number
  paid: number
  pending: number
  failed: number
  revenue: number
}

// ============================================================
// Types de réponses API
// ============================================================
interface OrdersResponse {
  orders?: Order[]
  stats?: Stats
  pagination?: {
    pages?: number
  }
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, paid: 0, pending: 0, failed: 0, revenue: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)

  const [status, setStatus] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      })
      if (status) params.set('status', status)
      if (paymentStatus) params.set('payment_status', paymentStatus)
      if (search) params.set('search', search)

      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      })

      if (!res.ok) {
        throw new Error(`Erreur HTTP ${res.status}`)
      }

      const data = (await res.json()) as OrdersResponse
      setOrders(data.orders || [])
      setStats(data.stats || stats)
      setTotalPages(data.pagination?.pages || 1)
    } catch (err: any) {
      console.error('❌ Erreur chargement commandes:', err)
      setError(err.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [page, limit, status, paymentStatus, search])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  const handleStatusChange = (orderId: number, field: string, value: string) => {
    setOrders(prev =>
      prev.map(o => (o.id === orderId ? { ...o, [field]: value } : o))
    )
    fetch('/api/admin/orders', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, [field]: value }),
    }).then(() => loadOrders())
  }

  const formatPrice = (amount: number, currency: string) => {
    return `${Number(amount || 0).toLocaleString('fr-FR')} ${currency || 'XOF'}`
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

  const getPaymentBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      paid: { label: '✅ Payé', color: 'bg-green-100 text-green-700 border-green-300' },
      pending: { label: '⏳ En attente', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
      failed: { label: '❌ Échoué', color: 'bg-red-100 text-red-700 border-red-300' },
      canceled: { label: '🚫 Annulé', color: 'bg-gray-100 text-gray-700 border-gray-300' },
      cancelled: { label: '🚫 Annulé', color: 'bg-gray-100 text-gray-700 border-gray-300' },
      refunded: { label: '↩️ Remboursé', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    }
    const v = map[status] || { label: status, color: 'bg-gray-100 text-gray-700 border-gray-300' }
    return <span className={`px-2 py-1 text-xs rounded border ${v.color}`}>{v.label}</span>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commandes</h1>
          <p className="text-sm text-gray-500 mt-1">Gérez les commandes clients</p>
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
          <div className="text-xs text-gray-500 uppercase">Total</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-green-600 uppercase">Payées</div>
          <div className="text-2xl font-bold text-green-700">{stats.paid}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-yellow-600 uppercase">En attente</div>
          <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-red-600 uppercase">Échouées</div>
          <div className="text-2xl font-bold text-red-700">{stats.failed}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-blue-600 uppercase">Revenu</div>
          <div className="text-xl font-bold text-blue-700">
            {formatPrice(stats.revenue, 'XOF')}
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
            <label className="block text-xs text-gray-500 mb-1">Statut commande</label>
            <select
              value={status}
              onChange={e => { setStatus(e.target.value); setPage(1) }}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Tous</option>
              <option value="pending">En attente</option>
              <option value="processing">En cours</option>
              <option value="completed">Complétée</option>
              <option value="canceled">Annulée</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Paiement</label>
            <select
              value={paymentStatus}
              onChange={e => { setPaymentStatus(e.target.value); setPage(1) }}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Tous</option>
              <option value="pending">En attente</option>
              <option value="paid">Payé</option>
              <option value="failed">Échoué</option>
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
              setPaymentStatus('')
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
      ) : orders.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center text-gray-500">
          <div className="text-4xl mb-3">📦</div>
          <p className="font-medium">Aucune commande trouvée</p>
          <p className="text-sm mt-1">Les commandes apparaîtront ici dès que des clients passeront commande.</p>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-600">
                <th className="px-4 py-3">Commande</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Produit</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Paiement</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs text-gray-700">{order.order_number}</div>
                    <div className="text-xs text-gray-400">#{order.id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {order.user_name || 'Anonyme'}
                    </div>
                    <div className="text-xs text-gray-500">{order.user_email || '—'}</div>
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate">
                    {order.product_title || '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatPrice(order.total, order.currency)}
                  </td>
                  <td className="px-4 py-3">
                    {getPaymentBadge(order.payment_status)}
                    {order.payment_method && (
                      <div className="text-xs text-gray-400 mt-1">{order.payment_method}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={order.payment_status}
                        onChange={e => handleStatusChange(order.id, 'payment_status', e.target.value)}
                        className="text-xs border rounded px-2 py-1"
                      >
                        <option value="pending">En attente</option>
                        <option value="paid">Payé</option>
                        <option value="failed">Échoué</option>
                        <option value="canceled">Annulé</option>
                      </select>
                    </div>
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