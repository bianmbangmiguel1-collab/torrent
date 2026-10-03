export const dynamic = 'force-dynamic';

// app/api/notifications/route.ts
// ============================================================
// 🔔 API Notifications — version complète
// - GET   : liste paginée + filtres + groupe + unread count
// - POST  : créer une notif (usage interne/admin) OU mark_all
// - PATCH : marquer lue (1 ou plusieurs) OU tout marquer
// - DELETE: supprimer (1 ou plusieurs) OU tout vider
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationStats,
  type NotificationType,
} from '@/lib/notifications'

// ============================================================
// TYPES
// ============================================================

type NotificationPriority = 'low' | 'normal' | 'high'

interface CreateNotificationBody {
  mark_all?: boolean
  userId?: number | string
  type?: NotificationType
  title?: string
  message?: string
  link?: string
  icon?: string
  metadata?: Record<string, unknown>
  dedupKey?: string
  priority?: NotificationPriority
  skipRateLimit?: boolean
}

interface UpdateNotificationBody {
  notification_id?: number | string
  notification_ids?: Array<number | string>
  mark_all?: boolean
}

interface DeleteNotificationBody {
  all?: boolean
  ids?: Array<number | string>
  id?: number | string
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Décode le token JWT présent dans les cookies.
 * Retourne l'userId ou null.
 */
function getUserIdFromToken(request: NextRequest): number | null {
  try {
    const token =
      request.cookies.get('user_session')?.value ||
      request.cookies.get('token')?.value

    if (!token) return null

    const base64Url = token.split('.')[1]
    if (!base64Url) return null

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const decoded = JSON.parse(jsonPayload)
    const id = decoded?.id || decoded?.userId || null
    return id ? Number(id) : null
  } catch {
    return null
  }
}

/**
 * Réponse standardisée non authentifié.
 */
function unauthorized(extra: Record<string, any> = {}) {
  return NextResponse.json(
    { success: false, error: 'Non authentifié', ...extra },
    { status: 401 }
  )
}

/**
 * Parse une notification côté API :
 * - décode le metadata embarqué dans message (format "message|||{json}")
 * - conserve le champ `read` (booléen) pour compat UI existante
 */
function shapeNotification(row: any) {
  let message: string = row.message || ''
  let metadata: Record<string, any> | undefined

  if (message.includes('|||')) {
    const [cleanMsg, metaStr] = message.split('|||')
    message = cleanMsg
    try {
      metadata = JSON.parse(metaStr)
    } catch {
      metadata = undefined
    }
  }

  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    title: row.title,
    message,
    metadata,
    is_read: row.is_read ?? row.read ?? 0,
    read: (row.is_read ?? row.read ?? 0) === 1, // compat UI
    link: row.link,
    icon: row.icon,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

// ============================================================
// GET : Liste des notifications
// Query params :
//   - limit     (int, default 50)
//   - offset    (int, default 0)
//   - unread    ("true" → non lues uniquement)
//   - group     ("parcours" | "produit" | "social" | "système")
//   - type      (filtre précis, ex: "journey", "reminder")
//   - stats     ("true" → renvoie aussi les stats agrégées)
// ============================================================

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/notifications - Début')

    const userId = getUserIdFromToken(request)
    if (!userId) {
      console.log('❌ Token manquant ou invalide')
      return unauthorized({ notifications: [], unread_count: 0 })
    }

    console.log('👤 User ID:', userId)

    const db = await getDB()

    // --- S'assurer que la table existe ---
    try {
      const tableCheck = await db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='notifications'"
      )
      if (!tableCheck) {
        console.log('⚠️ Table notifications absente — création…')
        await db.exec(`
          CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT DEFAULT 'info',
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            link TEXT,
            icon TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `)
        await db.exec(
          `CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`
        )
        await db.exec(
          `CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)`
        )
      }
    } catch (err) {
      console.warn('⚠️ Vérification table notifications :', err)
    }

    // --- Query params ---
    const sp = request.nextUrl.searchParams
    const limit = Math.min(parseInt(sp.get('limit') || '50'), 200)
    const offset = Math.max(parseInt(sp.get('offset') || '0'), 0)
    const unreadOnly = sp.get('unread') === 'true'
    const groupFilter = sp.get('group') // parcours | produit | social | système
    const typeFilter = sp.get('type') // journey | reminder | etc.
    const withStats = sp.get('stats') === 'true'

    // --- Mapping groupe → types ---
    const GROUP_TO_TYPES: Record<string, string[]> = {
      parcours: ['journey', 'reminder', 'success', 'achievement'],
      produit: ['product_tip', 'promotion', 'order'],
      social: ['favorite'],
      système: ['system', 'info', 'warning', 'error'],
    }

    // --- Construction WHERE ---
    const where: string[] = ['user_id = ?']
    const params: any[] = [userId]

    if (unreadOnly) {
      where.push('is_read = 0')
    }

    if (typeFilter) {
      where.push('type = ?')
      params.push(typeFilter)
    } else if (groupFilter && GROUP_TO_TYPES[groupFilter]) {
      const types = GROUP_TO_TYPES[groupFilter]
      where.push(`type IN (${types.map(() => '?').join(',')})`)
      params.push(...types)
    }

    const whereClause = `WHERE ${where.join(' AND ')}`

    console.log('📊 Requête:', { whereClause, limit, offset })

    // --- Récupération ---
    const rows = await db.all(
      `SELECT id, user_id, type, title, message, is_read, link, icon, created_at, updated_at
       FROM notifications
       ${whereClause}
       ORDER BY is_read ASC, created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )

    const notifications = (rows || []).map(shapeNotification)

    // --- Compteurs ---
    const unreadCount = await getUnreadCount(userId)
    const totalCountRow = await db.get(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = ?`,
      [userId]
    )
    const totalCount = totalCountRow?.count || 0

    // --- Stats optionnelles ---
    let stats = null
    if (withStats) {
      stats = await getNotificationStats(userId)
    }

    console.log(`✅ ${notifications.length} notifs (${unreadCount} non lues)`)

    return NextResponse.json({
      success: true,
      notifications,
      unread_count: unreadCount,
      unreadCount, // compat
      total: totalCount,
      pagination: {
        limit,
        offset,
        hasMore: offset + notifications.length < totalCount,
      },
      ...(stats ? { stats } : {}),
    })
  } catch (error) {
    console.error('❌ GET /api/notifications:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          'Erreur serveur: ' +
          (error instanceof Error ? error.message : 'Unknown'),
        notifications: [],
        unread_count: 0,
      },
      { status: 500 }
    )
  }
}

// ============================================================
// POST : Deux usages
// 1) { mark_all: true } → marquer tout comme lu
// 2) { userId, type, title, message, ... } → créer une notif
//    (réservé aux usages internes — vérif admin si besoin)
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request)
    if (!userId) return unauthorized()

    const body = (await request.json().catch(() => ({}))) as CreateNotificationBody
    const { mark_all, ...createPayload } = body

    // --- Cas 1 : mark_all ---
    if (mark_all === true) {
      const count = await markAllAsRead(userId)
      return NextResponse.json({
        success: true,
        markedRead: count,
        message: 'Toutes les notifications ont été marquées comme lues',
      })
    }

    // --- Cas 2 : création programmatique ---
    if (createPayload?.title && createPayload?.message) {
      const targetUserId = Number(createPayload.userId || userId)
      const result = await createNotification({
        userId: targetUserId,
        type: (createPayload.type || 'info') as NotificationType,
        title: String(createPayload.title),
        message: String(createPayload.message),
        link: createPayload.link,
        icon: createPayload.icon,
        metadata: createPayload.metadata,
        dedupKey: createPayload.dedupKey,
        priority: createPayload.priority,
        skipRateLimit: createPayload.skipRateLimit === true,
      })

      return NextResponse.json({
        success: result.created,
        id: result.id,
        reason: result.reason,
      })
    }

    return NextResponse.json(
      { success: false, error: 'Corps de requête invalide' },
      { status: 400 }
    )
  } catch (error) {
    console.error('❌ POST /api/notifications:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// ============================================================
// PATCH : Marquer comme lue
// Body :
//   - { notification_id: number }       → une seule
//   - { notification_ids: number[] }    → plusieurs
//   - { mark_all: true }                → toutes
// ============================================================

export async function PATCH(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request)
    if (!userId) return unauthorized()

    const body = (await request.json().catch(() => ({}))) as UpdateNotificationBody
    const { notification_id, notification_ids, mark_all } = body

    console.log('📝 PATCH body:', { notification_id, notification_ids, mark_all })

    const db = await getDB()

    // --- Tout marquer ---
    if (mark_all === true) {
      const count = await markAllAsRead(userId)
      return NextResponse.json({
        success: true,
        markedRead: count,
        message: 'Toutes les notifications ont été marquées comme lues',
      })
    }

    // --- Plusieurs ---
    if (Array.isArray(notification_ids) && notification_ids.length > 0) {
      const placeholders = notification_ids.map(() => '?').join(',')
      const result = await db.run(
        `UPDATE notifications
         SET is_read = 1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND id IN (${placeholders})`,
        [userId, ...notification_ids]
      )
      return NextResponse.json({
        success: true,
        updated: result.changes || 0,
      })
    }

    // --- Une seule ---
    if (!notification_id) {
      return NextResponse.json(
        { success: false, error: 'ID notification requis' },
        { status: 400 }
      )
    }

    const ok = await markAsRead(userId, Number(notification_id))
    if (!ok) {
      return NextResponse.json(
        { success: false, error: 'Notification non trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Notification marquée comme lue',
    })
  } catch (error) {
    console.error('❌ PATCH /api/notifications:', error)
    return NextResponse.json(
      { error: 'Erreur serveur: ' + (error instanceof Error ? error.message : 'Unknown') },
      { status: 500 }
    )
  }
}

// ============================================================
// DELETE : Supprimer
// Query  : ?id=123          → une seule
// Body   : { ids: [..] }    → plusieurs
//        : { all: true }    → tout
// ============================================================

export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request)
    if (!userId) return unauthorized()

    const sp = request.nextUrl.searchParams
    const queryId = sp.get('id')

    // --- Mode bulk via body ---
    let body: DeleteNotificationBody = {}
    try {
      body = (await request.json()) as DeleteNotificationBody
    } catch {
      // pas de body = ok si queryId présent
    }

    const db = await getDB()

    // --- Tout supprimer ---
    if (body?.all === true) {
      const result = await db.run(
        'DELETE FROM notifications WHERE user_id = ?',
        [userId]
      )
      return NextResponse.json({
        success: true,
        deleted: result.changes || 0,
        message: 'Toutes les notifications supprimées',
      })
    }

    // --- Plusieurs ---
    if (Array.isArray(body?.ids) && body.ids.length > 0) {
      const placeholders = body.ids.map(() => '?').join(',')
      const result = await db.run(
        `DELETE FROM notifications WHERE user_id = ? AND id IN (${placeholders})`,
        [userId, ...body.ids]
      )
      return NextResponse.json({
        success: true,
        deleted: result.changes || 0,
      })
    }

    // --- Une seule ---
    const id = queryId || body?.id
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID notification requis' },
        { status: 400 }
      )
    }

    const ok = await deleteNotification(userId, Number(id))
    if (!ok) {
      return NextResponse.json(
        { success: false, error: 'Notification non trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Notification supprimée',
    })
  } catch (error) {
    console.error('❌ DELETE /api/notifications:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================================
// OPTIONS : CORS
// ============================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  })
}