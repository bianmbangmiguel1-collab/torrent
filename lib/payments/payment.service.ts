// lib/payments/payment.service.ts
import { getDB } from '@/lib/db';
import { getPaymentProvider } from './payment.factory';
import crypto from 'crypto';

export class PaymentService {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  async createPayment(input: {
    orderId: number;
    userId?: number;
    email: string;
    name?: string;
    phone?: string;
    method: string;
    returnUrl?: string;
    webhookUrl?: string;
  }) {
    // Récupérer la commande
    const order = await this.db.get(`
      SELECT 
        o.*,
        (SELECT SUM(price * quantity) FROM order_items WHERE order_id = o.id) as total_amount
      FROM orders o
      WHERE o.id = ?
    `, [input.orderId]);

    if (!order) {
      throw new Error('Commande non trouvée');
    }

    if (order.status === 'completed' || order.payment_status === 'successful') {
      throw new Error('Commande déjà payée');
    }

    // Générer une clé d'idempotence
    const idempotencyKey = crypto.randomBytes(32).toString('hex');

    // Créer le paiement en base
    const result = await this.db.run(`
      INSERT INTO payments (
        order_id,
        user_id,
        provider,
        amount,
        currency,
        method,
        status,
        idempotency_key,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'created', ?, datetime('now'), datetime('now'))
    `, [
      order.id,
      input.userId || null,
      'fedapay',
      order.total_amount || order.total,
      order.currency || 'XAF',
      input.method,
      idempotencyKey
    ]);

    const paymentId = result.lastID;

    // Appeler le provider
    const provider = getPaymentProvider();
    const providerResult = await provider.createPayment({
      amount: order.total_amount || order.total,
      currency: order.currency || 'XAF',
      orderId: order.order_number || String(order.id),
      description: `Commande #${order.order_number}`,
      customer: {
        email: input.email,
        firstname: input.name?.split(' ')[0],
        lastname: input.name?.split(' ').slice(1).join(' '),
        phone: input.phone,
      },
      returnUrl: input.returnUrl,
      webhookUrl: input.webhookUrl,
    });

    // Mettre à jour le paiement avec l'ID du provider
    await this.db.run(`
      UPDATE payments 
      SET provider_payment_id = ?,
          status = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `, [
      providerResult.providerPaymentId,
      providerResult.status,
      paymentId
    ]);

    return {
      id: paymentId,
      provider_payment_id: providerResult.providerPaymentId,
      payment_url: providerResult.paymentUrl,
      status: providerResult.status,
    };
  }

  async updatePaymentStatus(providerPaymentId: string, status: string, metadata?: any) {
    // Récupérer le paiement
    const payment = await this.db.get(`
      SELECT * FROM payments WHERE provider_payment_id = ?
    `, [providerPaymentId]);

    if (!payment) {
      throw new Error('Paiement non trouvé');
    }

    // Mettre à jour le statut
    await this.db.run(`
      UPDATE payments 
      SET status = ?,
          updated_at = datetime('now'),
          paid_at = CASE WHEN ? = 'successful' THEN datetime('now') ELSE paid_at END
      WHERE id = ?
    `, [status, status, payment.id]);

    // Si paiement réussi, mettre à jour la commande
    if (status === 'successful') {
      await this.db.run(`
        UPDATE orders 
        SET status = 'confirmed',
            payment_status = 'successful',
            updated_at = datetime('now')
        WHERE id = ?
      `, [payment.order_id]);

      // Créer la purchase (bibliothèque)
      await this.createPurchase(payment.order_id);
    }

    return payment;
  }

  async createPurchase(orderId: number) {
    // Récupérer les items de la commande
    const items = await this.db.all(`
      SELECT * FROM order_items WHERE order_id = ?
    `, [orderId]);

    // Récupérer la commande
    const order = await this.db.get(`
      SELECT * FROM orders WHERE id = ?
    `, [orderId]);

    if (!order) return;

    // Pour chaque item, ajouter à la bibliothèque
    for (const item of items) {
      // Vérifier si déjà dans la bibliothèque
      const existing = await this.db.get(`
        SELECT * FROM library WHERE user_id = ? AND product_id = ?
      `, [order.user_id, item.product_id]);

      if (!existing) {
        await this.db.run(`
          INSERT INTO library (user_id, product_id, order_id, access_status, created_at)
          VALUES (?, ?, ?, 'active', datetime('now'))
        `, [order.user_id, item.product_id, orderId]);
      }
    }
  }

  async getPaymentStatus(providerPaymentId: string) {
    const payment = await this.db.get(`
      SELECT * FROM payments WHERE provider_payment_id = ?
    `, [providerPaymentId]);

    if (!payment) {
      throw new Error('Paiement non trouvé');
    }

    const provider = getPaymentProvider();
    const result = await provider.getPayment(providerPaymentId);

    // Mettre à jour si le statut a changé
    if (result.status !== payment.status) {
      await this.updatePaymentStatus(providerPaymentId, result.status);
    }

    return {
      status: result.status,
      payment,
    };
  }

  async refundPayment(paymentId: number, amount?: number) {
    const payment = await this.db.get(`
      SELECT * FROM payments WHERE id = ?
    `, [paymentId]);

    if (!payment) {
      throw new Error('Paiement non trouvé');
    }

    if (payment.status !== 'successful') {
      throw new Error('Seul un paiement réussi peut être remboursé');
    }

    const provider = getPaymentProvider();
    const result = await provider.refundPayment(payment.provider_payment_id, amount);

    await this.db.run(`
      UPDATE payments 
      SET status = 'refunded',
          updated_at = datetime('now')
      WHERE id = ?
    `, [paymentId]);

    await this.db.run(`
      UPDATE orders 
      SET status = 'refunded',
          payment_status = 'refunded',
          updated_at = datetime('now')
      WHERE id = ?
    `, [payment.order_id]);

    return {
      success: true,
      status: result.status,
    };
  }
}