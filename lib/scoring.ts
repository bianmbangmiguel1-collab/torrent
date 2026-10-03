// lib/scoring.ts
import { getDB } from './db';

export interface ProductScore {
  productId: number;
  score: number;
}

/**
 * Calcule un score personnalisé pour chaque produit pour un utilisateur donné.
 * @param userId - ID de l'utilisateur (ou null si non connecté)
 * @param products - Liste des produits (avec leurs champs)
 * @param categories - Liste des catégories
 * @returns Map produitId → score
 */
export async function computeProductScores(
  userId: number | null,
  products: any[],
  categories: any[]
): Promise<Map<number, number>> {
  const scoreMap = new Map<number, number>();

  if (!userId) {
    // Non connecté : score = popularité globale (ventes) + un peu de nouveauté
    products.forEach(p => {
      const salesWeight = p.sales_count || 0;
      const newWeight = p.is_new ? 5 : 0;
      const score = salesWeight * 0.8 + newWeight;
      scoreMap.set(p.id, score);
    });
    return scoreMap;
  }

  const db = await getDB();

  // ── 1. Récupérer les interactions de l'utilisateur ──

  // Favoris
  const favorites = await db.all<{ product_id: number }>(
    `SELECT product_id FROM user_favorites WHERE user_id = ?`,
    [userId]
  );
  const favoriteIds = new Set(favorites.map(f => f.product_id));

  // Achats (produits déjà commandés)
  const purchases = await db.all<{ product_id: number }>(
    `SELECT DISTINCT product_id FROM order_items 
     WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)
    `,
    [userId]
  );
  const purchasedIds = new Set(purchases.map(p => p.product_id));

  // Vues récentes (derniers 30 jours)
  const views = await db.all<{ product_id: number; count: number }>(
    `SELECT product_id, COUNT(*) as count 
     FROM user_product_views 
     WHERE user_id = ? AND viewed_at > datetime('now', '-30 days')
     GROUP BY product_id`,
    [userId]
  );
  const viewMap = new Map(views.map(v => [v.product_id, v.count]));

  // ── 2. Calculer le score pour chaque produit ──

  const now = new Date();
  for (const p of products) {
    let score = 0;

    // Popularité globale (ventes)
    const salesWeight = p.sales_count || 0;
    score += salesWeight * 0.3;

    // Affinité catégorie (l'utilisateur a-t-il acheté ou vu des produits de cette catégorie ?)
    if (p.category_id) {
      // On regarde si l'utilisateur a acheté ou vu des produits de cette catégorie
      const catAffinity = await getCategoryAffinity(userId, p.category_id);
      score += catAffinity * 0.25;
    }

    // Historique de navigation (vues)
    const viewCount = viewMap.get(p.id) || 0;
    score += viewCount * 0.2;

    // Favoris
    if (favoriteIds.has(p.id)) {
      score += 10 * 0.15;
    }

    // Nouveauté (bonus pour les produits récents)
    const daysSinceCreation = (now.getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation < 7) {
      score += 5 * 0.1;
    }

    // Bonus si l'utilisateur a déjà acheté un produit similaire (même catégorie)
    if (p.category_id && purchasedIds.size > 0) {
      // On pourrait compter le nombre de produits achetés dans cette catégorie
      const purchasedInCategory = await db.get<{ count: number }>(
        `SELECT COUNT(DISTINCT oi.product_id) as count
         FROM order_items oi
         JOIN products p2 ON oi.product_id = p2.id
         WHERE oi.order_id IN (SELECT id FROM orders WHERE user_id = ?)
           AND p2.category_id = ?`,
        [userId, p.category_id]
      );
      if (purchasedInCategory && purchasedInCategory.count > 0) {
        score += 10 * purchasedInCategory.count;
      }
    }

    scoreMap.set(p.id, score);
  }

  return scoreMap;
}

// Helper pour calculer l'affinité de catégorie (basée sur le nombre de vues/achats dans cette catégorie)
async function getCategoryAffinity(userId: number, categoryId: number): Promise<number> {
  const db = await getDB();
  // On compte les vues et achats dans cette catégorie pour l'utilisateur
  const result = await db.get<{ total: number }>(
    `SELECT 
       (SELECT COUNT(*) FROM user_product_views upv 
        JOIN products p ON upv.product_id = p.id 
        WHERE upv.user_id = ? AND p.category_id = ?) 
       + 
       (SELECT COUNT(*) FROM order_items oi 
        JOIN products p ON oi.product_id = p.id 
        WHERE oi.order_id IN (SELECT id FROM orders WHERE user_id = ?) AND p.category_id = ?) 
       as total`,
    [userId, categoryId, userId, categoryId]
  );
  return result?.total || 0;
}