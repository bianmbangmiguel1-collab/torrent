'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ReviewFormProps {
  productSlug: string
  onSuccess?: () => void
}

export default function ReviewForm({ productSlug, onSuccess }: ReviewFormProps) {
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rating === 0) {
      setError('Veuillez sélectionner une note.')
      return
    }

    if (!comment.trim()) {
      setError('Veuillez écrire un avis.')
      return
    }

    if (comment.trim().length < 5) {
      setError('Votre avis doit contenir au moins 5 caractères.')
      return
    }

    setSubmitting(true)
    setError('')

    // ✅ NOUVELLE URL – sans crochets, slug passé en query param
    const url = `/api/products/reviews?slug=${encodeURIComponent(productSlug)}`

    console.log('══════════════════════════════════════')
    console.log('⭐ ENVOI REVIEW')
    console.log('🔗 URL =', url)
    console.log('📦 productSlug =', productSlug)
    console.log('⭐ rating =', rating)
    console.log('💬 comment =', comment.trim())
    console.log('══════════════════════════════════════')

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          rating,
          comment: comment.trim(),
        }),
      })

      console.log('📡 RESPONSE status =', res.status)
      console.log('📡 ok =', res.ok)

      const responseText = await res.text()
      console.log('📨 réponse brute =', responseText)

      let data: any = null
      try {
        data = responseText ? JSON.parse(responseText) : null
      } catch (jsonError) {
        console.error('❌ Réponse NON JSON:', jsonError)
      }

      if (!res.ok) {
        if (res.status === 401) {
          setError('Votre session a expiré. Veuillez vous reconnecter.')
          setTimeout(() => {
            router.push(`/login?redirect=${encodeURIComponent(`/product/${productSlug}`)}`)
          }, 1500)
          setSubmitting(false)
          return
        }

        if (res.status === 403) {
          setError(data?.message || data?.error || "Vous n'êtes pas autorisé à publier cet avis.")
          setSubmitting(false)
          return
        }

        if (res.status === 404) {
          setError(data?.message || data?.error || 'Produit ou route introuvable.')
          setSubmitting(false)
          return
        }

        if (res.status === 409) {
          setError(data?.message || data?.error || 'Vous avez déjà publié un avis sur ce produit.')
          setSubmitting(false)
          return
        }

        if (res.status >= 500) {
          setError(data?.message || data?.error || data?.details || 'Erreur interne du serveur.')
          setSubmitting(false)
          return
        }

        setError(data?.message || data?.error || `Erreur HTTP ${res.status}`)
        setSubmitting(false)
        return
      }

      console.log('🎉 AVIS ENVOYÉ AVEC SUCCÈS')
      setSubmitted(true)
      setRating(0)
      setComment('')
      router.refresh()
      if (onSuccess) onSuccess()

    } catch (err) {
      console.error('🔥 FETCH ERROR:', err)
      if (err instanceof Error) {
        setError(`Erreur réseau : ${err.message}`)
      } else {
        setError('Impossible de contacter le serveur.')
      }
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center text-green-700">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-lg font-semibold">✅ Merci pour votre avis !</p>
        <p className="text-sm">Votre avis a bien été envoyé et sera publié après validation.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">✍️ Donnez votre avis</h3>

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-gray-700">Votre note</label>
        <div className="flex gap-1 text-3xl" onMouseLeave={() => setHoverRating(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              aria-label={`Donner ${star} étoile${star > 1 ? 's' : ''}`}
              className={`transition ${
                star <= (hoverRating || rating) ? 'text-yellow-400' : 'text-gray-300'
              } hover:scale-110`}
              onMouseEnter={() => setHoverRating(star)}
              onClick={() => setRating(star)}
            >
              ★
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-400">Cliquez sur les étoiles pour noter</p>
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-gray-700">Votre avis</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={5}
          maxLength={2000}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          placeholder="Qu'avez-vous pensé de ce produit ?"
          disabled={submitting}
        />
        <div className="mt-1 text-right text-xs text-gray-400">{comment.length}/2000</div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Envoi en cours...
          </span>
        ) : (
          'Publier mon avis'
        )}
      </button>
    </form>
  )
}