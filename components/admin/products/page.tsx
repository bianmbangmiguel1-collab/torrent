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
  Loader2
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
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface ProductsResponse {
  products?: Product[]
  pagination?: Pagination | null
  error?: string
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
  { value: 'ia_generation', label: 'IA Génération' }
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
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/admin/login')
        return
      }

      const params = new URLSearchParams({
        page: String(currentPage),
        limit: '10',
        search,
        status: filterStatus === 'all' ? '' : filterStatus,
        type: filterType === 'all' ? '' : filterType
      })

      const res = await fetch(`/api/admin/products?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/admin/login')
          return
        }
        const data = (await res.json()) as ProductsResponse
        throw new Error(data.error || 'Erreur de chargement')
      }

      const data = (await res.json()) as ProductsResponse
      setProducts(data.products || [])
      setPagination(data.pagination || null)
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }, [currentPage, search, filterStatus, filterType, router])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const changeStatus = async (id: string, newStatus: 'draft' | 'published' | 'archived') => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/admin/products/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        fetchProducts()
      } else {
        const data = (await res.json()) as ProductsResponse
        alert(data.error || 'Erreur lors du changement de statut')
      }
    } catch (err) {
      alert('Erreur réseau')
    }
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce produit ? Cette action est irréversible.')) return

    try {
      setIsDeleting(id)
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        fetchProducts()
      } else {
        const data = (await res.json()) as ProductsResponse
        alert(data.error || 'Erreur lors de la suppression')
      }
    } catch (err) {
      alert('Erreur réseau')
    } finally {
      setIsDeleting(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      draft: {
        label: 'Brouillon',
        className: 'bg-gray-100 text-gray-600 border-gray-200',
        icon: XCircle
      },
      published: {
        label: 'Publié',
        className: 'bg-green-100 text-green-700 border-green-200',
        icon: CheckCircle
      },
      archived: {
        label: 'Archivé',
        className: 'bg-red-100 text-red-700 border-red-200',
        icon: AlertCircle
      }
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
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Catalogue</h1>
          <p className="text-gray-500 text-sm">
            {pagination?.total || 0} produit(s) au total
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/products/new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-sm"
        >
          <Plus size={18} />
          Ajouter un produit
        </button>
      </div>

      {/* Erreur */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <AlertCircle size={18} />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => fetchProducts()}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Filtres et recherche */}
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
            setFilterStatus(e.target.value as any)
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
          {PRODUCT_TYPES.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>

        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-600">
          <Download size={18} />
          Exporter CSV
        </button>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
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
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <Package className="mx-auto mb-3 text-gray-300" size={40} />
                    <p className="text-lg font-medium text-gray-600">Aucun produit trouvé</p>
                    <p className="text-sm text-gray-400 mt-1">Essayez de modifier vos filtres ou créez un nouveau produit.</p>
                    <button
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
                      <div className="font-medium text-gray-900">{product.title}</div>
                      <div className="text-xs text-gray-400">
                        SKU: {product.sku || 'N/A'}
                        {product.slug && (
                          <span className="ml-2">/produit/{product.slug}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {getTypeLabel(product.type)}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {product.price.toLocaleString()} FCFA
                      {product.compare_price && (
                        <span className="text-sm text-gray-400 line-through ml-2">
                          {product.compare_price.toLocaleString()} FCFA
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.stock > 10 ? 'bg-green-100 text-green-700' :
                        product.stock > 0 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {product.stock} unités
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {product.sales_count || 0}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(product.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {/* Publier/Dépublier */}
                        {product.status !== 'archived' && (
                          <button
                            onClick={() => changeStatus(
                              product.id,
                              product.status === 'published' ? 'draft' : 'published'
                            )}
                            className={`p-2 rounded-lg transition ${
                              product.status === 'published'
                                ? 'text-yellow-600 hover:bg-yellow-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={product.status === 'published' ? 'Dépublier' : 'Publier'}
                          >
                            {product.status === 'published' ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        )}

                        {/* Modifier */}
                        <button
                          onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Modifier"
                        >
                          <Edit2 size={18} />
                        </button>

                        {/* Supprimer */}
                        <button
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

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
              onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
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