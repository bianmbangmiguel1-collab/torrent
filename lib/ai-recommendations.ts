// lib/ai-recommendations.ts
'use server';

import { getDB } from './db';

export async function getAIRecommendations(userId?: number, limit: number = 8) {
  const db = await getDB();

  if (!userId) {
    return db.all(`
      SELECT 
        p.*,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) as main_image,
        (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) as avg_rating,
        (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as review_count,
        (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) as sales_count
      FROM products p
      WHERE p.status = 'published'
      ORDER BY RANDOM()
      LIMIT ${limit}
    `);
  }

  // Pour un utilisateur connecté : recommandations basées sur ses achats
  const userCategories = await db.all(`
    SELECT DISTINCT p.category_id 
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    WHERE o.user_id = ?
  `, [userId]);

  if (userCategories.length === 0) {
    return db.all(`
      SELECT 
        p.*,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) as main_image,
        (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) as avg_rating,
        (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as review_count,
        (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) as sales_count
      FROM products p
      WHERE p.status = 'published'
      ORDER BY sales_count DESC
      LIMIT ${limit}
    `);
  }

  const categoryIds = userCategories.map(c => c.category_id).join(',');
  return db.all(`
    SELECT 
      p.*,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) as main_image,
      (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) as avg_rating,
      (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as review_count,
      (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) as sales_count
    FROM products p
    WHERE p.status = 'published' 
      AND p.category_id IN (${categoryIds})
    ORDER BY RANDOM()
    LIMIT ${limit}
  `);
}

export async function getTrendingProducts(limit: number = 8) {
  const db = await getDB();
  return db.all(`
    SELECT 
      p.*,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) as main_image,
      (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) as avg_rating,
      (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as review_count,
      (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) as sales_count
    FROM products p
    WHERE p.status = 'published'
    ORDER BY p.created_at DESC
    LIMIT ${limit}
  `);
}