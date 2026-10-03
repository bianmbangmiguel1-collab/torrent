// app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { requireAdmin, createAdminErrorResponse } from '@/lib/admin-auth'

// ============================================================
// GET : STATISTIQUES ADMIN
// ============================================================

export async function GET(request: NextRequest) {
  try {
    // ✅ Vérification admin via les headers ajoutés par le middleware
    const admin = await requireAdmin(request)
    if (!admin) {
      return createAdminErrorResponse()
    }

    const db = await getDB()

    // 1. Chiffre d'affaires total
    const revenue = await db.get(`
      SELECT COALESCE(SUM(total), 0) as total 
      FROM orders 
      WHERE status = 'completed' OR status = 'paid'
    `)

    // 2. Nombre total de produits
    const totalProducts = await db.get(`
      SELECT COUNT(*) as count 
      FROM products
    `)

    // 3. Produits publiés
    const publishedProducts = await db.get(`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE status = 'published'
    `)

    // 4. Nombre total de commandes
    const totalOrders = await db.get(`
      SELECT COUNT(*) as count 
      FROM orders
    `)

    // 5. Commandes en attente
    const pendingOrders = await db.get(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE status = 'pending'
    `)

    // 6. Nombre total d'utilisateurs
    const totalUsers = await db.get(`
      SELECT COUNT(*) as count 
      FROM users
    `)

    // 7. Nombre d'utilisateurs admins (via users.is_admin)
    const adminUsers = await db.get(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE is_admin = 1
    `)

    // 8. Nombre total d'avis
    const totalReviews = await db.get(`
      SELECT COUNT(*) as count 
      FROM reviews
    `)

    // 9. Note moyenne des avis
    const avgRating = await db.get(`
      SELECT COALESCE(AVG(rating), 0) as avg 
      FROM reviews 
      WHERE rating IS NOT NULL
    `)

    // 10. Ventes du mois
    const monthlySales = await db.get(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as total
      FROM orders 
      WHERE status IN ('completed', 'paid')
      AND created_at >= datetime('now', 'start of month')
    `)

    // 11. Ventes du jour
    const todaySales = await db.get(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as total
      FROM orders 
      WHERE status IN ('completed', 'paid')
      AND created_at >= datetime('now', 'start of day')
    `)

    // 12. Meilleurs produits (top 5)
    const topProducts = await db.all(`
      SELECT 
        p.id,
        p.title,
        p.slug,
        p.price,
        COUNT(oi.id) as sales_count,
        COALESCE(SUM(oi.total), 0) as revenue
      FROM products p
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status IN ('completed', 'paid')
      GROUP BY p.id
      ORDER BY sales_count DESC
      LIMIT 5
    `)

    // 13. Commandes récentes (7 derniers jours)
    const recentOrders = await db.get(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE created_at >= datetime('now', '-7 days')
    `)

    // 14. Nouveaux utilisateurs (7 derniers jours)
    const newUsers = await db.get(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE created_at >= datetime('now', '-7 days')
    `)

    return NextResponse.json({
      success: true,
      data: {
        revenue: revenue?.total || 0,
        totalProducts: totalProducts?.count || 0,
        publishedProducts: publishedProducts?.count || 0,
        totalOrders: totalOrders?.count || 0,
        pendingOrders: pendingOrders?.count || 0,
        totalUsers: totalUsers?.count || 0,
        adminUsers: adminUsers?.count || 0,
        totalReviews: totalReviews?.count || 0,
        avgRating: parseFloat((avgRating?.avg || 0).toFixed(1)),
        monthlySales: {
          count: monthlySales?.count || 0,
          total: monthlySales?.total || 0
        },
        todaySales: {
          count: todaySales?.count || 0,
          total: todaySales?.total || 0
        },
        topProducts: topProducts || [],
        recentOrders: recentOrders?.count || 0,
        newUsers: newUsers?.count || 0
      }
    })
  } catch (error) {
    console.error('❌ Erreur stats admin:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'