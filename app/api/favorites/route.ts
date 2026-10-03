export const dynamic = 'force-dynamic';

// app/api/favorites/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

interface FavoriteRequestBody {
  product_id: number | string
}

// ============================================================
// GET : Récupérer les favoris de l'utilisateur
// ============================================================
export async function GET(request: NextRequest) {
  try {
    // 🔥 Récupérer le token depuis les cookies
    const token = request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Non authentifié',
        favorites: [] 
      }, { status: 401 })
    }

    // 🔥 Décoder le token JWT
    let userId = null
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join('')
      )
      const decoded = JSON.parse(jsonPayload)
      userId = decoded?.id || decoded?.userId || null
    } catch (e) {
      return NextResponse.json({ 
        success: false, 
        error: 'Token invalide',
        favorites: [] 
      }, { status: 401 })
    }

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Utilisateur non identifié',
        favorites: [] 
      }, { status: 401 })
    }

    const db = await getDB()

    // 🔥 Récupérer les favoris
    const favorites = await db.all(`
      SELECT 
        f.id,
        f.product_id,
        p.title,
        p.slug,
        p.price,
        p.compare_price,
        p.avg_rating,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) as image,
        f.created_at as favorited_at
      FROM user_favorites f
      JOIN products p ON f.product_id = p.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `, [userId])

    return NextResponse.json({
      success: true,
      favorites: favorites || []
    })
    
  } catch (error) {
    console.error('❌ Erreur GET /api/favorites:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Erreur serveur',
      favorites: [] 
    }, { status: 500 })
  }
}

// ============================================================
// POST : Ajouter un favori
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // 🔥 Décoder le token
    let userId = null
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join('')
      )
      const decoded = JSON.parse(jsonPayload)
      userId = decoded?.id || decoded?.userId || null
    } catch (e) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 })
    }

    const body = (await request.json()) as FavoriteRequestBody
    const { product_id } = body

    if (!product_id) {
      return NextResponse.json({ error: 'ID produit requis' }, { status: 400 })
    }

    const db = await getDB()

    // Vérifier si le produit existe
    const product = await db.get(
      'SELECT id FROM products WHERE id = ? AND status = "published"',
      [product_id]
    )

    if (!product) {
      return NextResponse.json({ error: 'Produit non trouvé' }, { status: 404 })
    }

    // Vérifier si déjà en favori
    const existing = await db.get(
      'SELECT id FROM user_favorites WHERE user_id = ? AND product_id = ?',
      [userId, product_id]
    )

    if (existing) {
      return NextResponse.json({ 
        success: false, 
        error: 'Déjà dans les favoris' 
      }, { status: 409 })
    }

    // Ajouter aux favoris
    await db.run(
      `INSERT INTO user_favorites (user_id, product_id, created_at) 
       VALUES (?, ?, CURRENT_TIMESTAMP)`,
      [userId, product_id]
    )

    return NextResponse.json({
      success: true,
      message: 'Ajouté aux favoris'
    }, { status: 201 })
    
  } catch (error) {
    console.error('❌ Erreur POST /api/favorites:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// ============================================================
// DELETE : Supprimer un favori
// ============================================================
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // 🔥 Décoder le token
    let userId = null
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join('')
      )
      const decoded = JSON.parse(jsonPayload)
      userId = decoded?.id || decoded?.userId || null
    } catch (e) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json({ error: 'ID produit requis' }, { status: 400 })
    }

    const db = await getDB()

    // Supprimer le favori
    await db.run(
      'DELETE FROM user_favorites WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    )

    return NextResponse.json({
      success: true,
      message: 'Retiré des favoris'
    })
    
  } catch (error) {
    console.error('❌ Erreur DELETE /api/favorites:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// ============================================================
// OPTIONS : CORS
// ============================================================
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  })
}