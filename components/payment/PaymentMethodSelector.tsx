// components/payment/PaymentMethodSelector.tsx
'use client'

import { useCallback, useRef, useState } from 'react'
import {
  CreditCard,
  ShoppingBag,
  Loader2,
  Shield,
  AlertCircle,
  MapPin,
} from 'lucide-react'

type Provider = 'fedapay' | 'chariow'

interface Props {
  orderId: number
  amount?: number
  currency?: string
  defaultProvider?: Provider
  /** Code pays ISO ("BJ", "FR"...). Vide = pas de restriction */
  country?: string
  onSuccess?: (provider: string, checkoutUrl: string) => void
  onError?: (provider: string, errorMsg: string) => void
}

interface PaymentCreateResponse {
  error?: string
  paymentUrl?: string
  checkoutUrl?: string
  url?: string
  checkout_url?: string
}

export default function PaymentMethodSelector({
  orderId,
  amount,
  currency = 'XOF',
  defaultProvider = 'chariow',
  country = '',
  onSuccess,
  onError,
}: Props) {
  const [loading, setLoading] = useState<Provider | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 🔒 Verrou anti-double-clic (persiste entre les renders)
  const requestLock = useRef<Provider | null>(null)

  // FedaPay autorisé pour Bénin (BJ) uniquement
  // Si aucun pays n'est détecté → on laisse passer (mode dev)
  const fedapayAllowed = !country || country.toUpperCase() === 'BJ'

  // ─────────────────────────────────────────────────────────────
  // Déclencher le paiement
  // ─────────────────────────────────────────────────────────────
  const pay = useCallback(
    async (provider: Provider) => {
      // 🔒 Anti-double-clic
      if (requestLock.current !== null) return
      requestLock.current = provider

      setLoading(provider)
      setError(null)

      try {
        const res = await fetch(`/api/payments/${provider}/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ orderId }),
        })

        const data = (await res.json()) as PaymentCreateResponse

        if (!res.ok) {
          const msg = data.error || 'Erreur lors du paiement'
          setError(msg)
          onError?.(provider, msg)
          return
        }

        // Chaque provider renvoie son URL sous un nom différent
        const url =
          data.paymentUrl ||
          data.checkoutUrl ||
          data.url ||
          data.checkout_url ||
          null

        if (!url) {
          const msg = 'URL de paiement introuvable'
          setError(msg)
          onError?.(provider, msg)
          return
        }

        // Callback succès + redirection
        onSuccess?.(provider, url)
        window.location.href = url
      } catch (e: any) {
        const msg = e.message || 'Erreur réseau'
        setError(msg)
        onError?.(provider, msg)
      } finally {
        setLoading(null)
        requestLock.current = null
      }
    },
    [orderId, onSuccess, onError],
  )

  // ─────────────────────────────────────────────────────────────
  // Rendu
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">

      {/* ═══════════ CHARIOW (partout) ═══════════ */}
      <button
        type="button"
        onClick={() => pay('chariow')}
        disabled={loading !== null}
        className="
          w-full flex items-center justify-between px-5 py-4
          rounded-2xl border-2 border-gray-200
          hover:border-emerald-500 hover:bg-emerald-50
          transition disabled:opacity-50 disabled:cursor-wait
          group text-left
        "
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-500 transition shrink-0">
            <ShoppingBag className="w-5 h-5 text-emerald-600 group-hover:text-white transition" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900">Chariow</p>
            <p className="text-xs text-gray-500">
              Paiement international · tous pays 🌍
            </p>
          </div>
        </div>

        {loading === 'chariow' ? (
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600 shrink-0" />
        ) : (
          <span className="text-xs text-emerald-600 font-semibold shrink-0">
            Choisir →
          </span>
        )}
      </button>

      {/* ═══════════ FEDAPAY (Bénin uniquement) ═══════════ */}
      {fedapayAllowed ? (
        <button
          type="button"
          onClick={() => pay('fedapay')}
          disabled={loading !== null}
          className="
            w-full flex items-center justify-between px-5 py-4
            rounded-2xl border-2 border-gray-200
            hover:border-indigo-500 hover:bg-indigo-50
            transition disabled:opacity-50 disabled:cursor-wait
            group text-left
          "
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-500 transition shrink-0">
              <CreditCard className="w-5 h-5 text-indigo-600 group-hover:text-white transition" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">FedaPay</p>
              <p className="text-xs text-gray-500">
                Mobile Money · Carte bancaire — Bénin 🇧🇯
              </p>
            </div>
          </div>

          {loading === 'fedapay' ? (
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600 shrink-0" />
          ) : (
            <span className="text-xs text-indigo-600 font-semibold shrink-0">
              Choisir →
            </span>
          )}
        </button>
      ) : (
        // Version grisée si pas au Bénin
        <div className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-500">FedaPay</p>
              <p className="text-xs text-gray-400">
                Disponible uniquement au Bénin 🇧🇯
              </p>
            </div>
          </div>
          <span className="text-xs text-gray-400 font-medium shrink-0">
            Indisponible
          </span>
        </div>
      )}

      {/* ═══════════ Montant ═══════════ */}
      {amount !== undefined && (
        <div className="pt-3 mt-3 border-t border-gray-100 flex justify-between items-center text-sm">
          <span className="text-gray-500">Montant à payer</span>
          <span className="font-bold text-indigo-600 text-lg">
            {amount.toLocaleString('fr-FR')} {currency}
          </span>
        </div>
      )}

      {/* ═══════════ Pays détecté ═══════════ */}
      {country && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 pt-1">
          <MapPin className="w-3 h-3" />
          Détecté : <span className="font-semibold">{country}</span>
        </div>
      )}

      {/* ═══════════ Erreur ═══════════ */}
      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 flex-1">{error}</p>
        </div>
      )}

      {/* ═══════════ Sécurité ═══════════ */}
      <div className="pt-3 flex items-center justify-center gap-2 text-xs text-gray-400">
        <Shield className="w-3.5 h-3.5" />
        Paiement 100% sécurisé · SSL
      </div>
    </div>
  )
}