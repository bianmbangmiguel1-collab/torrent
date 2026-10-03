// app/api/admin/gdpr/route.ts
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
// GET — Vue d'ensemble RGPD + liste utilisateurs avec données
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const search = (searchParams.get('search') || '').trim()
    const filter = searchParams.get('filter') || '' // 'consent' | 'no-consent' | 'inactive'

    let where = 'WHERE 1=1'
    const params: any[] = []

    if (search) {
      where += ' AND (email LIKE ? OR name LIKE ?)'
      const like = `%${search}%`
      params.push(like, like)
    }

    // Récupérer les utilisateurs avec leurs infos
    const users = await db.all(
      `SELECT
         id, name, email, phone, country, city,
         whatsapp_opt_in, email_notifications, push_notifications,
         created_at, last_login, is_active, is_verified
       FROM users
       ${where}
       ORDER BY created_at DESC
       LIMIT 500`,
      params
    )

    // Stats globales
    const stats = {
      totalUsers: 0,
      usersWithConsent: 0,
      usersWithPhone: 0,
      usersInactive30d: 0,
      usersInactive90d: 0,
      usersNeverLoggedIn: 0,
      deletionRequests: 0,
    }

    try {
      const total = await db.get('SELECT COUNT(*) as c FROM users')
      stats.totalUsers = total?.c || 0

      const consent = await db.get(
        'SELECT COUNT(*) as c FROM users WHERE whatsapp_opt_in = 1 OR email_notifications = 1'
      )
      stats.usersWithConsent = consent?.c || 0

      const phone = await db.get(
        'SELECT COUNT(*) as c FROM users WHERE phone IS NOT NULL AND phone != ""'
      )
      stats.usersWithPhone = phone?.c || 0

      const inactive30 = await db.get(
        `SELECT COUNT(*) as c FROM users
         WHERE last_login IS NULL
            OR last_login < datetime('now', '-30 days')`
      )
      stats.usersInactive30d = inactive30?.c || 0

      const inactive90 = await db.get(
        `SELECT COUNT(*) as c FROM users
         WHERE last_login IS NULL
            OR last_login < datetime('now', '-90 days')`
      )
      stats.usersInactive90d = inactive90?.c || 0

      const never = await db.get(
        'SELECT COUNT(*) as c FROM users WHERE last_login IS NULL'
      )
      stats.usersNeverLoggedIn = never?.c || 0
    } catch (err) {
      console.warn('⚠️ Stats partielles:', err)
    }

    // Liste enrichie des utilisateurs
    const enrichedUsers = users.map((u: any) => ({
      ...u,
      hasConsent: u.whatsapp_opt_in === 1 || u.email_notifications === 1,
      daysSinceLogin: u.last_login
        ? Math.floor(
            (Date.now() - new Date(u.last_login).getTime()) / (1000 * 60 * 60 * 24)
          )
        : null,
      isInactive: u.last_login
        ? Date.now() - new Date(u.last_login).getTime() > 90 * 24 * 60 * 60 * 1000
        : true,
    }))

    return NextResponse.json({
      success: true,
      stats,
      users: enrichedUsers,
    })
  } catch (error: any) {
    console.error('❌ GET /api/admin/gdpr:', error)
    if (error.message === 'TOKEN_MISSING')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN')
      return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================================
// Types
// ============================================================
interface GdprActionBody {
  action: 'export' | 'delete' | 'anonymize'
  user_id: number | string
}

// ============================================================
// POST — Actions RGPD : exporter / supprimer un utilisateur
// Body : { action: 'export' | 'delete' | 'anonymize', user_id }
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)
    const body = (await request.json()) as GdprActionBody

    const action = body.action
    const userId = parseInt(String(body.user_id || ''), 10)

    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json({ error: 'user_id requis' }, { status: 400 })
    }

    const user = await db.get(
      'SELECT id, name, email FROM users WHERE id = ?',
      [userId]
    )
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    // ---------- EXPORT ----------
    if (action === 'export') {
      const data: any = {}

      try {
        data.user = await db.get('SELECT * FROM users WHERE id = ?', [userId])
      } catch {}

      try {
        data.orders = await db.all(
          'SELECT * FROM orders WHERE user_id = ?',
          [userId]
        )
      } catch {}

      try {
        data.favorites = await db.all(
          'SELECT * FROM user_favorites WHERE user_id = ?',
          [userId]
        )
      } catch {}

      try {
        data.reviews = await db.all(
          'SELECT * FROM reviews WHERE user_id = ?',
          [userId]
        )
      } catch {}

      try {
        data.activities = await db.all(
          'SELECT * FROM activities WHERE user_id = ? LIMIT 100',
          [userId]
        )
      } catch {}

      try {
        data.notifications = await db.all(
          'SELECT * FROM notifications WHERE user_id = ? LIMIT 100',
          [userId]
        )
      } catch {}

      // Retirer les données sensibles
      if (data.user) {
        delete data.user.password
        delete data.user.two_factor_secret
        delete data.user.two_factor_backup_codes
      }

      console.log(`📤 Export RGPD pour user ${userId}`)

      return NextResponse.json({
        success: true,
        message: 'Données utilisateur exportées',
        data,
        exported_at: new Date().toISOString(),
      })
    }

    // ---------- ANONYMISER ----------
    if (action === 'anonymize') {
      const anonEmail = `deleted-${userId}-${Date.now()}@anonymized.local`
      await db.run(
        `UPDATE users
         SET name = 'Anonyme',
             email = ?,
             phone = NULL,
             address = NULL,
             city = NULL,
             country = NULL,
             postal_code = NULL,
             bio = NULL,
             preferences = NULL,
             is_active = 0,
             updated_at = datetime('now')
         WHERE id = ?`,
        [anonEmail, userId]
      )

      console.log(`🎭 User ${userId} anonymisé`)

      return NextResponse.json({
        success: true,
        message: 'Utilisateur anonymisé (données personnelles effacées)',
      })
    }

    // ---------- SUPPRESSION ----------
    if (action === 'delete') {
      // Supprimer dans l'ordre inverse des dépendances
      try {
        await db.run('DELETE FROM notifications WHERE user_id = ?', [userId])
        await db.run('DELETE FROM activities WHERE user_id = ?', [userId])
        await db.run('DELETE FROM user_favorites WHERE user_id = ?', [userId])
        await db.run('DELETE FROM user_product_views WHERE user_id = ?', [userId])
        await db.run('DELETE FROM user_cart WHERE user_id = ?', [userId])
        await db.run('DELETE FROM reviews WHERE user_id = ?', [userId])
        await db.run('DELETE FROM user_sessions WHERE user_id = ?', [userId])
        // On garde les commandes pour la comptabilité (obligation légale)
        await db.run('UPDATE orders SET user_id = NULL, user_email = NULL, user_name = NULL WHERE user_id = ?', [userId])
        await db.run('DELETE FROM users WHERE id = ?', [userId])
      } catch (err: any) {
        console.error('❌ Erreur suppression:', err)
        return NextResponse.json(
          { error: 'Erreur lors de la suppression: ' + err.message },
          { status: 500 }
        )
      }

      console.log(`🗑️ User ${userId} supprimé`)

      return NextResponse.json({
        success: true,
        message: 'Utilisateur et toutes ses données supprimés',
      })
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
  } catch (error: any) {
    console.error('❌ POST /api/admin/gdpr:', error)
    if (error.message === 'TOKEN_MISSING')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN')
      return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'