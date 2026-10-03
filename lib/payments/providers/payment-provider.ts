// lib/payments/providers/payment-provider.ts
export interface PaymentProvider {
  createPayment(input: {
    amount: number;
    currency: string;
    orderId: string;
    description?: string;
    customer: {
      firstname?: string;
      lastname?: string;
      email: string;
      phone?: string;
    };
    returnUrl?: string;
    webhookUrl?: string;
  }): Promise<{
    providerPaymentId: string;
    paymentUrl?: string;
    status: string;
    raw?: unknown;
  }>;

  getPayment(paymentId: string): Promise<{
    providerPaymentId: string;
    status: string;
    raw?: unknown;
  }>;

  verifyWebhook(
    payload: any,
    signature?: string
  ): Promise<{ valid: boolean; data?: any }>;

  refundPayment(paymentId: string, amount?: number): Promise<{
    status: string;
    raw?: unknown;
  }>;
}