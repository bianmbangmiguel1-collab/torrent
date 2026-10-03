// app/api/admin/analytics/route.ts
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
// GET /api/admin/analytics?period=30d
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d' // 7d | 30d | 90d | 365d | all

    // Nombre de jours à analyser
    const daysMap: Record<string, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '365d': 365,
      'all': 99999,
    }
    const days = daysMap[period] || 30

    // ============================================================
    // 1. KPIs globaux
    // ============================================================
    const kpis: any = {
      revenue: 0,
      revenueChange: 0,
      orders: 0,
      ordersChange: 0,
      users: 0,
      usersChange: 0,
      avgOrderValue: 0,
      conversionRate: 0,
      paidOrders: 0,
      pendingOrders: 0,
      failedOrders: 0,
    }

    try {
      // Revenu et commandes payées
      const revenueRow = await db.get(
        `SELECT
           COUNT(*) as orders,
           COALESCE(SUM(total), 0) as revenue
         FROM orders
         WHERE payment_status = 'paid'
           AND created_at >= datetime('now', '-' || ? || ' days')`,
        [days]
      )
      kpis.orders = revenueRow?.orders || 0
      kpis.revenue = revenueRow?.revenue || 0
      kpis.paidOrders = kpis.orders

      // Panier moyen
      if (kpis.orders > 0) {
        kpis.avgOrderValue = Math.round(kpis.revenue / kpis.orders)
      }

      // Comparaison avec la période précédente (pour la variation %)
      const prevRow = await db.get(
        `SELECT
           COUNT(*) as orders,
           COALESCE(SUM(total), 0) as revenue
         FROM orders
         WHERE payment_status = 'paid'
           AND created_at >= datetime('now', '-' || ? || ' days')
           AND created_at <  datetime('now', '-' || ? || ' days')`,
        [days * 2, days]
      )
      if (prevRow) {
        kpis.revenueChange =
          prevRow.revenue > 0
            ? Math.round(((kpis.revenue - prevRow.revenue) / prevRow.revenue) * 100)
            : 100
        kpis.ordersChange =
          prevRow.orders > 0
            ? Math.round(((kpis.orders - prevRow.orders) / prevRow.orders) * 100)
            : 100
      }

      // Nouveaux utilisateurs
      const usersRow = await db.get(
        `SELECT COUNT(*) as c FROM users
         WHERE created_at >= datetime('now', '-' || ? || ' days')`,
        [days]
      )
      kpis.users = usersRow?.c || 0

      const prevUsersRow = await db.get(
        `SELECT COUNT(*) as c FROM users
         WHERE created_at >= datetime('now', '-' || ? || ' days')
           AND created_at <  datetime('now', '-' || ? || ' days')`,
        [days * 2, days]
      )
      if (prevUsersRow && prevUsersRow.c > 0) {
        kpis.usersChange = Math.round(
          ((kpis.users - prevUsersRow.c) / prevUsersRow.c) * 100
        )
      }

      // Commandes en attente + échouées
      const pendingRow = await db.get(
        "SELECT COUNT(*) as c FROM orders WHERE payment_status = 'pending'"
      )
      kpis.pendingOrders = pendingRow?.c || 0

      const failedRow = await db.get(
        "SELECT COUNT(*) as c FROM orders WHERE payment_status IN ('failed', 'canceled', 'cancelled')"
      )
      kpis.failedOrders = failedRow?.c || 0

      // Taux de conversion (commandes payées / total commandes)
      const totalOrdersRow = await db.get(
        `SELECT COUNT(*) as c FROM orders
         WHERE created_at >= datetime('now', '-' || ? || ' days')`,
        [days]
      )
      if (totalOrdersRow && totalOrdersRow.c > 0) {
        kpis.conversionRate = Math.round(
          (kpis.paidOrders / totalOrdersRow.c) * 100
        )
      }
    } catch (err) {
      console.warn('⚠️ KPIs partiels:', err)
    }

    // ============================================================
    // 2. Graphique ventes par jour
    // ============================================================
    let salesChart: any[] = []
    try {
      salesChart = await db.all(
        `SELECT
           DATE(created_at) as date,
           COUNT(*) as orders,
           COALESCE(SUM(total), 0) as revenue
         FROM orders
         WHERE payment_status = 'paid'
           AND created_at >= datetime('now', '-' || ? || ' days')
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        [days]
      )
    } catch (err) {
      console.warn('⚠️ Chart indisponible:', err)
    }

    // ============================================================
    // 3. Top 5 produits
    // ============================================================
    let topProducts: any[] = []
    try {
      topProducts = await db.all(
        `SELECT
           o.product_id,
           o.product_title,
           COUNT(*) as sales,
           COALESCE(SUM(o.total), 0) as revenue
         FROM orders o
         WHERE o.payment_status = 'paid'
           AND o.product_id IS NOT NULL
           AND o.created_at >= datetime('now', '-' || ? || ' days')
         GROUP BY o.product_id
         ORDER BY sales DESC
         LIMIT 5`,
        [days]
      )
    } catch (err) {
      console.warn('⚠️ Top produits indisponible:', err)
    }

    // ============================================================
    // 4. Top 5 clients
    // ============================================================
    let topCustomers: any[] = []
    try {
      topCustomers = await db.all(
        `SELECT
           o.user_id,
           COALESCE(u.name, o.user_name, 'Anonyme') as name,
           COALESCE(u.email, o.user_email, '—') as email,
           COUNT(*) as orders,
           COALESCE(SUM(o.total), 0) as spent
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
         WHERE o.payment_status = 'paid'
           AND o.user_id IS NOT NULL
           AND o.created_at >= datetime('now', '-' || ? || ' days')
         GROUP BY o.user_id
         ORDER BY spent DESC
         LIMIT 5`,
        [days]
      )
    } catch (err) {
      console.warn('⚠️ Top clients indisponible:', err)
    }

    // ============================================================
    // 5. Répartition des statuts
    // ============================================================
    let statusBreakdown: any[] = []
    try {
      statusBreakdown = await db.all(
        `SELECT payment_status as status, COUNT(*) as count
         FROM orders
         WHERE created_at >= datetime('now', '-' || ? || ' days')
         GROUP BY payment_status`,
        [days]
      )
    } catch (err) {
      console.warn('⚠️ Status breakdown indisponible:', err)
    }

    // ============================================================
    // 6. Activité récente (10 dernières actions)
    // ============================================================
    let recentActivity: any[] = []
    try {
      recentActivity = await db.all(
        `SELECT
           o.id,
           o.order_number,
           o.user_name,
           o.user_email,
           o.product_title,
           o.total,
           o.payment_status,
           o.created_at
         FROM orders o
         ORDER BY o.created_at DESC
         LIMIT 10`
      )
    } catch (err) {
      console.warn('⚠️ Activité indisponible:', err)
    }

    return NextResponse.json({
      success: true,
      period,
      days,
      kpis,
      salesChart,
      topProducts,
      topCustomers,
      statusBreakdown,
      recentActivity,
    })
  } catch (error: any) {
    console.error('❌ Erreur GET /api/admin/analytics:', error)
    if (error.message === 'TOKEN_MISSING') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN') return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'