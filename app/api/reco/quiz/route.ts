// app/api/reco/quiz/route.ts
import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { cookies } from 'next/headers';

interface QuizRequestBody {
  categoryId?: number | string;
  level?: string;
}

export async function POST(req: Request) {
  const { categoryId, level } = (await req.json()) as QuizRequestBody;
  const db = await getDB();
  const visitorId = cookies().get('visitor_id')?.value ?? 'anon';

  if (!categoryId) {
    return NextResponse.json({ products: [] });
  }

  // Récupère les sous-catégories éventuelles pour élargir le filtre
  const subCats = await db.all<{ id: number }>(
    `SELECT id FROM categories WHERE parent_id = ? AND is_active = 1`,
    [categoryId],
  );
  const catIds = [categoryId, ...subCats.map(c => c.id)];
  const placeholders = catIds.map(() => '?').join(',');

  // Filtre par difficulté via product_value (LEFT JOIN : marche même si vide)
  const levelFilter = level ? `AND (pv.difficulty_level = ? OR pv.difficulty_level IS NULL)` : '';
  const params: any[] = [...catIds];
  if (level) params.push(level);

  const rows = await db.all<any>(`
    SELECT
      p.id, p.slug, p.title, p.price, p.compare_price,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) AS main_image,
      (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) AS sales_count,
      (SELECT AVG(rating) FROM reviews WHERE product_id = p.id AND status='approved') AS avg_rating,
      pv.difficulty_level
    FROM products p
    LEFT JOIN product_value pv ON pv.product_id = p.id
    WHERE p.status = 'published'
      AND p.category_id IN (${placeholders})
      ${levelFilter}
    ORDER BY sales_count DESC, p.created_at DESC
    LIMIT 3
  `, params);

  // Fallback 1 : élargir la catégorie (sans filtre de niveau)
  let products = rows;
  if (products.length < 3 && level) {
    products = await db.all<any>(`
      SELECT
        p.id, p.slug, p.title, p.price, p.compare_price,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) AS main_image,
        (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) AS sales_count
      FROM products p
      WHERE p.status = 'published'
        AND p.category_id IN (${placeholders})
      ORDER BY sales_count DESC
      LIMIT 3
    `, catIds);
  }

  // Fallback 2 : best-sellers globaux
  if (products.length === 0) {
    products = await db.all<any>(`
      SELECT
        p.id, p.slug, p.title, p.price, p.compare_price,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) AS main_image,
        (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) AS sales_count
      FROM products p
      WHERE p.status = 'published'
      ORDER BY sales_count DESC
      LIMIT 3
    `);
  }

  // Trace l'intention pour affiner les recos futures
  void db.run(
    `INSERT INTO product_events (visitor_id, product_id, event_type, metadata)
     VALUES (?, ?, 'quiz_intent', ?)`,
    [visitorId, products[0]?.id ?? 0, JSON.stringify({ categoryId, level })],
  ).catch(() => {});

  return NextResponse.json({ products });
}