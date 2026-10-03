// app/payment/page.tsx
'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, CreditCard, Smartphone, ArrowLeft, AlertCircle } from 'lucide-react'

// ⚠️ Force le rendu dynamique → évite l'erreur useSearchParams au build
export const dynamic = 'force-dynamic'

// ============================================================
// TYPES
// ============================================================
interface OrderDetail {
  id: number
  order_number: string
  total: number
  currency: string
  payment_status: string
  product_title?: string
}

interface OrderApiResponse {
  order?: OrderDetail
  error?: string
  message?: string
}

interface PaymentApiResponse {
  success?: boolean
  checkoutUrl?: string
  paymentUrl?: string
  url?: string
  error?: string
  code?: string
}

// ============================================================
// CONTENU (utilise useSearchParams → doit être dans Suspense)
// ============================================================
function PaymentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get('order') || searchParams.get('orderId')

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<'fedapay' | 'chariow' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderNumber) {
      setError('Aucune commande spécifiée')
      setLoading(false)
      return
    }
    fetchOrder()
  }, [orderNumber])

  const fetchOrder = async () => {
    try {
      const token = localStorage.getItem('token')

      // ✅ URL relative → marche en local ET en production
      const res = await fetch(`/api/orders/${orderNumber}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })

      if (!res.ok) throw new Error('Commande introuvable')

      // ✅ Typage correct (évite l'erreur "data is of type 'unknown'")
      const data = (await res.json()) as OrderApiResponse
      const fetchedOrder = data.order ?? null
      setOrder(fetchedOrder)

      // Si déjà payée → redirection vers la page de succès
      if (fetchedOrder?.payment_status === 'paid') {
        router.push(`/payment/success?order=${fetchedOrder.order_number || orderNumber}`)
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async (provider: 'fedapay' | 'chariow') => {
    if (!order) return
    setProcessing(provider)
    setError(null)

    try {
      const token = localStorage.getItem('token')

      const res = await fetch(`/api/payments/${provider}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ orderId: order.id })
      })

      const data = (await res.json()) as PaymentApiResponse

      if (!res.ok || data.error) {
        throw new Error(data.error || `Erreur ${provider}`)
      }

      const checkoutUrl = data.checkoutUrl || data.paymentUrl || data.url
      if (!checkoutUrl) {
        throw new Error('URL de paiement manquante dans la réponse')
      }

      window.location.href = checkoutUrl
    } catch (err: any) {
      setError(err.message)
      setProcessing(null)
    }
  }

  // ============================================================
  // RENDU
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (processing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-gray-600">
          Redirection vers {processing === 'fedapay' ? 'FedaPay' : 'Chariow'}…
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-lg w-full bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/50">
        <h1 className="text-2xl font-bold text-gray-900 text-center">
          💳 Paiement sécurisé
        </h1>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {order && (
          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <div className="text-xs text-gray-500 uppercase">Commande</div>
            <div className="font-semibold text-gray-900">#{order.order_number}</div>
            {order.product_title && (
              <div className="mt-2 text-sm text-gray-600">{order.product_title}</div>
            )}
            <div className="mt-3 flex justify-between items-center pt-3 border-t">
              <span className="text-gray-500 text-sm">Total</span>
              <span className="font-bold text-lg text-gray-900">
                {order.total?.toLocaleString()} {order.currency || 'FCFA'}
              </span>
            </div>
          </div>
        )}

        <div className="mt-8 space-y-3">
          <button
            onClick={() => handlePayment('fedapay')}
            disabled={!!processing || !order}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
          >
            <Smartphone className="w-5 h-5" />
            Payer avec FedaPay (Mobile Money)
          </button>

          <button
            onClick={() => handlePayment('chariow')}
            disabled={!!processing || !order}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
          >
            <CreditCard className="w-5 h-5" />
            Payer avec Chariow (Carte)
          </button>
        </div>

        <Link
          href="/"
          className="mt-6 flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 transition text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Annuler et retourner à l'accueil
        </Link>
      </div>
    </div>
  )
}

// ============================================================
// PAGE (enveloppe dans Suspense)
// ============================================================
export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  )
}