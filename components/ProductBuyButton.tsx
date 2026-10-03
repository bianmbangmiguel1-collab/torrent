// components/ProductBuyButton.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShoppingBag, ShieldCheck, Zap } from 'lucide-react'

interface Props {
  productId: number
  quantity?: number
  price?: number
  comparePrice?: number | null
  label?: string
  variant?: 'primary' | 'success' | 'dark'
  className?: string
}

interface OrderCreateResponse {
  error?: string
  orderId?: number | string
  order?: {
    id?: number | string
  }
  id?: number | string
}

const VARIANTS: Record<string, string> = {
  primary:
    'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/30',
  success:
    'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-emerald-500/30',
  dark: 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/30',
}

export default function ProductBuyButton({
  productId,
  quantity = 1,
  price,
  comparePrice,
  label = 'Acheter maintenant',
  variant = 'primary',
  className = '',
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasPromo =
    comparePrice !== undefined && comparePrice !== null && comparePrice > (price || 0)

  async function handleBuy() {
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const r = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          items: [{ productId, quantity }],
        }),
      })

      if (r.status === 401) {
        const redirect = encodeURIComponent(`/checkout?product_id=${productId}`)
        router.push(`/login?redirect=${redirect}`)
        return
      }

      const data = (await r.json()) as OrderCreateResponse

      if (!r.ok) {
        setError(data.error || 'Erreur lors de la commande')
        return
      }

      const orderId = data.orderId || data.order?.id || data.id
      if (!orderId) {
        setError('ID commande introuvable')
        return
      }

      router.push(`/checkout?orderId=${orderId}`)
    } catch (e: any) {
      setError(e.message || 'Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`w-full ${className}`}>
      <button
        onClick={handleBuy}
        disabled={loading}
        className={`
          w-full flex items-center justify-center gap-2
          px-6 py-4 rounded-2xl font-bold text-lg
          shadow-xl hover:shadow-2xl
          transition-all duration-200
          disabled:opacity-60 disabled:cursor-wait
          ${VARIANTS[variant]}
        `}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Préparation…
          </>
        ) : (
          <>
            <ShoppingBag className="w-5 h-5" />
            {label}
          </>
        )}
      </button>

      {hasPromo && !loading && (
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-500">
          <span className="line-through">{comparePrice!.toLocaleString()} FCFA</span>
          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-bold">
            -{Math.round((1 - (price || 0) / comparePrice!) * 100)}%
          </span>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-red-600 text-center">{error}</p>}

      <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          Paiement sécurisé
        </span>
        <span className="w-px h-3 bg-slate-200" />
        <span className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-500" />
          Accès immédiat
        </span>
      </div>
    </div>
  )
}