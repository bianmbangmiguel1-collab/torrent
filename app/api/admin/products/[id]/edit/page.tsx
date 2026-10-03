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
  status?: string
  [key: string]: unknown
}

interface ProductResponse {
  product?: Product
  error?: string
}

export default function EditProductPage() {
  const { id } = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true)
        setError(null)
        setNotFound(false)

        console.log(`🔍 Récupération du produit ID: ${id}`)

        // ✅ Utiliser credentials: 'include' pour envoyer le cookie HttpOnly admin_session
        const res = await fetch(`/api/admin/products/${id}`, {
          credentials: 'include',
        })

        console.log(`📡 Statut de la réponse: ${res.status}`)

        if (!res.ok) {
          if (res.status === 404) {
            setNotFound(true)
            throw new Error('Produit non trouvé')
          }
          if (res.status === 401) {
            console.warn('⛔ Non autorisé - redirection vers login')
            router.push('/admin/login')
            return
          }
          const data = (await res.json()) as ProductResponse
          throw new Error(data.error || 'Erreur lors du chargement')
        }

        const data = (await res.json()) as ProductResponse | Product
        console.log('📦 Données reçues:', data)

        // ✅ Support des deux formats de réponse
        const productData = (data as ProductResponse).product || (data as Product)

        if (!productData || !productData.id) {
          console.warn('⚠️ Aucun produit trouvé dans la réponse')
          setNotFound(true)
          throw new Error('Produit non trouvé')
        }

        console.log(`✅ Produit chargé: ${productData.title}`)
        setProduct(productData)
      } catch (err: any) {
        console.error('❌ Erreur chargement produit:', err)
        if (err.message === 'Produit non trouvé') {
          setNotFound(true)
        } else {
          setError(err.message || 'Une erreur est survenue')
        }
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchProduct()
    } else {
      console.warn('⚠️ ID du produit manquant')
      setError('ID du produit manquant')
      setLoading(false)
    }
  }, [id, router])

  // États de chargement
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

  // Produit non trouvé
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
          <button
            onClick={() => router.push('/admin/products')}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-sm hover:shadow flex items-center justify-center gap-2 mx-auto"
          >
            <ArrowLeft size={18} />
            Retour à la liste
          </button>
        </div>
      </div>
    )
  }

  // Erreur
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

  // Affichage du formulaire
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