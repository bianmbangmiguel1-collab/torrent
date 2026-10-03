// lib/services/order.service.ts
import { getDB } from '@/lib/db';
import { cartService } from './cart.service';

export interface Order {
  id: number;
  orderNumber: string;
  userId: number;
  subtotal: number;
  total: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
  payment_status: 'unpaid' | 'paid' | 'failed' | 'refunded';
  payment_reference: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: number;
  product_id: number;
  product_title: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export class OrderService {
  // Créer une commande depuis le panier
  async createOrderFromCart(userId: number): Promise<Order> {
    const db = await getDB();
    
    // Récupérer les articles du panier
    const cartItems = await cartService.getCart(userId);
    if (cartItems.length === 0) {
      throw new Error('Panier vide');
    }

    const total = cartItems.reduce((sum, item) => sum + item.total, 0);
    const orderNumber = `TT-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`.toUpperCase();

    // Créer la commande
    const result = await db.run(
      `INSERT INTO orders (
        orderNumber, user_id, subtotal, total, currency, status, payment_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'XOF', 'pending', 'unpaid', datetime('now'), datetime('now'))`,
      [orderNumber, userId, total, total]
    );

    const orderId = Number(result.lastID ?? 0);

    // Ajouter les articles
    for (const item of cartItems) {
      await db.run(
        `INSERT INTO order_items (
          order_id, product_id, product_title, quantity, unit_price, total
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.product_title, item.quantity, item.price, item.total]
      );
    }

    // Vider le panier
    await cartService.clearCart(userId);

    // Récupérer la commande complète
    return await this.getOrder(orderId);
  }

  // Créer une commande directe (achat immédiat)
  async createDirectOrder(userId: number, productId: number, quantity: number = 1): Promise<Order> {
    const db = await getDB();
    
    const product = await db.get(
      `SELECT id, title, price FROM products WHERE id = ? AND status = 'published'`,
      [productId]
    );

    if (!product) {
      throw new Error('Produit non trouvé');
    }

    const total = product.price * quantity;
    const orderNumber = `TT-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`.toUpperCase();

    const result = await db.run(
      `INSERT INTO orders (
        orderNumber, user_id, subtotal, total, currency, status, payment_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'XOF', 'pending', 'unpaid', datetime('now'), datetime('now'))`,
      [orderNumber, userId, total, total]
    );

    const orderId = Number(result.lastID ?? 0);

    await db.run(
      `INSERT INTO order_items (
        order_id, product_id, product_title, quantity, unit_price, total
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [orderId, product.id, product.title, quantity, product.price, total]
    );

    return await this.getOrder(orderId);
  }

  // Récupérer une commande
  async getOrder(orderId: number): Promise<Order> {
    const db = await getDB();
    
    const order = await db.get<Order>(
      `SELECT * FROM orders WHERE id = ?`,
      [orderId]
    );

    if (!order) {
      throw new Error('Commande non trouvée');
    }

    const items = await db.all<OrderItem>(
      `SELECT * FROM order_items WHERE order_id = ?`,
      [orderId]
    );

    order.items = items;
    return order;
  }

  // Récupérer les commandes d'un utilisateur
  async getUserOrders(userId: number): Promise<Order[]> {
    const db = await getDB();
    return await db.all<Order>(
      `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
  }

  // Mettre à jour le statut de paiement
  async updatePaymentStatus(orderId: number, paymentStatus: string, paymentReference?: string): Promise<void> {
    const db = await getDB();
    await db.run(
      `UPDATE orders 
       SET payment_status = ?, 
           payment_reference = COALESCE(?, payment_reference),
           updated_at = datetime('now') 
       WHERE id = ?`,
      [paymentStatus, paymentReference || null, orderId]
    );
  }

  // Mettre à jour le statut de la commande
  async updateOrderStatus(orderId: number, status: string): Promise<void> {
    const db = await getDB();
    await db.run(
      `UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?`,
      [status, orderId]
    );
  }
}

export const orderService = new OrderService();