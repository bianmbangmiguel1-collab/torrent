// app/admin/analytics/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface KPIs {
  revenue: number
  revenueChange: number
  orders: number
  ordersChange: number
  users: number
  usersChange: number
  avgOrderValue: number
  conversionRate: number
  paidOrders: number
  pendingOrders: number
  failedOrders: number
}

interface ChartPoint {
  date: string
  orders: number
  revenue: number
}

interface TopProduct {
  product_id: number
  product_title: string
  sales: number
  revenue: number
}

interface TopCustomer {
  user_id: number
  name: string
  email: string
  orders: number
  spent: number
}

interface StatusItem {
  status: string
  count: number
}

interface ActivityItem {
  id: number
  order_number: string
  user_name: string | null
  user_email: string | null
  product_title: string | null
  total: number
  payment_status: string
  created_at: string
}

interface AnalyticsResponse {
  kpis?: KPIs
  salesChart?: ChartPoint[]
  topProducts?: TopProduct[]
  topCustomers?: TopCustomer[]
  statusBreakdown?: StatusItem[]
  recentActivity?: ActivityItem[]
}

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '365d'>('30d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [kpis, setKpis] = useState<KPIs>({
    revenue: 0,
    revenueChange: 0,
    orders: 0,
    ordersChange: 0,
    users: 0,
    usersChange: 0,
    avgOrderValue: 0,
    conversionRate: 0,
    paidOrders: 0,
    pendingOrders: 0,
    failedOrders: 0,
  })
  const [salesChart, setSalesChart] = useState<ChartPoint[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([])
  const [statusBreakdown, setStatusBreakdown] = useState<StatusItem[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])

  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/analytics?period=${period}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`)
      const data = (await res.json()) as AnalyticsResponse
      setKpis(data.kpis || kpis)
      setSalesChart(data.salesChart || [])
      setTopProducts(data.topProducts || [])
      setTopCustomers(data.topCustomers || [])
      setStatusBreakdown(data.statusBreakdown || [])
      setRecentActivity(data.recentActivity || [])
    } catch (err: unknown) {
      console.error('❌ Erreur:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  const formatPrice = (amount: number) => {
    return Number(amount || 0).toLocaleString('fr-FR') + ' F'
  }

  const formatDate = (date: string | null) => {
    if (!date) return '—'
    try {
      return new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return date
    }
  }

  const renderChange = (change: number) => {
    if (change > 0) {
      return <span className="text-green-600 text-xs font-medium">↑ +{change}%</span>
    }
    if (change < 0) {
      return <span className="text-red-600 text-xs font-medium">↓ {change}%</span>
    }
    return <span className="text-gray-400 text-xs">— 0%</span>
  }

  // ============================================================
  // MINI GRAPHIQUE (barres CSS)
  // ============================================================
  const maxRevenue = Math.max(...salesChart.map(p => p.revenue), 1)

  // ============================================================
  // CALCUL DU TOTAL DES STATUTS
  // ============================================================
  const totalStatusCount = statusBreakdown.reduce((sum, s) => sum + s.count, 0) || 1

  const statusColors: Record<string, string> = {
    paid: 'bg-green-500',
    pending: 'bg-yellow-500',
    failed: 'bg-red-500',
    canceled: 'bg-gray-500',
    cancelled: 'bg-gray-500',
    refunded: 'bg-blue-500',
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Vue d'ensemble des performances de votre boutique
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value as '7d' | '30d' | '90d' | '365d')}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
            <option value="90d">90 derniers jours</option>
            <option value="365d">365 derniers jours</option>
          </select>
          <Link
            href="/admin"
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            ← Dashboard
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement des analytics…</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border rounded-lg p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-gray-500 uppercase">Revenu</div>
                {renderChange(kpis.revenueChange)}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatPrice(kpis.revenue)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {kpis.paidOrders} commandes payées
              </div>
            </div>

            <div className="bg-white border rounded-lg p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-gray-500 uppercase">Commandes</div>
                {renderChange(kpis.ordersChange)}
              </div>
              <div className="text-2xl font-bold text-gray-900">{kpis.orders}</div>
              <div className="text-xs text-gray-400 mt-1">
                {kpis.pendingOrders} en attente · {kpis.failedOrders} échouées
              </div>
            </div>

            <div className="bg-white border rounded-lg p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-gray-500 uppercase">Panier moyen</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatPrice(kpis.avgOrderValue)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Taux conversion : {kpis.conversionRate}%
              </div>
            </div>

            <div className="bg-white border rounded-lg p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-gray-500 uppercase">Nouveaux clients</div>
                {renderChange(kpis.usersChange)}
              </div>
              <div className="text-2xl font-bold text-gray-900">{kpis.users}</div>
              <div className="text-xs text-gray-400 mt-1">
                Sur la période sélectionnée
              </div>
            </div>
          </div>

          {/* Graphique ventes */}
          <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              📈 Ventes par jour
            </h2>
            {salesChart.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                Aucune vente sur la période
              </div>
            ) : (
              <>
                <div className="flex items-end gap-1 h-48 mb-3">
                  {salesChart.map((point, idx) => {
                    const height = (point.revenue / maxRevenue) * 100
                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center group relative"
                        title={`${point.date}\n${point.orders} vente(s)\n${formatPrice(point.revenue)}`}
                      >
                        <div
                          className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t hover:from-blue-600 hover:to-blue-500 transition-all min-h-[2px]"
                          style={{ height: `${Math.max(height, 2)}%` }}
                        />
                        <div className="absolute -top-16 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
                          {point.date}<br />
                          {point.orders} vente{point.orders > 1 ? 's' : ''}<br />
                          {formatPrice(point.revenue)}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between text-xs text-gray-400 border-t pt-2">
                  <span>{salesChart[0]?.date}</span>
                  <span>{salesChart[salesChart.length - 1]?.date}</span>
                </div>
              </>
            )}
          </div>

          {/* Deux colonnes : top produits + top clients */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Top produits */}
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                🏆 Top 5 produits
              </h2>
              {topProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Aucune vente
                </div>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((p, idx) => (
                    <div
                      key={p.product_id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">
                        #{idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {p.product_title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {p.sales} vente{p.sales > 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-gray-900 whitespace-nowrap">
                        {formatPrice(p.revenue)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top clients */}
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                👑 Top 5 clients
              </h2>
              {topCustomers.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Aucun client
                </div>
              ) : (
                <div className="space-y-3">
                  {topCustomers.map((c, idx) => (
                    <div
                      key={c.user_id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-sm">
                        #{idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {c.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {c.email} · {c.orders} cmd
                        </div>
                      </div>
                      <div className="text-sm font-bold text-gray-900 whitespace-nowrap">
                        {formatPrice(c.spent)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Répartition statuts + Activité récente */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status breakdown */}
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                📊 Statuts de paiement
              </h2>
              {statusBreakdown.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Aucune donnée
                </div>
              ) : (
                <>
                  <div className="flex h-4 rounded-full overflow-hidden mb-4">
                    {statusBreakdown.map((s, idx) => (
                      <div
                        key={idx}
                        className={`${statusColors[s.status] || 'bg-gray-400'}`}
                        style={{ width: `${(s.count / totalStatusCount) * 100}%` }}
                        title={`${s.status}: ${s.count}`}
                      />
                    ))}
                  </div>
                  <div className="space-y-2">
                    {statusBreakdown.map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded ${statusColors[s.status] || 'bg-gray-400'}`}
                          />
                          <span className="capitalize text-gray-700">{s.status}</span>
                        </div>
                        <div className="text-gray-900 font-medium">
                          {s.count} ({Math.round((s.count / totalStatusCount) * 100)}%)
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Activité récente */}
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                🕐 Activité récente
              </h2>
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Aucune activité
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {recentActivity.map(a => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {a.product_title || '—'}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {a.user_name || 'Anonyme'} · {formatDate(a.created_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 text-xs rounded ${
                            a.payment_status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : a.payment_status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {a.payment_status}
                        </span>
                        <span className="font-medium text-gray-900">
                          {formatPrice(a.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}