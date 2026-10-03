// lib/home-sections.ts
import { getDB } from '@/lib/db';

const PRODUCT_SELECT = `
  SELECT p.*,
    (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) as main_image,
    (SELECT AVG(rating) FROM reviews WHERE product_id = p.id AND status='approved') as avg_rating,
    (SELECT COUNT(*) FROM reviews WHERE product_id = p.id AND status='approved') as review_count,
    (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) as sales_count
  FROM products p
`;

function safeJSON(s: string | null): any[] {
  if (!s) return [];
  try { return JSON.parse(s); } catch { return []; }
}

/**
 * Système de déduplication en cascade.
 * Un produit ne peut apparaître qu'une seule fois dans les sections principales.
 */
export async function getHomeSections() {
  const db = await getDB();
  const seen = new Set<number>();

  const take = <T extends { id: number }>(rows: T[]): T[] => {
    const out = rows.filter((r) => !seen.has(r.id));
    out.forEach((r) => seen.add(r.id));
    return out;
  };

  // 1. Flash sale — réduction ≥ 40 %
  const flashSale = take(
    await db.all(`
      ${PRODUCT_SELECT}
      WHERE p.status='published'
        AND p.compare_price IS NOT NULL
        AND (p.compare_price - p.price) * 100.0 / p.compare_price >= 40
      ORDER BY (p.compare_price - p.price) DESC
      LIMIT 3
    `)
  );

  // 2. Nouveautés — créés dans les 14 derniers jours
  const newProducts = take(
    await db.all(`
      ${PRODUCT_SELECT}
      WHERE p.status='published'
        AND p.created_at >= datetime('now', '-14 days')
      ORDER BY p.created_at DESC
      LIMIT 8
    `)
  );

  // 3. Promotions — réduction ≥ 25 %
  const promos = take(
    await db.all(`
      ${PRODUCT_SELECT}
      WHERE p.status='published'
        AND p.compare_price IS NOT NULL
        AND (p.compare_price - p.price) * 100.0 / p.compare_price >= 25
      ORDER BY (p.compare_price - p.price) DESC
      LIMIT 8
    `)
  );

  // 4. Populaires — ventes des 30 derniers jours
  const popular = take(
    await db.all(`
      ${PRODUCT_SELECT}
      WHERE p.status='published'
        AND EXISTS (
          SELECT 1 FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE oi.product_id = p.id
            AND o.created_at >= datetime('now', '-30 days')
        )
      ORDER BY sales_count DESC, avg_rating DESC
      LIMIT 8
    `)
  );

  // 5. Tendances — vues des 3 derniers jours
  const trending = take(
    await db.all(`
      SELECT p.*,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) as main_image,
        (SELECT AVG(rating) FROM reviews WHERE product_id = p.id AND status='approved') as avg_rating,
        (SELECT COUNT(*) FROM reviews WHERE product_id = p.id AND status='approved') as review_count,
        (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) as sales_count,
        COUNT(pv.id) as view_count
      FROM products p
      LEFT JOIN product_views pv ON pv.product_id = p.id
        AND pv.created_at >= datetime('now', '-3 days')
      WHERE p.status='published'
      GROUP BY p.id
      HAVING view_count > 0
      ORDER BY view_count DESC
      LIMIT 8
    `)
  );

  // 6. Best-sellers all-time (il ne reste que les "anciens" hits)
  const bestSellers = take(
    await db.all(`
      ${PRODUCT_SELECT}
      WHERE p.status='published'
      ORDER BY sales_count DESC, avg_rating DESC
      LIMIT 8
    `)
  );

  return { flashSale, newProducts, promos, popular, trending, bestSellers };
}

/**
 * Collections éditoriales (utilise la colonne JSON `product_ids`).
 */
export async function getEditorialCollections(limit = 4) {
  const db = await getDB();
  const rows = await db.all(`
    SELECT * FROM collections
    WHERE is_active = 1
    ORDER BY position ASC
    LIMIT ?
  `, [limit]);

  const enriched = await Promise.all(
    rows.map(async (col: any) => {
      const ids: number[] = safeJSON(col.product_ids)
        .map((x: any) => Number(x))
        .filter((x) => Number.isFinite(x));

      if (ids.length === 0) return { ...col, products: [] };

      const placeholders = ids.map(() => '?').join(',');
      const products = await db.all(`
        SELECT p.id, p.title, p.slug, p.price, p.compare_price,
          (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) as main_image
        FROM products p
        WHERE p.id IN (${placeholders})
          AND p.status = 'published'
      `, ids);

      const byId = new Map(products.map((p: any) => [p.id, p]));
      const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

      return { ...col, products: ordered };
    })
  );

  return enriched.filter((c) => c.products.length >= 2);
}

/**
 * Parcours d'apprentissage éditoriaux.
 */
export async function getLearningPaths(limit = 3) {
  const db = await getDB();
  const paths = await db.all(`
    SELECT * FROM learning_paths
    WHERE is_active = 1
    ORDER BY position ASC
    LIMIT ?
  `, [limit]);

  const enriched = await Promise.all(
    paths.map(async (path: any) => {
      const steps = await db.all(`
        SELECT lps.id, lps.step_number, lps.title, lps.is_optional,
          p.id as product_id, p.title as product_title, p.slug as product_slug,
          p.price, p.compare_price,
          (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) as main_image
        FROM learning_path_steps lps
        JOIN products p ON p.id = lps.product_id
        WHERE lps.path_id = ? AND p.status = 'published'
        ORDER BY lps.step_number ASC
      `, [path.id]);

      const totalPrice = steps.reduce((s: number, st: any) => s + (st.price || 0), 0);
      return { ...path, steps, totalPrice, step_count: steps.length };
    })
  );

  return enriched.filter((p) => p.steps.length >= 2);
}