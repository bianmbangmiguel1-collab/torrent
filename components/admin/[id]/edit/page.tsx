// app/admin/products/[id]/edit/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ProductForm from '@/components/admin/ProductForm'
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react'

interface ProductResponse {
  product?: any
  error?: string
  message?: string
}

export default function EditProductPage() {
  const { id } = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true)
        setError(null)

        const token = localStorage.getItem('token')
        if (!token) {
          router.push('/admin/login')
          return
        }

        const res = await fetch(`/api/admin/products/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Produit non trouvé')
          }
          if (res.status === 401) {
            router.push('/admin/login')
            return
          }
          throw new Error('Erreur lors du chargement du produit')
        }

        const data = (await res.json()) as ProductResponse
        setProduct(data.product ?? null)
      } catch (err: any) {
        setError(err.message || 'Une erreur est survenue')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchProduct()
    }
  }, [id, router])

  // Gestion du chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-blue-500 animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Chargement du produit...</p>
        </div>
      </div>
    )
  }

  // Gestion de l'erreur
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Oups !</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Réessayer
            </button>
            <button
              onClick={() => router.push('/admin/products')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-2"
            >
              <ArrowLeft size={18} />
              Retour à la liste
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Cas où le produit n'existe pas
  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Produit non trouvé</h2>
          <p className="text-gray-600 mb-6">Le produit que vous cherchez n'existe pas ou a été supprimé.</p>
          <button
            onClick={() => router.push('/admin/products')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Retour à la liste
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ProductForm product={product} />
    </div>
  )
}