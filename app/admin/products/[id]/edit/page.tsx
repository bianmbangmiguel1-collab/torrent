// app/admin/products/[id]/edit/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ProductForm from '@/components/admin/ProductForm'
import { Loader2, AlertCircle, ArrowLeft, Package } from 'lucide-react'

// ============================================================
// Types
// ============================================================
interface Product {
  id: string | number
  title: string
  status?: 'published' | 'draft' | 'archived' | string
  [key: string]: unknown
}

interface ProductResponse {
  product?: Product
  error?: string
}

export default function EditProductPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  // Récupère l'ID depuis les paramètres de l'URL
  const id = params?.id as string

  console.log('🔍 ID depuis useParams :', id)
  console.log('🔍 Type :', typeof id)

  useEffect(() => {
    if (!id) {
      console.warn('⚠️ Aucun ID de produit fourni')
      setNotFound(true)
      setLoading(false)
      return
    }

    const fetchProduct = async () => {
      try {
        setLoading(true)
        setError(null)
        setNotFound(false)

        console.log(`🔍 Récupération du produit ID: ${id}`)
        console.log(`🔍 URL complète : /api/admin/products/${id}`)

        const res = await fetch(`/api/admin/products/${id}`, {
          credentials: 'include',
        })

        console.log(`📡 Réponse API: ${res.status}`)

        if (res.status === 401) {
          router.replace('/admin/login')
          return
        }

        if (res.status === 404) {
          console.warn(`❌ Produit ${id} non trouvé`)
          setNotFound(true)
          return
        }

        if (!res.ok) {
          const data = (await res.json()) as ProductResponse
          throw new Error(data.error || `Erreur ${res.status}`)
        }

        const data = (await res.json()) as ProductResponse
        console.log('📦 Données reçues :', data)

        const productData = data.product
        if (!productData || !productData.id) {
          console.warn('⚠️ Aucun produit dans la réponse')
          setNotFound(true)
          return
        }

        if (String(productData.id) !== String(id)) {
          console.warn(
            `⚠️ Incohérence d'ID : demandé ${id}, reçu ${productData.id}`
          )
        }

        setProduct(productData)
        console.log(`✅ Produit chargé : ${productData.title}`)
      } catch (err: any) {
        console.error('❌ Erreur chargement produit:', err)
        setError(err.message || 'Une erreur est survenue')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [id, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto" />
          <p className="mt-4 text-gray-500 font-medium">Chargement du produit...</p>
          <p className="text-sm text-gray-400 mt-1">ID: {id}</p>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-gray-100">
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center">
              <Package className="h-10 w-10 text-red-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Produit non trouvé</h2>
          <p className="text-gray-500 mb-6">
            Le produit que vous cherchez n'existe pas ou a été supprimé.
            <br />
            <span className="text-xs text-gray-400">ID: {id}</span>
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/admin/products')}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-sm hover:shadow flex items-center justify-center gap-2 mx-auto"
            >
              <ArrowLeft size={18} />
              Retour à la liste
            </button>
            <button
              onClick={() => {
                setNotFound(false)
                setLoading(true)
                const refetch = async () => {
                  try {
                    const res = await fetch(`/api/admin/products/${id}`, { credentials: 'include' })
                    if (res.ok) {
                      const data = (await res.json()) as ProductResponse
                      const productData = data.product
                      if (productData?.id) {
                        setProduct(productData)
                        setNotFound(false)
                        setLoading(false)
                        return
                      }
                    }
                    setNotFound(true)
                    setLoading(false)
                  } catch {
                    setNotFound(true)
                    setLoading(false)
                  }
                }
                refetch()
              }}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition flex items-center justify-center gap-2 mx-auto"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-gray-100">
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Oups !</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-sm hover:shadow"
            >
              Réessayer
            </button>
            <button
              onClick={() => router.push('/admin/products')}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition flex items-center justify-center gap-2"
            >
              <ArrowLeft size={18} />
              Retour à la liste
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    setNotFound(true)
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/products')}
              className="p-2 hover:bg-gray-200 rounded-lg transition text-gray-600"
              title="Retour"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {product?.title ? `Modifier : ${product.title}` : 'Modifier le produit'}
              </h1>
              <p className="text-sm text-gray-500">
                ID: {id} • {product?.status === 'published' ? '🟢 Publié' : product?.status === 'draft' ? '🟡 Brouillon' : '🔴 Archivé'}
              </p>
            </div>
          </div>
        </div>

        <ProductForm product={product} />
      </div>
    </div>
  )
}