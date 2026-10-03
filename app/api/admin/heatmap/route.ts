// app/api/admin/heatmap/route.ts
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
// GET /api/admin/heatmap?days=90&metric=orders|revenue|users
// Retourne une matrice 7 jours x 24 heures
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const days = Math.min(
      Math.max(parseInt(searchParams.get('days') || '90', 10) || 90, 7),
      365
    )
    const metric = searchParams.get('metric') || 'orders' // orders | revenue | users

    // ============================================================
    // 1. Récupérer les données depuis orders
    // ============================================================
    const orderRows: any[] = await db.all(
      `SELECT
         CAST(strftime('%w', created_at) AS INTEGER) AS day_of_week,
         CAST(strftime('%H', created_at) AS INTEGER) AS hour,
         COUNT(*) AS orders,
         COALESCE(SUM(total), 0) AS revenue,
         payment_status
       FROM orders
       WHERE created_at >= datetime('now', '-' || ? || ' days')
       GROUP BY day_of_week, hour`,
      [days]
    )

    // ============================================================
    // 2. Récupérer les inscriptions utilisateurs
    // ============================================================
    const userRows: any[] = await db.all(
      `SELECT
         CAST(strftime('%w', created_at) AS INTEGER) AS day_of_week,
         CAST(strftime('%H', created_at) AS INTEGER) AS hour,
         COUNT(*) AS users
       FROM users
       WHERE created_at >= datetime('now', '-' || ? || ' days')
       GROUP BY day_of_week, hour`,
      [days]
    )

    // ============================================================
    // 3. Construire la matrice 7x24
    // ============================================================
    // Structure : matrix[day][hour] = { value, orders, revenue, users }
    const matrix: any[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => ({
        orders: 0,
        revenue: 0,
        users: 0,
      }))
    )

    for (const row of orderRows) {
      const d = Number(row.day_of_week) || 0
      const h = Number(row.hour) || 0
      if (d >= 0 && d < 7 && h >= 0 && h < 24) {
        matrix[d][h].orders += Number(row.orders) || 0
        if (row.payment_status === 'paid') {
          matrix[d][h].revenue += Number(row.revenue) || 0
        }
      }
    }

    for (const row of userRows) {
      const d = Number(row.day_of_week) || 0
      const h = Number(row.hour) || 0
      if (d >= 0 && d < 7 && h >= 0 && h < 24) {
        matrix[d][h].users += Number(row.users) || 0
      }
    }

    // ============================================================
    // 4. Calculer le max selon la métrique
    // ============================================================
    let maxValue = 0
    let totalValue = 0
    let peak = { day: 0, hour: 0, value: 0 }

    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        const cell = matrix[d][h]
        const value =
          metric === 'revenue'
            ? cell.revenue
            : metric === 'users'
            ? cell.users
            : cell.orders

        totalValue += value
        if (value > maxValue) {
          maxValue = value
          peak = { day: d, hour: h, value }
        }
      }
    }

    // ============================================================
    // 5. Format pour le frontend
    // ============================================================
    const daysLabels = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
    const daysShort = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

    const data = matrix.map((row, dayIdx) => ({
      day: dayIdx,
      label: daysLabels[dayIdx],
      short: daysShort[dayIdx],
      hours: row.map((cell, hourIdx) => {
        const value =
          metric === 'revenue'
            ? cell.revenue
            : metric === 'users'
            ? cell.users
            : cell.orders
        return {
          hour: hourIdx,
          value,
          orders: cell.orders,
          revenue: cell.revenue,
          users: cell.users,
          // Intensité 0-100 pour la couleur
          intensity: maxValue > 0 ? Math.round((value / maxValue) * 100) : 0,
        }
      }),
    }))

    // ============================================================
    // 6. Stats globales
    // ============================================================
    const stats = {
      metric,
      days,
      maxValue,
      totalValue,
      peakDay: daysLabels[peak.day],
      peakHour: `${String(peak.hour).padStart(2, '0')}:00`,
      peakValue: peak.value,
    }

    return NextResponse.json({
      success: true,
      stats,
      data,
    })
  } catch (error: any) {
    console.error('❌ Erreur GET /api/admin/heatmap:', error)
    if (error.message === 'TOKEN_MISSING')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN')
      return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'