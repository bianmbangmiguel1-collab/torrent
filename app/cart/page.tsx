// app/cart/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Trash2, Plus, Minus, ShoppingBag, ArrowRight, MessageCircle,
  CreditCard, Truck, AlertCircle, ArrowLeft, CheckCircle, Download,
  FileText, Zap, Wallet, Smartphone, Package, ShieldCheck, Heart,
  Clock, Sparkles, Loader2
} from 'lucide-react'
import { useUser } from '@/context/UserContext'

interface CartItem {
  id: number
  product_id: number
  title: string
  price: number
  quantity: number
  image: string
  slug?: string
  file_path?: string
}

interface CartTotal {
  items: number
  total: number
  totalQuantity: number
}

interface CreatedOrderResponse {
  orderId?: number
}

export default function CartPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: userLoading } = useUser()

  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null)

  // ============================================================
  // CALCUL DU TOTAL (CÔTÉ CLIENT)
  // ============================================================
  const total: CartTotal = {
    items: cart.length,
    totalQuantity: cart.reduce((s, i) => s + i.quantity, 0),
    total: cart.reduce((s, i) => s + i.price * i.quantity, 0),
  }

  // ============================================================
  // CHARGER LE PANIER (URL RELATIVE !)
  // ============================================================
  useEffect(() => {
    if (!userLoading) {
      if (!isAuthenticated) {
        router.push('/login?redirect=/cart')
        return
      }
      fetchCart()
    }
  }, [userLoading, isAuthenticated, router])

  const fetchCart = async () => {
    try {
      setError(null)
      setLoading(true)

      // ✅ URL relative — utilise Next.js
      const response = await fetch('/api/cart', {
        credentials: 'include',
        cache: 'no-store',
      })

      if (response.status === 401) {
        router.push('/login?redirect=/cart')
        return
      }

      if (!response.ok) {
        throw new Error('Erreur lors du chargement du panier')
      }

      const data: unknown = await response.json()

      if (
        typeof data !== 'object' ||
        data === null ||
        !('items' in data) ||
        !Array.isArray(data.items)
      ) {
        throw new Error('Réponse du panier invalide')
      }

      setCart(data.items as CartItem[])
    } catch (error: any) {
      console.error('❌ Erreur chargement panier:', error)
      setError(error.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // METTRE À JOUR LA QUANTITÉ
  // ============================================================
  const updateQuantity = async (productId: number, quantity: number) => {
    if (quantity < 1) return

    try {
      // ✅ PUT /api/cart avec body
      const response = await fetch('/api/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId, quantity }),
      })

      if (response.ok) {
        // Mettre à jour localement (optimistic update)
        setCart(prev =>
          prev.map(item =>
            item.product_id === productId ? { ...item, quantity } : item
          )
        )
      }
    } catch (error) {
      console.error('❌ Erreur mise à jour:', error)
    }
  }

  // ============================================================
  // RETIRER UN ARTICLE
  // ============================================================
  const removeItem = async (productId: number) => {
    try {
      // ✅ DELETE /api/cart?productId=X
      const response = await fetch(`/api/cart?productId=${productId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        setCart(prev => prev.filter(item => item.product_id !== productId))
      }
    } catch (error) {
      console.error('❌ Erreur suppression:', error)
    }
  }

  // ============================================================
  // VIDER LE PANIER
  // ============================================================
  const clearCart = async () => {
    if (!confirm('Vider votre panier ?')) return

    try {
      // Vider en supprimant chaque article
      await Promise.all(
        cart.map(item =>
          fetch(`/api/cart?productId=${item.product_id}`, {
            method: 'DELETE',
            credentials: 'include',
          })
        )
      )
      setCart([])
    } catch (error) {
      console.error('❌ Erreur vidage panier:', error)
    }
  }

  // ============================================================
  // PAIEMENT
  // ============================================================
  const handleCheckout = () => {
    if (cart.length === 0) return
    setShowPaymentModal(true)
  }

  const handlePayment = async (method: string) => {
    setIsProcessing(true)
    setPaymentMethod(method)
    setError(null)

    try {
      if (method === 'whatsapp') {
        // 📱 WhatsApp : redirection simple
        const message = encodeURIComponent(
          `Bonjour, je souhaite payer ma commande :\n` +
          cart.map(i => `- ${i.title} x${i.quantity} = ${(i.price * i.quantity).toLocaleString()} FCFA`).join('\n') +
          `\n\nTotal : ${total.total.toLocaleString()} FCFA`
        )
        window.open(`https://wa.me/237XXXXXXXXX?text=${message}`, '_blank')
        setIsProcessing(false)
        setShowPaymentModal(false)
        return
      }

      // 💳 FedaPay : créer commande puis paiement
      // ✅ ÉTAPE 1 : Créer UNE commande par produit (ou une commande multi-produits)
      // On va créer une commande par produit pour simplifier
      const createdOrders: CreatedOrderResponse[] = []

      for (const item of cart) {
        const orderResponse = await fetch('/api/orders/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            productId: item.product_id,
            quantity: item.quantity,
          }),
        })

        if (!orderResponse.ok) {
          const errorData: unknown = await orderResponse.json().catch(() => ({}))

          const message =
            typeof errorData === 'object' &&
            errorData !== null &&
            'error' in errorData &&
            typeof errorData.error === 'string'
              ? errorData.error
              : `Erreur création commande pour ${item.title}`

          throw new Error(message)
        }

        const orderData: unknown = await orderResponse.json()

        if (
          typeof orderData !== 'object' ||
          orderData === null ||
          !('orderId' in orderData) ||
          typeof orderData.orderId !== 'number'
        ) {
          throw new Error('Réponse de création de commande invalide')
        }

        createdOrders.push({
          orderId: orderData.orderId,
        })
      }

      if (createdOrders.length === 0) {
        throw new Error('Aucune commande créée')
      }

      // ✅ ÉTAPE 2 : Créer le paiement FedaPay pour la PREMIÈRE commande
      // (Dans un vrai multi-produits, on créerait un seul paiement global)
      const firstOrder = createdOrders[0]

      const paymentResponse = await fetch('/api/payments/fedapay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderId: firstOrder.orderId,
          productId: cart[0].product_id,
        }),
      })

      if (!paymentResponse.ok) {
        const errorData: unknown = await paymentResponse.json().catch(() => ({}))

        const message =
          typeof errorData === 'object' &&
          errorData !== null &&
          'error' in errorData &&
          typeof errorData.error === 'string'
            ? errorData.error
            : 'Erreur lors de la création du paiement'

        throw new Error(message)
      }

      const paymentData: unknown = await paymentResponse.json()

      if (
        typeof paymentData !== 'object' ||
        paymentData === null ||
        !('paymentUrl' in paymentData) ||
        typeof paymentData.paymentUrl !== 'string'
      ) {
        throw new Error('URL de paiement non reçue')
      }

      // ✅ ÉTAPE 3 : Rediriger vers FedaPay
      window.location.href = paymentData.paymentUrl

    } catch (error: unknown) {
      console.error('❌ Erreur paiement:', error)

      const message =
        error instanceof Error
          ? error.message
          : 'Erreur lors du paiement'

      setError(message)
      alert(message)
    } finally {
      setIsProcessing(false)
      setShowPaymentModal(false)
      setPaymentMethod(null)
    }
  }

  // ============================================================
  // RENDU
  // ============================================================
  if (userLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-500">Chargement de votre panier...</p>
        </div>
      </div>
    )
  }

  if (error && cart.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-gray-800 mt-4">Une erreur est survenue</h2>
          <p className="text-gray-500 mt-2">{error}</p>
          <button
            onClick={fetchCart}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Votre panier est vide</h2>
          <p className="text-gray-500 mt-2">Découvrez nos produits et commencez vos achats</p>
          <div className="mt-6 space-y-3">
            <Link
              href="/avant"
              className="block w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition text-center font-medium"
            >
              Découvrir les produits
            </Link>
            <Link
              href="/orders"
              className="block w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition text-center font-medium"
            >
              Voir mes commandes
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/avant"
              className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl hover:bg-white transition shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
              Continuer les achats
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Mon panier</h1>
              <p className="text-gray-500">{total.items} produit(s)</p>
            </div>
          </div>
          <button
            onClick={clearCart}
            className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl hover:bg-white transition shadow-sm text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
            Vider
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Liste des produits */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item, index) => (
              <motion.div
                key={item.product_id}
                className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-white/50 hover:shadow-md transition"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex items-start gap-4">
                  <img
                    src={item.image || '/images/placeholder.png'}
                    alt={item.title}
                    className="w-20 h-20 object-cover rounded-lg bg-gray-100"
                    onError={(e) => {
                      e.currentTarget.src = '/images/placeholder.png'
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>
                    <p className="text-sm text-gray-500">{item.price.toLocaleString()} FCFA</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center border border-gray-200 rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          className="px-2 py-1 hover:bg-gray-100 rounded-l-lg disabled:opacity-50"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="px-3 py-1 text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          className="px-2 py-1 hover:bg-gray-100 rounded-r-lg"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.product_id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      {(item.price * item.quantity).toLocaleString()} FCFA
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Résumé */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-white/50 h-fit lg:sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Résumé</h2>

            <div className="space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Sous-total ({total.items} articles)</span>
                <span>{total.total.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Livraison</span>
                <span className="text-green-600">Instantanée</span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>Total</span>
                  <span>{total.total.toLocaleString()} FCFA</span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={handleCheckout}
                disabled={isProcessing || cart.length === 0}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Procéder au paiement
                  </>
                )}
              </button>

              <Link
                href="/avant"
                className="block text-center text-sm text-blue-600 hover:text-blue-700"
              >
                Continuer les achats
              </Link>
            </div>

            <div className="mt-4 p-3 bg-green-50 rounded-lg flex items-center gap-2 text-sm text-green-700">
              <ShieldCheck className="w-4 h-4" />
              Paiement sécurisé
            </div>
          </div>
        </div>
      </div>

      {/* Modal de paiement */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Choisissez votre méthode de paiement
            </h3>
            <p className="text-gray-500 mb-6">
              Montant total:{' '}
              <span className="font-bold text-gray-900">
                {total.total.toLocaleString()} FCFA
              </span>
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handlePayment('fedapay')}
                disabled={isProcessing}
                className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition disabled:opacity-50"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  {isProcessing && paymentMethod === 'fedapay' ? (
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                  ) : (
                    <Wallet className="w-6 h-6 text-blue-600" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold">FedaPay</p>
                  <p className="text-sm text-gray-500">Mobile Money, Carte bancaire</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </button>

              <button
                onClick={() => handlePayment('whatsapp')}
                disabled={isProcessing}
                className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition disabled:opacity-50"
              >
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold">WhatsApp</p>
                  <p className="text-sm text-gray-500">Paiement par message</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <button
              onClick={() => setShowPaymentModal(false)}
              disabled={isProcessing}
              className="mt-4 w-full px-4 py-2 text-gray-500 hover:text-gray-700 transition disabled:opacity-50"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}