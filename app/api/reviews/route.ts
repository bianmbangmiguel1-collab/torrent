// app/api/reviews/route.ts

console.log('🔥 ROUTE FIXE /api/reviews chargée')

import { NextRequest, NextResponse } from 'next/server'
import { getProductReviews, createReview, getProductReviewSummary } from '@/lib/services/reviews'
import { verifyToken } from '@/lib/auth'
import { getDB } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface CreateReviewBody {
  slug: string
  rating: number | string
  comment: string
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}

export async function GET(request: NextRequest) {
  console.log('🚀 GET /api/reviews')
  try {
    const slug = request.nextUrl.searchParams.get('slug')
    if (!slug) {
      return NextResponse.json({ error: 'Slug requis' }, { status: 400 })
    }

    const db = await getDB()
    const product = await db.get<{ id: number }>(
      'SELECT id FROM products WHERE slug = ? AND status = "published"',
      [slug]
    )
    if (!product) {
      return NextResponse.json({ error: 'Produit non trouvé' }, { status: 404 })
    }

    const limit = Number(request.nextUrl.searchParams.get('limit')) || 10
    const offset = Number(request.nextUrl.searchParams.get('offset')) || 0

    const { reviews, total } = await getProductReviews(product.id, limit, offset)
    const summary = await getProductReviewSummary(product.id)

    return NextResponse.json({ success: true, reviews, total, summary })
  } catch (error) {
    console.error('❌ Erreur GET reviews:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  console.log('🚀 POST /api/reviews appelée')
  try {
    let body: CreateReviewBody

    try {
      body = (await request.json()) as CreateReviewBody
    } catch {
      return NextResponse.json(
        { success: false, error: 'JSON invalide' },
        { status: 400 }
      )
    }

    const { slug, rating, comment } = body
    if (!slug) {
      return NextResponse.json({ success: false, error: 'Slug manquant' }, { status: 400 })
    }

    console.log(`📦 Produit: ${slug}, note: ${rating}`)

    // --- Token ---
    let token = request.cookies.get('token')?.value
    if (!token) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7)
    }
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token manquant' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Token invalide' }, { status: 401 })
    }

    const userId = Number(payload.id ?? payload.userId ?? payload.sub)
    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ success: false, error: 'ID utilisateur invalide' }, { status: 401 })
    }

    // --- Validation ---
    const ratingNum = Number(rating)
    const commentStr = typeof comment === 'string' ? comment.trim() : ''
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json({ success: false, error: 'Note invalide (1-5)' }, { status: 400 })
    }
    if (!commentStr || commentStr.length < 5) {
      return NextResponse.json({ success: false, error: 'Avis trop court (min 5 caractères)' }, { status: 400 })
    }

    // --- Produit ---
    const db = await getDB()
    const product = await db.get<{ id: number; title: string }>(
      'SELECT id, title FROM products WHERE slug = ? AND status = "published"',
      [slug]
    )
    if (!product) {
      return NextResponse.json({ success: false, error: 'Produit non trouvé' }, { status: 404 })
    }

    // --- Déjà avis ? ---
    const existing = await db.get<{ id: number }>(
      'SELECT id FROM reviews WHERE user_id = ? AND product_id = ?',
      [userId, product.id]
    )
    if (existing) {
      return NextResponse.json({ success: false, error: 'Avis déjà existant' }, { status: 409 })
    }

    // --- Achat vérifié ---
    let orderId = null, isVerifiedPurchase = 0
    const order = await db.get<{ id: number }>(
      `SELECT o.id FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE o.user_id = ? AND oi.product_id = ? AND (o.payment_status = 'paid' OR o.status = 'completed') ORDER BY o.created_at DESC LIMIT 1`,
      [userId, product.id]
    )
    if (order) { orderId = order.id; isVerifiedPurchase = 1 }

    // --- Création ---
    const result = await createReview(userId, product.id, ratingNum, commentStr, orderId)
    if (!result.success || !result.reviewId) {
      return NextResponse.json({ success: false, error: 'Erreur création' }, { status: 400 })
    }

    await db.run(
      `UPDATE reviews SET status = 'pending', is_visible = 1, is_verified_purchase = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [isVerifiedPurchase, result.reviewId]
    )

    console.log(`✅ Avis créé ID ${result.reviewId}`)

    return NextResponse.json({
      success: true,
      message: 'Avis envoyé, en attente de modération.',
      review: {
        id: result.reviewId,
        product_id: product.id,
        rating: ratingNum,
        comment: commentStr,
        order_id: orderId,
        is_verified_purchase: isVerifiedPurchase,
        status: 'pending'
      }
    }, { status: 201 })
  } catch (error) {
    console.error('❌ Erreur POST review:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}