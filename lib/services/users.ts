// lib/services/users.ts
import { getDB } from '@/lib/db';
import bcrypt from 'bcryptjs';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  is_admin: number;
  is_active: number;
  is_verified: number;
  avatar: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  timezone: string | null;
  language: string | null;
  currency: string | null;
  whatsapp_opt_in: number;
  total_spent: number;
  orders_count: number;
  last_order_date: string | null;
  vip_level: string;
  engagement_score: number;
  last_activity: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  created_at: string;
  last_login: string | null;
}

export interface UserFilters {
  search?: string;
  role?: 'admin' | 'user' | 'all';
  status?: 'active' | 'inactive' | 'all';
  country?: string;
  page?: number;
  limit?: number;
}

// ============================================================
// LISTE DES UTILISATEURS (filtres + pagination)
// ============================================================
export async function getUsers(filters: UserFilters = {}) {
  const {
    search = '',
    role = 'all',
    status = 'all',
    country = '',
    page = 1,
    limit = 20,
  } = filters;

  const db = await getDB();
  const conditions: string[] = [];
  const params: any[] = [];

  if (search) {
    conditions.push('(u.name LIKE ? OR u.email LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (role !== 'all') {
    const isAdmin = role === 'admin' ? 1 : 0;
    conditions.push('u.is_admin = ?');
    params.push(isAdmin);
  }

  if (status !== 'all') {
    const isActive = status === 'active' ? 1 : 0;
    conditions.push('u.is_active = ?');
    params.push(isActive);
  }

  if (country && country !== 'all') {
    conditions.push('u.country = ?');
    params.push(country);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countResult = await db.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM users u ${whereClause}`,
    params
  );
  const total = countResult?.count || 0;

  const users = await db.all<User>(
    `
    SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      u.is_admin,
      u.is_active,
      u.is_verified,
      u.avatar,
      u.phone,
      u.country,
      u.city,
      u.timezone,
      u.language,
      u.currency,
      u.whatsapp_opt_in,
      u.total_spent,
      u.orders_count,
      u.last_order_date,
      u.vip_level,
      u.engagement_score,
      u.last_activity,
      u.device_type,
      u.browser,
      u.os,
      u.created_at,
      u.last_login
    FROM users u
    ${whereClause}
    ORDER BY u.id DESC
    LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// ============================================================
// RÉCUPÉRER UN UTILISATEUR PAR ID
// ============================================================
export async function getUserById(id: number): Promise<User | null> {
  const db = await getDB();
  return await db.get<User>(
    `
    SELECT
      id,
      name,
      email,
      role,
      is_admin,
      is_active,
      is_verified,
      avatar,
      phone,
      country,
      city,
      timezone,
      language,
      currency,
      whatsapp_opt_in,
      total_spent,
      orders_count,
      last_order_date,
      vip_level,
      engagement_score,
      last_activity,
      device_type,
      browser,
      os,
      created_at,
      last_login
    FROM users
    WHERE id = ?
    `,
    [id]
  ) || null;
}

// ============================================================
// CRÉER UN UTILISATEUR
// ============================================================
export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role?: string;
  is_admin?: boolean;
  is_active?: boolean;
  is_verified?: boolean;
  phone?: string;
  country?: string | null;
  city?: string | null;
  timezone?: string | null;
  language?: string | null;
  currency?: string | null;
}) {
  const db = await getDB();
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(data.password, salt);

  const result = await db.run(
    `INSERT INTO users (
      name, email, password, role, is_admin, is_active, is_verified, phone,
      country, city, timezone, language, currency, whatsapp_opt_in,
      total_spent, orders_count, vip_level, engagement_score,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'standard', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      data.name,
      data.email,
      hashedPassword,
      data.role || 'user',
      data.is_admin ? 1 : 0,
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
      data.is_verified !== undefined ? (data.is_verified ? 1 : 0) : 1,
      data.phone || null,
      data.country || null,
      data.city || null,
      data.timezone || null,
      data.language || 'fr',
      data.currency || 'XAF',
      0, // whatsapp_opt_in par défaut
    ]
  );
  return await getUserById(Number(result.lastID ?? 0));
}

// ============================================================
// METTRE À JOUR UN UTILISATEUR (avec logging)
// ============================================================
export async function updateUser(id: number, data: any, adminId?: number | null): Promise<boolean> {
  const db = await getDB();

  const currentUser = await getUserById(id);
  if (!currentUser) return false;

  const fields: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email); }
  if (data.role !== undefined) { fields.push('role = ?'); values.push(data.role); }
  if (data.is_admin !== undefined) { fields.push('is_admin = ?'); values.push(data.is_admin ? 1 : 0); }
  if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active ? 1 : 0); }
  if (data.is_verified !== undefined) { fields.push('is_verified = ?'); values.push(data.is_verified ? 1 : 0); }
  if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
  if (data.country !== undefined) { fields.push('country = ?'); values.push(data.country); }
  if (data.city !== undefined) { fields.push('city = ?'); values.push(data.city); }
  if (data.timezone !== undefined) { fields.push('timezone = ?'); values.push(data.timezone); }
  if (data.language !== undefined) { fields.push('language = ?'); values.push(data.language); }
  if (data.currency !== undefined) { fields.push('currency = ?'); values.push(data.currency); }
  if (data.whatsapp_opt_in !== undefined) { fields.push('whatsapp_opt_in = ?'); values.push(data.whatsapp_opt_in ? 1 : 0); }
  if (data.device_type !== undefined) { fields.push('device_type = ?'); values.push(data.device_type); }
  if (data.browser !== undefined) { fields.push('browser = ?'); values.push(data.browser); }
  if (data.os !== undefined) { fields.push('os = ?'); values.push(data.os); }
  if (data.total_spent !== undefined) { fields.push('total_spent = ?'); values.push(data.total_spent); }
  if (data.orders_count !== undefined) { fields.push('orders_count = ?'); values.push(data.orders_count); }
  if (data.last_order_date !== undefined) { fields.push('last_order_date = ?'); values.push(data.last_order_date); }
  if (data.vip_level !== undefined) { fields.push('vip_level = ?'); values.push(data.vip_level); }
  if (data.engagement_score !== undefined) { fields.push('engagement_score = ?'); values.push(data.engagement_score); }
  if (data.password) {
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(data.password, salt);
    fields.push('password = ?');
    values.push(hashed);
  }

  if (fields.length === 0) return false;
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  const result = await db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

  if (Number(result.changes ?? 0) > 0) {
    const fieldsToCheck = ['name', 'email', 'role', 'is_admin', 'is_active', 'is_verified', 'phone', 'country', 'city', 'timezone', 'language', 'currency', 'whatsapp_opt_in'];
    for (const field of fieldsToCheck) {
      const dataValue = (data as Record<string, unknown>)[field];
      const currentValue = (currentUser as unknown as Record<string, unknown>)[field];
      if (dataValue !== undefined && dataValue !== currentValue) {
        await logProfileChange(id, field, currentValue, dataValue, adminId || null);
      }
    }
  }

  return Number(result.changes ?? 0) > 0;
}

// ============================================================
// SUPPRIMER UN UTILISATEUR
// ============================================================
export async function deleteUser(id: number): Promise<boolean> {
  const db = await getDB();
  const result = await db.run('DELETE FROM users WHERE id = ?', [id]);
  return Number(result.changes ?? 0) > 0;
}

// ============================================================
// LOG DE CHANGEMENT DE PROFIL
// ============================================================
export async function logProfileChange(
  userId: number,
  field: string,
  oldValue: any,
  newValue: any,
  changedBy: number | null
) {
  const db = await getDB();
  await db.run(
    `INSERT INTO user_profile_logs (user_id, field, old_value, new_value, changed_by)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, field, String(oldValue ?? ''), String(newValue ?? ''), changedBy]
  );
}

// ============================================================
// SESSIONS
// ============================================================
export async function createSession(
  userId: number,
  token: string,
  ip: string | null,
  userAgent: string | null,
  deviceType: string | null,
  browser: string | null,
  os: string | null,
  expiresAt: Date
) {
  const db = await getDB();
  await db.run(
    `INSERT INTO user_sessions (user_id, token, ip, user_agent, device_type, browser, os, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, token, ip, userAgent, deviceType, browser, os, expiresAt.toISOString()]
  );
}

export async function getActiveSessions(userId: number) {
  const db = await getDB();
  return await db.all(
    `SELECT id, device_type, browser, os, ip, created_at, expires_at
     FROM user_sessions
     WHERE user_id = ? AND is_active = 1 AND expires_at > CURRENT_TIMESTAMP
     ORDER BY created_at DESC`,
    [userId]
  );
}

export async function revokeSession(sessionId: number, userId: number): Promise<boolean> {
  const db = await getDB();
  const result = await db.run(
    `UPDATE user_sessions SET is_active = 0 WHERE id = ? AND user_id = ?`,
    [sessionId, userId]
  );
  return Number(result.changes ?? 0) > 0;
}

export async function revokeAllSessions(userId: number): Promise<boolean> {
  const db = await getDB();
  const result = await db.run(
    `UPDATE user_sessions SET is_active = 0 WHERE user_id = ?`,
    [userId]
  );
  return Number(result.changes ?? 0) > 0;
}

// ============================================================
// LISTE DES PAYS
// ============================================================
export async function getCountries(): Promise<string[]> {
  const db = await getDB();
  const rows = await db.all<{ country: string }>(
    `SELECT DISTINCT country FROM users WHERE country IS NOT NULL AND country != '' ORDER BY country`
  );
  return rows.map(row => row.country);
}

// ============================================================
// STATISTIQUES UTILISATEUR
// ============================================================
export async function updateUserStats(userId: number) {
  const db = await getDB();
  
  const stats = await db.get<{ total_spent: number; orders_count: number; last_order_date: string }>(
    `SELECT 
       COALESCE(SUM(total), 0) as total_spent,
       COUNT(*) as orders_count,
       MAX(created_at) as last_order_date
     FROM orders
     WHERE user_id = ? AND status = 'completed'`,
    [userId]
  );

  if (stats) {
    await db.run(
      `UPDATE users 
       SET total_spent = ?, 
           orders_count = ?, 
           last_order_date = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [stats.total_spent || 0, stats.orders_count || 0, stats.last_order_date || null, userId]
    );
  }
}

// ============================================================
// PANIERS ABANDONNÉS
// ============================================================
export async function getAbandonedCarts(minutes: number = 30) {
  const db = await getDB();
  return await db.all(
    `SELECT 
       c.user_id,
       u.name,
       u.email,
       u.phone,
       COUNT(c.product_id) as items_count,
       SUM(p.price) as total_amount,
       c.created_at
     FROM cart_items c
     JOIN users u ON c.user_id = u.id
     JOIN products p ON c.product_id = p.id
     WHERE c.created_at < datetime('now', ?)
       AND NOT EXISTS (
         SELECT 1 FROM orders o 
         WHERE o.user_id = c.user_id 
         AND o.created_at > c.created_at
       )
     GROUP BY c.user_id
     ORDER BY c.created_at DESC`,
    [`-${minutes} minutes`]
  );
}

// ============================================================
// SEGMENTATION DES UTILISATEURS
// ============================================================
export async function getUserSegmentation(userId: number) {
  const user = await getUserById(userId);
  if (!user) return null;

  const segments: string[] = [];
  
  // VIP
  if (user.total_spent && user.total_spent > 100000) {
    segments.push('vip');
  } else if (user.orders_count && user.orders_count > 10) {
    segments.push('vip');
  }
  
  // Régulier
  if (user.orders_count && user.orders_count >= 3) {
    segments.push('regular');
  }
  
  // Nouveau
  if (user.created_at) {
    const daysSinceSignup = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceSignup < 7) {
      segments.push('new');
    }
  }
  
  // Inactif
  if (user.last_activity) {
    const daysSinceActivity = (Date.now() - new Date(user.last_activity).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceActivity > 30) {
      segments.push('inactive');
    }
  }
  
  return segments;
}

// ============================================================
// DERNIER ACHAT
// ============================================================
export async function getLastPurchase(userId: number) {
  const db = await getDB();
  return await db.get(
    `SELECT 
       o.id as order_id,
       o.total as amount,
       o.created_at as order_date,
       oi.product_id,
       p.title as product_title,
       p.slug as product_slug
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     JOIN products p ON p.id = oi.product_id
     WHERE o.user_id = ? AND o.status = 'completed'
     ORDER BY o.created_at DESC
     LIMIT 1`,
    [userId]
  );
}

// ============================================================
// ENGAGEMENT SCORE
// ============================================================
export async function updateEngagementScore(userId: number) {
  const db = await getDB();
  const user = await getUserById(userId);
  if (!user) return;

  let score = 0;

  // Connexions récentes (+10 par connexion)
  const sessions = await db.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM user_sessions WHERE user_id = ? AND created_at > datetime('now', '-30 days')`,
    [userId]
  );
  if (sessions) score += sessions.count * 10;

  // Achats (+20 par achat)
  if (user.orders_count) score += user.orders_count * 20;

  // Avis (+5 par avis)
  const reviews = await db.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM reviews WHERE user_id = ?`,
    [userId]
  );
  if (reviews) score += reviews.count * 5;

  // Inactivité (-5 par mois)
  if (user.last_activity) {
    const daysSince = (Date.now() - new Date(user.last_activity).getTime()) / (1000 * 60 * 60 * 24);
    score -= Math.floor(daysSince / 30) * 5;
  }

  // Score minimum 0
  score = Math.max(0, score);

  // Mettre à jour le VIP level en fonction du score
  let vipLevel = 'standard';
  if (score >= 200) vipLevel = 'premium';
  else if (score >= 100) vipLevel = 'vip';
  else if (score >= 50) vipLevel = 'pro';

  await db.run(
    `UPDATE users SET engagement_score = ?, vip_level = ? WHERE id = ?`,
    [score, vipLevel, userId]
  );
}