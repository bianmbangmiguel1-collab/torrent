// lib/notifications.ts
// ============================================================
// 🔔 Système de notifications contextuelles
// - Liées au parcours utilisateur
// - Anti-spam (rate limiting, déduplication)
// - Priorisation intelligente
// - Notifications "produit utile" uniquement si pertinent
// ============================================================

import { getDB } from '@/lib/db'

// ============================================================
// TYPES
// ============================================================

export type NotificationType =
  | 'info'              // Information générale
  | 'success'           // Mission validée, achat confirmé
  | 'warning'           // Rappel doux
  | 'journey'           // Étape débloquée, parcours terminé
  | 'product_tip'       // Produit utile pour l'étape en cours
  | 'reminder'          // Rappel de mission quotidienne
  | 'achievement'       // Badge débloqué
  | 'system'            // Message système

export interface CreateNotificationInput {
  userId: number
  type: NotificationType
  title: string
  message: string
  link?: string
  icon?: string
  metadata?: Record<string, any>
  // Anti-spam
  dedupKey?: string        // Clé unique pour éviter les doublons (ex: "step_complete_42")
  priority?: 'low' | 'normal' | 'high'
  expiresInHours?: number  // Durée de vie
  skipRateLimit?: boolean  // Pour les notifs critiques
}

export interface NotificationRow {
  id: number
  user_id: number
  type: string
  title: string
  message: string
  is_read: number
  link: string | null
  icon: string | null
  created_at: string
  updated_at: string
}

// ============================================================
// CONFIG ANTI-SPAM
// ============================================================

const RATE_LIMITS = {
  // Max notifications par utilisateur sur une fenêtre donnée
  perHour: 6,
  perDay: 20,
  // Délai minimum entre 2 notifications du même type
  minDelayBetweenSameType: 30 * 60 * 1000, // 30 minutes
  // Durée de vie par défaut (heures)
  defaultExpiryHours: 72,
}

// Types qui contournent le rate limit (critiques)
const CRITICAL_TYPES: NotificationType[] = ['success', 'system']

// ============================================================
// 🎯 CRÉATION DE NOTIFICATION (avec anti-spam intégré)
// ============================================================

export async function createNotification(
  input: CreateNotificationInput
): Promise<{ created: boolean; id?: number; reason?: string }> {
  const db = await getDB()

  const {
    userId,
    type,
    title,
    message,
    link,
    icon,
    metadata,
    dedupKey,
    priority = 'normal',
    expiresInHours = RATE_LIMITS.defaultExpiryHours,
    skipRateLimit = false,
  } = input

  try {
    // 1. Déduplication par clé unique
    if (dedupKey) {
      const existing = await db.get(
        `SELECT id, created_at FROM notifications
         WHERE user_id = ? AND title = ? AND message = ?
           AND created_at > datetime('now', '-24 hours')
         LIMIT 1`,
        [userId, title, message]
      )
      if (existing) {
        return { created: false, reason: 'duplicate' }
      }
    }

    // 2. Rate limiting (sauf types critiques)
    if (!skipRateLimit && !CRITICAL_TYPES.includes(type)) {
      const rateCheck = await checkRateLimit(userId, type)
      if (!rateCheck.allowed) {
        return { created: false, reason: rateCheck.reason }
      }
    }

    // 3. Vérifier que l'utilisateur existe et est actif
    const user = await db.get(
      `SELECT id, email_notifications, push_notifications, is_active
       FROM users WHERE id = ?`,
      [userId]
    )
    if (!user || !user.is_active) {
      return { created: false, reason: 'user_inactive' }
    }

    // 4. Vérifier les préférences utilisateur
    if (
      (type === 'product_tip' || type === 'reminder') &&
      user.push_notifications === 0
    ) {
      return { created: false, reason: 'user_opted_out' }
    }

    // 5. Insérer
    const enrichedMessage = metadata
      ? `${message}|||${JSON.stringify(metadata)}`
      : message

    const result = await db.run(
      `INSERT INTO notifications
       (user_id, type, title, message, link, icon, is_read, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [userId, type, title, enrichedMessage, link || null, icon || null]
    )

    return { created: true, id: result.lastID }
  } catch (err: any) {
    console.error('❌ createNotification :', err)
    return { created: false, reason: 'error' }
  }
}

// ============================================================
// 🚦 RATE LIMITING
// ============================================================

async function checkRateLimit(
  userId: number,
  type: NotificationType
): Promise<{ allowed: boolean; reason?: string }> {
  const db = await getDB()

  // Compter sur la dernière heure
  const hourCount = await db.get(
    `SELECT COUNT(*) as count FROM notifications
     WHERE user_id = ?
       AND created_at > datetime('now', '-1 hour')
       AND type NOT IN ('system', 'success')`,
    [userId]
  )

  if ((hourCount?.count || 0) >= RATE_LIMITS.perHour) {
    return { allowed: false, reason: 'rate_limit_hour' }
  }

  // Compter sur les dernières 24h
  const dayCount = await db.get(
    `SELECT COUNT(*) as count FROM notifications
     WHERE user_id = ?
       AND created_at > datetime('now', '-24 hours')
       AND type NOT IN ('system', 'success')`,
    [userId]
  )

  if ((dayCount?.count || 0) >= RATE_LIMITS.perDay) {
    return { allowed: false, reason: 'rate_limit_day' }
  }

  // Délai minimum entre 2 notifs du même type
  const lastSameType = await db.get(
    `SELECT created_at FROM notifications
     WHERE user_id = ? AND type = ?
     ORDER BY created_at DESC LIMIT 1`,
    [userId, type]
  )

  if (lastSameType) {
    const lastTime = new Date(lastSameType.created_at).getTime()
    const now = Date.now()
    if (now - lastTime < RATE_LIMITS.minDelayBetweenSameType) {
      return { allowed: false, reason: 'too_soon_same_type' }
    }
  }

  return { allowed: true }
}

// ============================================================
// 📖 LECTURE DES NOTIFICATIONS
// ============================================================

export async function getUserNotifications(
  userId: number,
  options: { limit?: number; unreadOnly?: boolean } = {}
): Promise<NotificationRow[]> {
  const db = await getDB()
  const { limit = 20, unreadOnly = false } = options

  const whereUnread = unreadOnly ? 'AND is_read = 0' : ''

  const rows = await db.all(
    `SELECT * FROM notifications
     WHERE user_id = ? ${whereUnread}
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, limit]
  )

  return rows.map(parseNotificationRow)
}

export async function getUnreadCount(userId: number): Promise<number> {
  const db = await getDB()
  const row = await db.get(
    `SELECT COUNT(*) as count FROM notifications
     WHERE user_id = ? AND is_read = 0`,
    [userId]
  )
  return row?.count || 0
}

export async function markAsRead(userId: number, notificationId: number): Promise<boolean> {
  const db = await getDB()
  const result = await db.run(
    `UPDATE notifications
     SET is_read = 1, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`,
    [notificationId, userId]
  )
  return (result.changes || 0) > 0
}

export async function markAllAsRead(userId: number): Promise<number> {
  const db = await getDB()
  const result = await db.run(
    `UPDATE notifications
     SET is_read = 1, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND is_read = 0`,
    [userId]
  )
  return result.changes || 0
}

export async function deleteNotification(userId: number, notificationId: number): Promise<boolean> {
  const db = await getDB()
  const result = await db.run(
    `DELETE FROM notifications WHERE id = ? AND user_id = ?`,
    [notificationId, userId]
  )
  return (result.changes || 0) > 0
}

// ============================================================
// 🧹 NETTOYAGE
// ============================================================

export async function cleanupOldNotifications(daysOld: number = 30): Promise<number> {
  const db = await getDB()
  const result = await db.run(
    `DELETE FROM notifications
     WHERE is_read = 1
       AND created_at < datetime('now', '-' || ? || ' days')`,
    [daysOld]
  )
  return result.changes || 0
}

// ============================================================
// 🎯 NOTIFICATIONS CONTEXTUELLES LIÉES AU PARCOURS
// ============================================================

/**
 * Notifier qu'une étape vient d'être débloquée
 */
export async function notifyStepUnlocked(
  userId: number,
  journeyId: number,
  step: { id: number; step_number: number; title: string; mission_text: string }
): Promise<{ created: boolean; id?: number; reason?: string }> {
  return createNotification({
    userId,
    type: 'journey',
    title: `🎯 Étape ${step.step_number} débloquée`,
    message: `"${step.title}" — ${truncate(step.mission_text, 80)}`,
    link: `/dashboard?step=${step.id}`,
    icon: 'target',
    metadata: { journeyId, stepId: step.id, stepNumber: step.step_number },
    dedupKey: `step_unlock_${step.id}`,
    priority: 'high',
  })
}

/**
 * Notifier qu'une mission est validée
 */
export async function notifyMissionCompleted(
  userId: number,
  stepId: number,
  stepTitle: string,
  progressPercent: number,
  isLastStep: boolean
): Promise<{ created: boolean; id?: number; reason?: string }> {
  if (isLastStep) {
    return createNotification({
      userId,
      type: 'success',
      title: '🏆 Parcours terminé !',
      message: `Bravo, tu as complété "${stepTitle}". Prêt pour un nouvel objectif ?`,
      link: '/dashboard?newGoal=true',
      icon: 'trophy',
      metadata: { stepId, finalStep: true },
      dedupKey: `journey_complete_${stepId}`,
      skipRateLimit: true,
    })
  }

  return createNotification({
    userId,
    type: 'success',
    title: '✅ Mission accomplie',
    message: `"${stepTitle}" validée — Progression : ${progressPercent}%`,
    link: '/dashboard',
    icon: 'check-circle',
    metadata: { stepId, progressPercent },
    dedupKey: `mission_complete_${stepId}`,
    skipRateLimit: true,
  })
}

/**
 * 🔥 Notifier qu'un produit est utile pour l'étape en cours
 * C'est LA notification contextuelle clé : on ne notifie que si le produit
 * est réellement lié à l'étape active de l'utilisateur.
 */
export async function notifyProductUseful(
  userId: number,
  stepId: number,
  product: { id: number; title: string; slug: string },
  reason: string
): Promise<{ created: boolean; id?: number; reason?: string }> {
  return createNotification({
    userId,
    type: 'product_tip',
    title: `💡 Ce produit peut t'aider`,
    message: `"${truncate(product.title, 60)}" — ${truncate(reason, 100)}`,
    link: `/product/${product.slug}`,
    icon: 'lightbulb',
    metadata: { stepId, productId: product.id },
    dedupKey: `product_tip_${stepId}_${product.id}`,
    priority: 'normal',
  })
}

/**
 * Notifier qu'un nouveau parcours peut être créé (fin de parcours)
 */
export async function notifyJourneyCompleted(
  userId: number,
  journeyId: number,
  journeyTitle: string
): Promise<{ created: boolean; id?: number; reason?: string }> {
  return createNotification({
    userId,
    type: 'journey',
    title: '🎉 Parcours terminé',
    message: `Tu as complété "${journeyTitle}". Choisis un nouvel objectif pour continuer.`,
    link: '/dashboard?newGoal=true',
    icon: 'flag',
    metadata: { journeyId },
    dedupKey: `journey_done_${journeyId}`,
    skipRateLimit: true,
  })
}

/**
 * Rappel quotidien : mission du jour
 * À déclencher par un cron le matin.
 */
export async function notifyDailyMission(
  userId: number,
  step: { id: number; title: string; mission_text: string; estimated_minutes: number }
): Promise<{ created: boolean; id?: number; reason?: string }> {
  const today = new Date().toISOString().slice(0, 10)
  return createNotification({
    userId,
    type: 'reminder',
    title: '☀️ Ta mission du jour',
    message: `"${truncate(step.title, 50)}" (~${step.estimated_minutes} min) — ${truncate(step.mission_text, 80)}`,
    link: `/dashboard?step=${step.id}`,
    icon: 'sun',
    metadata: { stepId: step.id, date: today },
    dedupKey: `daily_mission_${step.id}_${today}`,
    priority: 'high',
  })
}

/**
 * Notifier un badge débloqué
 */
export async function notifyAchievement(
  userId: number,
  badgeName: string,
  badgeDescription: string
): Promise<{ created: boolean; id?: number; reason?: string }> {
  return createNotification({
    userId,
    type: 'achievement',
    title: `🏅 Badge débloqué : ${badgeName}`,
    message: badgeDescription,
    link: '/dashboard?badges=true',
    icon: 'award',
    metadata: { badgeName },
    dedupKey: `badge_${badgeName}_${userId}`,
    skipRateLimit: true,
  })
}

// ============================================================
// 🎯 NOTIFICATIONS PRODUIT UNIQUEMENT SI UTILE AU PARCOURS
// ============================================================

/**
 * Vérifie si un produit est utile au parcours actif de l'utilisateur.
 * Retourne la raison si oui, sinon null.
 */
export async function isProductUsefulForUser(
  userId: number,
  productId: number
): Promise<{ useful: boolean; stepId?: number; reason?: string }> {
  const db = await getDB()

  try {
    // 1. Trouver le parcours actif
    const journey = await db.get(
      `SELECT j.* FROM journeys j
       WHERE j.user_id = ? AND j.status = 'active'
       ORDER BY j.created_at DESC LIMIT 1`,
      [userId]
    )
    if (!journey) return { useful: false }

    // 2. Trouver l'étape en cours
    const step = await db.get(
      `SELECT * FROM journey_steps
       WHERE journey_id = ? AND status IN ('available', 'in_progress')
       ORDER BY step_number ASC LIMIT 1`,
      [journey.id]
    )
    if (!step) return { useful: false }

    // 3. Le produit est-il lié à cette étape ?
    const link = await db.get(
      `SELECT * FROM step_recommendations
       WHERE step_id = ? AND product_id = ?
       LIMIT 1`,
      [step.id, productId]
    )

    if (link) {
      return {
        useful: true,
        stepId: step.id,
        reason: link.reason || `Recommandé pour l'étape "${step.title}"`,
      }
    }

    // 4. Fallback : le produit matche-t-il les mots-clés du parcours ?
    const keywords = (journey.title || '')
      .toLowerCase()
      .split(/\s+/)
      .filter((w: string) => w.length > 3)
      .slice(0, 3)

    if (keywords.length > 0) {
      const product = await db.get(
        `SELECT title, description, meta_keywords FROM products WHERE id = ?`,
        [productId]
      )
      if (product) {
        const haystack = `${product.title} ${product.description || ''} ${product.meta_keywords || ''}`.toLowerCase()
        const matches = keywords.filter((k: string) => haystack.includes(k))
        if (matches.length > 0) {
          return {
            useful: true,
            stepId: step.id,
            reason: `Correspond à ton objectif "${journey.title}"`,
          }
        }
      }
    }

    return { useful: false }
  } catch (err) {
    console.error('❌ isProductUsefulForUser :', err)
    return { useful: false }
  }
}

/**
 * Notifie l'utilisateur si un produit consulté est utile à son parcours.
 * À appeler depuis la page produit (server-side) ou via API.
 */
export async function maybeNotifyProductViewed(
  userId: number,
  product: { id: number; title: string; slug: string }
): Promise<{ created: boolean; reason?: string }> {
  // 1. Vérifier la pertinence
  const check = await isProductUsefulForUser(userId, product.id)
  if (!check.useful || !check.stepId) {
    return { created: false, reason: 'not_relevant' }
  }

  // 2. Vérifier que l'utilisateur a bien consulté (évite les faux positifs)
  const db = await getDB()
  const viewed = await db.get(
    `SELECT id FROM user_product_views
     WHERE user_id = ? AND product_id = ?
       AND viewed_at > datetime('now', '-5 minutes')
     LIMIT 1`,
    [userId, product.id]
  )
  if (!viewed) {
    return { created: false, reason: 'not_viewed_recently' }
  }

  // 3. Créer la notification
  const result = await notifyProductUseful(
    userId,
    check.stepId,
    product,
    check.reason || 'Utile pour ton étape en cours'
  )

  return { created: result.created, reason: result.reason }
}

// ============================================================
// 🕐 CRON : RAPPELS QUOTIDIENS
// ============================================================

/**
 * À appeler une fois par jour (matin) via un cron job.
 * Parcourt tous les utilisateurs avec un parcours actif
 * et leur envoie la mission du jour.
 */
export async function sendDailyMissionReminders(): Promise<{
  sent: number
  skipped: number
}> {
  const db = await getDB()
  let sent = 0
  let skipped = 0

  try {
    // Récupérer tous les parcours actifs
    const journeys = await db.all(
      `SELECT j.*, u.id as user_id, u.is_active as user_active
       FROM journeys j
       JOIN users u ON u.id = j.user_id
       WHERE j.status = 'active' AND u.is_active = 1`
    )

    for (const journey of journeys) {
      // Étape en cours
      const step = await db.get(
        `SELECT * FROM journey_steps
         WHERE journey_id = ? AND status IN ('available', 'in_progress')
         ORDER BY step_number ASC LIMIT 1`,
        [journey.id]
      )

      if (!step) {
        skipped++
        continue
      }

      const result = await notifyDailyMission(journey.user_id, {
        id: step.id,
        title: step.title,
        mission_text: step.mission_text,
        estimated_minutes: step.estimated_minutes || 15,
      })

      if (result.created) sent++
      else skipped++
    }
  } catch (err) {
    console.error('❌ sendDailyMissionReminders :', err)
  }

  return { sent, skipped }
}

// ============================================================
// 🧰 HELPERS
// ============================================================

function parseNotificationRow(row: NotificationRow): NotificationRow & { metadata?: any } {
  let metadata: any = undefined
  let message = row.message

  if (message && message.includes('|||')) {
    const [cleanMsg, metaStr] = message.split('|||')
    message = cleanMsg
    try {
      metadata = JSON.parse(metaStr)
    } catch {}
  }

  return { ...row, message, metadata }
}

function truncate(str: string, max: number): string {
  if (!str) return ''
  const clean = str.replace(/\s+/g, ' ').trim()
  return clean.length > max ? clean.slice(0, max - 1) + '…' : clean
}

// ============================================================
// 📊 STATS (admin / debug)
// ============================================================

export async function getNotificationStats(userId?: number) {
  const db = await getDB()
  const where = userId ? 'WHERE user_id = ?' : ''
  const params = userId ? [userId] : []

  const total = await db.get(
    `SELECT COUNT(*) as count FROM notifications ${where}`,
    params
  )

  const unread = await db.get(
    `SELECT COUNT(*) as count FROM notifications ${where}${where ? ' AND' : 'WHERE'} is_read = 0`,
    params
  )

  const byType = await db.all(
    `SELECT type, COUNT(*) as count FROM notifications ${where}
     GROUP BY type ORDER BY count DESC`,
    params
  )

  return {
    total: total?.count || 0,
    unread: unread?.count || 0,
    byType,
  }
}