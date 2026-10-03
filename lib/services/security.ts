// lib/services/security.ts
import { getDB } from '@/lib/db';

export interface SecurityAction {
  user_id: number;
  action: 'ban' | 'unban' | 'suspend' | 'unsuspend';
  reason: string;
  admin_id: number;
  duration?: number; // pour la suspension (en jours)
}

export async function banUser(userId: number, reason: string, adminId: number) {
  const db = await getDB();
  await db.run(
    `UPDATE users 
     SET banned = 1, 
         banned_reason = ?, 
         banned_at = CURRENT_TIMESTAMP, 
         banned_by = ?,
         is_active = 0
     WHERE id = ?`,
    [reason, adminId, userId]
  );

  // Log l'action
  await db.run(
    `INSERT INTO admin_activity_logs (user_id, action, details, created_at)
     VALUES (?, 'ban_utilisateur', ?, CURRENT_TIMESTAMP)`,
    [userId, JSON.stringify({ reason, admin_id: adminId })]
  );

  return true;
}

export async function unbanUser(userId: number, adminId: number) {
  const db = await getDB();
  await db.run(
    `UPDATE users 
     SET banned = 0, 
         banned_reason = NULL, 
         banned_at = NULL, 
         banned_by = NULL,
         is_active = 1
     WHERE id = ?`,
    [userId]
  );

  await db.run(
    `INSERT INTO admin_activity_logs (user_id, action, details, created_at)
     VALUES (?, 'unban_utilisateur', ?, CURRENT_TIMESTAMP)`,
    [userId, JSON.stringify({ admin_id: adminId })]
  );

  return true;
}

export async function suspendUser(userId: number, reason: string, durationDays: number, adminId: number) {
  const db = await getDB();
  await db.run(
    `UPDATE users 
     SET suspended = 1, 
         suspension_reason = ?, 
         suspended_until = datetime('now', ?), 
         suspended_by = ?,
         is_active = 0
     WHERE id = ?`,
    [reason, `+${durationDays} days`, adminId, userId]
  );

  await db.run(
    `INSERT INTO admin_activity_logs (user_id, action, details, created_at)
     VALUES (?, 'suspendre_utilisateur', ?, CURRENT_TIMESTAMP)`,
    [userId, JSON.stringify({ reason, duration: durationDays, admin_id: adminId })]
  );

  return true;
}

export async function unsuspendUser(userId: number, adminId: number) {
  const db = await getDB();
  await db.run(
    `UPDATE users 
     SET suspended = 0, 
         suspension_reason = NULL, 
         suspended_until = NULL, 
         suspended_by = NULL,
         is_active = 1
     WHERE id = ?`,
    [userId]
  );

  await db.run(
    `INSERT INTO admin_activity_logs (user_id, action, details, created_at)
     VALUES (?, 'unsuspendre_utilisateur', ?, CURRENT_TIMESTAMP)`,
    [userId, JSON.stringify({ admin_id: adminId })]
  );

  return true;
}

export async function getSuspendedUsers() {
  const db = await getDB();
  return await db.all(
    `SELECT u.*, a.name as suspended_by_name
     FROM users u
     LEFT JOIN users a ON u.suspended_by = a.id
     WHERE u.suspended = 1 AND datetime(u.suspended_until) > datetime('now')
     ORDER BY u.suspended_until ASC`
  );
}

export async function getBannedUsers() {
  const db = await getDB();
  return await db.all(
    `SELECT u.*, a.name as banned_by_name
     FROM users u
     LEFT JOIN users a ON u.banned_by = a.id
     WHERE u.banned = 1
     ORDER BY u.banned_at DESC`
  );
}

export async function getSecurityStats() {
  const db = await getDB();
  const banned = await db.get('SELECT COUNT(*) as count FROM users WHERE banned = 1');
  const suspended = await db.get('SELECT COUNT(*) as count FROM users WHERE suspended = 1 AND datetime(suspended_until) > datetime("now")');
  const total = await db.get('SELECT COUNT(*) as count FROM users');
  
  return {
    banned: banned?.count || 0,
    suspended: suspended?.count || 0,
    total: total?.count || 0,
  };
}