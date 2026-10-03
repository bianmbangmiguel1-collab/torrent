// lib/stock/getCategoryStats.ts
import { getDB } from '@/lib/db';

export interface CategoryStat {
  id: number;
  name: string;
  slug: string;
  product_count: number;
}

/**
 * Récupère les statistiques par catégorie pour la page d'administration du stock.
 * 
 * Compte tous les produits (quel que soit leur statut) pour chaque catégorie active.
 * 
 * @returns {Promise<CategoryStat[]>} Tableau des catégories avec leur nombre de produits.
 */
export async function getCategoryStats(): Promise<CategoryStat[]> {
  try {
    const db = await getDB();

    const categories = await db.all<CategoryStat>(`
      SELECT 
        c.id,
        c.name,
        c.slug,
        COUNT(p.id) AS product_count
      FROM categories c
      LEFT JOIN products p 
        ON p.category_id = c.id
        -- ✅ Pour la gestion de stock, on compte tous les produits (publiés, brouillons, archivés)
      WHERE c.is_active = 1
      GROUP BY c.id, c.name, c.slug
      ORDER BY product_count DESC, c.name ASC
    `);

    return categories || [];
  } catch (error) {
    console.error('❌ Erreur getCategoryStats:', error);
    return [];
  }
}