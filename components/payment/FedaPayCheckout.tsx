// components/payment/FedaPayCheckout.tsx
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, CreditCard, ShieldCheck, Zap } from 'lucide-react';

const FedaPayButton = dynamic(
  () => import('@/components/payment/FedaPayButton'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-sm text-gray-500">Chargement du paiement...</span>
      </div>
    )
  }
);

interface FedaPayCheckoutProps {
  amount: number;
  description?: string;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  currency?: string;
  productId?: number;
  productTitle?: string;
  onSuccess?: (transaction: any) => void;
  onError?: (error: any) => void;
  onClose?: () => void;
  buttonText?: string;
  buttonClassName?: string;
  embedded?: boolean;
  className?: string;
  height?: number | string;
  width?: number | string;
}

export default function FedaPayCheckout({
  amount,
  description = 'Paiement TorrentTwist',
  customerEmail,
  customerName = '',
  customerPhone = '',
  currency = 'XOF',
  productId,
  productTitle,
  onSuccess,
  onError,
  onClose,
  buttonText = 'Payer maintenant',
  buttonClassName = '',
  embedded = false,
  className = '',
  height = 500,
  width = '100%',
}: FedaPayCheckoutProps) {
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    console.log('✅ FedaPayCheckout monté');
    console.log('💰 Amount:', amount);
    console.log('📧 Customer:', customerEmail);
    console.log('🔑 Public Key:', process.env.NEXT_PUBLIC_FEDAPAY_PUBLIC_KEY ? '✅ Présente' : '❌ Manquante');
  }, [amount, customerEmail]);

  const handleSuccess = (transaction: any) => {
    console.log('✅ Paiement réussi:', transaction);
    onSuccess?.(transaction);
  };

  const handleError = (err: any) => {
    console.error('❌ Erreur paiement:', err);
    setError(err.message || 'Erreur lors du paiement');
    onError?.(err);
  };

  const handleClose = () => {
    console.log('👋 Paiement annulé');
    onClose?.();
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Chargement du paiement...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-xl ${className}`}>
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => setError(null)}
          className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <FedaPayButton
        amount={amount}
        description={description}
        customerEmail={customerEmail}
        customerName={customerName}
        customerPhone={customerPhone}
        currency={currency}
        buttonText={buttonText}
        buttonClass={buttonClassName || 'w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/30 transition hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2 text-lg'}
        onSuccess={handleSuccess}
        onError={handleError}
        onClose={handleClose}
      />

      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Paiement sécurisé
        </span>
        <span className="flex items-center gap-1.5">
          <CreditCard className="w-4 h-4 text-blue-500" />
          Cartes & Mobile Money
        </span>
        <span className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-yellow-500" />
          Instantané
        </span>
      </div>
    </div>
  );
}