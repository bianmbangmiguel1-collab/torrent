// app/api/admin/orders/route.ts
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
// GET /api/admin/orders?page=1&limit=20&status=&payment_status=&search=
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const paymentStatus = searchParams.get('payment_status') || ''
    const search = (searchParams.get('search') || '').trim()
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 100)
    const offset = (page - 1) * limit

    let where = 'WHERE 1=1'
    const params: any[] = []

    if (status) {
      where += ' AND o.status = ?'
      params.push(status)
    }

    if (paymentStatus) {
      where += ' AND o.payment_status = ?'
      params.push(paymentStatus)
    }

    if (search) {
      where += ' AND (o.order_number LIKE ? OR o.user_email LIKE ? OR o.user_name LIKE ? OR o.product_title LIKE ?)'
      const like = `%${search}%`
      params.push(like, like, like, like)
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
        o.products,
        o.subtotal,
        o.total,
        o.amount,
        o.currency,
        o.status,
        o.payment_status,
        o.payment_method,
        o.transaction_id,
        o.download_token,
        o.download_count,
        o.download_limit,
        o.paid_at,
        o.created_at,
        o.updated_at,
        u.name AS user_db_name,
        u.email AS user_db_email,
        u.avatar AS user_avatar
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ${where}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `
    params.push(limit, offset)

    const rows = await db.all(sql, params)

    const countSql = `SELECT COUNT(*) as total FROM orders o ${where}`
    const countRow = await db.get(countSql, params.slice(0, -2))
    const total = countRow?.total || 0

    // Stats globales
    const stats = {
      total: 0,
      paid: 0,
      pending: 0,
      failed: 0,
      revenue: 0,
    }
    try {
      const totalRow = await db.get('SELECT COUNT(*) as c FROM orders')
      stats.total = totalRow?.c || 0

      const paidRow = await db.get(
        "SELECT COUNT(*) as c, COALESCE(SUM(total), 0) as s FROM orders WHERE payment_status = 'paid'"
      )
      stats.paid = paidRow?.c || 0
      stats.revenue = paidRow?.s || 0

      const pendingRow = await db.get(
        "SELECT COUNT(*) as c FROM orders WHERE payment_status = 'pending'"
      )
      stats.pending = pendingRow?.c || 0

      const failedRow = await db.get(
        "SELECT COUNT(*) as c FROM orders WHERE payment_status IN ('failed', 'canceled', 'cancelled')"
      )
      stats.failed = failedRow?.c || 0
    } catch {}

    const orders = (rows || []).map((o: any) => ({
      id: o.id,
      order_number: o.order_number,
      user_id: o.user_id,
      user_email: o.user_email || o.user_db_email || null,
      user_name: o.user_name || o.user_db_name || null,
      user_avatar: o.user_avatar || null,
      product_id: o.product_id,
      product_title: o.product_title,
      total: o.total,
      amount: o.amount,
      currency: o.currency || 'XOF',
      status: o.status,
      payment_status: o.payment_status,
      payment_method: o.payment_method,
      transaction_id: o.transaction_id,
      download_token: o.download_token ? '***' : null,
      download_count: o.download_count || 0,
      download_limit: o.download_limit || 0,
      paid_at: o.paid_at,
      created_at: o.created_at,
      updated_at: o.updated_at,
    }))

    return NextResponse.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats,
    })
  } catch (error: any) {
    console.error('❌ Erreur GET /api/admin/orders:', error)

    if (error.message === 'TOKEN_MISSING') {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }
    if (error.message === 'NOT_ADMIN') {
      return NextResponse.json({ success: false, error: 'Accès admin requis' }, { status: 403 })
    }
    if (error.message === 'TOKEN_INVALID') {
      return NextResponse.json({ success: false, error: 'Token invalide' }, { status: 401 })
    }

    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================================
// PUT /api/admin/orders — Mettre à jour le statut d'une commande
// Body : { order_id, status?, payment_status? }
// ============================================================

// ============================================================
// Types
// ============================================================
interface UpdateOrderBody {
  order_id: number | string
  status?: string
  payment_status?: string
}

export async function PUT(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)
    const body = (await request.json()) as UpdateOrderBody

    const orderId = parseInt(String(body.order_id || ''), 10)
    if (!orderId || Number.isNaN(orderId)) {
      return NextResponse.json({ success: false, error: 'order_id requis' }, { status: 400 })
    }

    const updates: string[] = []
    const values: any[] = []

    if (body.status !== undefined) {
      updates.push('status = ?')
      values.push(String(body.status))
    }

    if (body.payment_status !== undefined) {
      updates.push('payment_status = ?')
      values.push(String(body.payment_status))
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'Aucun champ à mettre à jour' }, { status: 400 })
    }

    updates.push("updated_at = datetime('now')")
    values.push(orderId)

    await db.run(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, values)

    return NextResponse.json({ success: true, message: 'Commande mise à jour' })
  } catch (error: any) {
    console.error('❌ Erreur PUT /api/admin/orders:', error)
    if (error.message === 'TOKEN_MISSING') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN') return NextResponse.json({ error: 'Accès admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'