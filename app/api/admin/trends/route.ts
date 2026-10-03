// app/api/admin/trends/route.ts
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
// GET /api/admin/trends?days=30&compare=prev
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const days = Math.min(
      Math.max(parseInt(searchParams.get('days') || '30', 10) || 30, 7),
      365
    )

    // ============================================================
    // 1. Évolution quotidienne des ventes (période actuelle)
    // ============================================================
    const currentSales: any[] = await db.all(
      `SELECT
         DATE(created_at) AS date,
         COUNT(*) AS orders,
         COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END), 0) AS revenue
       FROM orders
       WHERE created_at >= datetime('now', '-' || ? || ' days')
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [days]
    )

    // ============================================================
    // 2. Période précédente (pour comparaison)
    // ============================================================
    const previousSales: any[] = await db.all(
      `SELECT
         DATE(created_at) AS date,
         COUNT(*) AS orders,
         COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END), 0) AS revenue
       FROM orders
       WHERE created_at >= datetime('now', '-' || ? || ' days')
         AND created_at <  datetime('now', '-' || ? || ' days')
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [days * 2, days]
    )

    // ============================================================
    // 3. Produits en croissance (compare 2 périodes)
    // ============================================================
    const currentProducts: any[] = await db.all(
      `SELECT
         product_id,
         product_title,
         COUNT(*) AS orders,
         COALESCE(SUM(total), 0) AS revenue
       FROM orders
       WHERE payment_status = 'paid'
         AND product_id IS NOT NULL
         AND created_at >= datetime('now', '-' || ? || ' days')
       GROUP BY product_id`,
      [days]
    )

    const previousProducts: any[] = await db.all(
      `SELECT
         product_id,
         COUNT(*) AS orders,
         COALESCE(SUM(total), 0) AS revenue
       FROM orders
       WHERE payment_status = 'paid'
         AND product_id IS NOT NULL
         AND created_at >= datetime('now', '-' || ? || ' days')
         AND created_at <  datetime('now', '-' || ? || ' days')
       GROUP BY product_id`,
      [days * 2, days]
    )

    // ============================================================
    // 4. Catégories en croissance (via products.category_id)
    // ============================================================
    const currentCategories: any[] = await db.all(
      `SELECT
         c.id AS category_id,
         c.name AS category_name,
         COUNT(o.id) AS orders,
         COALESCE(SUM(o.total), 0) AS revenue
       FROM orders o
       LEFT JOIN products p ON o.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE o.payment_status = 'paid'
         AND c.id IS NOT NULL
         AND o.created_at >= datetime('now', '-' || ? || ' days')
       GROUP BY c.id
       ORDER BY revenue DESC`,
      [days]
    )

    // ============================================================
    // 5. Nouveaux utilisateurs par jour
    // ============================================================
    const newUsers: any[] = await db.all(
      `SELECT
         DATE(created_at) AS date,
         COUNT(*) AS users
       FROM users
       WHERE created_at >= datetime('now', '-' || ? || ' days')
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [days]
    )

    // ============================================================
    // 6. Construire les séries complètes (jours sans ventes = 0)
    // ============================================================
    const buildDateSeries = (rows: any[], valueKey: string) => {
      const map = new Map<string, number>()
      for (const r of rows) {
        map.set(r.date, Number(r[valueKey]) || 0)
      }

      const series: Array<{ date: string; value: number }> = []
      const today = new Date()
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const key = d.toISOString().split('T')[0]
        series.push({
          date: key,
          value: map.get(key) || 0,
        })
      }
      return series
    }

    const currentRevenueSeries = buildDateSeries(currentSales, 'revenue')
    const currentOrdersSeries = buildDateSeries(currentSales, 'orders')
    const previousRevenueSeries = buildDateSeries(previousSales, 'revenue')
    const previousOrdersSeries = buildDateSeries(previousSales, 'orders')
    const newUsersSeries = buildDateSeries(newUsers, 'users')

    // ============================================================
    // 7. Calculer les variations
    // ============================================================
    const currentRevenue = currentRevenueSeries.reduce((s, p) => s + p.value, 0)
    const previousRevenue = previousRevenueSeries.reduce((s, p) => s + p.value, 0)
    const currentOrders = currentOrdersSeries.reduce((s, p) => s + p.value, 0)
    const previousOrders = previousOrdersSeries.reduce((s, p) => s + p.value, 0)
    const totalNewUsers = newUsersSeries.reduce((s, p) => s + p.value, 0)

    const revenueChange =
      previousRevenue > 0
        ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
        : 100

    const ordersChange =
      previousOrders > 0
        ? Math.round(((currentOrders - previousOrders) / previousOrders) * 100)
        : 100

    // ============================================================
    // 8. Produits en croissance / déclin
    // ============================================================
    const previousProductMap = new Map<number, any>()
    for (const p of previousProducts) {
      previousProductMap.set(p.product_id, p)
    }

    const productTrends = currentProducts.map((curr: any) => {
      const prev = previousProductMap.get(curr.product_id) || {
        orders: 0,
        revenue: 0,
      }
      const ordersChange =
        prev.orders > 0
          ? Math.round(((curr.orders - prev.orders) / prev.orders) * 100)
          : curr.orders > 0
          ? 100
          : 0
      const revenueChange =
        prev.revenue > 0
          ? Math.round(((curr.revenue - prev.revenue) / prev.revenue) * 100)
          : curr.revenue > 0
          ? 100
          : 0

      return {
        product_id: curr.product_id,
        product_title: curr.product_title,
        currentOrders: curr.orders,
        previousOrders: prev.orders,
        ordersChange,
        currentRevenue: curr.revenue,
        previousRevenue: prev.revenue,
        revenueChange,
      }
    })

    // Top croissants & top déclins
    const growingProducts = [...productTrends]
      .filter(p => p.ordersChange > 0)
      .sort((a, b) => b.revenueChange - a.revenueChange)
      .slice(0, 5)

    const decliningProducts = [...productTrends]
      .filter(p => p.ordersChange < 0)
      .sort((a, b) => a.revenueChange - b.revenueChange)
      .slice(0, 5)

    // ============================================================
    // 9. Réponse
    // ============================================================
    return NextResponse.json({
      success: true,
      days,
      kpis: {
        currentRevenue,
        previousRevenue,
        revenueChange,
        currentOrders,
        previousOrders,
        ordersChange,
        totalNewUsers,
      },
      series: {
        current: {
          revenue: currentRevenueSeries,
          orders: currentOrdersSeries,
        },
        previous: {
          revenue: previousRevenueSeries,
          orders: previousOrdersSeries,
        },
        newUsers: newUsersSeries,
      },
      productTrends: {
        growing: growingProducts,
        declining: decliningProducts,
      },
      categories: currentCategories,
    })
  } catch (error: any) {
    console.error('❌ Erreur GET /api/admin/trends:', error)
    if (error.message === 'TOKEN_MISSING')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN')
      return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'