// components/admin/reviews/AdminReviewTable.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, X, Eye, Edit, Trash2, Star, StarOff, Loader2 } from 'lucide-react'
import AdminReviewModerationModal from './AdminReviewModerationModal'

interface Review {
  id: number
  user_name?: string | null
  user_email?: string | null
  product_title?: string | null
  product_slug?: string | null
  rating: number
  comment?: string | null
  status: string
  is_featured: boolean
  is_verified_purchase: boolean
  admin_reply?: string | null
  created_at: string
}

interface AdminReviewTableProps {
  reviews: Review[]
}

interface ErrorResponse {
  error?: string
  message?: string
}

export default function AdminReviewTable({ reviews }: AdminReviewTableProps) {
  const router = useRouter()
  const [modalReview, setModalReview] = useState<Review | null>(null)
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})

  // Fonction pour gérer les actions
  const handleAction = async (
    id: number,
    action: 'approve' | 'reject' | 'feature' | 'unfeature' | 'delete'
  ) => {
    if (action === 'delete' && !confirm('⚠️ Supprimer définitivement cet avis ?')) return

    const key = `${id}-${action}`
    setLoadingStates((prev) => ({ ...prev, [key]: true }))

    try {
      let body: Record<string, unknown> = {}
      let method = 'PATCH'

      switch (action) {
        case 'approve':
          body = { status: 'approved', is_visible: 1 }
          break
        case 'reject':
          body = { status: 'rejected', is_visible: 0 }
          break
        case 'feature':
          body = { is_featured: 1 }
          break
        case 'unfeature':
          body = { is_featured: 0 }
          break
        case 'delete':
          method = 'DELETE'
          break
      }

      // ✅ URL corrigée : paramètre id dans la query string
      const url = `/api/admin/reviews?id=${id}`
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: method !== 'DELETE' ? JSON.stringify(body) : undefined,
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as ErrorResponse
        throw new Error(err.error || err.message || "Erreur lors de l'action")
      }

      router.refresh()
    } catch (error) {
      console.error('❌ Erreur action:', error)
      const message = error instanceof Error ? error.message : String(error)
      alert(message || 'Une erreur est survenue')
    } finally {
      setLoadingStates((prev) => ({ ...prev, [key]: false }))
    }
  }

  const isLoading = (id: number, action: string) => {
    return loadingStates[`${id}-${action}`] || false
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left font-medium">AVIS</th>
              <th className="px-4 py-3 text-left font-medium">PRODUIT</th>
              <th className="px-4 py-3 text-left font-medium">NOTE</th>
              <th className="px-4 py-3 text-left font-medium">STATUT</th>
              <th className="px-4 py-3 text-left font-medium">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {reviews.map((review) => (
              <tr key={review.id} className="transition hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    <p className="font-medium text-gray-800">
                      {review.user_name || 'Anonyme'}
                    </p>
                    <p className="line-clamp-2 text-xs text-gray-400">
                      {review.comment || 'Aucun commentaire'}
                    </p>
                    {review.is_verified_purchase && (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">
                        ✓ achat vérifié
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/product/${review.product_slug || ''}`}
                    target="_blank"
                    className="text-blue-600 hover:underline"
                  >
                    {review.product_title || 'Produit inconnu'}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="font-bold">{review.rating}</span>
                    <span className="text-yellow-400">★</span>
                    {review.is_featured && (
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      review.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : review.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {review.status === 'approved'
                      ? '✅ Approuvé'
                      : review.status === 'rejected'
                        ? '❌ Rejeté'
                        : '⏳ En attente'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1">
                    {review.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAction(review.id, 'approve')}
                          disabled={isLoading(review.id, 'approve')}
                          className="rounded-lg p-1.5 text-green-600 hover:bg-green-50 disabled:opacity-50"
                          title="Approuver"
                        >
                          {isLoading(review.id, 'approve') ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleAction(review.id, 'reject')}
                          disabled={isLoading(review.id, 'reject')}
                          className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title="Rejeter"
                        >
                          {isLoading(review.id, 'reject') ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </button>
                      </>
                    )}

                    {review.status === 'approved' && (
                      <>
                        {review.is_featured ? (
                          <button
                            onClick={() => handleAction(review.id, 'unfeature')}
                            disabled={isLoading(review.id, 'unfeature')}
                            className="rounded-lg p-1.5 text-yellow-600 hover:bg-yellow-50 disabled:opacity-50"
                            title="Retirer des vedettes"
                          >
                            {isLoading(review.id, 'unfeature') ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <StarOff className="h-4 w-4" />
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction(review.id, 'feature')}
                            disabled={isLoading(review.id, 'feature')}
                            className="rounded-lg p-1.5 text-yellow-600 hover:bg-yellow-50 disabled:opacity-50"
                            title="Mettre en vedette"
                          >
                            {isLoading(review.id, 'feature') ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Star className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </>
                    )}

                    <button
                      onClick={() => setModalReview(review)}
                      className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50"
                      title="Modérer"
                    >
                      <Edit className="h-4 w-4" />
                    </button>

                    <Link
                      href={`/product/${review.product_slug || ''}`}
                      target="_blank"
                      className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100"
                      title="Voir produit"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>

                    <button
                      onClick={() => handleAction(review.id, 'delete')}
                      disabled={isLoading(review.id, 'delete')}
                      className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      title="Supprimer"
                    >
                      {isLoading(review.id, 'delete') ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {reviews.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Aucun avis trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalReview && (
        <AdminReviewModerationModal
          review={modalReview}
          onClose={() => setModalReview(null)}
          onRefresh={() => router.refresh()}
        />
      )}
    </div>
  )
}