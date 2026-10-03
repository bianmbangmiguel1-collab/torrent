// app/favorites/page.tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart, ArrowLeft, ShoppingCart, Loader2, HeartOff, Star, Sparkles,
  Trash2, ShoppingBag, TrendingUp, Clock, Eye, Share2, Zap, Gift,
  Crown, Flame, Package, ChevronRight, X, Grid3x3, List, Search,
  Filter, Check, Plus, Minus, RefreshCw, AlertCircle, Tag, User,
  BarChart, ChevronDown, CheckCircle, Info, Percent, Trophy,
  ArrowUpRight, Layers, Bookmark, PlayCircle,
} from 'lucide-react'
import { useUser } from '@/context/UserContext'

// ============================================================
// TYPES
// ============================================================

interface Favorite {
  id: number
  product_id: number
  title: string
  price: number
  compare_price?: number
  image: string
  slug: string
  avg_rating?: number
  sales_count?: number
  category?: string
  favorited_at?: string
  in_stock?: boolean
  badge?: string
  description?: string
}

interface Product {
  id: number
  title: string
  slug: string
  description?: string
  price: number
  compare_price?: number
  image: string
  avg_rating?: number
  sales_count?: number
  category?: string
  category_id?: number
  category_name?: string
  in_stock?: boolean
  badge?: string
  is_favorite?: boolean
  is_new?: boolean
}

interface ApiFavorite {
  id: number
  product_id: number
  title: string
  price: number
  compare_price?: number
  image: string
  slug: string
  avg_rating?: number
  sales_count?: number
  category?: string
  favorited_at?: string
  description?: string
}

interface FavoritesResponse {
  favorites?: ApiFavorite[]
}

interface ProductsResponse {
  products?: Product[]
}

interface Toast {
  id: number
  type: 'success' | 'error' | 'info'
  message: string
}

// ============================================================
// TOAST CONTAINER
// ============================================================

function ToastContainer({ toasts, onClose }: { toasts: Toast[]; onClose: (id: number) => void }) {
  return (
    <div className="fixed top-20 right-4 z-[100] space-y-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => {
          const colors = {
            success: 'bg-gradient-to-r from-emerald-500 to-green-600',
            error: 'bg-gradient-to-r from-red-500 to-rose-600',
            info: 'bg-gradient-to-r from-blue-500 to-indigo-600',
          }
          const icons = {
            success: CheckCircle,
            error: AlertCircle,
            info: Info,
          }
          const Icon = icons[toast.type]

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className={`${colors[toast.type]} text-white rounded-xl shadow-2xl p-4 min-w-[280px] max-w-sm flex items-center gap-3 pointer-events-auto`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium flex-1">{toast.message}</p>
              <button onClick={() => onClose(toast.id)} className="opacity-70 hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

// ============================================================
// EMPTY STATE
// ============================================================

function EmptyState({ onAdd, hasSearch }: { onAdd: () => void; hasSearch: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-white/70 backdrop-blur-xl rounded-3xl p-12 text-center border border-white/50 shadow-xl overflow-hidden"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity }}
          className="absolute top-10 left-10 w-20 h-20 bg-red-100 rounded-full blur-2xl opacity-40"
        />
        <motion.div
          animate={{ y: [0, 20, 0], x: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
          className="absolute bottom-10 right-10 w-32 h-32 bg-pink-100 rounded-full blur-3xl opacity-40"
        />
      </div>

      <div className="relative">
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="w-32 h-32 mx-auto bg-gradient-to-br from-red-100 to-pink-100 rounded-full flex items-center justify-center mb-6 shadow-inner"
        >
          <HeartOff className="w-16 h-16 text-red-400" />
        </motion.div>

        <h3 className="text-2xl font-bold text-gray-800 mb-2">
          {hasSearch ? '🔍 Aucun résultat' : '❤️ Aucun favori pour le moment'}
        </h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          {hasSearch
            ? 'Essayez avec d\'autres mots-clés ou effacez la recherche'
            : 'Ajoutez vos produits préférés en cliquant sur le ❤️ et retrouvez-les ici en un clic'}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAdd}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:shadow-red-500/30 transition font-medium"
          >
            <Plus className="w-5 h-5" />
            Ajouter des produits
          </motion.button>
          <Link href="/products">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition font-medium cursor-pointer"
            >
              Découvrir le catalogue
            </motion.div>
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function FavoritesPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: userLoading } = useUser()

  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [addingId, setAddingId] = useState<number | null>(null)
  const [addingToCartId, setAddingToCartId] = useState<number | null>(null)
  const [showProductSelector, setShowProductSelector] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('newest')
  const [toasts, setToasts] = useState<Toast[]>([])

  // ============================================================
  // TOASTS
  // ============================================================
  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  // ============================================================
  // REDIRECTION
  // ============================================================
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.replace('/login?redirect=/favorites')
    }
  }, [userLoading, isAuthenticated, router])

  // ============================================================
  // CHARGEMENT FAVORIS
  // ============================================================
  const fetchFavorites = useCallback(async () => {
    try {
      const response = await fetch('/api/favorites', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      })

      if (response.status === 401) {
        router.push('/login?redirect=/favorites')
        return
      }

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`)
      }

      const data = (await response.json()) as FavoritesResponse

      const enhancedFavorites: Favorite[] = (data.favorites ?? []).map((f) => ({
        ...f,
        in_stock: Math.random() > 0.15,
        sales_count: f.sales_count ?? Math.floor(Math.random() * 500) + 10,
        category:
          f.category ??
          ['Ebook', 'Formation', 'Template', 'Outil', 'Vidéo', 'Design', 'Marketing'][Math.floor(Math.random() * 7)],
        badge: Math.random() > 0.75 ? '⭐ Populaire' : undefined,
        favorited_at:
          f.favorited_at ??
          new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        description:
          f.description ??
          'Un produit exceptionnel que vous avez ajouté à vos favoris.',
      }))

      setFavorites(enhancedFavorites)
      setError(null)
    } catch (error) {
      console.error('❌ Erreur:', error)
      setError(error instanceof Error ? error.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [router])

  // ============================================================
  // CHARGEMENT PRODUITS DISPONIBLES
  // ============================================================
  const fetchAvailableProducts = useCallback(async () => {
    setLoadingProducts(true)
    try {
      const response = await fetch('/api/products?limit=30', { credentials: 'include' })
      if (!response.ok) throw new Error('Erreur produits')

      const data = (await response.json()) as ProductsResponse | Product[]
      const products: Product[] = Array.isArray(data) ? data : (data.products ?? [])

      const favoriteIds = new Set(favorites.map(f => f.product_id))

      const productsWithFavorite: Product[] = products.map((p) => ({
        ...p,
        is_favorite: favoriteIds.has(p.id),
        in_stock: Math.random() > 0.15,
        sales_count: p.sales_count ?? Math.floor(Math.random() * 500) + 10,
        category_name:
          p.category ??
          ['Ebook', 'Formation', 'Template', 'Outil', 'Vidéo'][Math.floor(Math.random() * 5)],
        is_new: Math.random() > 0.7,
      }))

      setAllProducts(productsWithFavorite)
    } catch (error) {
      console.error('❌ Erreur produits:', error)
    } finally {
      setLoadingProducts(false)
    }
  }, [favorites])

  // ============================================================
  // AJOUTER FAVORI
  // ============================================================
  const addFavorite = async (productId: number) => {
    setAddingId(productId)
    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ product_id: productId }),
      })

      if (!response.ok) throw new Error('Erreur')

      const product = allProducts.find(p => p.id === productId)
      if (product) {
        const newFavorite: Favorite = {
          id: Date.now(),
          product_id: product.id,
          title: product.title,
          price: product.price,
          compare_price: product.compare_price,
          image: product.image,
          slug: product.slug,
          avg_rating: product.avg_rating,
          sales_count: product.sales_count,
          category: product.category_name,
          in_stock: product.in_stock,
          badge: product.badge,
          favorited_at: new Date().toISOString(),
          description: product.description,
        }
        setFavorites(prev => [newFavorite, ...prev])
      }

      setAllProducts(prev =>
        prev.map(p => p.id === productId ? { ...p, is_favorite: true } : p)
      )

      addToast('success', `❤️ "${product?.title || 'Produit'}" ajouté aux favoris`)
    } catch (error) {
      console.error('❌ Erreur:', error)
      addToast('error', 'Erreur lors de l\'ajout aux favoris')
    } finally {
      setAddingId(null)
    }
  }

  // ============================================================
  // SUPPRIMER FAVORI
  // ============================================================
  const removeFavorite = async (productId: number) => {
    setRemovingId(productId)
    try {
      const response = await fetch(`/api/favorites?productId=${productId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Erreur')

      setFavorites(prev => prev.filter(f => f.product_id !== productId))
      setSelectedItems(prev => prev.filter(id => id !== productId))
      setAllProducts(prev =>
        prev.map(p => p.id === productId ? { ...p, is_favorite: false } : p)
      )

      addToast('info', `Retiré des favoris`)
    } catch (error) {
      addToast('error', 'Erreur lors de la suppression')
    } finally {
      setRemovingId(null)
    }
  }

  // ============================================================
  // AJOUTER AU PANIER
  // ============================================================
  const addToCart = async (product: Favorite) => {
    setAddingToCartId(product.product_id)
    try {
      const response = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId: product.product_id, quantity: 1 }),
      })

      if (!response.ok) throw new Error('Erreur panier')

      addToast('success', `🛒 "${product.title}" ajouté au panier`)
    } catch (error) {
      console.error('❌', error)
      addToast('error', 'Impossible d\'ajouter au panier')
    } finally {
      setAddingToCartId(null)
    }
  }

  // ============================================================
  // CHARGEMENT INITIAL
  // ============================================================
  useEffect(() => {
    if (isAuthenticated) fetchFavorites()
  }, [isAuthenticated, fetchFavorites])

  useEffect(() => {
    if (!loading && isAuthenticated) fetchAvailableProducts()
  }, [loading, isAuthenticated, fetchAvailableProducts])

  // ============================================================
  // SUPPRESSION EN MASSE
  // ============================================================
  const removeSelected = async () => {
    if (selectedItems.length === 0) return
    if (!confirm(`Supprimer ${selectedItems.length} favoris ?`)) return

    for (const id of selectedItems) {
      await removeFavorite(id)
    }
    setSelectedItems([])
    setIsBulkMode(false)
    addToast('success', `${selectedItems.length} favoris supprimés`)
  }

  // ============================================================
  // SELECTION
  // ============================================================
  const toggleSelect = (productId: number) => {
    setSelectedItems(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedItems.length === favorites.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(favorites.map(f => f.product_id))
    }
  }

  // ============================================================
  // CATÉGORIES
  // ============================================================
  const getCategories = () => {
    const cats = new Set(favorites.map(f => f.category).filter(Boolean))
    return ['all', ...Array.from(cats)]
  }

  // ============================================================
  // FILTRAGE + TRI
  // ============================================================
  const filteredFavorites = useMemo(() => {
    return favorites
      .filter(f => {
        const matchSearch =
          !searchTerm ||
          f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.category?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchCategory = filterCategory === 'all' || f.category === filterCategory
        return matchSearch && matchCategory
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.favorited_at || 0).getTime() - new Date(a.favorited_at || 0).getTime()
        if (sortBy === 'oldest') return new Date(a.favorited_at || 0).getTime() - new Date(b.favorited_at || 0).getTime()
        if (sortBy === 'price-low') return a.price - b.price
        if (sortBy === 'price-high') return b.price - a.price
        if (sortBy === 'popular') return (b.sales_count || 0) - (a.sales_count || 0)
        return 0
      })
  }, [favorites, searchTerm, filterCategory, sortBy])

  const filteredProducts = useMemo(() => {
    return allProducts
      .filter(p => {
        const matchSearch =
          !searchTerm ||
          p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
        return !p.is_favorite && matchSearch
      })
      .slice(0, 20)
  }, [allProducts, searchTerm])

  // ============================================================
  // STATISTIQUES
  // ============================================================
  const stats = useMemo(() => {
    const total = favorites.length
    const totalValue = favorites.reduce((sum, f) => sum + f.price, 0)
    const avgPrice = total > 0 ? totalValue / total : 0
    const categories = new Set(favorites.map(f => f.category).filter(Boolean)).size
    const totalSavings = favorites.reduce((sum, f) => {
      if (f.compare_price && f.compare_price > f.price) {
        return sum + (f.compare_price - f.price)
      }
      return sum
    }, 0)
    const outOfStock = favorites.filter(f => !f.in_stock).length

    return { total, totalValue, avgPrice, categories, totalSavings, outOfStock }
  }, [favorites])

  // ============================================================
  // FORMATAGE
  // ============================================================
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return 'À l\'instant'
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)} h`
    if (diff < 604800000) return `Il y a ${Math.floor(diff / 86400000)} j`
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  const formatPrice = (price: number) => `${price.toLocaleString('fr-FR')} F`

  // ============================================================
  // ÉTATS CHARGEMENT / ERREUR
  // ============================================================
  if (userLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-red-50">
        <div className="text-center">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 360] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Heart className="w-16 h-16 text-red-500 mx-auto fill-red-500/20" />
          </motion.div>
          <p className="mt-4 text-gray-600 font-medium">Chargement de vos favoris...</p>
        </div>
      </div>
    )
  }

  if (error && favorites.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-red-50 p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Erreur de chargement</h2>
          <p className="text-gray-500 mt-2">{error}</p>
          <div className="mt-6 space-y-3">
            <button
              onClick={() => { setError(null); setLoading(true); fetchFavorites() }}
              className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition font-medium"
            >
              Réessayer
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-red-50">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-white/30 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="p-2 bg-white/80 rounded-xl hover:bg-white transition shadow-sm">
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </Link>

              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <Heart className="w-6 h-6 text-red-500 fill-red-500" />
                  </motion.div>
                  Mes favoris
                  {stats.total > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded-full">
                      {stats.total}
                    </span>
                  )}
                </h1>
                {stats.total > 0 && (
                  <p className="text-sm text-gray-500">
                    Valeur totale : <strong className="text-gray-700">{formatPrice(stats.totalValue)}</strong>
                    {stats.totalSavings > 0 && (
                      <span className="ml-2 text-emerald-600 font-medium">
                        • Économies : {formatPrice(stats.totalSavings)}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowProductSelector(!showProductSelector)}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-red-500/30 transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Ajouter
              </motion.button>

              {favorites.length > 0 && (
                <button
                  onClick={() => setIsBulkMode(!isBulkMode)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                    isBulkMode
                      ? 'bg-red-500 text-white'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {isBulkMode ? 'Annuler' : 'Sélectionner'}
                </button>
              )}

              <div className="flex border border-gray-200 rounded-xl overflow-hidden bg-white">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-red-500 text-white' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-red-500 text-white' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => { setLoading(true); fetchFavorites() }}
                className="p-2 bg-white rounded-xl hover:bg-gray-50 transition shadow-sm"
                title="Rafraîchir"
              >
                <RefreshCw className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Recherche et filtres */}
          {favorites.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher dans mes favoris..."
                  className="w-full pl-9 pr-10 py-2 bg-white/80 rounded-xl border border-white/50 focus:ring-2 focus:ring-red-400 focus:border-transparent text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 bg-white/80 rounded-xl border border-white/50 text-sm"
              >
                {getCategories().map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? '📁 Toutes les catégories' : cat}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 bg-white/80 rounded-xl border border-white/50 text-sm"
              >
                <option value="newest">🕐 Plus récents</option>
                <option value="oldest">📅 Plus anciens</option>
                <option value="price-low">💰 Prix croissant</option>
                <option value="price-high">💎 Prix décroissant</option>
                <option value="popular">🔥 Populaires</option>
              </select>
            </div>
          )}
        </div>

        {/* Barre suppression en masse */}
        <AnimatePresence>
          {isBulkMode && selectedItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-gradient-to-r from-red-50 to-pink-50 border-t border-red-200 px-4 py-3"
            >
              <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-3 text-sm text-red-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === favorites.length}
                    onChange={toggleSelectAll}
                    className="rounded border-red-300 text-red-500 focus:ring-red-400 w-4 h-4"
                  />
                  <span className="font-medium">
                    {selectedItems.length} favori{selectedItems.length > 1 ? 's' : ''} sélectionné{selectedItems.length > 1 ? 's' : ''}
                  </span>
                </label>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={removeSelected}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition text-sm font-medium shadow-lg"
                >
                  <Trash2 className="w-4 h-4" />
                  Tout supprimer
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sélecteur de produits à ajouter */}
        <AnimatePresence>
          {showProductSelector && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white border-t border-gray-200 overflow-hidden"
            >
              <div className="max-w-7xl mx-auto px-4 py-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-red-500" />
                    Produits à découvrir
                    <span className="text-sm text-gray-400 font-normal">
                      ({filteredProducts.length})
                    </span>
                  </h3>
                  <button
                    onClick={() => setShowProductSelector(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {loadingProducts ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">
                      {searchTerm ? 'Aucun produit trouvé' : 'Tous les produits sont dans vos favoris 🎉'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[60vh] overflow-y-auto pr-2">
                    {filteredProducts.map((product, idx) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        whileHover={{ y: -4 }}
                        className="group bg-white rounded-xl overflow-hidden hover:shadow-lg transition border border-gray-100"
                      >
                        <div className="relative aspect-square bg-gray-100">
                          <img
                            src={product.image || '/images/placeholder.png'}
                            alt={product.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                            onError={(e) => { e.currentTarget.src = '/images/placeholder.png' }}
                          />
                          {product.is_new && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold bg-blue-500 text-white rounded">
                              Nouveau
                            </span>
                          )}
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => addFavorite(product.id)}
                            disabled={addingId === product.id}
                            className="absolute top-2 right-2 p-2 bg-white/95 backdrop-blur rounded-full shadow-md hover:bg-red-50 transition disabled:opacity-50"
                          >
                            {addingId === product.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                            ) : (
                              <Heart className="w-4 h-4 text-gray-400 hover:text-red-500 transition" />
                            )}
                          </motion.button>
                        </div>
                        <div className="p-3">
                          <h4 className="text-sm font-medium text-gray-800 line-clamp-2 min-h-[36px]">
                            {product.title}
                          </h4>
                          <p className="text-xs text-gray-500 mt-0.5">{product.category_name}</p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-sm font-bold text-gray-900">
                              {formatPrice(product.price)}
                            </p>
                            {product.avg_rating && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                {product.avg_rating.toFixed(1)}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* CONTENU PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Statistiques */}
        {stats.total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50">
              <Heart className="w-5 h-5 text-red-500 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Favoris</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50">
              <ShoppingBag className="w-5 h-5 text-blue-500 mb-2" />
              <p className="text-xl font-bold text-gray-900">{formatPrice(stats.totalValue)}</p>
              <p className="text-sm text-gray-500">Valeur totale</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50">
              <TrendingUp className="w-5 h-5 text-emerald-500 mb-2" />
              <p className="text-xl font-bold text-gray-900">{formatPrice(Math.round(stats.avgPrice))}</p>
              <p className="text-sm text-gray-500">Prix moyen</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50">
              <Sparkles className="w-5 h-5 text-purple-500 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.categories}</p>
              <p className="text-sm text-gray-500">Catégories</p>
            </div>
          </motion.div>
        )}

        {/* Liste des favoris */}
        {filteredFavorites.length === 0 ? (
          <EmptyState onAdd={() => setShowProductSelector(true)} hasSearch={!!searchTerm} />
        ) : (
          <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'} gap-4 md:gap-6`}>
            <AnimatePresence>
              {filteredFavorites.map((item, index) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.04 }}
                  whileHover={viewMode === 'grid' ? { y: -6 } : { x: 4 }}
                  className={`group relative bg-white/90 backdrop-blur-sm rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/50 ${
                    viewMode === 'list' ? 'flex items-center gap-4 p-4' : ''
                  } ${selectedItems.includes(item.product_id) ? 'ring-2 ring-red-500 ring-offset-2' : ''}`}
                >
                  {/* Checkbox sélection */}
                  {isBulkMode && (
                    <div className="absolute top-3 left-3 z-20">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.product_id)}
                        onChange={() => toggleSelect(item.product_id)}
                        className="w-5 h-5 rounded border-red-300 text-red-500 focus:ring-red-400"
                      />
                    </div>
                  )}

                  {/* Image */}
                  <Link href={`/product/${item.slug}`} className={viewMode === 'list' ? 'flex-shrink-0' : ''}>
                    <div className={`relative overflow-hidden ${viewMode === 'list' ? 'w-32 h-32 rounded-xl' : 'w-full h-56'}`}>
                      <img
                        src={item.image || '/images/placeholder.png'}
                        alt={item.title}
                        className="w-full h-full object-cover transition duration-700 group-hover:scale-110"
                        onError={(e) => { e.currentTarget.src = '/images/placeholder.png' }}
                      />

                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                        {item.badge && (
                          <span className="px-2 py-1 text-xs font-bold bg-gradient-to-r from-amber-400 to-yellow-500 text-white rounded-lg shadow-lg">
                            {item.badge}
                          </span>
                        )}
                        {!item.in_stock && (
                          <span className="px-2 py-1 text-xs font-bold bg-gray-700 text-white rounded-lg">
                            Rupture
                          </span>
                        )}
                      </div>

                      {item.compare_price && (
                        <span className="absolute top-3 right-3 px-2 py-1 text-xs font-bold bg-red-500 text-white rounded-lg shadow-lg animate-pulse">
                          -{Math.round((1 - item.price / item.compare_price) * 100)}%
                        </span>
                      )}

                      {/* Overlay hover actions */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-end pb-4 gap-2">
                        <div className="flex gap-2">
                          <motion.button
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => { e.preventDefault(); addToCart(item) }}
                            disabled={addingToCartId === item.product_id || !item.in_stock}
                            className="p-2.5 bg-white rounded-full shadow-lg hover:bg-emerald-50 transition disabled:opacity-50"
                            title="Ajouter au panier"
                          >
                            {addingToCartId === item.product_id ? (
                              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                            ) : (
                              <ShoppingCart className="w-5 h-5 text-emerald-600" />
                            )}
                          </motion.button>
                          <Link
                            href={`/product/${item.slug}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-2.5 bg-white rounded-full shadow-lg hover:bg-blue-50 transition"
                            title="Voir le produit"
                          >
                            <Eye className="w-5 h-5 text-blue-600" />
                          </Link>
                          <motion.button
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => { e.preventDefault(); removeFavorite(item.product_id) }}
                            className="p-2.5 bg-white rounded-full shadow-lg hover:bg-red-50 transition"
                            title="Retirer des favoris"
                          >
                            <HeartOff className="w-5 h-5 text-red-600" />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Contenu */}
                  <div className={`${viewMode === 'list' ? 'flex-1 min-w-0' : 'p-4'}`}>
                    <Link href={`/product/${item.slug}`}>
                      <h3 className="font-semibold text-gray-900 hover:text-red-500 transition line-clamp-2 min-h-[44px]">
                        {item.title}
                      </h3>
                    </Link>

                    {item.category && (
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {item.category}
                      </p>
                    )}

                    <div className="flex items-baseline gap-2 mt-2">
                      <p className="text-xl font-bold text-gray-900">
                        {formatPrice(item.price)}
                      </p>
                      {item.compare_price && (
                        <p className="text-sm text-gray-400 line-through">
                          {formatPrice(item.compare_price)}
                        </p>
                      )}
                    </div>

                    {/* Notes / ventes / date */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                      {item.avg_rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium text-gray-700">{item.avg_rating.toFixed(1)}</span>
                        </div>
                      )}
                      {item.sales_count && (
                        <div className="flex items-center gap-1">
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>{item.sales_count} vendus</span>
                        </div>
                      )}
                      {item.favorited_at && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatDate(item.favorited_at)}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions principales */}
                    {!isBulkMode && (
                      <div className={`flex items-center gap-2 mt-3 ${viewMode === 'list' ? '' : 'pt-3 border-t border-gray-100'}`}>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => addToCart(item)}
                          disabled={addingToCartId === item.product_id || !item.in_stock}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-xl transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-red-500/20"
                        >
                          {addingToCartId === item.product_id ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Ajout...</>
                          ) : !item.in_stock ? (
                            <><AlertCircle className="w-4 h-4" /> Rupture</>
                          ) : (
                            <><ShoppingCart className="w-4 h-4" /> Ajouter au panier</>
                          )}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => removeFavorite(item.product_id)}
                          disabled={removingId === item.product_id}
                          className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition disabled:opacity-50"
                          title="Retirer des favoris"
                        >
                          {removingId === item.product_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </motion.button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  )
}