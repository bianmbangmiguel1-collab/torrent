// app/admin/sitemap/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface UrlEntry {
  loc: string
  lastmod: string
  changefreq: string
  priority: number
  type: string
  title: string
}

interface Stats {
  totalUrls: number
  products: number
  categories: number
  pages: number
  staticPages: number
  cmsPages: number
}

interface SitemapResponse {
  urls?: UrlEntry[]
  stats?: Stats
  byType?: Record<string, number>
  baseUrl?: string
  xml?: string
}

interface GenerateSitemapResponse {
  message?: string
  path?: string
  urlCount?: number
  error?: string
}

export default function AdminSitemapPage() {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [urls, setUrls] = useState<UrlEntry[]>([])
  const [stats, setStats] = useState<Stats>({
    totalUrls: 0,
    products: 0,
    categories: 0,
    pages: 0,
    staticPages: 0,
    cmsPages: 0,
  })
  const [byType, setByType] = useState<Record<string, number>>({})
  // ✅ Correction : utilise NEXT_PUBLIC_APP_URL au lieu de localhost:3000 en dur
  const [baseUrl, setBaseUrl] = useState(
    process.env.NEXT_PUBLIC_APP_URL || 'https://torrentwist.com'
  )
  const [xml, setXml] = useState('')
  const [filterType, setFilterType] = useState<string>('')
  const [copySuccess, setCopySuccess] = useState(false)

  const loadSitemap = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/sitemap', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`)
      const data = (await res.json()) as SitemapResponse
      setUrls(data.urls || [])
      setStats(data.stats || stats)
      setByType(data.byType || {})
      setBaseUrl(data.baseUrl || baseUrl)
      setXml(data.xml || '')
    } catch (err: any) {
      console.error('❌ Erreur:', err)
      setError(err.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSitemap()
  }, [loadSitemap])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/admin/sitemap', {
        method: 'POST',
        credentials: 'include',
      })
      const data = (await res.json()) as GenerateSitemapResponse

      if (!res.ok) {
        throw new Error(data.error || 'Erreur')
      }

      alert(
        `✅ ${data.message || 'Sitemap généré'}\n\n` +
        `Fichier accessible sur : ${data.path || 'sitemap.xml'}\n` +
        `URLs incluses : ${data.urlCount ?? 0}`
      )
    } catch (err: any) {
      alert('Erreur : ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([xml], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sitemap.xml'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(xml).then(() => {
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    })
  }

  const filteredUrls = filterType ? urls.filter(u => u.type === filterType) : urls

  const getTypeBadge = (type: string) => {
    const map: Record<string, { label: string; color: string }> = {
      page: { label: '📄 Page', color: 'bg-blue-100 text-blue-700' },
      product: { label: '📦 Produit', color: 'bg-green-100 text-green-700' },
      category: { label: '🏷️ Catégorie', color: 'bg-purple-100 text-purple-700' },
      cms: { label: '📰 CMS', color: 'bg-orange-100 text-orange-700' },
    }
    const v = map[type] || { label: type, color: 'bg-gray-100 text-gray-700' }
    return <span className={`px-2 py-0.5 text-xs rounded ${v.color}`}>{v.label}</span>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sitemap XML</h1>
          <p className="text-sm text-gray-500 mt-1">
            Générez le fichier sitemap pour les moteurs de recherche
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
          >
            {generating ? '⏳ Génération…' : '⚙️ Générer sitemap.xml'}
          </button>
          <Link
            href="/admin"
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            ← Dashboard
          </Link>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
        <div className="font-bold mb-1">💡 À quoi ça sert ?</div>
        <p className="text-xs">
          Le sitemap XML aide les moteurs de recherche à découvrir et indexer toutes les
          pages de votre site. Soumettez-le à Google Search Console et Bing Webmaster Tools.
        </p>
        <div className="mt-3 text-xs">
          <span className="font-medium">URL de base :</span>{' '}
          <code className="bg-white px-2 py-0.5 rounded">{baseUrl}</code>
        </div>
        <div className="mt-1 text-xs">
          <span className="font-medium">Sitemap :</span>{' '}
          <a
            href="/sitemap.xml"
            target="_blank"
            className="text-blue-600 hover:underline"
          >
            {baseUrl}/sitemap.xml
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase">URLs totales</div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalUrls}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-green-600 uppercase">Produits</div>
          <div className="text-2xl font-bold text-green-700">{stats.products}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-purple-600 uppercase">Catégories</div>
          <div className="text-2xl font-bold text-purple-700">{stats.categories}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xs text-orange-600 uppercase">Pages CMS</div>
          <div className="text-2xl font-bold text-orange-700">{stats.cmsPages}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white border rounded-lg p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="text-sm font-medium text-gray-700">Actions rapides :</div>
        <button
          onClick={handleDownload}
          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          📥 Télécharger XML
        </button>
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          {copySuccess ? '✅ Copié !' : '📋 Copier XML'}
        </button>
        <button
          onClick={() => window.open('/sitemap.xml', '_blank')}
          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          🔗 Ouvrir dans un onglet
        </button>
      </div>

      {/* Filtres par type */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilterType('')}
          className={`px-3 py-1.5 text-sm rounded-lg ${
            filterType === '' ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          Tous ({stats.totalUrls})
        </button>
        {Object.entries(byType).map(([type, count]) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              filterType === type ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {type} ({count})
          </button>
        ))}
      </div>

      {/* Liste des URLs */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement…</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      ) : filteredUrls.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center text-gray-500">
          <div className="text-4xl mb-3">🗺️</div>
          <p className="font-medium">Aucune URL trouvée</p>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-600">
                <th className="px-4 py-3">Titre</th>
                <th className="px-4 py-3">URL</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-center">Priorité</th>
                <th className="px-4 py-3 text-center">Fréquence</th>
                <th className="px-4 py-3">Dernière modif.</th>
              </tr>
            </thead>
            <tbody>
              {filteredUrls.map((u, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 max-w-xs truncate">{u.title}</td>
                  <td className="px-4 py-3">
                    <a
                      href={u.loc}
                      target="_blank"
                      className="text-blue-600 hover:underline text-xs font-mono truncate block max-w-md"
                    >
                      {u.loc}
                    </a>
                  </td>
                  <td className="px-4 py-3">{getTypeBadge(u.type)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-medium">{u.priority}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">
                    {u.changefreq}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{u.lastmod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Aperçu XML */}
      {!loading && xml && (
        <div className="mt-6 bg-white border rounded-lg overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700">
              📄 Aperçu du fichier sitemap.xml
            </h2>
            <span className="text-xs text-gray-500">
              {xml.length.toLocaleString('fr-FR')} caractères
            </span>
          </div>
          <pre className="p-4 text-xs overflow-x-auto bg-gray-900 text-green-400 max-h-96">
            {xml}
          </pre>
        </div>
      )}

      {/* Conseils */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6 text-sm">
        <h2 className="text-lg font-bold text-blue-900 mb-4">
          💡 Étapes suivantes
        </h2>
        <ol className="space-y-2 text-blue-800 text-xs list-decimal list-inside">
          <li>
            Cliquez sur <strong>Générer sitemap.xml</strong> pour écrire le fichier sur le
            serveur
          </li>
          <li>
            Créez un compte sur{' '}
            <a
              href="https://search.google.com/search-console"
              target="_blank"
              className="font-medium underline"
            >
              Google Search Console
            </a>{' '}
            et soumettez votre sitemap
          </li>
          <li>
            Faites pareil sur{' '}
            <a
              href="https://www.bing.com/webmasters"
              target="_blank"
              className="font-medium underline"
            >
              Bing Webmaster Tools
            </a>
          </li>
          <li>
            Régénérez le sitemap après chaque ajout important de produits ou pages
          </li>
        </ol>
      </div>
    </div>
  )
}