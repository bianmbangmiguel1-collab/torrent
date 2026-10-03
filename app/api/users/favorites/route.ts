// app/api/users/favorites/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import { getDB } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'

// ============================================================
// Types
// ============================================================
interface FavoriteRequest {
  product_id?: number | string;
}

async function getUserId(request: NextRequest): Promise<number | null> {
  let token =
    request.cookies.get('user_session')?.value ||
    request.cookies.get('admin_session')?.value ||
    request.cookies.get('token')?.value

  if (!token) {
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
  }

  if (!token) return null

  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jose.jwtVerify(token, secret, { algorithms: ['HS256'] })
    const rawId = (payload as any).id || (payload as any).userId || (payload as any).sub
    const userId = parseInt(String(rawId), 10)
    return Number.isNaN(userId) ? null : userId
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const db = await getDB()

    const favorites = await db.all(
      `SELECT f.id, f.product_id, f.created_at, p.title, p.slug, p.price,
              p.compare_price, p.stock, p.status,
              (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) AS main_image
       FROM user_favorites f
       LEFT JOIN products p ON f.product_id = p.id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [userId]
    )

    return NextResponse.json({
      success: true,
      favorites: favorites || [],
      total: favorites?.length || 0,
    })
  } catch (error: any) {
    console.error('❌ Erreur /api/users/favorites GET:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json() as FavoriteRequest
    const productId = parseInt(String(body.product_id), 10)

    if (!productId || Number.isNaN(productId)) {
      return NextResponse.json({ success: false, error: 'product_id requis' }, { status: 400 })
    }

    const db = await getDB()

    const product = await db.get('SELECT id FROM products WHERE id = ?', [productId])
    if (!product) {
      return NextResponse.json({ success: false, error: 'Produit introuvable' }, { status: 404 })
    }

    await db.run(
      `INSERT OR IGNORE INTO user_favorites (user_id, product_id, created_at)
       VALUES (?, ?, datetime('now'))`,
      [userId, productId]
    )

    try {
      await db.run(
        `UPDATE users SET total_favorites = (SELECT COUNT(*) FROM user_favorites WHERE user_id = ?) WHERE id = ?`,
        [userId, userId]
      )
    } catch {}

    return NextResponse.json({ success: true, message: 'Ajouté aux favoris', product_id: productId })
  } catch (error: any) {
    console.error('❌ Erreur /api/users/favorites POST:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const productId = parseInt(searchParams.get('product_id') || '', 10)

    if (!productId || Number.isNaN(productId)) {
      return NextResponse.json({ success: false, error: 'product_id requis' }, { status: 400 })
    }

    const db = await getDB()

    await db.run(
      'DELETE FROM user_favorites WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    )

    try {
      await db.run(
        `UPDATE users SET total_favorites = (SELECT COUNT(*) FROM user_favorites WHERE user_id = ?) WHERE id = ?`,
        [userId, userId]
      )
    } catch {}

    return NextResponse.json({ success: true, message: 'Retiré des favoris', product_id: productId })
  } catch (error: any) {
    console.error('❌ Erreur /api/users/favorites DELETE:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'