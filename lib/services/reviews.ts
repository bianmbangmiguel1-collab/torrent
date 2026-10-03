// lib/services/reviews.ts
import { getDB } from '@/lib/db'

// ============================================================
// TYPES
// ============================================================

export interface Review {
  id: number
  user_id: number
  product_id: number
  order_id: number | null
  rating: number
  comment: string | null
  status: 'pending' | 'approved' | 'rejected'
  is_verified_purchase: boolean
  is_featured: boolean
  helpful_count: number
  not_helpful_count: number
  admin_reply: string | null
  sentiment: string | null
  spam_score: number | null
  is_visible: boolean
  display_priority: number
  scheduled_start: string | null
  scheduled_end: string | null
  display_count: number
  click_count: number
  conversion_count: number
  created_at: string
  updated_at: string
  user_name?: string
  user_avatar?: string
  product_title?: string
  product_slug?: string
  product_price?: number
  category_name?: string
}

export interface ReviewSummary {
  average: number
  total: number
  distribution: { [rating: number]: number }
  positive: number
  neutral: number
  negative: number
  pending: number
  featured: number
}

export interface ReviewAnalytics {
  total: number
  pending: number
  featured: number
  visible: number
  avgRating: number
  positive: number
  negative: number
  displayStats: { total: number; clicks: number; conversions: number }
  topReviews: Review[]
}

// ============================================================
// RÉCUPÉRER LES AVIS APPROUVÉS POUR UN PRODUIT (client)
// ============================================================

export async function getProductReviews(
  productId: number,
  limit: number = 10,
  offset: number = 0
) {
  const db = await getDB()

  const reviews = await db.all<Review>(
    `
    SELECT 
      r.*,
      u.name as user_name,
      u.avatar as user_avatar
    FROM reviews r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE r.product_id = ? 
      AND r.status = 'approved' 
      AND r.is_visible = 1
    ORDER BY r.is_featured DESC, r.helpful_count DESC, r.created_at DESC
    LIMIT ? OFFSET ?
    `,
    [productId, limit, offset]
  )

  const total = await db.get<{ count: number }>(
    `
    SELECT COUNT(*) as count 
    FROM reviews 
    WHERE product_id = ? 
      AND status = 'approved' 
      AND is_visible = 1
    `,
    [productId]
  )

  return { reviews, total: total?.count || 0 }
}

// ============================================================
// RÉSUMÉ DES NOTES POUR UN PRODUIT
// ============================================================

export async function getProductReviewSummary(productId: number): Promise<ReviewSummary> {
  const db = await getDB()

  const stats = await db.get<{
    avg: number
    total: number
    count1: number
    count2: number
    count3: number
    count4: number
    count5: number
    positive: number
    neutral: number
    negative: number
    pending: number
    featured: number
  }>(
    `
    SELECT
      COALESCE(AVG(rating), 0) as avg,
      COUNT(*) as total,
      SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as count1,
      SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as count2,
      SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as count3,
      SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as count4,
      SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as count5,
      SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) as positive,
      SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as neutral,
      SUM(CASE WHEN rating <= 2 THEN 1 ELSE 0 END) as negative,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN is_featured = 1 THEN 1 ELSE 0 END) as featured
    FROM reviews
    WHERE product_id = ? 
      AND status = 'approved' 
      AND is_visible = 1
    `,
    [productId]
  )

  if (!stats) {
    return {
      average: 0,
      total: 0,
      distribution: {},
      positive: 0,
      neutral: 0,
      negative: 0,
      pending: 0,
      featured: 0,
    }
  }

  return {
    average: stats.avg,
    total: stats.total,
    distribution: {
      1: stats.count1 || 0,
      2: stats.count2 || 0,
      3: stats.count3 || 0,
      4: stats.count4 || 0,
      5: stats.count5 || 0,
    },
    positive: stats.positive || 0,
    neutral: stats.neutral || 0,
    negative: stats.negative || 0,
    pending: stats.pending || 0,
    featured: stats.featured || 0,
  }
}

// ============================================================
// CRÉER UN AVIS (client) – status = 'pending' par défaut
// ============================================================

export async function createReview(
  userId: number,
  productId: number,
  rating: number,
  comment: string,
  orderId?: number | null
): Promise<{ success: boolean; reviewId?: number; error?: string }> {
  try {
    const db = await getDB()

    // 1. Vérifier si l'utilisateur a déjà un avis sur ce produit
    const existing = await db.get<{ id: number }>(
      'SELECT id FROM reviews WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    )

    if (existing) {
      return {
        success: false,
        error: 'Vous avez déjà donné votre avis sur ce produit.',
      }
    }

    // 2. Vérifier l'achat si un orderId est fourni
    let isVerified = 0
    if (orderId) {
      const order = await db.get<{ id: number }>(
        'SELECT id FROM orders WHERE id = ? AND user_id = ?',
        [orderId, userId]
      )
      if (order) isVerified = 1
    }

    // 3. Analyse simple du sentiment (pour statistiques)
    const sentiment = rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral'

    // 4. Score de spam simplifié (pour modération future)
    const spam_score = comment?.length > 200 ? 0.1 : 0.05

    // 5. Insérer l'avis avec status = 'pending'
    const result = await db.run(
      `
        INSERT INTO reviews (
          user_id,
          product_id,
          rating,
          comment,
          order_id,
          is_verified_purchase,
          is_featured,
          is_visible,
          status,
          sentiment,
          spam_score,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 0, 1, 'pending', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      [
        userId,
        productId,
        rating,
        comment,
        orderId || null,
        isVerified,
        sentiment,
        spam_score,
      ]
    )

    return {
      success: true,
      reviewId: result.lastID,
    }
  } catch (error: any) {
    console.error('❌ Erreur createReview:', error)
    return {
      success: false,
      error: error.message || "Erreur lors de la création de l'avis",
    }
  }
}

// ============================================================
// RÉCUPÉRER UN AVIS PAR SON ID
// ============================================================

export async function getReviewById(reviewId: number): Promise<Review | null> {
  const db = await getDB()
  const review = await db.get<Review>(
    `
    SELECT 
      r.*,
      u.name as user_name,
      u.avatar as user_avatar,
      p.title as product_title,
      p.slug as product_slug
    FROM reviews r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN products p ON r.product_id = p.id
    WHERE r.id = ?
    `,
    [reviewId]
  )
  return review || null
}

// ============================================================
// ADMIN – RÉCUPÉRER TOUS LES AVIS AVEC FILTRES
// ============================================================

export async function getAdminReviews(filters: {
  status?: string
  rating?: number
  productId?: number
  search?: string
  page?: number
  limit?: number
  is_visible?: boolean
}) {
  const db = await getDB()
  const whereClauses: string[] = []
  const params: any[] = []

  if (filters.status && filters.status !== 'all') {
    whereClauses.push('r.status = ?')
    params.push(filters.status)
  }

  if (filters.rating) {
    whereClauses.push('r.rating = ?')
    params.push(filters.rating)
  }

  if (filters.productId) {
    whereClauses.push('r.product_id = ?')
    params.push(filters.productId)
  }

  if (filters.is_visible !== undefined) {
    whereClauses.push('r.is_visible = ?')
    params.push(filters.is_visible ? 1 : 0)
  }

  if (filters.search) {
    whereClauses.push('(u.name LIKE ? OR r.comment LIKE ? OR p.title LIKE ?)')
    const s = `%${filters.search}%`
    params.push(s, s, s)
  }

  const where = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : ''
  const limit = filters.limit || 20
  const offset = ((filters.page || 1) - 1) * limit

  const query = `
    SELECT 
      r.*,
      COALESCE(u.name, '') as user_name,
      COALESCE(u.email, '') as user_email,
      COALESCE(p.title, '') as product_title,
      COALESCE(p.slug, '') as product_slug
    FROM reviews r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN products p ON r.product_id = p.id
    ${where}
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `
  const reviews = await db.all<Review>(query, [...params, limit, offset])

  const countResult = await db.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM reviews r ${where}`,
    params
  )

  return { reviews, total: countResult?.count || 0 }
}

// ============================================================
// ADMIN – METTRE À JOUR UN AVIS (approbation, rejet, vedette, etc.)
// RETOURNE L'AVIS MIS À JOUR ou null si non trouvé
// ============================================================

export async function updateReview(
  reviewId: number,
  data: {
    status?: string
    admin_reply?: string | null
    is_featured?: boolean
    is_visible?: boolean
    display_priority?: number
    scheduled_start?: string | null
    scheduled_end?: string | null
  }
): Promise<Review | null> {
  const db = await getDB()

  // Vérifier que l'avis existe
  const existing = await db.get<{ id: number }>('SELECT id FROM reviews WHERE id = ?', [reviewId])
  if (!existing) return null

  const updates: string[] = []
  const values: any[] = []

  if (data.status !== undefined) {
    updates.push('status = ?')
    values.push(data.status)
  }
  if (data.admin_reply !== undefined) {
    updates.push('admin_reply = ?')
    values.push(data.admin_reply)
  }
  if (data.is_featured !== undefined) {
    updates.push('is_featured = ?')
    values.push(data.is_featured ? 1 : 0)
  }
  if (data.is_visible !== undefined) {
    updates.push('is_visible = ?')
    values.push(data.is_visible ? 1 : 0)
  }
  if (data.display_priority !== undefined) {
    updates.push('display_priority = ?')
    values.push(data.display_priority)
  }
  if (data.scheduled_start !== undefined) {
    updates.push('scheduled_start = ?')
    values.push(data.scheduled_start)
  }
  if (data.scheduled_end !== undefined) {
    updates.push('scheduled_end = ?')
    values.push(data.scheduled_end)
  }

  if (updates.length === 0) return null

  // Toujours mettre à jour updated_at
  updates.push('updated_at = CURRENT_TIMESTAMP')
  values.push(reviewId)

  await db.run(`UPDATE reviews SET ${updates.join(', ')} WHERE id = ?`, values)

  // Récupérer l'avis mis à jour
  return await getReviewById(reviewId)
}

// ============================================================
// ADMIN – SUPPRIMER UN AVIS (retourne true si supprimé)
// ============================================================

export async function deleteReview(reviewId: number): Promise<boolean> {
  const db = await getDB()
  const result = await db.run('DELETE FROM reviews WHERE id = ?', [reviewId])
  return Number(result.changes ?? 0) > 0
}

// ============================================================
// CLIENT – MARQUER UN AVIS COMME UTILE / PAS UTILE
// ============================================================

export async function markHelpful(reviewId: number, helpful: boolean): Promise<void> {
  const db = await getDB()
  const field = helpful ? 'helpful_count' : 'not_helpful_count'
  await db.run(`UPDATE reviews SET ${field} = ${field} + 1 WHERE id = ?`, [reviewId])
}

// ============================================================
// AVIS VEDETTES – RÉCUPÉRER LES AVIS À AFFICHER
// ============================================================

export async function getFeaturedReviews(options: {
  limit?: number
  productId?: number
  excludeIds?: number[]
  context?: 'home' | 'product' | 'category'
}): Promise<Review[]> {
  const db = await getDB()
  const { limit = 5, productId, excludeIds = [], context = 'home' } = options

  const whereClauses = [
    "r.status = 'approved'",
    'r.is_visible = 1',
    "(r.scheduled_start IS NULL OR r.scheduled_start <= datetime('now'))",
    "(r.scheduled_end IS NULL OR r.scheduled_end >= datetime('now'))",
  ]

  const params: any[] = []

  if (productId) {
    whereClauses.push('r.product_id = ?')
    params.push(productId)
  }

  if (context === 'home') {
    whereClauses.push('r.is_featured = 1')
  }

  if (excludeIds.length > 0) {
    whereClauses.push(`r.id NOT IN (${excludeIds.map(() => '?').join(',')})`)
    params.push(...excludeIds)
  }

  const query = `
    SELECT
      r.*,
      u.name as user_name,
      u.avatar as user_avatar,
      p.title as product_title,
      p.slug as product_slug,
      p.price as product_price,
      c.name as category_name
    FROM reviews r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN products p ON r.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY 
      r.display_priority DESC,
      r.is_featured DESC,
      r.helpful_count DESC,
      RANDOM()
    LIMIT ?
  `
  params.push(limit)

  const reviews = await db.all<Review>(query, params)
  return reviews
}

// ============================================================
// AVIS VEDETTES – SÉLECTION AUTOMATIQUE (IA)
// ============================================================

export async function autoSelectFeaturedReviews(limit = 10): Promise<number[]> {
  const db = await getDB()

  const reviews = await db.all<{ id: number; score: number }>(
    `SELECT
      id,
      (rating * 0.3) +
      (helpful_count / 10.0 * 0.25) +
      (is_verified_purchase * 0.2) +
      (CASE WHEN julianday('now') - julianday(created_at) < 30 THEN 0.15 ELSE 0 END) +
      (CASE WHEN comment IS NOT NULL AND LENGTH(comment) > 50 THEN 0.1 ELSE 0 END) as score
    FROM reviews
    WHERE status = 'approved' AND is_visible = 1
    ORDER BY score DESC
    LIMIT ?`,
    [limit * 2]
  )

  const shuffled = reviews.sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, limit).map((r) => r.id)

  for (const id of selected) {
    await db.run('UPDATE reviews SET display_priority = 1 WHERE id = ?', [id])
  }

  return selected
}

// ============================================================
// SUIVI DES AFFICHAGES, CLICS, CONVERSIONS
// ============================================================

export async function trackReviewDisplay(reviewId: number): Promise<void> {
  const db = await getDB()
  await db.run('UPDATE reviews SET display_count = display_count + 1 WHERE id = ?', [reviewId])
}

export async function trackReviewClick(reviewId: number): Promise<void> {
  const db = await getDB()
  await db.run('UPDATE reviews SET click_count = click_count + 1 WHERE id = ?', [reviewId])
}

export async function trackReviewConversion(reviewId: number): Promise<void> {
  const db = await getDB()
  await db.run('UPDATE reviews SET conversion_count = conversion_count + 1 WHERE id = ?', [reviewId])
}

// ============================================================
// ADMIN – STATISTIQUES AVANCÉES
// ============================================================

export async function getReviewAnalytics(): Promise<ReviewAnalytics> {
  const db = await getDB()

  const stats = await db.get<{
    total: number
    pending: number
    featured: number
    visible: number
    avgRating: number
    positive: number
    negative: number
    totalDisplay: number
    totalClicks: number
    totalConversions: number
  }>(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN is_featured = 1 THEN 1 ELSE 0 END) as featured,
      SUM(CASE WHEN is_visible = 1 THEN 1 ELSE 0 END) as visible,
      COALESCE(AVG(rating), 0) as avgRating,
      SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) as positive,
      SUM(CASE WHEN rating <= 2 THEN 1 ELSE 0 END) as negative,
      SUM(display_count) as totalDisplay,
      SUM(click_count) as totalClicks,
      SUM(conversion_count) as totalConversions
    FROM reviews`
  )

  const topReviews = await db.all<Review>(
    `SELECT 
      r.*,
      u.name as user_name,
      p.title as product_title
    FROM reviews r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN products p ON r.product_id = p.id
    WHERE r.status = 'approved'
    ORDER BY r.helpful_count DESC
    LIMIT 5`
  )

  return {
    total: stats?.total || 0,
    pending: stats?.pending || 0,
    featured: stats?.featured || 0,
    visible: stats?.visible || 0,
    avgRating: stats?.avgRating || 0,
    positive: stats?.positive || 0,
    negative: stats?.negative || 0,
    displayStats: {
      total: stats?.totalDisplay || 0,
      clicks: stats?.totalClicks || 0,
      conversions: stats?.totalConversions || 0,
    },
    topReviews,
  }
}