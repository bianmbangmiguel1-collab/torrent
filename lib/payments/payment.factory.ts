/// lib/payments/payment.factory.ts
import { PaymentProvider } from './providers/payment-provider';
import { FedaPayProvider } from './providers/fedapay.provider';

const PAYMENT_PROVIDER = process.env.PAYMENT_PROVIDER || 'fedapay';

export function getPaymentProvider(providerName: string = PAYMENT_PROVIDER): PaymentProvider {
  switch (providerName) {
    case 'fedapay':
      return new FedaPayProvider();
    default:
      throw new Error(`Provider non supporté: ${providerName}`);
  }
}