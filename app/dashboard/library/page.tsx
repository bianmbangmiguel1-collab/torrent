// app/dashboard/library/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft, Library, Search, Filter, Grid3x3, List, Download, Star,
  Clock, CheckCircle, AlertTriangle, FileText, Package, Key, RefreshCw,
  ExternalLink, Eye, ShoppingBag, TrendingUp, Award, X, PlayCircle,
  BookOpen, Music, Video, Image as ImageIcon, Code, FileArchive, Loader2,
} from 'lucide-react'
import { useUser } from '@/context/UserContext'

interface LibraryItem {
  id: number
  product_id: number
  title: string
  slug: string
  description: string | null
  type: string
  image: string | null
  price: number
  total: number
  purchase_date: string
  order_id: number
  order_number: string
  payment_method: string | null
  file_path: string | null
  file_size: string | null
  file_format: string | null
  download_token: string | null
  download_count: number
  download_limit: number
  downloads_left: number
  expires_at: string | null
  days_left: number | null
  license_code: string | null
  license_status: string
  license_validity_days: number
  license_expires_at: string | null
  has_auto_renewal: boolean
  renewal_price: number | null
  author: string | null
  chapters: any
  avg_rating: number
  total_reviews: number
}

interface Stats {
  totalItems: number
  totalSpent: number
  totalDownloads: number
  totalLicenses: number
  expiringSoon: number
}

interface LibraryResponse {
  items?: LibraryItem[]
  stats?: Stats
  error?: string
}

const TYPE_ICONS: Record<string, any> = {
  file: FileArchive,
  book: BookOpen,
  audio: Music,
  video: Video,
  image: ImageIcon,
  code: Code,
  document: FileText,
  course: PlayCircle,
}

export default function LibraryPage() {
  const router = useRouter()
  const { user, loading: userLoading, isAuthenticated } = useUser()

  const [items, setItems] = useState<LibraryItem[]>([])
  const [stats, setStats] = useState<Stats>({
    totalItems: 0, totalSpent: 0, totalDownloads: 0, totalLicenses: 0, expiringSoon: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [filterType, setFilterType] = useState('')
  const [sort, setSort] = useState<'recent' | 'title' | 'downloads'>('recent')
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null)
  const [copiedCode, setCopiedCode] = useState<number | null>(null)

  // Redirection si non authentifié
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.replace('/login?redirect=/dashboard/library')
    }
  }, [userLoading, isAuthenticated, router])

  const loadLibrary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterType) params.set('type', filterType)
      params.set('sort', sort)

      const res = await fetch(`/api/users/library?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (res.status === 401) { router.push('/login'); return }
      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`)
      const data = (await res.json()) as LibraryResponse
      setItems(data.items || [])
      setStats(data.stats || stats)
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [search, filterType, sort, router])

  useEffect(() => {
    if (isAuthenticated) loadLibrary()
  }, [isAuthenticated, loadLibrary])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput.trim())
  }

  const handleDownload = async (item: LibraryItem) => {
    setDownloading(item.id)
    try {
      const res = await fetch(
        `/api/users/library/download?order_id=${item.order_id}&product_id=${item.product_id}`,
        { credentials: 'include' }
      )
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as LibraryResponse
        throw new Error(err.error || `Erreur ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const filename = item.file_path ? item.file_path.split('/').pop() : `${item.title}.bin`
      a.download = filename || 'download'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      // Rafraîchir pour mettre à jour le compteur
      loadLibrary()
    } catch (err: unknown) {
      alert(
        'Erreur : ' +
          (err instanceof Error ? err.message : 'Erreur de téléchargement')
      )
    } finally {
      setDownloading(null)
    }
  }

  const copyLicense = (code: string, id: number) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(id)
      setTimeout(() => setCopiedCode(null), 2000)
    })
  }

  const formatDate = (date: string | null) => {
    if (!date) return '—'
    try {
      return new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    } catch { return date }
  }

  const formatPrice = (amount: number) => `${Number(amount || 0).toLocaleString('fr-FR')} F`

  const getTypeIcon = (type: string) => {
    const Icon = TYPE_ICONS[type] || FileArchive
    return <Icon className="w-4 h-4" />
  }

  const getExpiryColor = (daysLeft: number | null) => {
    if (daysLeft === null) return 'text-gray-500'
    if (daysLeft < 0) return 'text-red-600'
    if (daysLeft < 7) return 'text-red-600'
    if (daysLeft < 30) return 'text-amber-600'
    return 'text-emerald-600'
  }

  const getExpiryLabel = (daysLeft: number | null) => {
    if (daysLeft === null) return 'Aucune expiration'
    if (daysLeft < 0) return `Expiré depuis ${Math.abs(daysLeft)} j`
    if (daysLeft === 0) return 'Expire aujourd\'hui'
    if (daysLeft === 1) return 'Expire demain'
    if (daysLeft < 30) return `Expire dans ${daysLeft} jours`
    return `Expire dans ${Math.floor(daysLeft / 30)} mois`
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Library className="w-6 h-6 text-indigo-600" />
                Ma bibliothèque
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Tous vos produits achetés, en un seul endroit
              </p>
            </div>
          </div>
          <button
            onClick={loadLibrary}
            className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
            title="Rafraîchir"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="text-xs text-gray-500 uppercase">Produits</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalItems}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="text-xs text-gray-500 uppercase">Total dépensé</div>
            <div className="text-lg font-bold text-emerald-600">{formatPrice(stats.totalSpent)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="text-xs text-gray-500 uppercase">Téléchargements</div>
            <div className="text-2xl font-bold text-blue-600">{stats.totalDownloads}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="text-xs text-gray-500 uppercase">Licences actives</div>
            <div className="text-2xl font-bold text-purple-600">{stats.totalLicenses}</div>
          </div>
          <div className={`bg-white border-2 rounded-2xl p-4 ${stats.expiringSoon > 0 ? 'border-amber-300' : 'border-gray-200'}`}>
            <div className="text-xs text-gray-500 uppercase">Expire bientôt</div>
            <div className={`text-2xl font-bold ${stats.expiringSoon > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
              {stats.expiringSoon}
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            <form onSubmit={handleSearch} className="flex-1 min-w-[200px] flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Rechercher dans ma bibliothèque..."
                  className="w-full pl-9 pr-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm">
                Chercher
              </button>
            </form>

            <select
              value={filterType}
              onChange={e => { setFilterType(e.target.value); }}
              className="px-3 py-2 border rounded-xl text-sm"
            >
              <option value="">Tous les types</option>
              <option value="file">📦 Fichiers</option>
              <option value="course">🎓 Cours</option>
              <option value="book">📚 Livres</option>
              <option value="video">🎬 Vidéos</option>
              <option value="audio">🎵 Audio</option>
            </select>

            <select
              value={sort}
              onChange={e => setSort(e.target.value as any)}
              className="px-3 py-2 border rounded-xl text-sm"
            >
              <option value="recent">Plus récents</option>
              <option value="title">Titre (A-Z)</option>
              <option value="downloads">Plus téléchargés</option>
            </select>

            <div className="flex border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400'}`}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* État vide */}
        {items.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
            <Library className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Bibliothèque vide</h3>
            <p className="text-gray-500 mb-4">
              {search || filterType
                ? 'Aucun produit ne correspond à votre recherche.'
                : 'Vous n\'avez pas encore acheté de produit.'}
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition"
            >
              <ShoppingBag className="w-4 h-4" />
              Découvrir les produits
            </Link>
          </div>
        ) : viewMode === 'grid' ? (
          /* ============================================================
             VUE GRILLE
          ============================================================ */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ y: -6 }}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all group flex flex-col"
              >
                {/* Image */}
                <div className="relative h-40 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                  ) : (
                    <div className="text-indigo-400">
                      {getTypeIcon(item.type)}
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {item.days_left !== null && item.days_left <= 30 && item.days_left >= 0 && (
                      <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded">
                        ⏰ {item.days_left}j
                      </span>
                    )}
                    {item.license_status === 'active' && (
                      <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded">
                        ✓ Licence
                      </span>
                    )}
                  </div>

                  {/* Type */}
                  <div className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur rounded-lg">
                    {getTypeIcon(item.type)}
                  </div>

                  {/* Overlay pour actions */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="p-2 bg-white rounded-full shadow-lg hover:scale-110 transition"
                        title="Détails"
                      >
                        <Eye className="w-4 h-4 text-gray-700" />
                      </button>
                      <Link
                        href={`/product/${item.slug}`}
                        className="p-2 bg-white rounded-full shadow-lg hover:scale-110 transition"
                        title="Voir la fiche"
                      >
                        <ExternalLink className="w-4 h-4 text-gray-700" />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Contenu */}
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-semibold text-gray-900 line-clamp-2 min-h-[40px]">
                    {item.title}
                  </h3>

                  {item.author && (
                    <p className="text-xs text-gray-500 mt-0.5">Par {item.author}</p>
                  )}

                  {/* Notes */}
                  {item.avg_rating > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs text-gray-600 font-medium">{item.avg_rating.toFixed(1)}</span>
                      <span className="text-xs text-gray-400">({item.total_reviews})</span>
                    </div>
                  )}

                  {/* Infos fichiers */}
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    {item.file_size && <span>💾 {item.file_size}</span>}
                    {item.file_format && <span className="px-1.5 py-0.5 bg-gray-100 rounded">{item.file_format}</span>}
                  </div>

                  {/* Barre de téléchargement */}
                  {item.download_limit > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                        <span>Téléchargements</span>
                        <span>{item.download_count} / {item.download_limit}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.downloads_left <= 1
                              ? 'bg-red-500'
                              : item.downloads_left <= 3
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min((item.download_count / item.download_limit) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Expiration */}
                  {item.days_left !== null && (
                    <div className={`flex items-center gap-1 text-xs mt-2 ${getExpiryColor(item.days_left)}`}>
                      <Clock className="w-3 h-3" />
                      {getExpiryLabel(item.days_left)}
                    </div>
                  )}

                  <div className="flex-1" />

                  {/* Actions */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleDownload(item)}
                      disabled={downloading === item.id || (item.download_limit > 0 && item.downloads_left === 0)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {downloading === item.id ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> En cours...</>
                      ) : item.download_limit > 0 && item.downloads_left === 0 ? (
                        <><AlertTriangle className="w-3.5 h-3.5" /> Épuisé</>
                      ) : (
                        <><Download className="w-3.5 h-3.5" /> Télécharger</>
                      )}
                    </button>
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                      title="Détails"
                    >
                      <Eye className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* ============================================================
             VUE LISTE
          ============================================================ */
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-gray-600">
                  <th className="px-4 py-3">Produit</th>
                  <th className="px-4 py-3 hidden md:table-cell">Type</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Acheté le</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Téléchargements</th>
                  <th className="px-4 py-3 hidden md:table-cell">Expiration</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                            {getTypeIcon(item.type)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate max-w-xs">{item.title}</div>
                          {item.author && <div className="text-xs text-gray-500">Par {item.author}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded capitalize">
                        {item.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">
                      {formatDate(item.purchase_date)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs">
                      {item.download_limit > 0
                        ? `${item.download_count} / ${item.download_limit}`
                        : `${item.download_count} (∞)`}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs">
                      {item.days_left !== null ? (
                        <span className={getExpiryColor(item.days_left)}>
                          {getExpiryLabel(item.days_left)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(item)}
                          disabled={downloading === item.id || (item.download_limit > 0 && item.downloads_left === 0)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition disabled:opacity-50"
                          title="Télécharger"
                        >
                          {downloading === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================
          MODAL DÉTAILS
      ============================================================ */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-4 flex-1">
                  {selectedItem.image ? (
                    <img
                      src={selectedItem.image}
                      alt={selectedItem.title}
                      className="w-20 h-20 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-indigo-50 flex items-center justify-center">
                      {getTypeIcon(selectedItem.type)}
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedItem.title}</h2>
                    {selectedItem.author && (
                      <p className="text-sm text-gray-500">Par {selectedItem.author}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded capitalize">
                        {selectedItem.type}
                      </span>
                      {selectedItem.file_format && (
                        <span className="px-2 py-0.5 bg-gray-100 rounded">
                          {selectedItem.file_format}
                        </span>
                      )}
                      {selectedItem.file_size && <span>💾 {selectedItem.file_size}</span>}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Description */}
              {selectedItem.description && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 line-clamp-4">
                    {selectedItem.description.replace(/<[^>]*>/g, '').substring(0, 300)}
                    {selectedItem.description.length > 300 ? '...' : ''}
                  </p>
                </div>
              )}

              {/* Détails */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-1">Commande</div>
                  <div className="font-mono text-xs font-medium text-gray-900">
                    {selectedItem.order_number}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-1">Date d'achat</div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatDate(selectedItem.purchase_date)}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-1">Prix payé</div>
                  <div className="text-sm font-bold text-emerald-600">
                    {formatPrice(selectedItem.total)}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-1">Téléchargements</div>
                  <div className="text-sm font-medium text-gray-900">
                    {selectedItem.download_count} / {selectedItem.download_limit > 0 ? selectedItem.download_limit : '∞'}
                  </div>
                </div>
              </div>

              {/* Licence */}
              {selectedItem.license_code && (
                <div className={`rounded-xl p-4 mb-4 ${selectedItem.license_status === 'active' ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Key className={`w-4 h-4 ${selectedItem.license_status === 'active' ? 'text-emerald-600' : 'text-gray-400'}`} />
                      <span className="font-semibold text-sm">Licence</span>
                      {selectedItem.license_status === 'active' ? (
                        <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-bold">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded">
                          {selectedItem.license_status}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-200">
                    <code className="flex-1 text-xs font-mono text-gray-900 truncate">
                      {selectedItem.license_code}
                    </code>
                    <button
                      onClick={() => copyLicense(selectedItem.license_code!, selectedItem.id)}
                      className="p-1.5 hover:bg-gray-100 rounded transition"
                      title="Copier"
                    >
                      {copiedCode === selectedItem.id ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <FileText className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                  {selectedItem.license_expires_at && (
                    <p className="text-xs text-gray-500 mt-2">
                      Expire le : {formatDate(selectedItem.license_expires_at)}
                    </p>
                  )}
                </div>
              )}

              {/* Renouvellement */}
              {selectedItem.has_auto_renewal && selectedItem.renewal_price && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-blue-900">Renouvellement automatique</div>
                    <div className="text-xs text-blue-700">
                      Prix : {formatPrice(selectedItem.renewal_price)}
                    </div>
                  </div>
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                </div>
              )}

              {/* Expiration globale */}
              {selectedItem.days_left !== null && (
                <div className={`rounded-xl p-3 mb-4 flex items-center gap-2 ${getExpiryColor(selectedItem.days_left).replace('text-', 'bg-').replace('600', '50')}`}>
                  <Clock className={`w-4 h-4 ${getExpiryColor(selectedItem.days_left)}`} />
                  <span className={`text-sm font-medium ${getExpiryColor(selectedItem.days_left)}`}>
                    {getExpiryLabel(selectedItem.days_left)}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <Link
                  href={`/product/${selectedItem.slug}`}
                  className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Voir la fiche
                </Link>
                <button
                  onClick={() => handleDownload(selectedItem)}
                  disabled={downloading === selectedItem.id || (selectedItem.download_limit > 0 && selectedItem.downloads_left === 0)}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {downloading === selectedItem.id ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Téléchargement...</>
                  ) : selectedItem.download_limit > 0 && selectedItem.downloads_left === 0 ? (
                    <><AlertTriangle className="w-4 h-4" /> Limite atteinte</>
                  ) : (
                    <><Download className="w-4 h-4" /> Télécharger ({selectedItem.downloads_left === -1 ? '∞' : selectedItem.downloads_left} restants)</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}