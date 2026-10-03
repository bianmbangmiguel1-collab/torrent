// app/admin/heatmap/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Cell {
  hour: number
  value: number
  orders: number
  revenue: number
  users: number
  intensity: number
}

interface DayRow {
  day: number
  label: string
  short: string
  hours: Cell[]
}

interface Stats {
  metric: string
  days: number
  maxValue: number
  totalValue: number
  peakDay: string
  peakHour: string
  peakValue: number
}

type Metric = 'orders' | 'revenue' | 'users'

interface HeatmapResponse {
  data?: DayRow[]
  stats?: Stats
  error?: string
}

export default function AdminHeatmapPage() {
  const [metric, setMetric] = useState<Metric>('orders')
  const [days, setDays] = useState<30 | 90 | 180 | 365>(90)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [data, setData] = useState<DayRow[]>([])
  const [stats, setStats] = useState<Stats>({
    metric: 'orders',
    days: 90,
    maxValue: 0,
    totalValue: 0,
    peakDay: '—',
    peakHour: '—',
    peakValue: 0,
  })
  const [hoveredCell, setHoveredCell] = useState<{
    day: string
    hour: string
    cell: Cell
  } | null>(null)

  const loadHeatmap = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/admin/heatmap?days=${days}&metric=${metric}`,
        {
          credentials: 'include',
          cache: 'no-store',
        }
      )
      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`)
      const json = await res.json() as HeatmapResponse
      setData(json.data || [])
      setStats(json.stats || stats)
    } catch (err) {
      console.error('❌ Erreur:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [days, metric])

  useEffect(() => {
    loadHeatmap()
  }, [loadHeatmap])

  const formatPrice = (amount: number) => {
    return Number(amount || 0).toLocaleString('fr-FR') + ' F'
  }

  const formatValue = (value: number) => {
    if (metric === 'revenue') return formatPrice(value)
    return String(value)
  }

  // ============================================================
  // Couleur selon intensité (gradient bleu → rouge)
  // ============================================================
  const getCellColor = (intensity: number) => {
    if (intensity === 0) return 'bg-gray-50'
    if (intensity < 10) return 'bg-blue-50'
    if (intensity < 25) return 'bg-blue-100'
    if (intensity < 40) return 'bg-blue-200'
    if (intensity < 55) return 'bg-indigo-300'
    if (intensity < 70) return 'bg-indigo-400'
    if (intensity < 85) return 'bg-purple-500'
    return 'bg-red-500'
  }

  const getCellTextColor = (intensity: number) => {
    return intensity >= 55 ? 'text-white' : 'text-gray-700'
  }

  // ============================================================
  // Métrique active
  // ============================================================
  const metricsLabels: Record<Metric, string> = {
    orders: 'Commandes',
    revenue: 'Revenu',
    users: 'Nouveaux utilisateurs',
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Heatmap d'activité</h1>
          <p className="text-sm text-gray-500 mt-1">
            Visualisez à quels moments vos clients sont les plus actifs
          </p>
        </div>
        <Link
          href="/admin"
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Filtres */}
      <div className="bg-white border rounded-lg p-4 mb-6 flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Métrique</label>
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            {(['orders', 'revenue', 'users'] as Metric[]).map(m => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-4 py-2 text-sm font-medium transition ${
                  metric === m
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {metricsLabels[m]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Période</label>
          <select
            value={days}
            onChange={e => {
              const value = parseInt(e.target.value, 10)

              if (value === 30 || value === 90 || value === 180 || value === 365) {
                setDays(value)
              }
            }}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="30">30 derniers jours</option>
            <option value="90">90 derniers jours</option>
            <option value="180">180 derniers jours</option>
            <option value="365">365 derniers jours</option>
          </select>
        </div>

        <div className="ml-auto text-right">
          <div className="text-xs text-gray-500">Pic d'activité</div>
          <div className="text-sm font-bold text-gray-900">
            {stats.peakDay} à {stats.peakHour}
          </div>
          <div className="text-xs text-gray-500">
            {formatValue(stats.peakValue)}
          </div>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase">Total {metricsLabels[metric]}</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatValue(stats.totalValue)}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase">Max (1 cellule)</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatValue(stats.maxValue)}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase">Jour le plus actif</div>
          <div className="text-lg font-bold text-gray-900">{stats.peakDay}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase">Heure la plus active</div>
          <div className="text-lg font-bold text-gray-900">{stats.peakHour}</div>
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
        <span className="text-gray-500 font-medium">Intensité :</span>
        <div className="flex items-center gap-0.5">
          {[
            'bg-gray-50',
            'bg-blue-50',
            'bg-blue-100',
            'bg-blue-200',
            'bg-indigo-300',
            'bg-indigo-400',
            'bg-purple-500',
            'bg-red-500',
          ].map((color, i) => (
            <div
              key={i}
              className={`w-5 h-4 ${color} border border-white`}
              title={`${i * 12.5}% - ${(i + 1) * 12.5}%`}
            />
          ))}
        </div>
        <span className="text-gray-400">Faible → Élevé</span>
      </div>

      {/* Heatmap */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          Chargement de la heatmap…
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center text-gray-500">
          <div className="text-4xl mb-3">🔥</div>
          <p className="font-medium">Aucune donnée</p>
          <p className="text-sm mt-1">
            Les données apparaîtront dès que vous aurez des commandes.
          </p>
        </div>
      ) : (
        <div className="bg-white border rounded-lg p-6 overflow-x-auto">
          {/* Info-bulle flottante */}
          {hoveredCell && (
            <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 mb-3 inline-block">
              <strong>{hoveredCell.day}</strong> à <strong>{hoveredCell.hour}</strong>
              <div className="mt-1">
                {metric === 'orders' && `${hoveredCell.cell.orders} commande(s)`}
                {metric === 'revenue' && formatPrice(hoveredCell.cell.revenue)}
                {metric === 'users' && `${hoveredCell.cell.users} utilisateur(s)`}
              </div>
              <div className="text-gray-300 text-[10px] mt-0.5">
                {hoveredCell.cell.orders} cmd · {formatPrice(hoveredCell.cell.revenue)} · {hoveredCell.cell.users} users
              </div>
            </div>
          )}

          <table className="w-full text-xs border-separate border-spacing-0.5">
            <thead>
              <tr>
                <th className="w-16"></th>
                {Array.from({ length: 24 }).map((_, h) => (
                  <th
                    key={h}
                    className="text-center text-gray-400 font-normal pb-1"
                    style={{ minWidth: '28px' }}
                  >
                    {h % 3 === 0 ? `${String(h).padStart(2, '0')}` : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr key={row.day}>
                  <td className="text-right pr-3 text-gray-600 font-medium text-xs">
                    {row.short}
                  </td>
                  {row.hours.map(cell => (
                    <td key={cell.hour}>
                      <div
                        className={`w-full h-7 rounded-sm cursor-pointer transition ${getCellColor(
                          cell.intensity
                        )} ${getCellTextColor(cell.intensity)} hover:ring-2 hover:ring-blue-400 flex items-center justify-center font-medium`}
                        onMouseEnter={() =>
                          setHoveredCell({
                            day: row.label,
                            hour: `${String(cell.hour).padStart(2, '0')}:00`,
                            cell,
                          })
                        }
                        onMouseLeave={() => setHoveredCell(null)}
                        title={`${row.label} ${String(cell.hour).padStart(2, '0')}:00`}
                      >
                        {cell.intensity >= 60 && cell.value > 0 && (
                          <span className="text-[10px]">
                            {metric === 'revenue'
                              ? Math.round(cell.value / 1000) + 'k'
                              : cell.value}
                          </span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Axe X */}
          <div className="flex justify-between text-xs text-gray-400 mt-3 ml-16">
            <span>00h</span>
            <span>06h</span>
            <span>12h</span>
            <span>18h</span>
            <span>23h</span>
          </div>
        </div>
      )}

      {/* Conseils */}
      {!loading && data.length > 0 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <div className="font-bold mb-2">💡 Comment utiliser cette heatmap</div>
          <ul className="space-y-1 text-xs list-disc list-inside">
            <li>
              <strong>Planifiez vos envois</strong> de newsletters et notifications aux heures
              de pic
            </li>
            <li>
              <strong>Optimisez vos promotions</strong> : les utilisateurs achètent plus
              certains jours/heures
            </li>
            <li>
              <strong>Identifiez les creux</strong> pour lancer des offres spéciales à des
              moments calmes
            </li>
            <li>
              <strong>Adaptez votre support client</strong> : soyez disponibles aux heures
              de forte activité
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}