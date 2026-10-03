'use client'

import { useState, useEffect } from 'react'
import type { Review } from '@/lib/services/reviews'
import ReviewSummary from './ReviewSummary'
import ReviewCard from './ReviewCard'

interface ReviewsListProps {
  productSlug: string
}

interface ReviewSummaryData {
  average: number
  total: number
  distribution: { [key: number]: number }
  positive: number
  neutral: number
  negative: number
  pending: number
  featured: number
}

interface ReviewsApiResponse {
  summary?: ReviewSummaryData | null
  reviews?: Review[]
  error?: string
}

export default function ReviewsList({ productSlug }: ReviewsListProps) {
  const [mounted, setMounted] = useState(false)
  const [summary, setSummary] = useState<ReviewSummaryData | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fonction de chargement des avis
  const fetchReviews = async () => {
    try {
      setLoading(true)
      setError(null)

      // ✅ Route fixe avec slug en paramètre
      const res = await fetch(`/api/products/reviews?slug=${encodeURIComponent(productSlug)}`, {
        credentials: 'include',
      })

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Produit non trouvé')
        }
        throw new Error('Erreur lors du chargement des avis')
      }

      const data = (await res.json()) as ReviewsApiResponse
      setSummary(data.summary || null)
      setReviews(data.reviews || [])
    } catch (err: any) {
      console.error('❌ Erreur chargement avis:', err)
      setError(err.message || 'Impossible de charger les avis')
    } finally {
      setLoading(false)
    }
  }

  // 1. Marquer le composant comme monté
  useEffect(() => {
    setMounted(true)
  }, [])

  // 2. Charger les avis au montage et à chaque changement de slug
  useEffect(() => {
    if (!mounted) return
    fetchReviews()
  }, [mounted, productSlug])

  // 3. Écouter l'événement de soumission d'avis pour recharger
  useEffect(() => {
    if (!mounted) return

    const handleReviewSubmitted = () => {
      console.log('🔄 Nouvel avis soumis → rechargement')
      fetchReviews()
    }

    window.addEventListener('review-submitted', handleReviewSubmitted)
    return () => {
      window.removeEventListener('review-submitted', handleReviewSubmitted)
    }
  }, [mounted, productSlug])

  // ═════════════════════════════════════════════════════════════
  // RENDU
  // ═════════════════════════════════════════════════════════════

  if (!mounted || loading) {
    return (
      <div className="py-8 text-center text-gray-400">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <p className="mt-2">Chargement des avis...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center text-red-500">
        <p>{error}</p>
        <button
          onClick={fetchReviews}
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div>
      {summary && summary.total > 0 && <ReviewSummary summary={summary} />}

      <div className="mt-6 space-y-4">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <ReviewCard key={review.id} review={review} showHelpful={true} />
          ))
        ) : (
          <p className="py-8 text-center text-gray-400">
            Aucun avis pour le moment. Soyez le premier à donner votre avis !
          </p>
        )}
      </div>
    </div>
  )
}