// lib/services/cart.service.ts
import { getDB } from '@/lib/db';

export interface CartItem {
  id: number;
  product_id: number;
  product_title: string;
  price: number;
  quantity: number;
  image_url?: string;
  total: number;
}

export class CartService {
  // Récupérer le panier d'un utilisateur
  async getCart(userId: number): Promise<CartItem[]> {
    const db = await getDB();
    return await db.all<CartItem>(
      `SELECT 
        c.id,
        c.product_id,
        c.quantity,
        p.title as product_title,
        p.price,
        p.image as image_url,
        (c.quantity * p.price) as total
      FROM user_cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
      ORDER BY c.addedAt DESC`,
      [userId]
    );
  }

  // Ajouter au panier
  async addToCart(userId: number, productId: number, quantity: number = 1): Promise<void> {
    const db = await getDB();
    
    // Vérifier si déjà dans le panier
    const existing = await db.get(
      `SELECT id, quantity FROM user_cart WHERE user_id = ? AND product_id = ?`,
      [userId, productId]
    );

    if (existing) {
      // Mettre à jour la quantité
      await db.run(
        `UPDATE user_cart SET quantity = quantity + ?, addedAt = datetime('now') WHERE id = ?`,
        [quantity, existing.id]
      );
    } else {
      // Ajouter
      await db.run(
        `INSERT INTO user_cart (user_id, product_id, quantity, addedAt) VALUES (?, ?, ?, datetime('now'))`,
        [userId, productId, quantity]
      );
    }
  }

  // Supprimer du panier
  async removeFromCart(userId: number, cartItemId: number): Promise<void> {
    const db = await getDB();
    await db.run(
      `DELETE FROM user_cart WHERE id = ? AND user_id = ?`,
      [cartItemId, userId]
    );
  }

  // Vider le panier
  async clearCart(userId: number): Promise<void> {
    const db = await getDB();
    await db.run(`DELETE FROM user_cart WHERE user_id = ?`, [userId]);
  }

  // Mettre à jour la quantité
  async updateQuantity(userId: number, cartItemId: number, quantity: number): Promise<void> {
    const db = await getDB();
    if (quantity <= 0) {
      await this.removeFromCart(userId, cartItemId);
    } else {
      await db.run(
        `UPDATE user_cart SET quantity = ? WHERE id = ? AND user_id = ?`,
        [quantity, cartItemId, userId]
      );
    }
  }

  // Récupérer le total du panier
  async getCartTotal(userId: number): Promise<number> {
    const db = await getDB();
    const result = await db.get<{ total: number }>(
      `SELECT SUM(p.price * c.quantity) as total
       FROM user_cart c
       JOIN products p ON c.product_id = p.id
       WHERE c.user_id = ?`,
      [userId]
    );
    return result?.total || 0;
  }

  // Nombre d'articles dans le panier
  async getCartCount(userId: number): Promise<number> {
    const db = await getDB();
    const result = await db.get<{ count: number }>(
      `SELECT SUM(quantity) as count FROM user_cart WHERE user_id = ?`,
      [userId]
    );
    return result?.count || 0;
  }
}

export const cartService = new CartService();