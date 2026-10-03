// lib/fedapay-service.ts
import axios from 'axios';

interface FedaPayTransaction {
  id: number;
  reference: string;
  amount: number;
  description: string;
  callback_url: string;
  status: 'pending' | 'approved' | 'canceled' | 'declined';
  customer_id: number;
  currency_id: number;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  canceled_at?: string;
  declined_at?: string;
  custom_metadata?: any;
  receipt_url?: string;
  payment_method_id?: number;
}

interface FedaPayCustomer {
  id?: number;
  email: string;
  firstname?: string;
  lastname?: string;
  phone_number?: {
    number: string;
    country: string;
  };
}

export class FedaPayService {
  private apiKey: string;
  private baseUrl: string;
  private environment: 'sandbox' | 'live';

  constructor() {
    this.apiKey = process.env.FEDAPAY_SECRET_KEY || '';
    this.environment = (process.env.NEXT_PUBLIC_FEDAPAY_ENVIRONMENT as 'sandbox' | 'live') || 'sandbox';
    this.baseUrl = this.environment === 'sandbox' 
      ? 'https://sandbox-api.fedapay.com/v1'
      : 'https://api.fedapay.com/v1';
  }

  /**
   * Créer une transaction FedaPay
   */
  async createTransaction(params: {
    amount: number;
    description: string;
    customer: FedaPayCustomer;
    currency?: string;
    callback_url?: string;
    custom_metadata?: any;
  }): Promise<FedaPayTransaction> {
    try {
      const payload = {
        description: params.description,
        amount: params.amount,
        currency: { iso: params.currency || 'XOF' },
        callback_url: params.callback_url || `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/webhooks/fedapay`,
        custom_metadata: {
          platform: 'TorrentTwist',
          environment: this.environment,
          ...params.custom_metadata,
        },
        customer: params.customer,
      };

      console.log(`📝 Création transaction FedaPay (${this.environment}):`, payload);

      const response = await axios.post(
        `${this.baseUrl}/transactions`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`✅ Transaction FedaPay créée: ${response.data.id}`);
      return response.data;

    } catch (error: any) {
      console.error('❌ Erreur création transaction FedaPay:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Erreur lors de la création de la transaction');
    }
  }

  /**
   * Obtenir le token de paiement pour une transaction
   */
  async getPaymentToken(transactionId: number): Promise<{ token: string; url: string }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transactions/${transactionId}/token`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        token: response.data.token,
        url: response.data.url,
      };

    } catch (error: any) {
      console.error('❌ Erreur génération token:', error.response?.data || error.message);
      throw new Error('Erreur lors de la génération du token de paiement');
    }
  }

  /**
   * Récupérer une transaction
   */
  async getTransaction(transactionId: number): Promise<FedaPayTransaction> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/transactions/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;

    } catch (error: any) {
      console.error('❌ Erreur récupération transaction:', error.response?.data || error.message);
      throw new Error('Erreur lors de la récupération de la transaction');
    }
  }

  /**
   * Envoyer le paiement à l'utilisateur (Mobile Money)
   */
  async sendPaymentToUser(transactionId: number, mode: string, token: string, phoneNumber: string) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transactions/${mode}`,
        {
          token: parseInt(token),
          phone_number: {
            number: phoneNumber.replace(/\D/g, ''),
            country: 'CI',
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;

    } catch (error: any) {
      console.error('❌ Erreur envoi paiement:', error.response?.data || error.message);
      throw new Error('Erreur lors de l\'envoi du paiement');
    }
  }

  /**
   * Vérifier le statut d'une transaction
   */
  async checkTransactionStatus(transactionId: number): Promise<string> {
    const transaction = await this.getTransaction(transactionId);
    return transaction.status;
  }
}

export const fedapay = new FedaPayService();