export const dynamic = 'force-dynamic';

// app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

// ============================================================
// TYPES
// ============================================================

interface UpdateOrderBody {
  status?: string
}

// ============================================================
// GET : Récupérer une commande spécifique
// ============================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const orderId = parseInt(id)

    if (isNaN(orderId) || orderId <= 0) {
      return NextResponse.json(
        { error: 'ID de commande invalide' },
        { status: 400 }
      )
    }

    // 🔥 Récupérer le token depuis les cookies
    const token = request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // 🔥 Décoder le token JWT manuellement
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

    const db = await getDB()

    // 🔥 Récupérer la commande avec vérification de propriété - snake_case
    const order = await db.get(`
      SELECT 
        o.id,
        o.order_number,
        o.user_id,
        o.subtotal,
        o.total,
        o.currency,
        o.status,
        o.payment_status,
        o.payment_method,
        o.transaction_id,
        o.shipping_address,
        o.shipping_city,
        o.shipping_country,
        o.shipping_postal,
        o.download_token,
        o.download_expires_at,
        o.download_count,
        o.download_limit,
        o.notes,
        o.created_at,
        o.updated_at,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ? AND o.user_id = ?
    `, [orderId, userId])

    if (!order) {
      return NextResponse.json(
        { error: 'Commande non trouvée ou accès non autorisé' },
        { status: 404 }
      )
    }

    // 🔥 Récupérer les items de la commande
    const items = await db.all(`
      SELECT 
        id,
        product_id,
        product_title,
        quantity,
        price,
        total,
        product_file_path,
        product_file_size,
        product_format
      FROM order_items 
      WHERE order_id = ?
    `, [orderId])

    order.items = items || []

    return NextResponse.json({
      success: true,
      order
    })
    
  } catch (error) {
    console.error('❌ Erreur GET /api/orders/[id]:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// ============================================================
// PATCH : Mettre à jour une commande
// ============================================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const orderId = parseInt(id)

    if (isNaN(orderId) || orderId <= 0) {
      return NextResponse.json(
        { error: 'ID de commande invalide' },
        { status: 400 }
      )
    }

    // 🔥 Récupérer le token
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

    const db = await getDB()

    // 🔥 Vérifier que la commande appartient à l'utilisateur
    const existing = await db.get(
      'SELECT id, user_id, status FROM orders WHERE id = ?',
      [orderId]
    )

    if (!existing) {
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      )
    }

    if (existing.user_id !== userId) {
      return NextResponse.json(
        { error: 'Accès non autorisé à cette commande' },
        { status: 403 }
      )
    }

    const body = (await request.json()) as UpdateOrderBody
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Statut requis' },
        { status: 400 }
      )
    }

    // 🔥 Mettre à jour le statut
    await db.run(
      `UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, orderId]
    )

    // 🔥 Récupérer la commande mise à jour - snake_case
    const order = await db.get(`
      SELECT 
        o.id,
        o.order_number,
        o.user_id,
        o.subtotal,
        o.total,
        o.currency,
        o.status,
        o.payment_status,
        o.payment_method,
        o.transaction_id,
        o.shipping_address,
        o.shipping_city,
        o.shipping_country,
        o.shipping_postal,
        o.download_token,
        o.download_expires_at,
        o.download_count,
        o.download_limit,
        o.notes,
        o.created_at,
        o.updated_at,
        u.name as user_name,
        u.email as user_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `, [orderId])

    const items = await db.all(
      'SELECT * FROM order_items WHERE order_id = ?',
      [orderId]
    )

    return NextResponse.json({
      success: true,
      message: 'Commande mise à jour avec succès',
      order: {
        ...order,
        items
      }
    })
    
  } catch (error) {
    console.error('❌ Erreur PATCH /api/orders/[id]:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// ============================================================
// DELETE : Annuler une commande
// ============================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const orderId = parseInt(id)

    if (isNaN(orderId) || orderId <= 0) {
      return NextResponse.json(
        { error: 'ID de commande invalide' },
        { status: 400 }
      )
    }

    // 🔥 Récupérer le token
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

    const db = await getDB()

    // 🔥 Vérifier que la commande appartient à l'utilisateur
    const existing = await db.get(
      'SELECT id, user_id, status FROM orders WHERE id = ?',
      [orderId]
    )

    if (!existing) {
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      )
    }

    if (existing.user_id !== userId) {
      return NextResponse.json(
        { error: 'Accès non autorisé à cette commande' },
        { status: 403 }
      )
    }

    // 🔥 Vérifier que la commande peut être annulée
    if (existing.status === 'completed') {
      return NextResponse.json(
        { error: 'Impossible d\'annuler une commande terminée' },
        { status: 400 }
      )
    }

    // 🔥 Annuler la commande (changer le statut)
    await db.run(
      `UPDATE orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [orderId]
    )

    return NextResponse.json({
      success: true,
      message: 'Commande annulée avec succès'
    })
    
  } catch (error) {
    console.error('❌ Erreur DELETE /api/orders/[id]:', error)
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
      'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  })
}