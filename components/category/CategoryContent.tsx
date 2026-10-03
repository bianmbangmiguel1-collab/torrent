// components/category/CategoryContent.tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  SlidersHorizontal,
  Grid3x3,
  List,
  Star,
  Heart,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Clock,
  DollarSign,
  X,
  ChevronDown,
  Package,
  Flame,
} from 'lucide-react'

// ============================================================
// TYPES
// ============================================================

interface Product {
  id: number
  title: string
  slug: string
  price: number
  compare_price?: number | null
  image?: string | null
  category_id: number
  description?: string | null
  avg_rating?: number
  total_reviews?: number
  sales?: number
  stock?: number
  is_new?: boolean
  is_featured?: boolean
  created_at?: string | null
}

type SortOption = 'popular' | 'recent' | 'price-asc' | 'price-desc' | 'rating'
type ViewMode = 'grid' | 'list'

interface CategoryContentProps {
  categoryName: string
  products: Product[]
}

// ============================================================
// HELPERS
// ============================================================

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(price) + ' FCFA'
}

function getDiscountPercent(product: Product): number | null {
  if (!product.compare_price || product.compare_price <= product.price) return null
  return Math.round((1 - product.price / product.compare_price) * 100)
}

function isNewProduct(product: Product): boolean {
  if (product.is_new) return true
  if (!product.created_at) return false
  const days = 7
  const date = new Date(product.created_at)
  const diff = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
  return diff < days
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function CategoryContent({
  categoryName,
  products,
}: CategoryContentProps) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('popular')
  const [view, setView] = useState<ViewMode>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null)
  const [onlyNew, setOnlyNew] = useState(false)
  const [onlyPromo, setOnlyPromo] = useState(false)
  const [onlyStock, setOnlyStock] = useState(false)

  // Calculer les bornes de prix
  const priceBounds = useMemo(() => {
    if (products.length === 0) return [0, 0]
    const prices = products.map((p) => p.price)
    return [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))]
  }, [products])

  // Init priceRange
  useEffect(() => {
    if (priceBounds[0] !== priceBounds[1] && !priceRange) {
      setPriceRange([priceBounds[0], priceBounds[1]])
    }
  }, [priceBounds, priceRange])

  // ============================================================
  // FILTRAGE + TRI
  // ============================================================
  const filteredProducts = useMemo(() => {
    let list = [...products]

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q)
      )
    }

    // Prix
    if (priceRange) {
      list = list.filter(
        (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
      )
    }

    // Nouveau
    if (onlyNew) {
      list = list.filter((p) => isNewProduct(p))
    }

    // Promo
    if (onlyPromo) {
      list = list.filter((p) => getDiscountPercent(p) !== null)
    }

    // En stock
    if (onlyStock) {
      list = list.filter((p) => (p.stock || 0) > 0)
    }

    // Tri
    switch (sort) {
      case 'recent':
        list.sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
        )
        break
      case 'price-asc':
        list.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        list.sort((a, b) => b.price - a.price)
        break
      case 'rating':
        list.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0))
        break
      case 'popular':
      default:
        list.sort((a, b) => (b.sales || 0) - (a.sales || 0))
        break
    }

    return list
  }, [products, search, sort, priceRange, onlyNew, onlyPromo, onlyStock])

  // Compteur de filtres actifs
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (onlyNew) count++
    if (onlyPromo) count++
    if (onlyStock) count++
    if (priceRange && (priceRange[0] !== priceBounds[0] || priceRange[1] !== priceBounds[1]))
      count++
    return count
  }, [onlyNew, onlyPromo, onlyStock, priceRange, priceBounds])

  const resetFilters = () => {
    setSearch('')
    setOnlyNew(false)
    setOnlyPromo(false)
    setOnlyStock(false)
    setPriceRange([priceBounds[0], priceBounds[1]])
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <section>
      {/* ============================================================
          🎛️ TOOLBAR
      ============================================================ */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Rechercher dans ${categoryName}...`}
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="appearance-none pl-10 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer min-w-[180px]"
            >
              <option value="popular">🔥 Populaires</option>
              <option value="recent">🆕 Plus récents</option>
              <option value="rating">⭐ Mieux notés</option>
              <option value="price-asc">💰 Prix croissant</option>
              <option value="price-desc">💎 Prix décroissant</option>
            </select>
            <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* View toggle */}
          <div className="hidden lg:flex bg-gray-50 border border-gray-200 rounded-xl p-1">
            <button
              onClick={() => setView('grid')}
              className={`p-2 rounded-lg transition ${
                view === 'grid'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              aria-label="Vue grille"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-lg transition ${
                view === 'list'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              aria-label="Vue liste"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Filters button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl border font-medium text-sm transition ${
              showFilters || activeFiltersCount > 0
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtres
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Filtres avancés */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4 items-center">
                {/* Checkboxes */}
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={onlyNew}
                    onChange={(e) => setOnlyNew(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    🆕 Nouveautés
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={onlyPromo}
                    onChange={(e) => setOnlyPromo(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    🔥 En promo
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={onlyStock}
                    onChange={(e) => setOnlyStock(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    ✅ En stock
                  </span>
                </label>

                {/* Prix */}
                {priceBounds[0] !== priceBounds[1] && priceRange && (
                  <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatPrice(priceRange[0])}
                    </span>
                    <input
                      type="range"
                      min={priceBounds[0]}
                      max={priceBounds[1]}
                      value={priceRange[1]}
                      onChange={(e) =>
                        setPriceRange([priceRange[0], Number(e.target.value)])
                      }
                      className="flex-1 accent-indigo-600"
                    />
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatPrice(priceRange[1])}
                    </span>
                  </div>
                )}

                {/* Reset */}
                {activeFiltersCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="ml-auto text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Réinitialiser
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ============================================================
          📊 RÉSULTAT COUNT
      ============================================================ */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="text-sm text-gray-600">
          <strong className="text-gray-900">{filteredProducts.length}</strong>{' '}
          produit{filteredProducts.length > 1 ? 's' : ''}
          {search && (
            <>
              {' '}
              pour <em>"{search}"</em>
            </>
          )}
        </p>

        {/* Tags de filtres actifs */}
        {(onlyNew || onlyPromo || onlyStock) && (
          <div className="flex gap-2 flex-wrap">
            {onlyNew && (
              <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-full">
                🆕 Nouveautés
              </span>
            )}
            {onlyPromo && (
              <span className="px-2.5 py-1 bg-red-50 border border-red-200 text-red-700 text-xs rounded-full">
                🔥 Promo
              </span>
            )}
            {onlyStock && (
              <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-full">
                ✅ En stock
              </span>
            )}
          </div>
        )}
      </div>

      {/* ============================================================
          🛍️ GRILLE / LISTE
      ============================================================ */}
      {filteredProducts.length === 0 ? (
        <EmptyState onReset={resetFilters} hasFilters={activeFiltersCount > 0} />
      ) : (
        <div
          className={
            view === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5'
              : 'flex flex-col gap-4'
          }
        >
          <AnimatePresence>
            {filteredProducts.map((product, idx) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: Math.min(idx * 0.03, 0.3) }}
              >
                {view === 'grid' ? (
                  <ProductCardGrid product={product} />
                ) : (
                  <ProductCardList product={product} />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  )
}

// ============================================================
// 🎴 PRODUCT CARD — GRID
// ============================================================

function ProductCardGrid({ product }: { product: Product }) {
  const discount = getDiscountPercent(product)
  const isNew = isNewProduct(product)
  const inStock = (product.stock || 0) > 0
  const [liked, setLiked] = useState(false)
  const [added, setAdded] = useState(false)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
    // TODO: call /api/cart/add
  }

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLiked(!liked)
    // TODO: call /api/users/favorites
  }

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block h-full bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
    >
      {/* Image */}
      <div className="aspect-square relative bg-gradient-to-br from-gray-100 to-gray-50 overflow-hidden">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-6xl text-gray-300">
            <Package className="w-16 h-16" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {discount && (
            <span className="px-2 py-1 bg-gradient-to-r from-red-500 to-rose-500 text-white text-[11px] font-bold rounded-lg shadow-lg">
              -{discount}%
            </span>
          )}
          {isNew && (
            <span className="px-2 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[11px] font-bold rounded-lg shadow-lg flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Nouveau
            </span>
          )}
          {product.is_featured && (
            <span className="px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-bold rounded-lg shadow-lg flex items-center gap-1">
              <Flame className="w-3 h-3" />
              Top
            </span>
          )}
        </div>

        {/* Quick actions */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleLike}
            className={`p-2 rounded-full backdrop-blur-md shadow-md transition ${
              liked
                ? 'bg-red-500 text-white'
                : 'bg-white/90 text-gray-700 hover:bg-red-50 hover:text-red-500'
            }`}
            aria-label="Ajouter aux favoris"
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={handleAddToCart}
            className={`p-2 rounded-full backdrop-blur-md shadow-md transition ${
              added
                ? 'bg-emerald-500 text-white'
                : 'bg-white/90 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'
            }`}
            aria-label="Ajouter au panier"
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
        </div>

        {/* Stock badge */}
        {!inStock && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <span className="px-3 py-1.5 bg-white text-gray-900 text-xs font-bold rounded-full">
              Rupture de stock
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-indigo-600 transition min-h-[2.5rem]">
          {product.title}
        </h3>

        {/* Note */}
        {(product.avg_rating || 0) > 0 && (
          <div className="flex items-center gap-1 mt-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < Math.round(product.avg_rating || 0)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500">
              ({product.total_reviews || 0})
            </span>
          </div>
        )}

        {/* Prix */}
        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-lg font-bold text-gray-900">
            {formatPrice(product.price)}
          </span>
          {product.compare_price && product.compare_price > product.price && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(product.compare_price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

// ============================================================
// 🎴 PRODUCT CARD — LIST
// ============================================================

function ProductCardList({ product }: { product: Product }) {
  const discount = getDiscountPercent(product)
  const isNew = isNewProduct(product)
  const inStock = (product.stock || 0) > 0

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex gap-4 bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all p-4"
    >
      {/* Image */}
      <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl overflow-hidden">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.title}
            fill
            sizes="160px"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="w-10 h-10 text-gray-300" />
          </div>
        )}
        {discount && (
          <span className="absolute top-2 left-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-lg">
            -{discount}%
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition line-clamp-2">
            {product.title}
          </h3>
          {isNew && (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full whitespace-nowrap">
              Nouveau
            </span>
          )}
        </div>

        {product.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-2">
            {product.description.replace(/<[^>]*>/g, '').slice(0, 150)}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            {(product.avg_rating || 0) > 0 && (
              <div className="flex items-center gap-1 mb-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs text-gray-600 font-medium">
                  {product.avg_rating}
                </span>
                <span className="text-xs text-gray-400">
                  ({product.total_reviews})
                </span>
              </div>
            )}
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-gray-900">
                {formatPrice(product.price)}
              </span>
              {product.compare_price && product.compare_price > product.price && (
                <span className="text-sm text-gray-400 line-through">
                  {formatPrice(product.compare_price)}
                </span>
              )}
            </div>
          </div>

          <button
            className={`px-4 py-2 rounded-xl font-medium text-sm transition ${
              inStock
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            disabled={!inStock}
          >
            {inStock ? 'Voir le produit' : 'Indisponible'}
          </button>
        </div>
      </div>
    </Link>
  )
}

// ============================================================
// 📭 EMPTY STATE
// ============================================================

function EmptyState({
  onReset,
  hasFilters,
}: {
  onReset: () => void
  hasFilters: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300"
    >
      <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mb-5">
        <Search className="w-9 h-9 text-indigo-500" />
      </div>

      <h3 className="text-xl font-bold text-gray-900 mb-2">
        {hasFilters ? 'Aucun produit ne correspond' : 'Aucun produit pour l\'instant'}
      </h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto px-4">
        {hasFilters
          ? 'Essayez d\'ajuster vos filtres ou votre recherche.'
          : 'Nous ajoutons régulièrement du nouveau contenu. Revenez bientôt !'}
      </p>

      {hasFilters && (
        <button
          onClick={onReset}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition inline-flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Réinitialiser les filtres
        </button>
      )}
    </motion.div>
  )
}