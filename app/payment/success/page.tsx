// app/payment/success/page.tsx
'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Download, FileText, Package, ArrowLeft, Loader2 } from 'lucide-react'

// ⚠️ Force le rendu dynamique → évite l'erreur useSearchParams au build
export const dynamic = 'force-dynamic'

interface OrderDetail {
  id: number
  order_number: string
  total: number
  currency: string
  status: string
  payment_status: string
  payment_method: string
  download_token?: string | null
  download_expires_at?: string | null
  product_title?: string
  created_at: string
}

interface OrderApiResponse {
  order?: OrderDetail
  error?: string
  message?: string
}

function PaymentSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get('order')
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orderNumber) {
      fetchOrderDetails()
    } else {
      router.push('/avant')
    }
  }, [orderNumber])

  const fetchOrderDetails = async () => {
    try {
      const token = localStorage.getItem('token')

      // ✅ URL relative → marche en local ET en production
      const response = await fetch(`/api/orders/${orderNumber}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })

      if (response.ok) {
        const data = (await response.json()) as OrderApiResponse
        setOrder(data.order ?? null)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-blue-50 p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-lg w-full bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/50 text-center">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900">✅ Paiement réussi !</h1>
        <p className="text-gray-500 mt-2">
          Votre commande <span className="font-semibold text-gray-700">#{orderNumber}</span> a été confirmée
        </p>

        <div className="mt-6 p-4 bg-gray-50 rounded-xl text-left">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total</span>
            <span className="font-bold text-gray-900">{order?.total?.toLocaleString()} FCFA</span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-gray-500">Statut</span>
            <span className="text-green-600 font-semibold">Payé</span>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          {order?.download_token && (
            <Link
              href={`/api/download/${order.download_token}`}
              className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-semibold hover:shadow-lg transition"
            >
              <Download className="w-5 h-5" />
              Télécharger le produit
            </Link>
          )}

          <Link
            href="/orders"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition"
          >
            <Package className="w-5 h-5" />
            Voir mes commandes
          </Link>

          <Link
            href="/invoices"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition"
          >
            <FileText className="w-5 h-5" />
            Voir ma facture
          </Link>

          <Link
            href="/avant"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 text-blue-600 hover:text-blue-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Continuer les achats
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}