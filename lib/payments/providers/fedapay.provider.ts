// lib/payments/providers/fedapay.provider.ts
import { PaymentProvider } from './payment-provider';

const FEDAPAY_SECRET_KEY = process.env.FEDAPAY_SECRET_KEY || '';
const FEDAPAY_ENVIRONMENT = process.env.FEDAPAY_ENVIRONMENT || 'live';

// ============================================================
// Types
// ============================================================
interface FedaPayTransaction {
  id: string | number;
  payment_url?: string;
  status?: string;
}

interface FedaPayResponse {
  transaction: FedaPayTransaction;
}

interface FedaPayErrorResponse {
  message?: string;
}

export class FedaPayProvider implements PaymentProvider {
  private baseUrl: string;

  constructor() {
    this.baseUrl = FEDAPAY_ENVIRONMENT === 'production'
      ? 'https://api.fedapay.com/v1'
      : 'https://sandbox-api.fedapay.com/v1';
  }

  private async request(
    endpoint: string,
    method: string = 'GET',
    body?: any
  ): Promise<FedaPayResponse> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error: FedaPayErrorResponse = await response.json();
      throw new Error(error.message || 'Erreur FedaPay');
    }

    return response.json();
  }

  async createPayment(input: {
    amount: number;
    currency: string;
    orderId: string;
    description?: string;
    customer: { firstname?: string; lastname?: string; email: string; phone?: string };
    returnUrl?: string;
    webhookUrl?: string;
  }) {
    const data = await this.request('/transactions', 'POST', {
      transaction: {
        amount: input.amount,
        currency: input.currency,
        description: input.description || `Commande #${input.orderId}`,
        customer: {
          email: input.customer.email,
          name: [input.customer.firstname, input.customer.lastname].filter(Boolean).join(' ') || 'Client',
        },
        return_url: input.returnUrl,
        webhook_url: input.webhookUrl,
      }
    });

    return {
      providerPaymentId: String(data.transaction.id),
      paymentUrl: data.transaction.payment_url,
      status: data.transaction.status || 'unknown',
      raw: data,
    };
  }

  async getPayment(paymentId: string) {
    const data = await this.request(`/transactions/${paymentId}`);
    return {
      providerPaymentId: String(data.transaction.id),
      status: data.transaction.status || 'unknown',
      raw: data,
    };
  }

  async verifyWebhook(payload: any, signature?: string) {
    // TODO: Implémenter la vérification de signature
    // FedaPay utilise généralement un header x-fedapay-signature
    return {
      valid: true,
      data: payload,
    };
  }

  async refundPayment(paymentId: string, amount?: number) {
    const data = await this.request(`/transactions/${paymentId}/refund`, 'POST', {
      refund: amount ? { amount } : undefined,
    });
    return {
      status: data.transaction.status || 'unknown',
      raw: data,
    };
  }
}