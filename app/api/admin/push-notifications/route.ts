// app/api/admin/push-notifications/route.ts
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
    return { db, adminEmail: (payload as any).email }
  } catch (err: any) {
    if (err.message === 'TOKEN_MISSING' || err.message === 'NOT_ADMIN') throw err
    throw new Error('TOKEN_INVALID')
  }
}

// ============================================================
// GET /api/admin/push-notifications
// Liste les notifications envoyées + stats
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 100)
    const offset = (page - 1) * limit

    // Historique = notifications (table notifications)
    // On affiche les plus récentes, groupées par type "admin_push"
    const sql = `
      SELECT
        n.id,
        n.user_id,
        n.type,
        n.title,
        n.message,
        n.is_read,
        n.link,
        n.icon,
        n.created_at,
        u.name AS user_name,
        u.email AS user_email
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.type IN ('push', 'info', 'admin_push')
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `
    const notifications = await db.all(sql, [limit, offset])

    const countRow = await db.get(
      `SELECT COUNT(*) as total FROM notifications
       WHERE type IN ('push', 'info', 'admin_push')`
    )
    const total = countRow?.total || 0

    // Stats
    const stats = {
      totalSent: 0,
      totalRead: 0,
      totalUnread: 0,
      totalUsers: 0,
      readRate: 0,
    }
    try {
      const sentRow = await db.get(
        `SELECT COUNT(*) as c FROM notifications
         WHERE type IN ('push', 'info', 'admin_push')`
      )
      stats.totalSent = sentRow?.c || 0

      const readRow = await db.get(
        `SELECT COUNT(*) as c FROM notifications
         WHERE type IN ('push', 'info', 'admin_push') AND is_read = 1`
      )
      stats.totalRead = readRow?.c || 0
      stats.totalUnread = stats.totalSent - stats.totalRead

      const usersRow = await db.get(
        `SELECT COUNT(*) as c FROM users WHERE is_active = 1`
      )
      stats.totalUsers = usersRow?.c || 0

      if (stats.totalSent > 0) {
        stats.readRate = Math.round((stats.totalRead / stats.totalSent) * 100)
      }
    } catch {}

    return NextResponse.json({
      success: true,
      notifications: notifications || [],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats,
    })
  } catch (error: any) {
    console.error('❌ Erreur GET /api/admin/push-notifications:', error)
    if (error.message === 'TOKEN_MISSING') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN') return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================================
// Types
// ============================================================
interface PushNotificationBody {
  title: string
  message: string
  link?: string
  icon?: string
  target?: 'all' | 'email' | 'user'
  email?: string
}

// ============================================================
// POST /api/admin/push-notifications — Envoyer une notification
// Body : {
//   title: string,
//   message: string,
//   link?: string,
//   icon?: string,
//   target: 'all' | 'user' | 'email',
//   email?: string  (si target = 'email')
// }
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)
    const body = (await request.json()) as PushNotificationBody

    const title = String(body.title || '').trim()
    const message = String(body.message || '').trim()
    const link = body.link ? String(body.link).trim() : null
    const icon = body.icon ? String(body.icon).trim() : null
    const target = body.target || 'all' // 'all' | 'email'

    if (!title) {
      return NextResponse.json({ error: 'Le titre est requis' }, { status: 400 })
    }
    if (!message) {
      return NextResponse.json({ error: 'Le message est requis' }, { status: 400 })
    }

    // Déterminer les destinataires
    let recipients: any[] = []

    if (target === 'email') {
      const email = String(body.email || '').trim()
      if (!email) {
        return NextResponse.json({ error: 'Email requis pour la cible "email"' }, { status: 400 })
      }
      const user = await db.get('SELECT id, email, name FROM users WHERE email = ?', [email])
      if (!user) {
        return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
      }
      recipients = [user]
    } else {
      // Tous les utilisateurs actifs
      recipients = await db.all(
        'SELECT id, email, name FROM users WHERE is_active = 1'
      )
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'Aucun destinataire trouvé' }, { status: 400 })
    }

    // Insérer une notification par destinataire
    let inserted = 0
    for (const r of recipients) {
      try {
        await db.run(
          `INSERT INTO notifications
           (user_id, type, title, message, link, icon, is_read, created_at, updated_at)
           VALUES (?, 'push', ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`,
          [r.id, title, message, link, icon]
        )
        inserted++
      } catch (err) {
        console.warn(`⚠️ Impossible d'envoyer à user ${r.id}:`, err)
      }
    }

    console.log(`✅ Push envoyée à ${inserted} utilisateur(s) : "${title}"`)

    return NextResponse.json({
      success: true,
      message: `Notification envoyée à ${inserted} utilisateur(s)`,
      recipients: inserted,
      target,
    })
  } catch (error: any) {
    console.error('❌ Erreur POST /api/admin/push-notifications:', error)
    if (error.message === 'TOKEN_MISSING') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN') return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================================
// DELETE /api/admin/push-notifications?id=X — Supprimer une notification
// ============================================================
export async function DELETE(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)
    const { searchParams } = new URL(request.url)
    const id = parseInt(searchParams.get('id') || '', 10)

    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: 'id requis' }, { status: 400 })
    }

    await db.run('DELETE FROM notifications WHERE id = ?', [id])

    return NextResponse.json({ success: true, message: 'Notification supprimée' })
  } catch (error: any) {
    console.error('❌ Erreur DELETE /api/admin/push-notifications:', error)
    if (error.message === 'TOKEN_MISSING') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN') return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'