// lib/stock/getStockStats.ts
import { getDB } from '@/lib/db';

export interface StockStats {
  total: number;
  published: number;
  draft: number;
  archived: number;
  withoutImage: number;
  withPromotion: number;
  recent: number; // ajoutés dans les 7 derniers jours
}

export async function getStockStats(categoryFilter: string = 'all'): Promise<StockStats> {
  const db = await getDB();

  let categoryCondition = '';
  const params: any[] = [];

  if (categoryFilter !== 'all') {
    const cat = await db.get('SELECT id FROM categories WHERE slug = ?', [categoryFilter]);
    if (cat) {
      categoryCondition = 'AND p.category_id = ?';
      params.push(cat.id);
    }
  }

  // Total
  const totalResult = await db.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM products p WHERE 1=1 ${categoryCondition}`,
    params
  );

  // Publiés
  const publishedResult = await db.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM products p WHERE p.status = 'published' ${categoryCondition}`,
    params
  );

  // Brouillons
  const draftResult = await db.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM products p WHERE p.status = 'draft' ${categoryCondition}`,
    params
  );

  // Archivés
  const archivedResult = await db.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM products p WHERE p.status = 'archived' ${categoryCondition}`,
    params
  );

  // Sans image
  const withoutImageResult = await db.get<{ count: number }>(
    `SELECT COUNT(*) as count 
     FROM products p 
     WHERE p.status = 'published' 
       ${categoryCondition} 
       AND NOT EXISTS (SELECT 1 FROM product_images WHERE product_id = p.id)`,
    params
  );

  // En promotion
  const promotionResult = await db.get<{ count: number }>(
    `SELECT COUNT(*) as count 
     FROM products p 
     WHERE p.status = 'published' 
       ${categoryCondition} 
       AND p.compare_price IS NOT NULL 
       AND p.compare_price > p.price`,
    params
  );

  // Récent (7 derniers jours)
  const recentResult = await db.get<{ count: number }>(
    `SELECT COUNT(*) as count 
     FROM products p 
     WHERE p.status = 'published' 
       ${categoryCondition} 
       AND p.created_at > datetime('now', '-7 days')`,
    params
  );

  return {
    total: totalResult?.count || 0,
    published: publishedResult?.count || 0,
    draft: draftResult?.count || 0,
    archived: archivedResult?.count || 0,
    withoutImage: withoutImageResult?.count || 0,
    withPromotion: promotionResult?.count || 0,
    recent: recentResult?.count || 0,
  };
}