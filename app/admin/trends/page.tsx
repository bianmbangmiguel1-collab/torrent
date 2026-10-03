// app/admin/trends/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface SeriesPoint {
  date: string
  value: number
}

interface ProductTrend {
  product_id: number
  product_title: string
  currentOrders: number
  previousOrders: number
  ordersChange: number
  currentRevenue: number
  previousRevenue: number
  revenueChange: number
}

interface CategoryTrend {
  category_id: number
  category_name: string
  orders: number
  revenue: number
}

interface KPIs {
  currentRevenue: number
  previousRevenue: number
  revenueChange: number
  currentOrders: number
  previousOrders: number
  ordersChange: number
  totalNewUsers: number
}

interface Series {
  current: { revenue: SeriesPoint[]; orders: SeriesPoint[] }
  previous: { revenue: SeriesPoint[]; orders: SeriesPoint[] }
  newUsers: SeriesPoint[]
}

interface ProductTrends {
  growing: ProductTrend[]
  declining: ProductTrend[]
}

// ============================================================
// Types de réponses API
// ============================================================
interface TrendsResponse {
  kpis?: KPIs
  series?: Series
  productTrends?: ProductTrends
  categories?: CategoryTrend[]
}

export default function AdminTrendsPage() {
  const [days, setDays] = useState<7 | 30 | 90 | 365>(30)
  const [metric, setMetric] = useState<'revenue' | 'orders' | 'users'>('revenue')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [kpis, setKpis] = useState<KPIs>({
    currentRevenue: 0,
    previousRevenue: 0,
    revenueChange: 0,
    currentOrders: 0,
    previousOrders: 0,
    ordersChange: 0,
    totalNewUsers: 0,
  })
  const [series, setSeries] = useState<Series>({
    current: { revenue: [], orders: [] },
    previous: { revenue: [], orders: [] },
    newUsers: [],
  })
  const [productTrends, setProductTrends] = useState<ProductTrends>({
    growing: [],
    declining: [],
  })
  const [categories, setCategories] = useState<CategoryTrend[]>([])

  const loadTrends = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/trends?days=${days}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`)
      const data = (await res.json()) as TrendsResponse
      setKpis(data.kpis || kpis)
      setSeries(data.series || series)
      setProductTrends(data.productTrends || productTrends)
      setCategories(data.categories || [])
    } catch (err: any) {
      console.error('❌ Erreur:', err)
      setError(err.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    loadTrends()
  }, [loadTrends])

  const formatPrice = (amount: number) => {
    return Number(amount || 0).toLocaleString('fr-FR') + ' F'
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
    })
  }

  const renderChange = (change: number) => {
    if (change > 0)
      return <span className="text-green-600 text-sm font-bold">↑ +{change}%</span>
    if (change < 0)
      return <span className="text-red-600 text-sm font-bold">↓ {change}%</span>
    return <span className="text-gray-400 text-sm">— 0%</span>
  }

  // ============================================================
  // Graphique en lignes (SVG simple)
  // ============================================================
  const renderLineChart = () => {
    const currentData =
      metric === 'revenue'
        ? series.current.revenue
        : metric === 'orders'
        ? series.current.orders
        : series.newUsers

    const previousData =
      metric === 'revenue'
        ? series.previous.revenue
        : metric === 'orders'
        ? series.previous.orders
        : []

    if (currentData.length === 0) {
      return (
        <div className="text-center py-12 text-gray-400 text-sm">
          Aucune donnée sur la période
        </div>
      )
    }

    const allValues = [
      ...currentData.map(p => p.value),
      ...previousData.map(p => p.value),
    ]
    const maxValue = Math.max(...allValues, 1)

    const width = 800
    const height = 200
    const padding = { top: 10, right: 10, bottom: 25, left: 40 }
    const chartW = width - padding.left - padding.right
    const chartH = height - padding.top - padding.bottom

    const getPath = (data: SeriesPoint[]) => {
      if (data.length === 0) return ''
      const points = data.map((p, i) => {
        const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartW
        const y = padding.top + chartH - (p.value / maxValue) * chartH
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      return points.join(' ')
    }

    const currentPath = getPath(currentData)
    const previousPath = getPath(previousData)

    const currentColor =
      metric === 'revenue' ? '#3b82f6' : metric === 'orders' ? '#8b5cf6' : '#10b981'

    return (
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          style={{ minWidth: '600px' }}
        >
          {/* Grille horizontale */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = padding.top + chartH * (1 - ratio)
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 5}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#9ca3af"
                >
                  {metric === 'revenue'
                    ? Math.round((maxValue * ratio) / 1000) + 'k'
                    : Math.round(maxValue * ratio)}
                </text>
              </g>
            )
          })}

          {/* Ligne période précédente (gris, pointillé) */}
          {previousPath && (
            <path
              d={previousPath}
              fill="none"
              stroke="#9ca3af"
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity="0.6"
            />
          )}

          {/* Ligne période actuelle */}
          <path
            d={currentPath}
            fill="none"
            stroke={currentColor}
            strokeWidth="2.5"
          />

          {/* Points */}
          {currentData.map((p, i) => {
            const x = padding.left + (i / Math.max(currentData.length - 1, 1)) * chartW
            const y = padding.top + chartH - (p.value / maxValue) * chartH
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="2.5"
                fill={currentColor}
              />
            )
          })}

          {/* Axe X : dates */}
          {currentData.length > 0 && (
            <>
              <text
                x={padding.left}
                y={height - 5}
                fontSize="10"
                fill="#9ca3af"
              >
                {formatDate(currentData[0].date)}
              </text>
              <text
                x={width - padding.right}
                y={height - 5}
                textAnchor="end"
                fontSize="10"
                fill="#9ca3af"
              >
                {formatDate(currentData[currentData.length - 1].date)}
              </text>
            </>
          )}
        </svg>

        {/* Légende */}
        <div className="flex items-center justify-center gap-6 mt-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5" style={{ backgroundColor: currentColor }} />
            <span className="text-gray-700">Période actuelle</span>
          </div>
          {previousData.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 border-t-2 border-dashed border-gray-400" />
              <span className="text-gray-500">Période précédente</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tendances</h1>
          <p className="text-sm text-gray-500 mt-1">
            Évolution des ventes et performances
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={days}
            onChange={e => setDays(parseInt(e.target.value) as any)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="7">7 derniers jours</option>
            <option value="30">30 derniers jours</option>
            <option value="90">90 derniers jours</option>
            <option value="365">365 derniers jours</option>
          </select>
          <Link
            href="/admin"
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            ← Dashboard
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500 uppercase">Revenu période</div>
            {renderChange(kpis.revenueChange)}
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatPrice(kpis.currentRevenue)}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Précédent : {formatPrice(kpis.previousRevenue)}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500 uppercase">Commandes</div>
            {renderChange(kpis.ordersChange)}
          </div>
          <div className="text-2xl font-bold text-gray-900">{kpis.currentOrders}</div>
          <div className="text-xs text-gray-400 mt-1">
            Précédent : {kpis.previousOrders}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-5">
          <div className="text-xs text-gray-500 uppercase mb-2">
            Nouveaux utilisateurs
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {kpis.totalNewUsers}
          </div>
          <div className="text-xs text-gray-400 mt-1">Sur la période</div>
        </div>
      </div>

      {/* Graphique */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            📈 Évolution
          </h2>
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            {(['revenue', 'orders', 'users'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-3 py-1.5 text-sm font-medium transition ${
                  metric === m
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {m === 'revenue' ? 'Revenu' : m === 'orders' ? 'Commandes' : 'Users'}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="text-center py-12 text-gray-500">Chargement…</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        ) : (
          renderLineChart()
        )}
      </div>

      {/* Produits en croissance + déclin */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Croissance */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            🚀 Produits en croissance
          </h2>
          {productTrends.growing.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Aucun produit en croissance
            </div>
          ) : (
            <div className="space-y-3">
              {productTrends.growing.map(p => (
                <div
                  key={p.product_id}
                  className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {p.product_title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {p.currentOrders} cmd ({p.previousOrders} av.)
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className="text-green-700 font-bold text-sm">
                      +{p.revenueChange}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatPrice(p.currentRevenue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Déclin */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            📉 Produits en déclin
          </h2>
          {productTrends.declining.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Aucun produit en déclin
            </div>
          ) : (
            <div className="space-y-3">
              {productTrends.declining.map(p => (
                <div
                  key={p.product_id}
                  className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {p.product_title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {p.currentOrders} cmd ({p.previousOrders} av.)
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className="text-red-700 font-bold text-sm">
                      {p.revenueChange}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatPrice(p.currentRevenue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Catégories */}
      {categories.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            📊 Performances par catégorie
          </h2>
          <div className="space-y-2">
            {categories.map((c, idx) => {
              const maxRevenue = Math.max(...categories.map(x => x.revenue), 1)
              const width = (c.revenue / maxRevenue) * 100

              return (
                <div key={c.category_id} className="flex items-center gap-3">
                  <div className="w-32 text-sm text-gray-700 truncate">
                    {c.category_name}
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-6 rounded-full transition-all"
                      style={{ width: `${width}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-3 text-xs">
                      <span className="text-white font-medium">
                        {c.orders} cmd
                      </span>
                      <span className="text-gray-900 font-bold">
                        {formatPrice(c.revenue)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}