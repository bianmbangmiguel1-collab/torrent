// lib/stock/getStockProducts.ts

import { getDB } from '@/lib/db';

export interface StockProduct {
  id: number;
  title: string;
  slug: string;
  price: number;
  compare_price: number | null;
  status: string;
  category_name: string | null;
  main_image: string | null;
  created_at: string;
  sales_count: number;
}

interface GetStockProductsOptions {
  category: string;
  status: string;
  search: string;
  page: number;
  limit: number;
}

export async function getStockProducts({
  category,
  status,
  search,
  page,
  limit,
}: GetStockProductsOptions): Promise<{
  products: StockProduct[];
  total: number;
}> {
  const db = await getDB();

  const whereClauses: string[] = [];
  const params: any[] = [];

  // ============================================
  // FILTRE CATÉGORIE
  // ============================================

  if (category && category !== 'all') {
    const cat = await db.get<{ id: number }>(
      `
      SELECT id
      FROM categories
      WHERE slug = ?
      LIMIT 1
      `,
      [category]
    );

    if (cat) {
      whereClauses.push('p.category_id = ?');
      params.push(cat.id);
    }
  }

  // ============================================
  // FILTRE STATUT
  // ============================================

  if (status && status !== 'all') {
    whereClauses.push('p.status = ?');
    params.push(status);
  }

  // ============================================
  // RECHERCHE
  // ============================================

  if (search && search.trim()) {
    whereClauses.push(`
      (
        p.title LIKE ?
        OR p.slug LIKE ?
      )
    `);

    const searchPattern = `%${search.trim()}%`;

    params.push(
      searchPattern,
      searchPattern
    );
  }

  // ============================================
  // WHERE
  // ============================================

  const whereClause =
    whereClauses.length > 0
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

  // ============================================
  // TOTAL
  // ============================================

  const countResult = await db.get<{ count: number }>(
    `
    SELECT COUNT(*) AS count
    FROM products p
    LEFT JOIN categories c
      ON p.category_id = c.id
    ${whereClause}
    `,
    params
  );

  const total = Number(countResult?.count || 0);

  // ============================================
  // PAGINATION
  // ============================================

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 20);

  const offset =
    (safePage - 1) * safeLimit;

  // ============================================
  // PRODUITS
  // ============================================

  const products = await db.all<StockProduct>(
    `
    SELECT
      p.id,
      p.title,
      p.slug,
      p.price,
      p.compare_price,
      p.status,

      c.name AS category_name,

      (
        SELECT pi.url
        FROM product_images pi
        WHERE pi.product_id = p.id
          AND pi.is_main = 1
        LIMIT 1
      ) AS main_image,

      p.created_at,

      (
        SELECT COUNT(*)
        FROM order_items oi
        WHERE oi.product_id = p.id
      ) AS sales_count

    FROM products p

    LEFT JOIN categories c
      ON p.category_id = c.id

    ${whereClause}

    ORDER BY p.created_at DESC

    LIMIT ? OFFSET ?
    `,
    [
      ...params,
      safeLimit,
      offset,
    ]
  );

  return {
    products: products || [],
    total,
  };
}