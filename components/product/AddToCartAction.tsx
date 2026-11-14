'use client'

import { useState } from 'react'
import { Check, Loader2, ShoppingCart } from 'lucide-react'

export default function AddToCartAction({ productId }: { productId: number }) {
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function addToCart() {
    if (pending) return
    setPending(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Impossible d’ajouter cet article au panier.')
      setMessage('Ajouté au panier')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Une erreur est survenue.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <button type="button" onClick={addToCart} disabled={pending} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-bold text-blue-800 transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60">
        {pending ? <Loader2 size={17} className="animate-spin" /> : message ? <Check size={17} /> : <ShoppingCart size={17} />}
        {pending ? 'Ajout en cours…' : message || 'Ajouter au panier'}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      {message && <p role="status" className="mt-2 text-sm text-emerald-700">{message} · <a className="font-semibold underline" href="/cart">Voir le panier</a></p>}
    </div>
  )
}
