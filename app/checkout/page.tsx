// app/checkout/page.tsx
'use client'

import { useEffect, useState, Suspense, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import {
  Loader2, ArrowLeft, CreditCard, ShieldCheck, Zap, AlertCircle,
  Trash2, Plus, Minus, Sparkles, MapPin,
} from 'lucide-react'
import Link from 'next/link'
import PaymentMethodSelector from '@/components/payment/PaymentMethodSelector'

// ============================================================
// TYPES
// ============================================================

interface CartItem {
  id: number
  product_id: number
  title: string
  price: number
  quantity: number
  image?: string
  slug?: string
  subtotal?: number
}

interface CheckoutItem {
  id: number
  title: string
  price: number
  quantity: number
  image?: string
  slug?: string
}

interface CountryResponse {
  country?: string
}

interface OrderItem {
  id?: number
  product_id?: number
  title?: string
  product_title?: string
  price?: number
  quantity?: number
  image?: string
  image_url?: string
  slug?: string
}

interface OrderData {
  id?: number
  orderId?: number
  orderNumber?: string
  order_number?: string
  product_id?: number
  product_title?: string
  product_slug?: string
  image_url?: string
  total?: number
  items?: OrderItem[]
  products?: string | OrderItem[]
  [key: string]: unknown
}

interface OrderApiResponse {
  order?: OrderData
  [key: string]: unknown
}

interface ProductResponse {
  id: number
  title: string
  price: number
  image_url?: string
  main_image?: string
  slug?: string
}

interface CartResponse {
  items?: CartItem[]
}

interface CreateOrderResponse {
  id?: number
  orderId?: number
  orderNumber?: string
  order?: {
    id?: number
    order_number?: string
  }
  [key: string]: unknown
}

interface ErrorResponse {
  error?: string
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, loading: userLoading } = useUser()

  const orderIdFromUrl = searchParams?.get('orderId')
  const productIdFromUrl = searchParams?.get('product_id')

  const [items, setItems] = useState<CheckoutItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orderData, setOrderData] = useState<
    (OrderData & {
      orderId: number
      orderNumber?: string
    }) | null
  >(null)
  const [showPayment, setShowPayment] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [redirectDone, setRedirectDone] = useState(false)
  const [source, setSource] = useState<'url' | 'cart' | 'orderId' | null>(null)
  const [country, setCountry] = useState<string>('')

  // 🔒 Guards — empêchent les doubles exécutions
  const orderCreationLocked = useRef(false)
  const geoDoneRef = useRef(false)
  const loadDoneRef = useRef(false)

  // ============================================================
  // MOUNT
  // ============================================================
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // ============================================================
  // DÉTECTION DU PAYS — un seul appel, deps stables
  // ============================================================
  useEffect(() => {
    if (!isMounted || geoDoneRef.current) return
    geoDoneRef.current = true

    let cancelled = false

    fetch('/api/geo/country')
      .then(async (r): Promise<CountryResponse | null> => {
        if (!r.ok) return null

        const data: unknown = await r.json()

        if (
          typeof data === 'object' &&
          data !== null &&
          'country' in data &&
          typeof data.country === 'string'
        ) {
          return {
            country: data.country,
          }
        }

        return null
      })
      .then(d => {
        if (cancelled) return

        if (d?.country) {
          setCountry(d.country.toUpperCase())
          return
        }

        const lang = (navigator.language || '').toUpperCase()
        if (lang.includes('FR') || lang.includes('BJ')) {
          setCountry('BJ')
        }
      })
      .catch(() => {
        if (cancelled) return
        const lang = (navigator.language || '').toUpperCase()
        if (lang.includes('FR') || lang.includes('BJ')) setCountry('BJ')
      })

    return () => { cancelled = true }
  }, [isMounted])

  // ============================================================
  // REDIRECTION LOGIN
  // ============================================================
  useEffect(() => {
    if (!userLoading && !isAuthenticated && isMounted && !redirectDone) {
      setRedirectDone(true)
      const redirect = orderIdFromUrl
        ? `/checkout?orderId=${orderIdFromUrl}`
        : productIdFromUrl
          ? `/checkout?product_id=${productIdFromUrl}`
          : '/cart'
      router.replace(`/login?redirect=${encodeURIComponent(redirect)}`)
    }
  }, [userLoading, isAuthenticated, isMounted, redirectDone, orderIdFromUrl, productIdFromUrl, router])

  // ============================================================
  // CHARGEMENT — avec guard
  // ============================================================
  useEffect(() => {
    if (userLoading || !isAuthenticated || !isMounted || redirectDone) return
    if (loadDoneRef.current) return
    loadDoneRef.current = true

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        // 🅰️ CAS 1 — orderId fourni
        if (orderIdFromUrl) {
          console.log('📡 Chargement commande existante:', orderIdFromUrl)

          const res = await fetch(`/api/orders/${orderIdFromUrl}`, {
            credentials: 'include',
          })

          let ord: OrderData | null = null

          if (res.ok) {
            const data: unknown = await res.json()

            if (
              typeof data === 'object' &&
              data !== null &&
              'order' in data &&
              typeof data.order === 'object' &&
              data.order !== null
            ) {
              ord = data.order as OrderData
            } else if (
              typeof data === 'object' &&
              data !== null
            ) {
              ord = data as OrderData
            }
          } else {
            const alt = await fetch(`/api/orders/${orderIdFromUrl}/status`, {
              credentials: 'include',
            })

            if (!alt.ok) {
              throw new Error('Commande introuvable')
            }

            const altData: unknown = await alt.json()

            if (
              typeof altData === 'object' &&
              altData !== null &&
              'order' in altData &&
              typeof altData.order === 'object' &&
              altData.order !== null
            ) {
              ord = altData.order as OrderData
            } else if (
              typeof altData === 'object' &&
              altData !== null
            ) {
              ord = altData as OrderData
            }
          }

          if (!ord) {
            throw new Error('Données de commande invalides')
          }

          if (cancelled) return

          setOrderData({ ...ord, orderId: Number(orderIdFromUrl) })

          let loadedItems: CheckoutItem[] = []

          if (Array.isArray(ord.items) && ord.items.length > 0) {
            loadedItems = ord.items.map((it: OrderItem) => ({
              id: it.product_id || it.id || 0,
              title: it.title || it.product_title || 'Produit',
              price: it.price || 0,
              quantity: it.quantity || 1,
              image: it.image || it.image_url,
              slug: it.slug,
            }))
          } else if (ord.products) {
            try {
              const parsed = typeof ord.products === 'string'
                ? JSON.parse(ord.products)
                : ord.products
              if (Array.isArray(parsed)) {
                loadedItems = parsed.map((it: OrderItem) => ({
                  id: it.product_id || it.id || 0,
                  title: it.title || it.product_title || 'Produit',
                  price: it.price || 0,
                  quantity: it.quantity || 1,
                  image: it.image || it.image_url,
                  slug: it.slug,
                }))
              }
            } catch (e) {
              console.warn('⚠️ Impossible de parser products:', e)
            }
          }

          if (loadedItems.length === 0) {
            loadedItems = [{
              id: ord.product_id || 0,
              title: ord.product_title || 'Produit',
              price: ord.total || 0,
              quantity: 1,
              image: ord.image_url,
              slug: ord.product_slug,
            }]
          }

          setItems(loadedItems)
          setSource('orderId')
          setShowPayment(true)
          setLoading(false)
          return
        }

        // 🅱️ CAS 2 — product_id
        if (productIdFromUrl) {
          const res = await fetch(`/api/products/${productIdFromUrl}`, {
            credentials: 'include',
          })
          if (!res.ok) throw new Error('Produit non trouvé')

          const productData: unknown = await res.json()

          if (
            typeof productData !== 'object' ||
            productData === null ||
            !('id' in productData) ||
            !('title' in productData) ||
            !('price' in productData)
          ) {
            throw new Error('Réponse produit invalide')
          }

          const product = productData as ProductResponse

          if (cancelled) return

          setItems([{
            id: product.id,
            title: product.title,
            price: product.price,
            quantity: 1,
            image: product.image_url || product.main_image,
            slug: product.slug,
          }])
          setSource('url')
          setLoading(false)
          return
        }

        // 🅲 CAS 3 — Panier
        const res = await fetch('/api/cart', {
          credentials: 'include',
          cache: 'no-store',
        })

        if (res.status === 401) {
          router.push('/login?redirect=/cart')
          return
        }
        if (!res.ok) throw new Error('Erreur lors du chargement du panier')

        const cartData: unknown = await res.json()

        let cartItems: CartItem[] = []

        if (
          typeof cartData === 'object' &&
          cartData !== null &&
          'items' in cartData &&
          Array.isArray(cartData.items)
        ) {
          cartItems = cartData.items as CartItem[]
        }

        if (cancelled) return

        if (cartItems.length === 0) {
          setError('Votre panier est vide. Ajoutez des produits avant de commander.')
          setLoading(false)
          return
        }

        setItems(
          cartItems.map((item) => ({
            id: item.product_id,
            title: item.title,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
            slug: item.slug,
          }))
        )
        setSource('cart')
        setLoading(false)
      } catch (err: unknown) {
        if (cancelled) return

        setError(
          err instanceof Error
            ? err.message
            : 'Erreur de chargement'
        )

        setLoading(false)
      }
    }

    load()

    return () => { cancelled = true }
  }, [userLoading, isAuthenticated, isMounted, redirectDone, orderIdFromUrl, productIdFromUrl, router])

  // ============================================================
  // TOTAL
  // ============================================================
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const totalItems = items.reduce((s, i) => s + i.quantity, 0)

  // ============================================================
  // MODIFIER QUANTITÉ
  // ============================================================
  const updateQuantity = useCallback(async (productId: number, quantity: number) => {
    if (quantity < 1) return
    setItems((prev) =>
      prev.map((it) => (it.id === productId ? { ...it, quantity } : it))
    )
    if (source === 'cart') {
      try {
        await fetch('/api/cart', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ productId, quantity }),
        })
      } catch (err) {
        console.error('❌ Erreur mise à jour panier:', err)
      }
    }
  }, [source])

  // ============================================================
  // SUPPRIMER UN ARTICLE
  // ============================================================
  const removeItem = useCallback(async (productId: number) => {
    const newItems = items.filter((it) => it.id !== productId)
    setItems(newItems)
    if (source === 'cart') {
      try {
        await fetch(`/api/cart?productId=${productId}`, {
          method: 'DELETE',
          credentials: 'include',
        })
      } catch (err) {
        console.error('❌ Erreur suppression:', err)
      }
    }
    if (newItems.length === 0) setError('Votre panier est vide.')
  }, [items, source])

  // ============================================================
  // CRÉATION DE COMMANDE
  // ============================================================
  const createOrder = useCallback(async () => {
    if (orderIdFromUrl && orderData?.orderId) {
      setShowPayment(true)
      return
    }

    if (orderCreationLocked.current || creatingOrder) {
      console.log('🔒 Création déjà en cours, clic ignoré')
      return
    }

    if (items.length === 0) {
      setError('Aucun article à commander.')
      return
    }

    orderCreationLocked.current = true
    setCreatingOrder(true)
    setError(null)

    try {
      const orderRes = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          items: items.map((it) => ({
            productId: it.id,
            quantity: it.quantity,
          })),
        }),
      })

      if (!orderRes.ok) {
        const errData: unknown = await orderRes.json().catch(() => ({}))

        const errorMessage =
          typeof errData === 'object' &&
          errData !== null &&
          'error' in errData &&
          typeof errData.error === 'string'
            ? errData.error
            : 'Erreur lors de la création de la commande'

        throw new Error(errorMessage)
      }

      const orderResponseData: unknown = await orderRes.json()

      if (
        typeof orderResponseData !== 'object' ||
        orderResponseData === null
      ) {
        throw new Error('Réponse de création de commande invalide')
      }

      const orderResult = orderResponseData as CreateOrderResponse

      const orderId =
        orderResult.orderId ||
        orderResult.order?.id ||
        orderResult.id

      if (!orderId) {
        throw new Error('ID de commande introuvable dans la réponse')
      }

      setOrderData({
        ...orderResult,
        orderId,
        orderNumber:
          orderResult.orderNumber ||
          orderResult.order?.order_number,
      })
      setShowPayment(true)
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erreur lors de la commande'
      )

      orderCreationLocked.current = false
    } finally {
      setCreatingOrder(false)
    }
  }, [orderIdFromUrl, orderData?.orderId, creatingOrder, items])

  // ============================================================
  // 🔑 CALLBACKS MÉMOÏSÉS — LA CLÉ CONTRE LA BOUCLE
  // ============================================================
  const handlePaymentStart = useCallback(
    (provider: string, checkoutUrl: string) => {
      console.log(`✅ Paiement lancé via ${provider}`, checkoutUrl)
    },
    [],
  )

  const handlePaymentError = useCallback(
    (provider: string, errMsg: string) => {
      console.error(`❌ Erreur ${provider}:`, errMsg)
      setError(errMsg)
    },
    [],
  )

  // ============================================================
  // RENDUS DE CHARGEMENT
  // ============================================================
  if (!isMounted || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Chargement de la commande...</p>
        </div>
      </div>
    )
  }

  if (error && items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-2xl">
          <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Aucun article à commander</h2>
          <p className="text-gray-500 mt-2">{error}</p>
          <div className="mt-6 space-y-3">
            <Link
              href="/avant"
              className="block w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium"
            >
              Découvrir les produits
            </Link>
            <Link
              href="/cart"
              className="block w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
            >
              Voir mon panier
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <header className="bg-white/80 backdrop-blur-xl border-b border-white/30 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href={source === 'cart' ? '/cart' : `/product/${items[0]?.slug || ''}`}
            className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-xl hover:bg-white transition shadow-sm text-gray-700"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour
          </Link>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-600" />
            Paiement sécurisé
          </h1>
          {source === 'cart' && (
            <span className="ml-auto text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
              🛒 Depuis le panier
            </span>
          )}
          {(source === 'url' || source === 'orderId') && (
            <span className="ml-auto text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium">
              ⚡ Achat direct
            </span>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">

          {/* RÉSUMÉ */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Résumé de la commande</h2>
              <span className="text-sm text-gray-500">
                {totalItems} article{totalItems > 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-16 h-16 object-cover rounded-lg bg-white"
                      onError={(e) => { e.currentTarget.src = '/images/placeholder.png' }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{item.title}</p>
                    <p className="text-sm text-gray-500">
                      {item.price.toLocaleString('fr-FR')} FCFA × {item.quantity}
                    </p>
                  </div>

                  {source === 'cart' && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-gray-200 rounded-lg bg-white">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="px-2 py-1 hover:bg-gray-100 rounded-l-lg disabled:opacity-50"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 py-1 text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-2 py-1 hover:bg-gray-100 rounded-r-lg"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Retirer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="text-right font-bold text-gray-900 whitespace-nowrap">
                    {(item.price * item.quantity).toLocaleString('fr-FR')} FCFA
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-lg font-bold text-gray-900">
                <span>Total</span>
                <span className="text-blue-600">{total.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>
          </div>

          {/* INFOS USER */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              👤 Vos informations
            </h2>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-gray-500">Nom :</span>{' '}
                <span className="font-medium text-gray-900">{user?.name}</span>
              </p>
              <p>
                <span className="text-gray-500">Email :</span>{' '}
                <span className="font-medium text-gray-900">{user?.email}</span>
              </p>
              {orderData?.orderNumber && (
                <p className="text-xs text-gray-400 mt-2">
                  Commande #{orderData.orderNumber}
                </p>
              )}
              {country && (
                <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
                  <MapPin className="w-3 h-3" />
                  Pays : <span className="font-semibold">{country}</span>
                </p>
              )}
            </div>
          </div>

          {/* ÉTAPE 1 : CONTINUER */}
          {!showPayment && (
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-2xl shadow-blue-500/30 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-white rounded-full blur-3xl" />
              </div>

              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <ShieldCheck className="w-8 h-8" />
                  <span className="text-xl font-bold">Choisis ton mode de paiement</span>
                </div>

                <p className="text-white/80 mb-6">
                  Chariow ou FedaPay — paiement sécurisé par Mobile Money ou carte bancaire.
                </p>

                <button
                  onClick={createOrder}
                  disabled={creatingOrder || items.length === 0}
                  className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-white text-blue-600 rounded-2xl hover:shadow-xl transition font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingOrder ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Préparation de la commande...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Continuer vers le paiement
                    </>
                  )}
                </button>

                <div className="mt-4 flex items-center justify-center gap-4 text-sm text-white/70 flex-wrap">
                  <span>🔒 Sécurisé</span>
                  <span className="w-px h-4 bg-white/20" />
                  <span>💳 Carte bancaire</span>
                  <span className="w-px h-4 bg-white/20" />
                  <span>📱 Mobile Money</span>
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 : SÉLECTEUR */}
          {showPayment && orderData && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-xl">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-indigo-600" />
                  Finaliser le paiement
                </h2>
                {orderData.orderNumber && (
                  <span className="text-xs text-gray-400 font-mono bg-gray-100 px-3 py-1.5 rounded-full">
                    Commande #{orderData.orderNumber}
                  </span>
                )}
              </div>

              <PaymentMethodSelector
                orderId={orderData.orderId}
                amount={total}
                currency="XOF"
                defaultProvider="chariow"
                country={country}
                onSuccess={handlePaymentStart}
                onError={handlePaymentError}
              />

              {source === 'cart' && (
                <button
                  onClick={() => {
                    setShowPayment(false)
                    setOrderData(null)
                    orderCreationLocked.current = false
                  }}
                  className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700 transition flex items-center justify-center gap-2 py-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Modifier ma commande
                </button>
              )}
            </div>
          )}

          {/* ERREUR */}
          {error && items.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-600 font-medium">Erreur</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-xs text-red-500 hover:text-red-700 mt-2 underline"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Chargement du checkout...</p>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}