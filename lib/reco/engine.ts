// lib/reco/engine.ts
import { getDB } from '@/lib/db';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type SectionKey =
  | 'new' | 'promo' | 'popular' | 'trending' | 'ai' | 'bestsellers';

export interface RecoProduct {
  id: number;
  category_id: number | null;
  created_at: string;
  price: number;
  compare_price: number | null;
  avg_rating: number | null;
  review_count: number;
  sales_count: number;
  [k: string]: unknown;
}

export interface GetHomeOptions {
  userId?: number | null;
  visitorId: string;
  device: 'mobile' | 'tablet' | 'desktop';
  limitPerSection?: number;
}

export type HomeSections = Record<SectionKey, RecoProduct[]>;

// ─────────────────────────────────────────────────────────────
// PRNG déterministe (visitor + date + section)
// ─────────────────────────────────────────────────────────────

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRand(visitorId: string, section: string, dateKey: string) {
  return mulberry32(hashString(`${visitorId}|${dateKey}|${section}`));
}

// ─────────────────────────────────────────────────────────────
// Features produit (normalisées 0..1)
// ─────────────────────────────────────────────────────────────

const NOW = () => Date.now();

function freshness(createdAt: string): number {
  const days = (NOW() - new Date(createdAt).getTime()) / 86_400_000;
  return Math.exp(-Math.max(0, days) / 30); // demi-vie ~30j
}

function popularity(sales: number): number {
  return Math.min(1, Math.log10(1 + sales) / 3);
}

function ratingScore(avg: number | null, count: number): number {
  const a = (avg ?? 0) / 5;
  const prior = 0.7, weight = 5; // lisse les petites séries
  return (a * count + prior * weight) / (count + weight);
}

function discountScore(price: number, compare: number | null): number {
  if (!compare || compare <= price) return 0;
  return Math.min(1, (compare - price) / compare);
}

// ─────────────────────────────────────────────────────────────
// Pondérations par section
// ─────────────────────────────────────────────────────────────

const WEIGHTS: Record<SectionKey, {
  fresh: number; pop: number; rate: number; disc: number; aff: number;
}> = {
  new:         { fresh: 0.60, pop: 0.10, rate: 0.20, disc: 0.00, aff: 0.10 },
  promo:       { fresh: 0.05, pop: 0.15, rate: 0.10, disc: 0.60, aff: 0.10 },
  popular:     { fresh: 0.10, pop: 0.55, rate: 0.20, disc: 0.05, aff: 0.10 },
  trending:    { fresh: 0.35, pop: 0.35, rate: 0.10, disc: 0.10, aff: 0.10 },
  ai:          { fresh: 0.10, pop: 0.15, rate: 0.15, disc: 0.05, aff: 0.55 },
  bestsellers: { fresh: 0.00, pop: 0.70, rate: 0.20, disc: 0.00, aff: 0.10 },
};

function scoreFor(
  key: SectionKey,
  p: RecoProduct,
  affinity: Map<number, number>,
): number {
  const w = WEIGHTS[key];
  const aff = p.category_id ? (affinity.get(p.category_id) ?? 0) : 0;
  return (
    w.fresh * freshness(p.created_at) +
    w.pop   * popularity(p.sales_count) +
    w.rate  * ratingScore(p.avg_rating, p.review_count) +
    w.disc  * discountScore(p.price, p.compare_price) +
    w.aff   * aff
  );
}

// ─────────────────────────────────────────────────────────────
// Sélection diversifiée (pénalité par catégorie répétée)
// ─────────────────────────────────────────────────────────────

function pickDiverse(
  scored: Array<RecoProduct & { _final: number }>,
  limit: number,
): RecoProduct[] {
  const pool = [...scored];
  const catCount = new Map<number, number>();
  const out: RecoProduct[] = [];

  while (out.length < limit && pool.length > 0) {
    let bestIdx = 0;
    let bestVal = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const cat = pool[i].category_id ?? -1;
      const penalty = (catCount.get(cat) ?? 0) * 0.25;
      const v = pool[i]._final - penalty;
      if (v > bestVal) { bestVal = v; bestIdx = i; }
    }
    const picked = pool.splice(bestIdx, 1)[0];
    const cat = picked.category_id ?? -1;
    catCount.set(cat, (catCount.get(cat) ?? 0) + 1);
    out.push(picked);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// Affinité catégories (historique visiteur/user)
// ─────────────────────────────────────────────────────────────

async function getCategoryAffinity(
  db: Awaited<ReturnType<typeof getDB>>,
  userId: number | null | undefined,
  visitorId: string,
): Promise<Map<number, number>> {
  try {
    const rows = await db.all<{ category_id: number | null; c: number }>(`
      SELECT p.category_id, COUNT(*) as c
      FROM product_events e
      JOIN products p ON p.id = e.product_id
      WHERE (e.user_id = ? OR e.visitor_id = ?)
        AND e.created_at > datetime('now', '-30 days')
        AND e.event_type IN ('view','click','favorite','add_to_cart','purchase')
      GROUP BY p.category_id
    `, [userId ?? -1, visitorId]);

    const total = rows.reduce((s, r) => s + r.c, 0) || 1;
    const m = new Map<number, number>();
    for (const r of rows) if (r.category_id != null) m.set(r.category_id, r.c / total);
    return m;
  } catch {
    return new Map();
  }
}

// ─────────────────────────────────────────────────────────────
// Point d'entrée
// ─────────────────────────────────────────────────────────────

export async function getPersonalizedHome(
  opts: GetHomeOptions,
): Promise<HomeSections> {
  const db = await getDB();
  const limit = opts.limitPerSection ?? (opts.device === 'mobile' ? 4 : 5);
  const dateKey = new Date().toISOString().slice(0, 10);

  // Vivier unique — borne haute pour éviter de charger 50k produits
  const all = await db.all<RecoProduct>(`
    SELECT p.id, p.slug, p.title, p.description, p.type, p.price, p.compare_price,
           p.category_id, p.created_at, p.brand, p.stock, p.featured,
           (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) AS main_image,
           (SELECT AVG(rating) FROM reviews WHERE product_id = p.id AND status='approved')  AS avg_rating,
           (SELECT COUNT(*)  FROM reviews WHERE product_id = p.id AND status='approved')    AS review_count,
           (SELECT COUNT(*)  FROM order_items WHERE product_id = p.id)                      AS sales_count
    FROM products p
    WHERE p.status = 'published'
    ORDER BY p.created_at DESC
    LIMIT 500
  `);

  const affinity = await getCategoryAffinity(db, opts.userId, opts.visitorId);
  const used = new Set<number>();

  const sections = {} as HomeSections;
  const order: SectionKey[] = ['new', 'promo', 'popular', 'trending', 'ai', 'bestsellers'];

  for (const key of order) {
    const rand = makeRand(opts.visitorId, key, dateKey);
    const pool = all.filter(p => {
      if (used.has(p.id)) return false;
      if (key === 'promo' && !(p.compare_price && p.compare_price > p.price)) return false;
      return true;
    });

    const scored = pool.map(p => ({
      ...p,
      // variation contrôlée : ±7,5% seulement
      _final: scoreFor(key, p, affinity) + (rand() - 0.5) * 0.15,
    }));

    const picked = pickDiverse(scored, limit);
    picked.forEach(p => used.add(p.id));
    sections[key] = picked;
  }

  // Log impressions (best-effort, n'échoue jamais le rendu)
  void logImpressions(db, opts, sections).catch(() => {});

  return sections;
}

// ─────────────────────────────────────────────────────────────
// Tracking impressions
// ─────────────────────────────────────────────────────────────

async function logImpressions(
  db: Awaited<ReturnType<typeof getDB>>,
  opts: GetHomeOptions,
  sections: HomeSections,
) {
  const rows: unknown[] = [];
  const placeholders: string[] = [];
  for (const [section, products] of Object.entries(sections)) {
    products.forEach((p, i) => {
      placeholders.push('(?,?,?,?,?,?)');
      rows.push(opts.visitorId, opts.userId ?? null, p.id, section, i, opts.device);
    });
  }
  if (rows.length === 0) return;
  await db.run(
    `INSERT INTO product_impressions
       (visitor_id, user_id, product_id, section, position, device)
     VALUES ${placeholders.join(',')}`,
    rows,
  );
}