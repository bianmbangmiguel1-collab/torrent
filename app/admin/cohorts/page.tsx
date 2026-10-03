// app/admin/cohorts/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface CohortPeriod {
  monthOffset: number
  month: string
  activeUsers: number
  retention: number
  revenue: number
  orders: number
}

interface Cohort {
  cohortMonth: string
  cohortLabel: string
  cohortSize: number
  retainedUsers: number
  retentionRate: number
  revenue: number
  orders: number
  avgRevenuePerUser: number
  periods: CohortPeriod[]
}

interface Stats {
  totalCohorts: number
  totalUsers: number
  totalRevenue: number
  avgRetention: number
  bestCohortMonth: string | null
  bestCohortLabel: string | null
  bestCohortRevenue: number
}

interface CohortsResponse {
  cohorts?: Cohort[];
  stats?: Stats;
  error?: string;
}

export default function AdminCohortsPage() {
  const [months, setMonths] = useState<6 | 12 | 24>(6)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [stats, setStats] = useState<Stats>({
    totalCohorts: 0,
    totalUsers: 0,
    totalRevenue: 0,
    avgRetention: 0,
    bestCohortMonth: null,
    bestCohortLabel: null,
    bestCohortRevenue: 0,
  })

  const loadCohorts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/cohorts?months=${months}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`)
      const data = await res.json() as CohortsResponse
      setCohorts(data.cohorts || [])
      setStats(data.stats || stats)
    } catch (err) {
      console.error('❌ Erreur:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [months])

  useEffect(() => {
    loadCohorts()
  }, [loadCohorts])

  const formatPrice = (amount: number) => {
    return Number(amount || 0).toLocaleString('fr-FR') + ' F'
  }

  // ============================================================
  // Couleur de rétention (gradient vert)
  // ============================================================
  const getRetentionColor = (rate: number) => {
    if (rate === 0) return 'bg-gray-50 text-gray-300'
    if (rate < 20) return 'bg-red-50 text-red-600'
    if (rate < 40) return 'bg-orange-50 text-orange-600'
    if (rate < 60) return 'bg-yellow-50 text-yellow-700'
    if (rate < 80) return 'bg-green-50 text-green-700'
    return 'bg-green-200 text-green-900 font-bold'
  }

  // Nombre maximum de périodes (pour l'en-tête du tableau)
  const maxPeriods = Math.max(...cohorts.map(c => c.periods.length), 0)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cohortes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Analyse de rétention et revenus par mois d'inscription
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={months}
            onChange={e => {
              const value = parseInt(e.target.value, 10)

              if (value === 6 || value === 12 || value === 24) {
                setMonths(value)
              }
            }}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="6">6 derniers mois</option>
            <option value="12">12 derniers mois</option>
            <option value="24">24 derniers mois</option>
          </select>
          <Link
            href="/admin"
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            ← Dashboard
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase">Cohortes</div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalCohorts}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-blue-600 uppercase">Utilisateurs</div>
          <div className="text-2xl font-bold text-blue-700">{stats.totalUsers}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-green-600 uppercase">Revenu total</div>
          <div className="text-xl font-bold text-green-700">
            {formatPrice(stats.totalRevenue)}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-purple-600 uppercase">Rétention moy.</div>
          <div className="text-2xl font-bold text-purple-700">{stats.avgRetention}%</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-yellow-600 uppercase">Meilleure cohorte</div>
          <div className="text-lg font-bold text-yellow-700">
            {stats.bestCohortLabel || '—'}
          </div>
          <div className="text-xs text-gray-400">
            {stats.bestCohortRevenue ? formatPrice(stats.bestCohortRevenue) : '—'}
          </div>
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-3 mb-4 text-xs">
        <span className="text-gray-500 font-medium">Rétention :</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
          <span className="text-gray-500">0%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
          <span className="text-gray-500">&lt;20%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-orange-50 border border-orange-200 rounded"></div>
          <span className="text-gray-500">20-40%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-yellow-50 border border-yellow-200 rounded"></div>
          <span className="text-gray-500">40-60%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
          <span className="text-gray-500">60-80%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-200 border border-green-300 rounded"></div>
          <span className="text-gray-500">80%+</span>
        </div>
      </div>

      {/* Tableau des cohortes */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement des cohortes…</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      ) : cohorts.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center text-gray-500">
          <div className="text-4xl mb-3">📊</div>
          <p className="font-medium">Pas assez de données</p>
          <p className="text-sm mt-1">
            Il faut au moins quelques utilisateurs inscrits et des commandes pour voir les cohortes.
          </p>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-sm font-bold text-gray-700">
              Matrice de rétention (mois 0 à {maxPeriods - 1})
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Le % indique combien d'utilisateurs de chaque cohorte reviennent chaque mois
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr className="text-left text-gray-600">
                  <th className="px-3 py-2 sticky left-0 bg-gray-50 z-10 min-w-[100px]">
                    Cohorte
                  </th>
                  <th className="px-3 py-2 text-center min-w-[60px]">Users</th>
                  <th className="px-3 py-2 text-center min-w-[60px]">Rev.</th>
                  <th className="px-3 py-2 text-center min-w-[70px]">Ret. gl.</th>
                  {Array.from({ length: maxPeriods }).map((_, i) => (
                    <th key={i} className="px-2 py-2 text-center min-w-[55px]">
                      M{i}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.map(cohort => (
                  <tr key={cohort.cohortMonth} className="border-b hover:bg-gray-50">
                    {/* Nom de la cohorte */}
                    <td className="px-3 py-2 font-medium text-gray-800 sticky left-0 bg-white z-10">
                      {cohort.cohortLabel}
                    </td>

                    {/* Taille */}
                    <td className="px-3 py-2 text-center font-semibold text-blue-600">
                      {cohort.cohortSize}
                    </td>

                    {/* Revenu */}
                    <td className="px-3 py-2 text-center font-medium text-green-700">
                      {cohort.revenue >= 1000
                        ? `${Math.round(cohort.revenue / 1000)}k`
                        : cohort.revenue}
                    </td>

                    {/* Rétention globale */}
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${getRetentionColor(
                          cohort.retentionRate
                        )}`}
                      >
                        {cohort.retentionRate}%
                      </span>
                    </td>

                    {/* Cellules de rétention */}
                    {Array.from({ length: maxPeriods }).map((_, i) => {
                      const period = cohort.periods[i]
                      if (!period) {
                        // Pas encore de données pour ce mois
                        return (
                          <td
                            key={i}
                            className="px-2 py-2 text-center text-gray-300 bg-gray-50/50"
                          >
                            —
                          </td>
                        )
                      }

                      return (
                        <td key={i} className="px-2 py-2 text-center">
                          <div
                            className={`py-1 rounded text-[10px] font-medium ${getRetentionColor(
                              period.retention
                            )}`}
                            title={`${period.month}\n${period.activeUsers} user(s) actif(s)\n${formatPrice(
                              period.revenue
                            )}`}
                          >
                            {period.retention}%
                            {period.activeUsers > 0 && (
                              <div className="text-[9px] opacity-70">
                                {period.activeUsers}u
                              </div>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t bg-gray-50 text-xs text-gray-500">
            💡 <strong>M0</strong> = mois d'inscription · <strong>M1</strong> = mois suivant · <strong>u</strong> = nombre d'utilisateurs actifs · Survolez une cellule pour voir les détails
          </div>
        </div>
      )}

      {/* Détails additionnels */}
      {!loading && cohorts.length > 0 && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 3 cohortes par revenu */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              🏆 Top cohortes par revenu
            </h2>
            <div className="space-y-3">
              {[...cohorts]
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 3)
                .map((c, idx) => (
                  <div
                    key={c.cohortMonth}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="w-8 h-8 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center font-bold text-sm">
                      #{idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">
                        {c.cohortLabel}
                      </div>
                      <div className="text-xs text-gray-500">
                        {c.cohortSize} users · {c.orders} commandes
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-700">
                        {formatPrice(c.revenue)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatPrice(c.avgRevenuePerUser)}/user
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Meilleure rétention */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              💚 Meilleure rétention
            </h2>
            <div className="space-y-3">
              {[...cohorts]
                .sort((a, b) => b.retentionRate - a.retentionRate)
                .slice(0, 3)
                .map((c, idx) => (
                  <div
                    key={c.cohortMonth}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold text-sm">
                      #{idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">
                        {c.cohortLabel}
                      </div>
                      <div className="text-xs text-gray-500">
                        {c.retainedUsers} / {c.cohortSize} utilisateurs actifs
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-700">
                        {c.retentionRate}%
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}