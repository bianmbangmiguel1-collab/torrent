// app/api/admin/returns/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import { getDB } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'

async function requireAdmin(request: NextRequest) {
  const adminSession = request.cookies.get('admin_session')?.value
  const userSession = request.cookies.get('user_session')?.value
  let token = adminSession || userSession

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

    const isAdmin =
      (payload as any).role === 'admin' ||
      (payload as any).isAdmin === true ||
      (payload as any).is_admin === true ||
      !!adminSession

    if (!isAdmin) throw new Error('NOT_ADMIN')

    const db = await getDB()
    return { db }
  } catch (err: any) {
    if (err.message === 'TOKEN_MISSING' || err.message === 'NOT_ADMIN') throw err
    throw new Error('TOKEN_INVALID')
  }
}

// ============================================================
// GET /api/admin/returns?status=&page=1&limit=20&search=
// Retourne les commandes remboursées ou en demande de remboursement
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const search = (searchParams.get('search') || '').trim()
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 100)
    const offset = (page - 1) * limit

    // Les "returns" = commandes avec payment_status = 'refunded' ou 'canceled'
    // OU statut "refund_requested" si vous l'ajoutez plus tard
    let where = "WHERE o.payment_status IN ('refunded', 'canceled', 'cancelled')"
    const params: any[] = []

    if (status) {
      where = 'WHERE o.payment_status = ?'
      params.length = 0
      params.push(status)
    }

    if (search) {
      where += ' AND (o.order_number LIKE ? OR o.user_email LIKE ? OR o.product_title LIKE ?)'
      const like = `%${search}%`
      params.push(like, like, like)
    }

    const sql = `
      SELECT
        o.id,
        o.order_number,
        o.user_id,
        o.user_email,
        o.user_name,
        o.product_id,
        o.product_title,
        o.total,
        o.amount,
        o.currency,
        o.status,
        o.payment_status,
        o.payment_method,
        o.transaction_id,
        o.paid_at,
        o.created_at,
        o.updated_at,
        u.name AS user_db_name,
        u.email AS user_db_email,
        u.avatar AS user_avatar
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ${where}
      ORDER BY o.updated_at DESC
      LIMIT ? OFFSET ?
    `
    params.push(limit, offset)

    const rows = await db.all(sql, params)

    // Compter le total
    const countSql = `
      SELECT COUNT(*) as total FROM orders o ${where}
    `
    const countRow = await db.get(countSql, params.slice(0, -2))
    const total = countRow?.total || 0

    // Stats globales
    const stats = {
      total: 0,
      refunded: 0,
      canceled: 0,
      amountRefunded: 0,
    }
    try {
      const totalRow = await db.get(
        "SELECT COUNT(*) as c FROM orders WHERE payment_status IN ('refunded', 'canceled', 'cancelled')"
      )
      stats.total = totalRow?.c || 0

      const refundedRow = await db.get(
        "SELECT COUNT(*) as c, COALESCE(SUM(total), 0) as s FROM orders WHERE payment_status = 'refunded'"
      )
      stats.refunded = refundedRow?.c || 0
      stats.amountRefunded = refundedRow?.s || 0

      const canceledRow = await db.get(
        "SELECT COUNT(*) as c FROM orders WHERE payment_status IN ('canceled', 'cancelled')"
      )
      stats.canceled = canceledRow?.c || 0
    } catch {}

    const returns = (rows || []).map((o: any) => ({
      id: o.id,
      order_number: o.order_number,
      user_id: o.user_id,
      user_email: o.user_email || o.user_db_email || null,
      user_name: o.user_name || o.user_db_name || null,
      user_avatar: o.user_avatar || null,
      product_id: o.product_id,
      product_title: o.product_title,
      total: o.total,
      currency: o.currency || 'XOF',
      status: o.status,
      payment_status: o.payment_status,
      payment_method: o.payment_method,
      transaction_id: o.transaction_id,
      paid_at: o.paid_at,
      created_at: o.created_at,
      updated_at: o.updated_at,
    }))

    return NextResponse.json({
      success: true,
      returns,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats,
    })
  } catch (error: any) {
    console.error('❌ Erreur GET /api/admin/returns:', error)
    if (error.message === 'TOKEN_MISSING') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN') return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================================
// Types
// ============================================================
interface UpdateReturnBody {
  order_id: number | string
  action?: 'refund' | 'cancel'
}

// ============================================================
// PUT /api/admin/returns — Marquer une commande comme remboursée
// Body : { order_id, action: 'refund' | 'cancel' }
// ============================================================
export async function PUT(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)
    const body = (await request.json()) as UpdateReturnBody

    const orderId = parseInt(String(body.order_id || ''), 10)
    if (!orderId || Number.isNaN(orderId)) {
      return NextResponse.json({ error: 'order_id requis' }, { status: 400 })
    }

    const action = body.action || 'refund'
    const newPaymentStatus = action === 'cancel' ? 'canceled' : 'refunded'

    await db.run(
      `UPDATE orders
       SET payment_status = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [newPaymentStatus, action === 'cancel' ? 'canceled' : 'refunded', orderId]
    )

    console.log(`✅ Commande ${orderId} → ${newPaymentStatus}`)

    return NextResponse.json({
      success: true,
      message: action === 'cancel' ? 'Commande annulée' : 'Commande remboursée',
      order_id: orderId,
      payment_status: newPaymentStatus,
    })
  } catch (error: any) {
    console.error('❌ Erreur PUT /api/admin/returns:', error)
    if (error.message === 'TOKEN_MISSING') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN') return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'