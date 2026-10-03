// app/admin/products/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Package,
  ChevronLeft,
  ChevronRight,
  Download,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  LayoutDashboard,
} from 'lucide-react'

interface Product {
  id: string
  title: string
  slug: string
  description: string
  price: number
  compare_price: number | null
  stock: number
  category_id: number | null
  category_name: string | null
  status: 'draft' | 'published' | 'archived'
  type: string
  featured: number
  file_path: string | null
  sales_count: number
  sku: string | null
  created_at: string
  creator_name: string | null
  main_image?: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

// ============================================================
// Types de réponses API
// ============================================================
interface ProductsListResponse {
  products?: Product[]
  data?: Product[]
  pagination?: Pagination
  total?: number
  error?: string
}

interface ProductStatusResponse {
  success?: boolean
  error?: string
  message?: string
  product?: {
    id?: string
    title?: string
    status?: string
  }
}

interface ProductDeleteResponse {
  success?: boolean
  error?: string
  message?: string
}

const PRODUCT_TYPES = [
  { value: 'all', label: 'Tous les types' },
  { value: 'file', label: 'Fichier' },
  { value: 'license', label: 'Licence' },
  { value: 'subscription', label: 'Abonnement' },
  { value: 'group_access', label: 'Accès groupe' },
  { value: 'course', label: 'Formation' },
  { value: 'event', label: 'Événement' },
  { value: 'credits', label: 'Crédits' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'custom', label: 'Personnalisé' },
  { value: 'survey', label: 'Questionnaire' },
  { value: 'streaming', label: 'Streaming' },
  { value: 'affiliate', label: 'Affiliation' },
  { value: 'certificate', label: 'Certificat' },
  { value: 'data', label: 'Données' },
  { value: 'ia_generation', label: 'IA Génération' },
]

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'published' | 'archived'>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isChangingStatus, setIsChangingStatus] = useState<string | null>(null)

  // --- Fonction de récupération avec cache désactivé ---
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.set('page', String(currentPage))
      params.set('limit', '10')
      if (search.trim()) params.set('search', search.trim())
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (filterType !== 'all') params.set('type', filterType)

      const res = await fetch(`/api/admin/products?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      })

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/admin/login')
          return
        }
        const data = (await res.json().catch(() => ({}))) as ProductsListResponse
        throw new Error(data.error || `Erreur ${res.status}`)
      }

      const data = (await res.json()) as ProductsListResponse
      console.log('📦 Données reçues de /api/admin/products :', data)

      // Normalisation des données
      let productsData: Product[] = data.products || data.data || []
      if (!Array.isArray(productsData)) {
        productsData = []
      }

      setProducts(productsData)

      if (data.pagination) {
        setPagination(data.pagination)
      } else {
        const total = data.total ?? productsData.length
        const totalPages = Math.max(1, Math.ceil(total / 10))
        setPagination({
          page: currentPage,
          limit: 10,
          total,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
        })
      }
    } catch (err: unknown) {
      console.error('❌ Erreur fetchProducts :', err)
      setError(err instanceof Error ? err.message : 'Impossible de récupérer les produits')
    } finally {
      setLoading(false)
    }
  }, [currentPage, search, filterStatus, filterType, router])

  // Chargement initial
  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // 🔄 Rafraîchissement automatique au retour sur la page
  useEffect(() => {
    const refresh = () => {
      console.log('🔄 Rafraîchissement automatique des produits')
      fetchProducts()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    const handleFocus = () => refresh()
    const handlePageShow = () => refresh()

    window.addEventListener('focus', handleFocus)
    window.addEventListener('pageshow', handlePageShow)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('pageshow', handlePageShow)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchProducts])

  // --- Changement de statut (avec rechargement fiable) ---
  const changeStatus = async (
    id: string,
    newStatus: 'draft' | 'published' | 'archived'
  ) => {
    try {
      setIsChangingStatus(id)
      setError(null)
      setSuccessMessage(null)

      console.log(`🔄 Changement statut produit #${id} → ${newStatus}`)

      const res = await fetch(`/api/admin/products/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({ status: newStatus }),
      })

      const data = (await res.json()) as ProductStatusResponse

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Erreur changement de statut')
      }

      const productTitle = data.product?.title || products.find(p => p.id === id)?.title || 'Produit'

      // Rechargement complet depuis le backend (source de vérité)
      await fetchProducts()

      if (newStatus === 'published') {
        setSuccessMessage(`✅ "${productTitle}" a été publié avec succès`)
      } else if (newStatus === 'draft') {
        setSuccessMessage(`📦 "${productTitle}" a été dépublié avec succès`)
      } else {
        setSuccessMessage(`🗄️ "${productTitle}" a été archivé avec succès`)
      }

      setTimeout(() => setSuccessMessage(null), 3500)
    } catch (err: unknown) {
      console.error('❌ Erreur changement statut :', err)
      // En cas d'erreur, on resynchronise pour éviter tout décalage
      await fetchProducts()
      setError(err instanceof Error ? err.message : 'Erreur lors du changement de statut')
      setTimeout(() => setError(null), 5000)
    } finally {
      setIsChangingStatus(null)
    }
  }

  // --- Suppression avec mise à jour instantanée ET rechargement ---
  const deleteProduct = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce produit ? Cette action est irréversible.')) return

    try {
      setIsDeleting(id)
      setError(null)
      setSuccessMessage(null)

      console.log(`🗑️ Suppression du produit #${id}`)

      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })

      const data = (await res.json()) as ProductDeleteResponse

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Erreur lors de la suppression')
      }

      // Suppression immédiate de l'UI
      setProducts(prev => prev.filter(p => p.id !== id))

      // Rechargement pour synchroniser pagination, etc.
      await fetchProducts()

      setSuccessMessage(data.message || '🗑️ Produit supprimé avec succès')
      setTimeout(() => setSuccessMessage(null), 3500)
    } catch (err: unknown) {
      console.error('❌ Erreur suppression :', err)
      // On resynchronise pour ne pas rester dans un état incohérent
      await fetchProducts()
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
      setTimeout(() => setError(null), 5000)
    } finally {
      setIsDeleting(null)
    }
  }

  // --- Affichage du badge de statut ---
  const getStatusBadge = (status: string) => {
    const config = {
      draft: {
        label: 'Brouillon',
        className: 'bg-gray-100 text-gray-600 border-gray-200',
        icon: XCircle,
      },
      published: {
        label: 'Publié',
        className: 'bg-green-100 text-green-700 border-green-200',
        icon: CheckCircle,
      },
      archived: {
        label: 'Archivé',
        className: 'bg-red-100 text-red-700 border-red-200',
        icon: AlertCircle,
      },
    }
    const { label, className, icon: Icon } = config[status as keyof typeof config] || config.draft
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${className}`}>
        <Icon size={14} />
        {label}
      </span>
    )
  }

  const getTypeLabel = (type: string) => {
    const found = PRODUCT_TYPES.find(t => t.value === type)
    return found ? found.label : type
  }

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-blue-500 animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Chargement des produits...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {successMessage && (
        <div className="fixed top-5 right-5 z-[100] animate-in slide-in-from-right duration-300">
          <div className="flex items-center gap-3 bg-white border border-green-200 shadow-xl rounded-xl px-5 py-4 min-w-[320px]">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
              <CheckCircle size={22} className="text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Opération réussie</p>
              <p className="text-sm text-gray-600">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="ml-auto text-gray-400 hover:text-gray-600 text-xl font-bold"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Retour au tableau de bord"
          >
            <LayoutDashboard size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Catalogue</h1>
            <p className="text-gray-500 text-sm">
              {pagination?.total || 0} produit(s) au total
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push('/admin/products/new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-sm"
        >
          <Plus size={18} />
          Ajouter un produit
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <AlertCircle size={18} />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => fetchProducts()}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
          >
            Réessayer
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher un produit (titre, description, SKU)..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value as 'all' | 'draft' | 'published' | 'archived')
            setCurrentPage(1)
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">Tous les statuts</option>
          <option value="published">Publiés</option>
          <option value="draft">Brouillons</option>
          <option value="archived">Archivés</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value)
            setCurrentPage(1)
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {PRODUCT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => {}}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-600"
        >
          <Download size={18} />
          Exporter CSV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Produit</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Prix</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Ventes</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <Package className="mx-auto mb-3 text-gray-300" size={40} />
                    <p className="text-lg font-medium text-gray-600">Aucun produit trouvé</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Essayez de modifier vos filtres ou créez un nouveau produit.
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push('/admin/products/new')}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Créer mon premier produit
                    </button>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      {product.main_image ? (
                        <img
                          src={product.main_image}
                          alt={product.title}
                          className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                          <ImageIcon size={20} />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{product.title}</div>
                      <div className="text-xs text-gray-400">
                        SKU: {product.sku || 'N/A'}
                        {product.slug && <span className="ml-2">/produit/{product.slug}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">{getTypeLabel(product.type)}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {product.price.toLocaleString()} FCFA
                      {product.compare_price && (
                        <span className="text-sm text-gray-400 line-through ml-2">
                          {product.compare_price.toLocaleString()} FCFA
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.stock > 10
                            ? 'bg-green-100 text-green-700'
                            : product.stock > 0
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {product.stock} unités
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">{product.sales_count || 0}</td>
                    <td className="px-6 py-4">{getStatusBadge(product.status)}</td>
                    <td className="px-6 py-4">
                      <div className="relative z-10 flex items-center justify-end gap-1">
                        {product.status !== 'archived' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              const newStatus = product.status === 'published' ? 'draft' : 'published'
                              changeStatus(product.id, newStatus)
                            }}
                            disabled={isChangingStatus === product.id}
                            className={`p-2 rounded-lg transition ${
                              isChangingStatus === product.id
                                ? 'opacity-50 cursor-not-allowed'
                                : product.status === 'published'
                                ? 'text-yellow-600 hover:bg-yellow-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={
                              isChangingStatus === product.id
                                ? 'Modification en cours...'
                                : product.status === 'published'
                                ? 'Dépublier'
                                : 'Publier'
                            }
                          >
                            {isChangingStatus === product.id ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : product.status === 'published' ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Modifier"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteProduct(product.id)}
                          disabled={isDeleting === product.id}
                          className={`p-2 text-red-600 hover:bg-red-50 rounded-lg transition ${
                            isDeleting === product.id ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          title="Supprimer"
                        >
                          {isDeleting === product.id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrev}
              className="flex items-center gap-1 px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
            >
              <ChevronLeft size={16} />
              Précédent
            </button>
            <span className="text-sm text-gray-600">
              Page {pagination.page} sur {pagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={!pagination.hasNext}
              className="flex items-center gap-1 px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
            >
              Suivant
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}