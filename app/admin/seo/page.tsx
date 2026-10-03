// app/admin/seo/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface ProductAnalysis {
  id: number
  title: string
  slug: string
  score: number
  issues: string[]
}

interface PageAnalysis {
  id: number
  title: string
  slug: string
  status: string
  score: number
  issues: string[]
}

interface Summary {
  totalProducts: number
  totalPages: number
  avgProductScore: number
  avgPageScore: number
  productsWithIssues: number
  pagesWithIssues: number
  productsMissingMeta: number
  productsMissingImage: number
}

// ============================================================
// Types de réponses API
// ============================================================
interface SeoResponse {
  globalScore?: number
  summary?: Summary
  priorityProducts?: ProductAnalysis[]
  priorityPages?: PageAnalysis[]
}

export default function AdminSeoPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [globalScore, setGlobalScore] = useState(0)
  const [summary, setSummary] = useState<Summary>({
    totalProducts: 0,
    totalPages: 0,
    avgProductScore: 0,
    avgPageScore: 0,
    productsWithIssues: 0,
    pagesWithIssues: 0,
    productsMissingMeta: 0,
    productsMissingImage: 0,
  })
  const [priorityProducts, setPriorityProducts] = useState<ProductAnalysis[]>([])
  const [priorityPages, setPriorityPages] = useState<PageAnalysis[]>([])

  const loadSeo = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/seo', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`)
      const data = (await res.json()) as SeoResponse
      setGlobalScore(data.globalScore || 0)
      setSummary(data.summary || summary)
      setPriorityProducts(data.priorityProducts || [])
      setPriorityPages(data.priorityPages || [])
    } catch (err: any) {
      console.error('❌ Erreur:', err)
      setError(err.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSeo()
  }, [loadSeo])

  const getScoreColor = (score: number) => {
    if (score >= 80) return { bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-500', label: 'Excellent' }
    if (score >= 60) return { bg: 'bg-yellow-100', text: 'text-yellow-700', bar: 'bg-yellow-500', label: 'Correct' }
    if (score >= 40) return { bg: 'bg-orange-100', text: 'text-orange-700', bar: 'bg-orange-500', label: 'À améliorer' }
    return { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500', label: 'Critique' }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12 text-gray-500">Analyse SEO en cours…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      </div>
    )
  }

  const scoreInfo = getScoreColor(globalScore)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Optimisation SEO</h1>
          <p className="text-sm text-gray-500 mt-1">
            Analysez et améliorez la visibilité de votre boutique
          </p>
        </div>
        <Link
          href="/admin"
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Score global */}
      <div className="bg-white border rounded-lg p-8 mb-6">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="relative w-40 h-40 flex-shrink-0">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="12"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={
                  globalScore >= 80
                    ? '#10b981'
                    : globalScore >= 60
                    ? '#eab308'
                    : globalScore >= 40
                    ? '#f97316'
                    : '#ef4444'
                }
                strokeWidth="12"
                strokeDasharray={`${(globalScore / 100) * 314} 314`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={`text-4xl font-bold ${scoreInfo.text}`}>
                {globalScore}
              </div>
              <div className="text-xs text-gray-500">sur 100</div>
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${scoreInfo.bg} ${scoreInfo.text} mb-3`}>
              {scoreInfo.label}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Score SEO global
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Ce score est calculé à partir de l'analyse des métadonnées, descriptions et images de vos {summary.totalProducts} produits et {summary.totalPages} pages.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 uppercase">Produits</div>
                <div className="text-2xl font-bold text-gray-900">
                  {summary.avgProductScore}%
                </div>
                <div className="text-xs text-gray-400">
                  {summary.productsWithIssues} à corriger
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 uppercase">Pages CMS</div>
                <div className="text-2xl font-bold text-gray-900">
                  {summary.avgPageScore}%
                </div>
                <div className="text-xs text-gray-400">
                  {summary.pagesWithIssues} à corriger
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Métriques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase">Produits total</div>
          <div className="text-2xl font-bold text-gray-900">{summary.totalProducts}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-red-600 uppercase">Meta manquantes</div>
          <div className="text-2xl font-bold text-red-700">
            {summary.productsMissingMeta}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-orange-600 uppercase">Images manquantes</div>
          <div className="text-2xl font-bold text-orange-700">
            {summary.productsMissingImage}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-purple-600 uppercase">Pages CMS</div>
          <div className="text-2xl font-bold text-purple-700">{summary.totalPages}</div>
        </div>
      </div>

      {/* Actions prioritaires */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Produits à corriger */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            🎯 Produits à optimiser en priorité
          </h2>
          {priorityProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              🎉 Tous vos produits sont bien optimisés !
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {priorityProducts.map(p => {
                const info = getScoreColor(p.score)
                return (
                  <div
                    key={p.id}
                    className="border rounded-lg p-3 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {p.title}
                        </div>
                        <div className="text-xs text-gray-400 font-mono truncate">
                          /{p.slug}
                        </div>
                      </div>
                      <div className={`text-lg font-bold ${info.text}`}>
                        {p.score}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.issues.map((issue, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 rounded"
                        >
                          {issue}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2">
                      <Link
                        href={`/admin/products/${p.id}/edit`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        ✏️ Corriger →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pages à corriger */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            📄 Pages à optimiser
          </h2>
          {priorityPages.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              🎉 Toutes vos pages sont bien optimisées !
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {priorityPages.map(p => {
                const info = getScoreColor(p.score)
                return (
                  <div
                    key={p.id}
                    className="border rounded-lg p-3 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {p.title}
                        </div>
                        <div className="text-xs text-gray-400 font-mono truncate">
                          /{p.slug}
                        </div>
                      </div>
                      <div className={`text-lg font-bold ${info.text}`}>
                        {p.score}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.issues.map((issue, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 rounded"
                        >
                          {issue}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2">
                      <Link
                        href="/admin/pages"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        ✏️ Corriger →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Conseils SEO */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-blue-900 mb-4">
          💡 Bonnes pratiques SEO
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <div className="font-bold mb-1">📝 Titres (Meta Title)</div>
            <p className="text-xs">
              Entre <strong>30 et 60 caractères</strong>. Incluez le mot-clé principal
              au début.
            </p>
          </div>
          <div>
            <div className="font-bold mb-1">📄 Descriptions (Meta Description)</div>
            <p className="text-xs">
              Entre <strong>120 et 160 caractères</strong>. Donnez envie de cliquer.
            </p>
          </div>
          <div>
            <div className="font-bold mb-1">🔗 Slugs (URLs)</div>
            <p className="text-xs">
              Courts, en minuscules, séparés par des tirets. Pas de mots vides.
            </p>
          </div>
          <div>
            <div className="font-bold mb-1">🖼️ Images</div>
            <p className="text-xs">
              Toujours une image principale par produit. Ajoutez des attributs alt.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}