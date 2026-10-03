// app/admin/integrations/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Category {
  id: string
  name: string
  icon: string
  description: string
  href: string
  providers: string[]
  providersCount: number
  installedCount: number
  enabledCount: number
}

interface Stats {
  totalCategories: number
  totalInstalled: number
  totalEnabled: number
  totalProviders: number
}

// ============================================================
// Types de réponses API
// ============================================================
interface IntegrationsResponse {
  categories?: Category[]
  stats?: Stats
}

export default function AdminIntegrationsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [stats, setStats] = useState<Stats>({
    totalCategories: 0,
    totalInstalled: 0,
    totalEnabled: 0,
    totalProviders: 0,
  })
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/integrations', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as IntegrationsResponse
      setCategories(data.categories || [])
      setStats(data.stats || stats)
    } catch (err: any) {
      setError(err.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = categories.filter(c =>
    search
      ? c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase()) ||
        c.providers.some(p => p.toLowerCase().includes(search.toLowerCase()))
      : true
  )

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔌 Intégrations</h1>
          <p className="text-sm text-gray-500 mt-1">
            Connectez des services externes à votre boutique
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
          <div className="text-xs text-gray-500 uppercase">Catégories</div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.totalCategories}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-blue-600 uppercase">Services dispo.</div>
          <div className="text-2xl font-bold text-blue-700">
            {stats.totalProviders}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-purple-600 uppercase">Installées</div>
          <div className="text-2xl font-bold text-purple-700">
            {stats.totalInstalled}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-green-600 uppercase">Actives</div>
          <div className="text-2xl font-bold text-green-700">
            {stats.totalEnabled}
          </div>
        </div>
      </div>

      {/* Recherche */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Rechercher une intégration (ex: Stripe, analytics, email…)"
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />
      </div>

      {/* Liste des catégories */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement…</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center text-gray-500">
          <div className="text-4xl mb-3">🔌</div>
          <p className="font-medium">Aucune intégration trouvée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(cat => {
            const hasInstalled = cat.installedCount > 0
            const hasEnabled = cat.enabledCount > 0

            return (
              <Link
                key={cat.id}
                href={cat.href}
                className={`group bg-white border-2 rounded-xl p-5 transition hover:shadow-lg hover:-translate-y-0.5 ${
                  hasEnabled
                    ? 'border-green-300'
                    : hasInstalled
                    ? 'border-blue-200'
                    : 'border-gray-200'
                }`}
              >
                {/* Icon + nom */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-4xl group-hover:scale-110 transition-transform">
                    {cat.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900">{cat.name}</h3>
                      {hasEnabled && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                          ● Actif
                        </span>
                      )}
                      {!hasEnabled && hasInstalled && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                          ● Configuré
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{cat.description}</p>
                  </div>
                </div>

                {/* Badges stats */}
                <div className="flex items-center gap-2 mb-3 text-xs">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                    {cat.providersCount} services
                  </span>
                  {cat.installedCount > 0 && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                      {cat.installedCount} installé{cat.installedCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Providers (petits badges) */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {cat.providers.slice(0, 4).map(p => (
                    <span
                      key={p}
                      className="text-[10px] px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded border border-gray-100"
                    >
                      {p}
                    </span>
                  ))}
                  {cat.providers.length > 4 && (
                    <span className="text-[10px] px-1.5 py-0.5 text-gray-400">
                      +{cat.providers.length - 4}
                    </span>
                  )}
                </div>

                {/* CTA */}
                <div className="pt-3 border-t flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {hasInstalled ? 'Gérer' : 'Configurer'}
                  </span>
                  <span className="text-sm text-blue-600 group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Conseils */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6 text-sm">
        <h2 className="text-lg font-bold text-blue-900 mb-3">
          💡 Comment utiliser les intégrations ?
        </h2>
        <ul className="space-y-1 text-xs text-blue-800 list-disc list-inside">
          <li>
            <strong>Analytics</strong> : mesurez vos visiteurs, conversions et comportements
          </li>
          <li>
            <strong>CRM</strong> : synchronisez vos clients avec un outil de gestion
          </li>
          <li>
            <strong>Email</strong> : automatisez vos campagnes et newsletters
          </li>
          <li>
            <strong>Paiements</strong> : encaissez avec différents processeurs (FedaPay, Stripe…)
          </li>
          <li>
            <strong>IA</strong> : connectez OpenAI, Anthropic, OpenRouter pour vos fonctions IA
          </li>
          <li>
            <strong>Stockage</strong> : hébergez vos fichiers sur un cloud (S3, R2…)
          </li>
        </ul>
      </div>
    </div>
  )
}