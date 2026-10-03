// app/admin/orders/tracking/page.tsx
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
  transaction_id: string | null
  paid_at: string | null
  created_at: string
}

// ============================================================
// Types de réponses API
// ============================================================
interface OrdersResponse {
  orders?: Order[]
}

export default function OrderTrackingPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ page: '1', limit: '50' })
      if (search) params.set('search', search)

      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      })

      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`)

      const data = (await res.json()) as OrdersResponse
      setOrders(data.orders || [])
    } catch (err: any) {
      console.error('❌ Erreur chargement:', err)
      setError(err.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput.trim())
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

  const getStepStatus = (order: Order) => {
    const steps = [
      { key: 'created', label: 'Commande créée', done: true, date: order.created_at },
      {
        key: 'paid',
        label: 'Paiement reçu',
        done: order.payment_status === 'paid',
        date: order.paid_at,
      },
      {
        key: 'processing',
        label: 'Traitement',
        done: order.status === 'processing' || order.status === 'completed' || order.payment_status === 'paid',
        date: null,
      },
      {
        key: 'completed',
        label: 'Livré',
        done: order.status === 'completed',
        date: null,
      },
    ]
    return steps
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suivi des commandes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Suivez l'état de traitement des commandes
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/orders"
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            ← Commandes
          </Link>
          <Link
            href="/admin"
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Dashboard
          </Link>
        </div>
      </div>

      {/* Recherche */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <form onSubmit={handleSearch} className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">
              Rechercher une commande
            </label>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="N° commande, email, transaction…"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
          >
            Rechercher
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setSearchInput('')
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
            >
              Effacer
            </button>
          )}
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
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-medium">Aucune commande trouvée</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const steps = getStepStatus(order)
            return (
              <div
                key={order.id}
                className="bg-white border rounded-lg p-5 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-gray-700">
                        {order.order_number}
                      </span>
                      <span className="text-xs text-gray-400">#{order.id}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {order.user_name || 'Anonyme'}{' '}
                      <span className="text-gray-400">
                        · {order.user_email || 'email inconnu'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {Number(order.total || 0).toLocaleString('fr-FR')} {order.currency}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatDate(order.created_at)}
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="flex items-center gap-2 mt-4">
                  {steps.map((step, idx) => (
                    <div key={step.key} className="flex items-center flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            step.done
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 text-gray-400'
                          }`}
                        >
                          {step.done ? '✓' : idx + 1}
                        </div>
                        <div
                          className={`text-xs mt-2 text-center ${
                            step.done ? 'text-green-700 font-medium' : 'text-gray-400'
                          }`}
                        >
                          {step.label}
                        </div>
                        {step.date && (
                          <div className="text-[10px] text-gray-400 mt-1">
                            {formatDate(step.date)}
                          </div>
                        )}
                      </div>
                      {idx < steps.length - 1 && (
                        <div
                          className={`h-1 flex-1 mx-2 rounded ${
                            steps[idx + 1].done ? 'bg-green-500' : 'bg-gray-200'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Infos produit */}
                {order.product_title && (
                  <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
                    <div className="text-gray-600">
                      📦 {order.product_title}
                    </div>
                    {order.transaction_id && (
                      <div className="text-xs text-gray-400 font-mono">
                        TXN: {order.transaction_id}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}