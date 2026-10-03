// components/payment/FedaPayEmbed.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { FedaCheckoutContainer } from 'fedapay-reactjs';
import { Loader2 } from 'lucide-react';

interface FedaPayEmbedProps {
  amount: number;
  description?: string; // 🔥 Rendre optionnel
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  currency?: string;
  height?: number | string;
  width?: number | string;
  backgroundColor?: string;
  onSuccess?: (transaction: any) => void;
  onError?: (error: any) => void;
  onClose?: () => void;
}

export default function FedaPayEmbed({
  amount,
  description = 'Paiement TorrentTwist', // 🔥 Valeur par défaut
  customerEmail,
  customerName = '',
  customerPhone = '',
  currency = 'XOF',
  height = 500,
  width = '100%',
  backgroundColor = '#f8fafc',
  onSuccess,
  onError,
  onClose,
}: FedaPayEmbedProps) {
  const [isClient, setIsClient] = useState(false);
  const [publicKey, setPublicKey] = useState('');

  useEffect(() => {
    setIsClient(true);
    setPublicKey(process.env.NEXT_PUBLIC_FEDAPAY_PUBLIC_KEY || '');
  }, []);

  // 🔥 S'assurer que description est définie
  const safeDescription = description || 'Paiement TorrentTwist';
  const truncatedDescription = safeDescription.substring(0, 255);

  const safeEnvironment = ((process.env.NEXT_PUBLIC_FEDAPAY_ENVIRONMENT === 'live' ? 'live' : 'sandbox') as 'live' | 'sandbox');
  const checkoutOptions = {
    public_key: publicKey,
    environment: safeEnvironment,
    transaction: {
      amount: Math.round(amount),
      description: truncatedDescription,
      custom_metadata: {
        platform: 'TorrentTwist',
        timestamp: new Date().toISOString(),
      },
    },
    customer: {
      email: customerEmail,
      firstname: customerName.split(' ')[0] || '',
      lastname: customerName.split(' ').slice(1).join(' ') || '',
      ...(customerPhone && {
        phone_number: {
          number: customerPhone.replace(/\D/g, ''),
          country: 'CI',
        },
      }),
    },
    currency: {
      iso: currency,
    },
    onComplete: (resp: any) => {
      console.log('✅ FedaPay onComplete:', resp);
      
      if (resp.reason === 1) {
        onSuccess?.(resp.transaction);
      } else if (resp.reason === 0) {
        onClose?.();
      }
    },
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center p-8" style={{ height, width }}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Chargement du paiement...</span>
      </div>
    );
  }

  if (!publicKey) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
        ⚠️ Configuration de paiement manquante. Contactez le support.
      </div>
    );
  }

  return (
    <div
      className="w-full"
      style={{
        height,
        width,
        backgroundColor,
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      <FedaCheckoutContainer options={checkoutOptions} />
    </div>
  );
}