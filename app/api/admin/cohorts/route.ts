// app/api/admin/cohorts/route.ts
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
// GET /api/admin/cohorts?months=6
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const months = Math.min(
      Math.max(parseInt(searchParams.get('months') || '6', 10) || 6, 1),
      24
    )

    // ============================================================
    // 1. Récupérer les cohortes : utilisateurs groupés par mois d'inscription
    // ============================================================
    const cohortUsers: any[] = await db.all(
      `SELECT
         strftime('%Y-%m', created_at) AS cohort_month,
         id AS user_id,
         created_at
       FROM users
       WHERE created_at >= datetime('now', '-' || ? || ' months')
       ORDER BY created_at ASC`,
      [months]
    )

    // Grouper par mois
    const cohortMap: Record<string, { users: number[]; signups: number }> = {}
    for (const u of cohortUsers) {
      const m = u.cohort_month
      if (!cohortMap[m]) cohortMap[m] = { users: [], signups: 0 }
      cohortMap[m].users.push(u.user_id)
      cohortMap[m].signups++
    }

    // ============================================================
    // 2. Récupérer toutes les commandes des cohortes
    // ============================================================
    const orders: any[] = await db.all(
      `SELECT
         user_id,
         total,
         payment_status,
         strftime('%Y-%m', created_at) AS order_month,
         created_at
       FROM orders
       WHERE user_id IS NOT NULL
         AND created_at >= datetime('now', '-' || ? || ' months')`,
      [months]
    )

    // ============================================================
    // 3. Construire la matrice de cohortes
    // ============================================================
    // Liste des mois ordonnés
    const monthKeys = Object.keys(cohortMap).sort()

    // Pour chaque cohorte : nombre d'utilisateurs actifs par mois suivant
    const cohorts = monthKeys.map((cohortMonth, cohortIndex) => {
      const userSet = new Set(cohortMap[cohortMonth].users)
      const cohortSize = cohortMap[cohortMonth].signups

      // Mois à afficher (mois de la cohorte + suivants)
      const periodData: any[] = []
      let totalRevenue = 0
      let totalOrders = 0
      let activeUsers = 0

      // Pour chaque mois depuis la création de la cohorte
      for (let offset = 0; offset < months - cohortIndex; offset++) {
        const date = new Date(cohortMonth + '-01')
        date.setMonth(date.getMonth() + offset)
        const targetMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

        // Utilisateurs de cette cohorte ayant commandé ce mois-là
        const monthlyOrders = orders.filter(
          o => userSet.has(o.user_id) && o.order_month === targetMonth
        )

        const uniqueActive = new Set(monthlyOrders.map(o => o.user_id)).size
        const revenue = monthlyOrders
          .filter(o => o.payment_status === 'paid')
          .reduce((sum, o) => sum + (Number(o.total) || 0), 0)
        const paidOrders = monthlyOrders.filter(o => o.payment_status === 'paid').length

        totalRevenue += revenue
        totalOrders += paidOrders
        if (uniqueActive > 0) activeUsers += uniqueActive

        periodData.push({
          monthOffset: offset,
          month: targetMonth,
          activeUsers: uniqueActive,
          retention: cohortSize > 0 ? Math.round((uniqueActive / cohortSize) * 100) : 0,
          revenue,
          orders: paidOrders,
        })
      }

      const totalUniqueActive = new Set(
        orders.filter(o => userSet.has(o.user_id)).map(o => o.user_id)
      ).size

      return {
        cohortMonth,
        cohortLabel: new Date(cohortMonth + '-01').toLocaleDateString('fr-FR', {
          month: 'short',
          year: 'numeric',
        }),
        cohortSize,
        retainedUsers: totalUniqueActive,
        retentionRate: cohortSize > 0 ? Math.round((totalUniqueActive / cohortSize) * 100) : 0,
        revenue: totalRevenue,
        orders: totalOrders,
        avgRevenuePerUser:
          cohortSize > 0 ? Math.round(totalRevenue / cohortSize) : 0,
        periods: periodData,
      }
    })

    // ============================================================
    // 4. Stats globales
    // ============================================================
    const totalUsers = cohortUsers.length
    const totalRevenue = cohorts.reduce((sum, c) => sum + c.revenue, 0)
    const avgRetention =
      cohorts.length > 0
        ? Math.round(
            cohorts.reduce((sum, c) => sum + c.retentionRate, 0) / cohorts.length
          )
        : 0
    const bestCohort = cohorts.reduce(
      (best, c) => (c.revenue > (best?.revenue || 0) ? c : best),
      null as any
    )

    return NextResponse.json({
      success: true,
      months,
      stats: {
        totalCohorts: cohorts.length,
        totalUsers,
        totalRevenue,
        avgRetention,
        bestCohortMonth: bestCohort?.cohortMonth || null,
        bestCohortLabel: bestCohort?.cohortLabel || null,
        bestCohortRevenue: bestCohort?.revenue || 0,
      },
      cohorts,
    })
  } catch (error: any) {
    console.error('❌ Erreur GET /api/admin/cohorts:', error)
    if (error.message === 'TOKEN_MISSING')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN')
      return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'