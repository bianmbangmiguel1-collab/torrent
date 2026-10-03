// lib/services/recommendations.ts
import { getDB } from '@/lib/db';

export async function generateRecommendations(userId: number) {
  const db = await getDB();

  // 1. Trouver les produits que l'utilisateur a achetés
  const userProducts = await db.all(
    `SELECT DISTINCT product_id FROM order_items 
     WHERE order_id IN (SELECT id FROM orders WHERE user_id = ? AND status = 'completed')`,
    [userId]
  );

  if (userProducts.length === 0) {
    // Pas d'historique → recommander les produits populaires
    return await getPopularProducts();
  }

  const productIds = userProducts.map(p => p.product_id);
  const placeholders = productIds.map(() => '?').join(',');

  // 2. Trouver les produits achetés avec les mêmes produits
  const recommendations = await db.all(
    `
    SELECT 
      p.id,
      p.title,
      p.price,
      p.slug,
      p.image,
      COUNT(*) as score,
      (SELECT COUNT(*) FROM order_items oi2 WHERE oi2.product_id = p.id) as total_orders
    FROM order_items oi
    JOIN order_items oi2 ON oi2.order_id = oi.order_id AND oi2.product_id != oi.product_id
    JOIN products p ON p.id = oi2.product_id
    WHERE oi.product_id IN (${placeholders})
      AND p.id NOT IN (${placeholders})
    GROUP BY p.id
    ORDER BY score DESC, total_orders DESC
    LIMIT 5
    `,
    [...productIds, ...productIds]
  );

  return recommendations;
}

export async function getPopularProducts(limit: number = 10) {
  const db = await getDB();
  return await db.all(
    `
    SELECT 
      p.id,
      p.title,
      p.price,
      p.slug,
      p.image,
      COUNT(oi.id) as total_orders
    FROM products p
    JOIN order_items oi ON oi.product_id = p.id
    GROUP BY p.id
    ORDER BY total_orders DESC
    LIMIT ?
    `,
    [limit]
  );
}