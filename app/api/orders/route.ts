export const dynamic = 'force-dynamic';

// app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { randomBytes } from 'crypto'

// ============================================================
// TYPES
// ============================================================

interface OrderItemInput {
  product_id: number | string
  product_title?: string
  quantity?: number
  price?: number
  file_path?: string | null
}

interface CreateOrderBody {
  items: OrderItemInput[]
  total: number
  subtotal?: number
  currency?: string
  payment_method?: string
  shipping_address?: string | Record<string, unknown> | null
  notes?: string | null
}

// ============================================================
// GET : Liste des commandes de l'utilisateur connecté
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
        orders: [] 
      }, { status: 401 })
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
      return NextResponse.json({ 
        success: false, 
        error: 'Token invalide',
        orders: [] 
      }, { status: 401 })
    }

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Utilisateur non identifié',
        orders: [] 
      }, { status: 401 })
    }

    const db = await getDB()

    // 🔥 Récupérer les commandes de l'utilisateur (snake_case)
    const orders = await db.all(`
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
        o.download_token,
        o.download_expires_at,
        o.download_count,
        o.download_limit,
        o.created_at,
        o.updated_at,
        u.name as user_name,
        u.email as user_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `, [userId])

    // 🔥 Récupérer les items pour chaque commande
    for (const order of orders) {
      const items = await db.all(`
        SELECT 
          id,
          product_id,
          product_title,
          quantity,
          price,
          total,
          product_file_path
        FROM order_items 
        WHERE order_id = ?
      `, [order.id])
      order.items = items || []
    }

    return NextResponse.json({
      success: true,
      orders: orders || []
    })
    
  } catch (error) {
    console.error('❌ Erreur GET /api/orders:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Erreur serveur',
      orders: [] 
    }, { status: 500 })
  }
}

// ============================================================
// POST : Créer une commande (produits digitaux)
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

    const body = (await request.json()) as CreateOrderBody
    const { 
      items,
      total, 
      subtotal,
      currency = 'XOF',
      payment_method,
      shipping_address,
      notes
    } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Panier vide' }, { status: 400 })
    }

    if (!total || total <= 0) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
    }

    const db = await getDB()

    // 🔥 Générer un numéro de commande unique
    const orderNumber = `TT-${Date.now()}-${Math.floor(Math.random() * 10000)}`

    // 🔥 Générer un token de téléchargement (produits digitaux)
    const downloadToken = randomBytes(32).toString('hex')
    const downloadExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    // 🔥 Créer la commande
    const result = await db.run(`
      INSERT INTO orders (
        order_number,
        user_id,
        subtotal,
        total,
        currency,
        status,
        payment_status,
        payment_method,
        shipping_address,
        download_token,
        download_expires_at,
        download_limit,
        notes,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', 'pending', ?, ?, ?, ?, 5, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      orderNumber,
      userId,
      subtotal || total,
      total,
      currency,
      payment_method || null,
      typeof shipping_address === 'string'
        ? shipping_address
        : shipping_address
          ? JSON.stringify(shipping_address)
          : null,
      downloadToken,
      downloadExpiresAt,
      notes || null
    ])

    const orderId = result.lastID

    // 🔥 Ajouter les articles de la commande
    for (const item of items) {
      await db.run(`
        INSERT INTO order_items (
          order_id,
          product_id,
          product_title,
          quantity,
          price,
          total,
          product_file_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        orderId,
        item.product_id,
        item.product_title || `Produit #${item.product_id}`,
        item.quantity || 1,
        item.price || 0,
        (item.price || 0) * (item.quantity || 1),
        item.file_path || null
      ])
    }

    // 🔥 Récupérer la commande complète
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
        o.download_token,
        o.download_expires_at,
        o.download_count,
        o.download_limit,
        o.created_at,
        o.updated_at,
        u.name as user_name,
        u.email as user_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `, [orderId])

    const orderItems = await db.all(`
      SELECT * FROM order_items WHERE order_id = ?
    `, [orderId])

    return NextResponse.json({
      success: true,
      message: 'Commande créée avec succès',
      order: {
        ...order,
        items: orderItems
      }
    }, { status: 201 })
    
  } catch (error) {
    console.error('❌ Erreur POST /api/orders:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la commande' },
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  })
}