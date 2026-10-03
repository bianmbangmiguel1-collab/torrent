// lib/services/newsletter.ts
import { getDB } from '@/lib/db';

export interface Subscriber {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  country: string | null;
  status: string;
  source: string;
  opt_in: number;
  preferences: string | null;
  subscribed_at: string;
  unsubscribed_at: string | null;
  last_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriberFilters {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  source?: string;
  country?: string;
  page?: number;
  limit?: number;
}

export async function getSubscribers(filters: SubscriberFilters = {}) {
  const {
    search = '',
    status = 'all',
    source = 'all',
    country = 'all',
    page = 1,
    limit = 20,
  } = filters;

  const db = await getDB();
  const conditions: string[] = [];
  const params: any[] = [];

  if (search) {
    conditions.push('(email LIKE ? OR name LIKE ? OR phone LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (status !== 'all') {
    conditions.push('status = ?');
    params.push(status);
  }

  if (source !== 'all') {
    conditions.push('source = ?');
    params.push(source);
  }

  if (country !== 'all') {
    conditions.push('country = ?');
    params.push(country);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countResult = await db.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM newsletter_subscribers ${whereClause}`,
    params
  );
  const total = countResult?.count || 0;

  const subscribers = await db.all<Subscriber>(
    `
    SELECT *
    FROM newsletter_subscribers
    ${whereClause}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  return { subscribers, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getSubscriberById(id: number): Promise<Subscriber | null> {
  const db = await getDB();
  return await db.get<Subscriber>('SELECT * FROM newsletter_subscribers WHERE id = ?', [id]) || null;
}

export async function createSubscriber(data: {
  email: string;
  name?: string;
  phone?: string;
  country?: string;
  source?: string;
  preferences?: string;
}) {
  const db = await getDB();
  const result = await db.run(
    `INSERT INTO newsletter_subscribers (email, name, phone, country, source, preferences, status, opt_in, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'active', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [data.email, data.name || null, data.phone || null, data.country || null, data.source || 'website', data.preferences || null]
  );
  const insertedId = Number(result.lastID ?? 0);
  return await getSubscriberById(insertedId);
}

export async function updateSubscriber(id: number, data: Partial<Subscriber>) {
  const db = await getDB();
  const fields: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email); }
  if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
  if (data.country !== undefined) { fields.push('country = ?'); values.push(data.country); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.source !== undefined) { fields.push('source = ?'); values.push(data.source); }
  if (data.opt_in !== undefined) { fields.push('opt_in = ?'); values.push(data.opt_in ? 1 : 0); }
  if (data.preferences !== undefined) { fields.push('preferences = ?'); values.push(data.preferences); }

  if (fields.length === 0) return false;
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  const result = await db.run(`UPDATE newsletter_subscribers SET ${fields.join(', ')} WHERE id = ?`, values);
  return Number(result.changes ?? 0) > 0;
}

export async function deleteSubscriber(id: number): Promise<boolean> {
  const db = await getDB();
  const result = await db.run('DELETE FROM newsletter_subscribers WHERE id = ?', [id]);
  return Number(result.changes ?? 0) > 0;
}

export async function unsubscribeSubscriber(email: string): Promise<boolean> {
  const db = await getDB();
  const result = await db.run(
    `UPDATE newsletter_subscribers 
     SET status = 'inactive', opt_in = 0, unsubscribed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE email = ?`,
    [email]
  );
  return Number(result.changes ?? 0) > 0;
}

export async function getSources() {
  const db = await getDB();
  const sources = await db.all<{ source: string }>(
    'SELECT DISTINCT source FROM newsletter_subscribers WHERE source IS NOT NULL ORDER BY source'
  );
  return sources.map(s => s.source);
}

export async function getCountries() {
  const db = await getDB();
  const countries = await db.all<{ country: string }>(
    'SELECT DISTINCT country FROM newsletter_subscribers WHERE country IS NOT NULL AND country != "" ORDER BY country'
  );
  return countries.map(c => c.country);
}

export async function exportSubscribers(filters?: { status?: string; source?: string; country?: string }) {
  const db = await getDB();
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters?.status && filters.status !== 'all') {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  if (filters?.source && filters.source !== 'all') {
    conditions.push('source = ?');
    params.push(filters.source);
  }
  if (filters?.country && filters.country !== 'all') {
    conditions.push('country = ?');
    params.push(filters.country);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return await db.all(
    `
    SELECT id, email, name, phone, country, status, source, opt_in, subscribed_at, last_sent_at
    FROM newsletter_subscribers
    ${whereClause}
    ORDER BY id DESC
    `,
    params
  );
}