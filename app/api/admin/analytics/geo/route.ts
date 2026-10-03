// app/api/admin/analytics/geo/route.ts
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { getDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_session')?.value ||
                  request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value;
    if (!token || !(await verifyAdmin(token))) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const db = await getDB();

    // Statistiques par pays
    const countryStats = await db.all(`
      SELECT 
        u.country,
        COUNT(DISTINCT u.id) as users,
        COUNT(DISTINCT o.id) as orders,
        COALESCE(SUM(o.total), 0) as revenue,
        COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.id END) as completed_orders,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.total END), 0) as completed_revenue,
        AVG(o.total) as avg_order_value
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id
      WHERE u.country IS NOT NULL AND u.country != ''
      GROUP BY u.country
      ORDER BY users DESC
    `);

    // Données pour la carte (simplifiée)
    const totalUsers = await db.get('SELECT COUNT(*) as count FROM users');
    const totalOrders = await db.get('SELECT COUNT(*) as count FROM orders WHERE status = "completed"');
    const totalRevenue = await db.get('SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status = "completed"');

    return NextResponse.json({
      success: true,
      data: {
        countries: countryStats,
        totals: {
          users: totalUsers?.count || 0,
          orders: totalOrders?.count || 0,
          revenue: totalRevenue?.total || 0,
        },
        topCountries: countryStats.slice(0, 5),
      },
    });
  } catch (error) {
    console.error('❌ Erreur geo analytics:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}