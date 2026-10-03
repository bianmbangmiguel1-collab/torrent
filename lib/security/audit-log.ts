// lib/security/audit-log.ts
import { getDB } from '@/lib/db';

// ⭐ Types d'actions d'audit
export enum AuditAction {
  // Authentification
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  MFA_SUCCESS = 'MFA_SUCCESS',
  MFA_FAILED = 'MFA_FAILED',
  
  // Paiements
  PAYMENT_INITIATED = 'PAYMENT_INITIATED',
  PAYMENT_INIT_FAILED = 'PAYMENT_INIT_FAILED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_VERIFIED = 'PAYMENT_VERIFIED',
  PAYMENT_VERIFY_FAILED = 'PAYMENT_VERIFY_FAILED',
  
  // Webhooks
  WEBHOOK_RECEIVED = 'WEBHOOK_RECEIVED',
  WEBHOOK_PROCESSED = 'WEBHOOK_PROCESSED',
  WEBHOOK_INVALID_SIGNATURE = 'WEBHOOK_INVALID_SIGNATURE',
  WEBHOOK_ALREADY_PROCESSED = 'WEBHOOK_ALREADY_PROCESSED',
  WEBHOOK_AMOUNT_MISMATCH = 'WEBHOOK_AMOUNT_MISMATCH',
  WEBHOOK_TRANSACTION_NOT_FOUND = 'WEBHOOK_TRANSACTION_NOT_FOUND',
  
  // Commandes
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_UPDATED = 'ORDER_UPDATED',
  ORDER_COMPLETED = 'ORDER_COMPLETED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_REFUNDED = 'ORDER_REFUNDED',
  
  // Admin
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  ADMIN_ACTION = 'ADMIN_ACTION',
  CONFIG_CHANGED = 'CONFIG_CHANGED',
  SECRET_ACCESSED = 'SECRET_ACCESSED',
  
  // Sécurité
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  BLOCKED_IP = 'BLOCKED_IP',
}

interface AuditLogEntry {
  userId?: number;
  action: AuditAction | string;
  details: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

// Row type returned from DB for logs
interface AuditLogRow {
  id: number;
  user_id?: number | null;
  action: string;
  details?: string | null;
  ip?: string | null;
  user_agent?: string | null;
  created_at: string;
}

// ⭐ Journalisation d'audit
export async function auditLog(
  action: AuditAction | string,
  details: Record<string, unknown>,
  userId?: number,
  ip?: string,
  userAgent?: string
): Promise<void> {
  try {
    const db = await getDB();

    // ⭐ S'assurer que la table existe
    await db.exec(`
      CREATE TABLE IF NOT EXISTS security_audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        details TEXT,
        ip TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // ⭐ Nettoyer les données sensibles avant de les stocker
    const cleanDetails = { ...details };
    if (cleanDetails.password) delete cleanDetails.password;
    if (cleanDetails.token) delete cleanDetails.token;
    if (cleanDetails.apiKey) delete cleanDetails.apiKey;
    if (cleanDetails.secret) delete cleanDetails.secret;

    await db.run(
      `INSERT INTO security_audit_logs (user_id, action, details, ip, user_agent) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId || null,
        action,
        JSON.stringify(cleanDetails),
        ip || null,
        userAgent || null,
      ]
    );

  } catch (error) {
    console.error('❌ Erreur audit log:', error);
    // Ne pas faire échouer l'application
  }
}

// ⭐ Récupérer les logs d'audit
export async function getAuditLogs(filters: {
  action?: string;
  userId?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDB();
  let whereClauses: string[] = [];
  const params: any[] = [];

  if (filters.action) {
    whereClauses.push('action = ?');
    params.push(filters.action);
  }

  if (filters.userId) {
    whereClauses.push('user_id = ?');
    params.push(filters.userId);
  }

  if (filters.startDate) {
    whereClauses.push('date(created_at) >= ?');
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    whereClauses.push('date(created_at) <= ?');
    params.push(filters.endDate);
  }

  const where = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';
  const limit = filters.limit || 100;
  const offset = filters.offset || 0;

  const logs = await db.all<AuditLogRow>(
    `SELECT * FROM security_audit_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const total = await db.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM security_audit_logs ${where}`,
    params
  );

  return { logs, total: total?.count || 0 };
}