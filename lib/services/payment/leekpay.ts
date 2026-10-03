// lib/services/payment/leekpay.ts
import { getDB } from '@/lib/db';
import { auditLog, AuditAction } from '@/lib/security/audit-log';
import { encryptData, decryptData, maskKey } from '@/lib/security/encryption';
import { getDB as getDb } from '@/lib/db';

export interface LeekPayConfig {
  secretKey: string;
  publicKey: string;
  apiUrl: string;
}

export interface CheckoutRequest {
  amount: number;
  currency: string;
  description?: string;
  customer_email?: string;
  customer_name?: string;
  customer_phone?: string;
  return_url?: string;
  cancel_url?: string;
  webhook_url?: string;
  metadata?: Record<string, any>;
  orderId?: string;
  orderNumber?: string;
}

export interface CheckoutResponse {
  success: boolean;
  id: string;
  payment_url: string;
  amount: number;
  currency: string;
  status: string;
  expires_at: string;
}

export interface VerifyResponse {
  success: boolean;
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'expired';
  paid_at?: string;
  payment_method?: string;
  customer?: {
    email?: string;
    name?: string;
    phone?: string;
  };
}

interface LeekPayCheckoutApiResponse {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    payment_url: string;
    amount: number;
    currency: string;
    status: string;
    expires_at: string;
  };
}

interface LeekPayVerifyApiResponse {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    amount: number;
    currency: string;
    status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'expired';
    paid_at?: string;
    payment_method?: string;
    customer?: {
      email?: string;
      name?: string;
      phone?: string;
    };
  };
}

// ⭐ Classe sécurisée du service de paiement
export class LeekPayService {
  private config: LeekPayConfig | null = null;
  private configured = false;

  constructor() {
    this.loadConfig();
  }

  // ⭐ Charger la configuration depuis les variables d'environnement
  private loadConfig(): void {
    const secretKey = process.env.LEEKPAY_SECRET_KEY || '';
    const publicKey = process.env.LEEKPAY_PUBLIC_KEY || '';
    
    if (secretKey && publicKey) {
      // ⭐ Ne pas stocker la clé en clair en mémoire
      // La clé est utilisée UNIQUEMENT lors des appels API
      this.config = {
        secretKey,
        publicKey,
        apiUrl: process.env.LEEKPAY_API_URL || 'https://leekpay.fr/api/v1',
      };
      this.configured = true;
    } else {
      this.configured = false;
    }
  }

  // ⭐ Vérifier si le service est configuré
  isConfigured(): boolean {
    return this.configured;
  }

  // ⭐ Récupérer le statut du service (sans exposer les clés)
  getStatus(): { configured: boolean; publicKey: string; apiUrl: string } {
    return {
      configured: this.configured,
      publicKey: this.config ? maskKey(this.config.publicKey) : '',
      apiUrl: this.config?.apiUrl || '',
    };
  }

  // ⭐ INITIER UN PAIEMENT
  async checkout(data: CheckoutRequest): Promise<CheckoutResponse> {
    if (!this.isConfigured()) {
      throw new Error('LeekPay non configuré');
    }

    try {
      // Validation du montant (anti-fraude)
      if (data.amount <= 0) {
        throw new Error('Montant invalide');
      }

      if (data.amount > 10000000) {
        throw new Error('Montant supérieur à la limite autorisée (10 000 000 FCFA)');
      }

      // ⭐ Appel à l'API LeekPay AVEC LA CLÉ SECRÈTE (jamais exposée)
      const response = await fetch(`${this.config!.apiUrl}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config!.secretKey}`,
        },
        body: JSON.stringify({
          amount: data.amount,
          currency: data.currency || 'XOF',
          description: data.description || 'Achat TorrentTwist',
          return_url: data.return_url || `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
          cancel_url: data.cancel_url || `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`,
          webhook_url: data.webhook_url || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/leekpay`,
          customer_email: data.customer_email,
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          metadata: {
            ...data.metadata,
            order_id: data.orderId,
            order_number: data.orderNumber,
          },
        }),
      });

      const result = (await response.json()) as LeekPayCheckoutApiResponse;

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || 'Erreur d\'initiation du paiement');
      }

      // ⭐ Enregistrer la transaction en base
      const db = await getDb();
      const { id, payment_url, amount, currency, status, expires_at } = result.data;

      const transactionId = `TXN_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`.toUpperCase();

      await db.run(
        `INSERT INTO payments (
          transaction_id,
          checkout_id,
          order_id,
          amount,
          currency,
          status,
          provider,
          payment_url,
          expires_at,
          metadata,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          transactionId,
          id,
          data.orderId || null,
          amount,
          currency || 'XOF',
          'pending',
          'leekpay',
          payment_url,
          expires_at,
          JSON.stringify({
            customer: {
              email: data.customer_email,
              name: data.customer_name,
              phone: data.customer_phone,
            },
            description: data.description,
            order_number: data.orderNumber,
            metadata: data.metadata,
          }),
        ]
      );

      await auditLog(AuditAction.PAYMENT_INITIATED, {
        transactionId,
        checkoutId: id,
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        amount,
        currency,
        provider: 'leekpay',
      });

      return {
        success: true,
        id,
        payment_url,
        amount,
        currency,
        status,
        expires_at,
      };

    } catch (error: any) {
      await auditLog(AuditAction.PAYMENT_INIT_FAILED, {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        amount: data.amount,
        error: error.message,
      });
      throw error;
    }
  }

  // ⭐ VÉRIFIER UN PAIEMENT
  async verifyPayment(checkoutId: string): Promise<VerifyResponse> {
    if (!this.isConfigured()) {
      throw new Error('LeekPay non configuré');
    }

    try {
      const db = await getDb();

      // ⭐ Appel à l'API LeekPay AVEC LA CLÉ SECRÈTE
      const response = await fetch(`${this.config!.apiUrl}/checkout/${checkoutId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config!.secretKey}`,
        },
      });

      const result = (await response.json()) as LeekPayVerifyApiResponse;

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || 'Erreur de vérification');
      }

      const { id, amount, currency, status, paid_at, payment_method, customer } = result.data;

      const statusMap: Record<string, string> = {
        'pending': 'pending',
        'processing': 'processing',
        'paid': 'success',
        'failed': 'failed',
        'cancelled': 'cancelled',
        'expired': 'expired',
      };

      const newStatus = statusMap[status] || 'pending';

      await db.run(
        `UPDATE payments 
         SET status = ?, 
             provider_status = ?,
             paid_at = ?,
             payment_method = ?,
             updated_at = datetime('now') 
         WHERE checkout_id = ?`,
        [newStatus, status, paid_at || null, payment_method || null, checkoutId]
      );

      if (newStatus === 'success') {
        const transaction = await db.get(
          `SELECT order_id FROM payments WHERE checkout_id = ?`,
          [checkoutId]
        );

        if (transaction?.order_id) {
          await db.run(
            `UPDATE orders 
             SET status = 'processing', 
                 payment_status = 'paid',
                 updated_at = datetime('now') 
             WHERE id = ?`,
            [transaction.order_id]
          );

          await auditLog(AuditAction.PAYMENT_VERIFIED, {
            checkoutId,
            orderId: transaction.order_id,
            amount,
            status: 'paid',
          });
        }
      }

      return {
        success: true,
        id,
        amount,
        currency,
        status,
        paid_at,
        payment_method,
        customer,
      };

    } catch (error: any) {
      await auditLog(AuditAction.PAYMENT_VERIFY_FAILED, {
        checkoutId,
        error: error.message,
      });
      throw error;
    }
  }
}

// ⭐ Singleton sécurisé
export const leekPayService = new LeekPayService();