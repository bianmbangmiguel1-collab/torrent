// app/api/reviews/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import { getDB } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'

// ============================================================
// Types
// ============================================================
interface CreateReviewBody {
  product_id?: number | string | null
  productId?: number | string | null
  product?: number | string | null

  productSlug?: string | null
  product_slug?: string | null
  slug?: string | null

  rating?: number | string | null
  note?: number | string | null
  stars?: number | string | null

  title?: string | null
  content?: string | null
  comment?: string | null
  avis?: string | null
  message?: string | null

  order_id?: number | string | null
  orderId?: number | string | null
}

async function getUserFromToken(request: NextRequest) {
  let token =
    request.cookies.get('user_session')?.value ||
    request.cookies.get('admin_session')?.value ||
    request.cookies.get('token')?.value

  if (!token) {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
  }

  if (!token) throw new Error('TOKEN_MISSING')

  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jose.jwtVerify(token, secret, { algorithms: ['HS256'] })

    const rawId = (payload as any).id || (payload as any).userId || (payload as any).sub
    const userId = parseInt(String(rawId), 10)
    if (Number.isNaN(userId)) throw new Error('USER_NOT_FOUND')

    const db = await getDB()
    const user = await db.get(
      `SELECT id, name, email FROM users WHERE id = ?`,
      [userId]
    )
    if (!user) throw new Error('USER_NOT_FOUND')

    return { user, db }
  } catch (err: any) {
    if (err.message === 'TOKEN_MISSING' || err.message === 'USER_NOT_FOUND') throw err
    console.error('❌ Token reviews invalide:', err)
    throw new Error('TOKEN_INVALID')
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 POST /api/reviews/create - début')

    const { user, db } = await getUserFromToken(request)
    const body = await request.json() as CreateReviewBody

    console.log('📦 Body reçu:', JSON.stringify(body))

    // ============================================================
    // EXTRACTION TOLÉRANTE (accepte plusieurs noms de champs)
    // ============================================================
    const rawProductId = body.product_id ?? body.productId ?? body.product
    const rawProductSlug = body.productSlug ?? body.product_slug ?? body.slug

    const rawRating = body.rating ?? body.note ?? body.stars
    const rating = parseInt(String(rawRating ?? ''), 10)

    // Le commentaire peut être dans "content", "comment", "avis" ou "message"
    // On préfixe avec "title" si fourni
    const title = String(body.title ?? '').trim()
    const contentRaw = String(body.content ?? body.comment ?? body.avis ?? body.message ?? '').trim()
    const comment = title
      ? `**${title}**\n\n${contentRaw}`
      : (contentRaw || null)

    const rawOrderId = body.order_id ?? body.orderId
    const orderId = rawOrderId ? parseInt(String(rawOrderId), 10) : null

    // ============================================================
    // RÉSOLUTION DU PRODUIT (par ID ou par SLUG)
    // ============================================================
    let product: any = null

    const productIdNum = rawProductId ? parseInt(String(rawProductId), 10) : NaN

    if (!Number.isNaN(productIdNum)) {
      // Cas 1 : un ID valide est fourni
      product = await db.get(
        'SELECT id, title FROM products WHERE id = ?',
        [productIdNum]
      )
    } else if (rawProductSlug) {
      // Cas 2 : un slug est fourni → on cherche l'ID correspondant
      product = await db.get(
        'SELECT id, title FROM products WHERE slug = ?',
        [String(rawProductSlug).trim()]
      )
    }

    console.log('📦 Champs extraits →', {
      productId: product?.id ?? null,
      productSlug: rawProductSlug,
      rating,
      comment,
      orderId,
    })

    // ============================================================
    // VALIDATIONS
    // ============================================================
    if (!product) {
      console.error('❌ Produit introuvable. Body:', body)
      return NextResponse.json(
        { success: false, error: 'Produit introuvable (product_id ou productSlug requis)' },
        { status: 400 }
      )
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'La note doit être entre 1 et 5' },
        { status: 400 }
      )
    }

    const productId = product.id

    // ============================================================
    // DOUBLON
    // ============================================================
    const existing = await db.get(
      'SELECT id FROM reviews WHERE user_id = ? AND product_id = ?',
      [user.id, productId]
    )

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Vous avez déjà laissé un avis pour ce produit' },
        { status: 409 }
      )
    }

    // ============================================================
    // ACHAT VÉRIFIÉ
    // ============================================================
    let isVerifiedPurchase = 0
    try {
      const paidOrder = await db.get(
        `SELECT id FROM orders
         WHERE user_id = ? AND product_id = ? AND payment_status = 'paid'
         LIMIT 1`,
        [user.id, productId]
      )
      if (paidOrder) isVerifiedPurchase = 1
    } catch (err) {
      console.warn('⚠️ Impossible de vérifier l\'achat:', err)
    }

    // ============================================================
    // INSERTION
    // ============================================================
    const result = await db.run(
      `INSERT INTO reviews
       (user_id, product_id, order_id, rating, comment, status,
        is_verified_purchase, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))`,
      [user.id, productId, orderId, rating, comment, isVerifiedPurchase]
    )

    console.log(`✅ Avis créé par ${user.email} pour produit ${productId} (${rating}/5)`)

    return NextResponse.json(
      {
        success: true,
        message: 'Avis soumis avec succès. Il sera publié après vérification.',
        review: {
          id: result.lastID,
          user_id: user.id,
          product_id: productId,
          product_slug: rawProductSlug || null,
          rating,
          comment,
          is_verified_purchase: isVerifiedPurchase === 1,
          status: 'pending',
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('❌ ERREUR POST /api/reviews/create:', error)

    if (error.message === 'TOKEN_MISSING') {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }
    if (error.message === 'TOKEN_INVALID') {
      return NextResponse.json({ success: false, error: 'Token invalide' }, { status: 401 })
    }
    if (error.message === 'USER_NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 404 })
    }

    return NextResponse.json(
      { success: false, error: error?.message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'