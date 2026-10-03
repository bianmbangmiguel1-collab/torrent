// app/admin/reviews/page.tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { getAdminReviews } from '@/lib/services/reviews'
import { getDB } from '@/lib/db'
import Link from 'next/link'
import AdminReviewDashboard from '@/components/admin/reviews/AdminReviewDashboard'
import AdminReviewFilters from '@/components/admin/reviews/AdminReviewFilters'
import AdminReviewTable from '@/components/admin/reviews/AdminReviewTable'

export const metadata = {
  title: 'Gestion des avis | TorrentTwist Admin',
  description: 'Modérez les avis clients – approuvez, rejetez, mettez en vedette ou supprimez.',
}

interface SearchParams {
  status?: string
  rating?: string
  productId?: string
  search?: string
  page?: string
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams> | SearchParams
}) {
  // ============================================================
  // 1. VÉRIFICATION ADMIN UNIFIÉE (comme stock et categories)
  // ============================================================

  try {
    await requireAdmin({
      cookies: cookies(),
      headers: {
        get: () => null,
      },
    })
  } catch {
    redirect('/admin/login')
  }

  // ============================================================
  // 2. RÉSOLUTION DES SEARCHPARAMS (compatible Next.js 15+)
  // ============================================================

  const params = searchParams instanceof Promise ? await searchParams : searchParams

  const status = params.status || 'all'
  const rating = params.rating ? Number(params.rating) : undefined
  const productId = params.productId ? Number(params.productId) : undefined
  const search = params.search || ''
  const page = Math.max(1, Number(params.page) || 1)
  const limit = 20

  // ============================================================
  // 3. CHARGEMENT DES AVIS
  // ============================================================

  const { reviews, total } = await getAdminReviews({
    status,
    rating,
    productId,
    search,
    page,
    limit,
  })

  // ============================================================
  // 4. STATISTIQUES GLOBALES
  // ============================================================

  const db = await getDB()

  const statsResult = await db.get<{
    total: number
    pending: number
    approved: number
    rejected: number
    avg: number
    positive: number
    neutral: number
    negative: number
    featured: number
    verified_count: number
  }>(
    `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      COALESCE(AVG(rating), 0) as avg,
      SUM(CASE WHEN rating >= 4 AND status = 'approved' THEN 1 ELSE 0 END) as positive,
      SUM(CASE WHEN rating = 3 AND status = 'approved' THEN 1 ELSE 0 END) as neutral,
      SUM(CASE WHEN rating <= 2 AND status = 'approved' THEN 1 ELSE 0 END) as negative,
      SUM(CASE WHEN is_featured = 1 THEN 1 ELSE 0 END) as featured,
      SUM(CASE WHEN is_verified_purchase = 1 AND status = 'approved' THEN 1 ELSE 0 END) as verified_count
    FROM reviews
    `
  )

  const stats = {
    total: statsResult?.total || 0,
    pending: statsResult?.pending || 0,
    approved: statsResult?.approved || 0,
    rejected: statsResult?.rejected || 0,
    average: statsResult?.avg || 0,
    positive: statsResult?.positive || 0,
    neutral: statsResult?.neutral || 0,
    negative: statsResult?.negative || 0,
    featured: statsResult?.featured || 0,
    verified: statsResult?.verified_count || 0,
  }

  // ============================================================
  // 5. LISTE DES PRODUITS POUR LE FILTRE
  // ============================================================
  // ⚠️ CORRECTION : db.all<T> attend le type d'UN ÉLÉMENT, pas du tableau.
  // Avant : db.all<{ id: number; title: string }[]>() → renvoyait [][]
  // Après : db.all<{ id: number; title: string }>()   → renvoie []

  const products = await db.all<{ id: number; title: string }>(
    'SELECT id, title FROM products WHERE status = "published" ORDER BY title ASC'
  )

  // ============================================================
  // 6. RENDU
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        {/* En-tête avec bouton Tableau de bord */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
              ⭐ Avis clients
            </h1>
            <p className="text-sm text-gray-500">
              {total} avis au total
            </p>
          </div>
          <Link
            href="/admin"
            className="mt-3 sm:mt-0 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition"
          >
            Tableau de bord
          </Link>
        </div>

        {/* Dashboard des statistiques */}
        <AdminReviewDashboard stats={stats} />

        {/* Filtres */}
        <AdminReviewFilters
          currentStatus={status}
          currentRating={rating ? String(rating) : 'all'}
          currentProductId={productId ? String(productId) : 'all'}
          currentSearch={search}
          products={products}
        />

        {/* Tableau des avis */}
        <div className="mt-6">
          <AdminReviewTable reviews={reviews} />
        </div>

        {/* Pagination simple */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>Affichage de {reviews.length} avis</span>
          <span>Total : {total} avis</span>
        </div>
      </div>
    </div>
  )
}