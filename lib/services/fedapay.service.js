// services/fedapay.service.js
const FedaPay = require('fedapay');
const crypto = require('crypto');

// Configuration FedaPay
const FEDAPAY_API_KEY = process.env.FEDAPAY_API_KEY || '';
const FEDAPAY_ENVIRONMENT = process.env.FEDAPAY_ENVIRONMENT || 'sandbox';

// Initialiser FedaPay
FedaPay.init(FEDAPAY_API_KEY, FEDAPAY_ENVIRONMENT);

class FedaPayService {
  constructor() {
    this.apiKey = FEDAPAY_API_KEY;
    this.environment = FEDAPAY_ENVIRONMENT;
  }

  /**
   * Créer une transaction FedaPay
   */
  async createTransaction(params) {
    try {
      const { 
        amount, 
        currency = 'XOF', 
        description, 
        customer_email, 
        customer_name,
        payment_method = 'mobile_money',
        return_url,
        webhook_url
      } = params;

      // Créer un client FedaPay
      const customer = await FedaPay.Customer.create({
        email: customer_email,
        name: customer_name || 'Client',
      });

      // Créer la transaction
      const transaction = await FedaPay.Transaction.create({
        amount: amount,
        currency: currency,
        description: description || 'Achat sur TorrentTwist',
        customer: customer,
        payment_method: payment_method,
        return_url: return_url || `${process.env.FRONTEND_URL}/payment/confirm`,
        webhook_url: webhook_url || `${process.env.BACKEND_URL}/api/webhooks/fedapay`,
      });

      return {
        success: true,
        transaction: transaction,
        payment_url: transaction.payment_url,
        token: transaction.token,
      };
    } catch (error) {
      console.error('❌ Erreur FedaPay createTransaction:', error);
      throw error;
    }
  }

  /**
   * Récupérer une transaction
   */
  async getTransaction(transactionId) {
    try {
      const transaction = await FedaPay.Transaction.retrieve(transactionId);
      return transaction;
    } catch (error) {
      console.error('❌ Erreur FedaPay getTransaction:', error);
      throw error;
    }
  }

  /**
   * Rembourser une transaction
   */
  async refundTransaction(transactionId) {
    try {
      const transaction = await FedaPay.Transaction.retrieve(transactionId);
      const refund = await transaction.refund();
      return refund;
    } catch (error) {
      console.error('❌ Erreur FedaPay refundTransaction:', error);
      throw error;
    }
  }

  /**
   * Vérifier la signature du webhook
   */
  verifyWebhookSignature(payload, signature) {
    try {
      const secret = process.env.FEDAPAY_WEBHOOK_SECRET || '';
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature || ''),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('❌ Erreur vérification signature:', error);
      return false;
    }
  }
}

module.exports = new FedaPayService();