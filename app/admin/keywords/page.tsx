// app/admin/keywords/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Keyword {
  word: string
  count: number
  inProducts: number
  inPages: number
  inCategories: number
  score: number
}

interface CloudWord {
  word: string
  count: number
  weight: number
}

interface Stats {
  totalUniqueWords: number
  totalWords: number
  avgWordFrequency: number
  productsAnalyzed: number
  pagesAnalyzed: number
  categoriesAnalyzed: number
}

// ============================================================
// Types de réponses API
// ============================================================
interface KeywordsResponse {
  topKeywords?: Keyword[]
  rareKeywords?: string[]
  wordCloud?: CloudWord[]
  stats?: Stats
}

export default function AdminKeywordsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [limit, setLimit] = useState<50 | 100 | 200>(50)
  const [search, setSearch] = useState('')

  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [rareKeywords, setRareKeywords] = useState<string[]>([])
  const [wordCloud, setWordCloud] = useState<CloudWord[]>([])
  const [stats, setStats] = useState<Stats>({
    totalUniqueWords: 0,
    totalWords: 0,
    avgWordFrequency: 0,
    productsAnalyzed: 0,
    pagesAnalyzed: 0,
    categoriesAnalyzed: 0,
  })

  const loadKeywords = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/keywords?limit=${limit}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`)
      const data: KeywordsResponse = await res.json()
      setKeywords(data.topKeywords || [])
      setRareKeywords(data.rareKeywords || [])
      setWordCloud(data.wordCloud || [])
      setStats(data.stats || stats)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    loadKeywords()
  }, [loadKeywords])

  const filteredKeywords = keywords.filter(k =>
    search ? k.word.toLowerCase().includes(search.toLowerCase()) : true
  )

  // Couleur selon le poids
  const getWeightColor = (weight: number) => {
    if (weight >= 9) return 'text-red-600'
    if (weight >= 7) return 'text-orange-500'
    if (weight >= 5) return 'text-purple-600'
    if (weight >= 3) return 'text-blue-600'
    return 'text-gray-500'
  }

  const getWeightSize = (weight: number) => {
    if (weight >= 9) return 'text-4xl'
    if (weight >= 7) return 'text-3xl'
    if (weight >= 5) return 'text-2xl'
    if (weight >= 3) return 'text-xl'
    return 'text-base'
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analyse des mots-clés</h1>
          <p className="text-sm text-gray-500 mt-1">
            Découvrez les termes les plus utilisés dans votre contenu
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={limit}
            onChange={e => {
              const value = Number(e.target.value)
              if (value === 50 || value === 100 || value === 200) {
                setLimit(value)
              }
            }}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="50">Top 50</option>
            <option value="100">Top 100</option>
            <option value="200">Top 200</option>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase">Mots uniques</div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.totalUniqueWords}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase">Mots totaux</div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.totalWords.toLocaleString('fr-FR')}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-blue-600 uppercase">Fréquence moy.</div>
          <div className="text-2xl font-bold text-blue-700">
            {stats.avgWordFrequency}x
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-purple-600 uppercase">Éléments analysés</div>
          <div className="text-2xl font-bold text-purple-700">
            {stats.productsAnalyzed +
              stats.pagesAnalyzed +
              stats.categoriesAnalyzed}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {stats.productsAnalyzed}p · {stats.pagesAnalyzed}pg ·{' '}
            {stats.categoriesAnalyzed}c
          </div>
        </div>
      </div>

      {/* Nuage de mots */}
      {!loading && wordCloud.length > 0 && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            ☁️ Nuage de mots-clés
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-3 py-4">
            {wordCloud.map((w, idx) => (
              <span
                key={idx}
                className={`${getWeightColor(w.weight)} ${getWeightSize(
                  w.weight
                )} font-bold hover:scale-110 transition cursor-pointer`}
                title={`${w.count} occurrences`}
              >
                {w.word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recherche */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Rechercher un mot-clé…"
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />
      </div>

      {/* Liste des mots-clés */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Analyse en cours…</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      ) : filteredKeywords.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center text-gray-500">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-medium">Aucun mot-clé trouvé</p>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-600">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Mot-clé</th>
                <th className="px-4 py-3 text-center">Occurrences</th>
                <th className="px-4 py-3 text-center">Produits</th>
                <th className="px-4 py-3 text-center">Pages</th>
                <th className="px-4 py-3 text-center">Catégories</th>
                <th className="px-4 py-3 text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {filteredKeywords.map((k, idx) => (
                <tr key={k.word} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-400 font-medium">
                    #{idx + 1}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{k.word}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                      {k.count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-600">
                    {k.inProducts > 0 ? `📦 ${k.inProducts}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-600">
                    {k.inPages > 0 ? `📄 ${k.inPages}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-600">
                    {k.inCategories > 0 ? `🏷️ ${k.inCategories}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                          style={{
                            width: `${Math.min(
                              100,
                              (k.score / (keywords[0]?.score || 1)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold text-purple-700 w-12 text-right">
                        {k.score}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mots rares */}
      {!loading && rareKeywords.length > 0 && (
        <div className="mt-6 bg-white border rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            🔍 Mots rares (utilisés une seule fois)
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Ces termes n'apparaissent qu'une fois. Envisagez de les réutiliser ou de
            les supprimer.
          </p>
          <div className="flex flex-wrap gap-2">
            {rareKeywords.map((w, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-xs cursor-pointer transition"
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Conseils */}
      <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-6 text-sm">
        <h2 className="text-lg font-bold text-purple-900 mb-3">
          💡 Comment utiliser cette analyse
        </h2>
        <ul className="space-y-1 text-xs text-purple-800 list-disc list-inside">
          <li>
            <strong>Mots fréquents</strong> = sujet principal de votre boutique. Utilisez
            ces termes dans vos titres et meta descriptions.
          </li>
          <li>
            <strong>Mots rares</strong> = opportunités SEO. Soit vous les développez, soit
            vous les retirez.
          </li>
          <li>
            <strong>Mots dans les catégories</strong> = structure thématique. Vérifiez
            qu'ils correspondent à votre offre.
          </li>
          <li>
            <strong>Score</strong> = pondération (produit 1.0, page 0.7, catégorie 0.5).
            Plus c'est haut, plus le mot est stratégique.
          </li>
        </ul>
      </div>
    </div>
  )
}