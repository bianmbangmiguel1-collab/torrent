// app/api/users/stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import { getDB } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'

async function getUserId(request: NextRequest): Promise<number | null> {
  let token =
    request.cookies.get('user_session')?.value ||
    request.cookies.get('admin_session')?.value ||
    request.cookies.get('token')?.value

  if (!token) {
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
  }

  if (!token) return null

  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jose.jwtVerify(token, secret, { algorithms: ['HS256'] })
    const rawId = (payload as any).id || (payload as any).userId || (payload as any).sub
    const userId = parseInt(String(rawId), 10)
    return Number.isNaN(userId) ? null : userId
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const db = await getDB()

    const user = await db.get(
      `SELECT id, name, email, total_spent, orders_count, total_favorites,
              total_reviews, vip_level, engagement_score, country, city, created_at
       FROM users WHERE id = ?`,
      [userId]
    )

    if (!user) {
      return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 404 })
    }

    let ordersCount = user.orders_count || 0
    try {
      const row = await db.get('SELECT COUNT(*) as c FROM orders WHERE user_id = ?', [userId])
      ordersCount = row?.c || ordersCount
    } catch {}

    let favoritesCount = user.total_favorites || 0
    try {
      const row = await db.get('SELECT COUNT(*) as c FROM user_favorites WHERE user_id = ?', [userId])
      favoritesCount = row?.c || favoritesCount
    } catch {}

    let downloadsCount = 0
    try {
      const row = await db.get('SELECT COUNT(*) as c FROM library WHERE user_id = ?', [userId])
      downloadsCount = row?.c || 0
    } catch {}

    let totalSpent = user.total_spent || 0
    try {
      const row = await db.get(
        `SELECT COALESCE(SUM(total), 0) as s FROM orders WHERE user_id = ? AND payment_status = 'paid'`,
        [userId]
      )
      if (row?.s) totalSpent = row.s
    } catch {}

    let recentActivities: any[] = []
    try {
      recentActivities = await db.all(
        `SELECT id, action, details, created_at FROM activities
         WHERE user_id = ? ORDER BY created_at DESC LIMIT 5`,
        [userId]
      )
    } catch {}

    const spent = Number(totalSpent) || 0
    let nextVipLevel = 'standard'
    let nextVipThreshold = 50000
    if (spent >= 500000) {
      nextVipLevel = 'platinum'; nextVipThreshold = 1000000
    } else if (spent >= 200000) {
      nextVipLevel = 'gold'; nextVipThreshold = 500000
    } else if (spent >= 50000) {
      nextVipLevel = 'silver'; nextVipThreshold = 200000
    }

    return NextResponse.json({
      success: true,
      stats: {
        user_id: user.id,
        name: user.name,
        email: user.email,
        member_since: user.created_at,
        country: user.country,
        city: user.city,
        orders_count: ordersCount,
        favorites_count: favoritesCount,
        downloads_count: downloadsCount,
        reviews_count: user.total_reviews || 0,
        total_spent: totalSpent,
        vip_level: user.vip_level || 'standard',
        engagement_score: user.engagement_score || 0,
        next_vip_level: nextVipLevel,
        next_vip_threshold: nextVipThreshold,
        recent_activities: recentActivities.map((a: any) => ({
          id: a.id,
          action: a.action,
          created_at: a.created_at,
          details: (() => { try { return a.details ? JSON.parse(a.details) : null } catch { return a.details } })(),
        })),
      },
    })
  } catch (error: any) {
    console.error('❌ Erreur /api/users/stats:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'