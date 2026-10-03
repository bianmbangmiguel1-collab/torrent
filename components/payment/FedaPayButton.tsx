// components/payment/FedaPayButton.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { FedaCheckoutButton } from 'fedapay-reactjs';
import { Loader2 } from 'lucide-react';

interface FedaPayButtonProps {
  amount: number;
  description?: string;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  currency?: string;
  buttonText?: string;
  buttonClass?: string;
  onSuccess?: (transaction: any) => void;
  onError?: (error: any) => void;
  onClose?: () => void;
}

// ============================================================
// 🔥 Chargement du script FedaPay (LOCAL en priorité)
// ============================================================
const FEDAPAY_SCRIPT_LOCAL = '/js/fedapay-checkout.js';
const FEDAPAY_SCRIPT_CDN = 'https://cdn.fedapay.com/checkout.js';

const loadFedaPayScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 1. Déjà chargé ?
    if (typeof window !== 'undefined' && (window as any).FedaPay) {
      console.log('✅ FedaPay script déjà chargé');
      resolve();
      return;
    }

    // 2. Script déjà présent dans le DOM ?
    const existingScript = document.querySelector(
      `script[src="${FEDAPAY_SCRIPT_LOCAL}"], script[src="${FEDAPAY_SCRIPT_CDN}"]`
    );

    if (existingScript) {
      console.log('⏳ FedaPay script en cours de chargement (existant)...');
      existingScript.addEventListener('load', () => {
        console.log('✅ FedaPay script chargé (existant)');
        resolve();
      });
      existingScript.addEventListener('error', () => {
        console.error('❌ Erreur chargement FedaPay (existant)');
        reject(new Error('Erreur lors du chargement du script FedaPay'));
      });
      return;
    }

    // 3. Charger depuis le LOCAL d'abord, puis fallback CDN si échec
    const tryLoad = (src: string, isFallback = false): Promise<void> => {
      return new Promise((res, rej) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;

        script.onload = () => {
          console.log(`✅ FedaPay script chargé : ${src}`);
          res();
        };

        script.onerror = () => {
          console.warn(`⚠️ Échec du chargement : ${src}`);
          if (!isFallback) {
            // Si le local échoue, essayer le CDN
            console.log('🔄 Tentative de fallback vers le CDN...');
            tryLoad(FEDAPAY_SCRIPT_CDN, true).then(res).catch(rej);
          } else {
            rej(new Error(`Impossible de charger FedaPay (${src}). Vérifiez votre connexion.`));
          }
        };

        document.head.appendChild(script);
      });
    };

    tryLoad(FEDAPAY_SCRIPT_LOCAL).then(resolve).catch(reject);
  });
};

export default function FedaPayButton({
  amount,
  description = 'Paiement TorrentTwist',
  customerEmail,
  customerName = '',
  customerPhone = '',
  currency = 'XOF',
  buttonText = 'Payer maintenant',
  buttonClass = 'w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/30 transition hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2',
  onSuccess,
  onError,
  onClose,
}: FedaPayButtonProps) {
  const [isClient, setIsClient] = useState(false);
  const [publicKey, setPublicKey] = useState('');
  const [environment, setEnvironment] = useState('sandbox');
  const [isReady, setIsReady] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // 🔥 Charger le script FedaPay
  useEffect(() => {
    let mounted = true;

    const loadScript = async () => {
      try {
        await loadFedaPayScript();
        if (mounted) setScriptLoaded(true);
      } catch (err: any) {
        if (mounted) {
          setLoadingError(err.message || 'Erreur lors du chargement du paiement');
        }
      }
    };

    loadScript();

    return () => {
      mounted = false;
    };
  }, []);

  // 🔥 Détection environnement
  useEffect(() => {
    setIsClient(true);

    const isProduction = process.env.NODE_ENV === 'production';
    const env =
      process.env.NEXT_PUBLIC_FEDAPAY_ENVIRONMENT ||
      (isProduction ? 'live' : 'sandbox');
    const key = process.env.NEXT_PUBLIC_FEDAPAY_PUBLIC_KEY || '';

    const isNgrok =
      process.env.NEXT_PUBLIC_APP_URL?.includes('ngrok.io') ||
      process.env.NEXT_PUBLIC_BACKEND_URL?.includes('ngrok.io');

    console.log('========================================');
    console.log('🔑 FedaPayButton - Configuration');
    console.log('========================================');
    console.log('📡 Environnement demandé:', env);
    console.log('🔑 Clé publique:', key ? `✅ ${key.substring(0, 15)}...` : '❌ Manquante');
    console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
    console.log('🔗 APP URL:', process.env.NEXT_PUBLIC_APP_URL || 'non défini');
    console.log('🔗 BACKEND URL:', process.env.NEXT_PUBLIC_BACKEND_URL || 'non défini');
    console.log('🔌 Ngrok détecté:', isNgrok ? '✅ OUI' : '❌ NON');
    console.log('💰 Montant:', amount);
    console.log('📧 Client:', customerEmail);
    console.log('📦 Script FedaPay:', scriptLoaded ? '✅ Chargé' : '⏳ En cours...');
    console.log('📦 Source:', FEDAPAY_SCRIPT_LOCAL);
    console.log('========================================');

    setEnvironment(env);
    setPublicKey(key);
    setIsReady(true);
  }, [amount, customerEmail, scriptLoaded]);

  const safeDescription = description || 'Paiement TorrentTwist';
  const truncatedDescription = safeDescription.substring(0, 255);

  const safeEnvironment = (environment === 'live' ? 'live' : 'sandbox') as 'live' | 'sandbox';

  const checkoutOptions = {
    public_key: publicKey,
    environment: safeEnvironment,
    transaction: {
      amount: Math.round(amount),
      description: truncatedDescription,
      callback_url: process.env.NEXT_PUBLIC_BACKEND_URL
        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/webhooks/fedapay`
        : undefined,
      custom_metadata: {
        platform: 'TorrentTwist',
        environment: environment,
        ngrok: process.env.NEXT_PUBLIC_APP_URL?.includes('ngrok.io') || false,
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
    button: {
      class: buttonClass,
      text: buttonText,
    },
    onComplete: (resp: any) => {
      console.log(`✅ FedaPay onComplete (${environment}):`, resp);

      if (resp.reason === 1) {
        console.log('✅ Transaction complétée avec succès');
        onSuccess?.(resp.transaction);
      } else if (resp.reason === 0) {
        console.log("👋 Dialogue fermé par l'utilisateur");
        onClose?.();
      }
    },
  };

  // 🔥 Erreur de chargement
  if (loadingError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
        <p className="font-medium">⚠️ Erreur de chargement du paiement</p>
        <p className="text-xs mt-1">{loadingError}</p>
        <p className="text-xs mt-2 text-gray-500">
          Assurez-vous que le fichier <code>public/js/fedapay-checkout.js</code> existe.
        </p>
        <button
          onClick={() => {
            setLoadingError(null);
            loadFedaPayScript()
              .then(() => setScriptLoaded(true))
              .catch((err) => setLoadingError(err.message));
          }}
          className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium underline"
        >
          Réessayer de charger
        </button>
      </div>
    );
  }

  // 🔥 Chargement
  if (!isClient || !isReady) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-500">Chargement du paiement...</span>
      </div>
    );
  }

  // 🔥 Clé manquante
  if (!publicKey) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
        <p className="font-medium">⚠️ Configuration de paiement manquante</p>
        <p className="text-xs mt-1">
          Clé publique FedaPay non configurée dans .env.local
        </p>
        <p className="text-xs mt-1 text-gray-500">
          Vérifiez: NEXT_PUBLIC_FEDAPAY_PUBLIC_KEY
        </p>
      </div>
    );
  }

  // 🔥 Script pas encore chargé
  if (!scriptLoaded) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-500">Chargement du système de paiement...</span>
      </div>
    );
  }

  const isLive = environment === 'live';
  const isNgrok = process.env.NEXT_PUBLIC_APP_URL?.includes('ngrok.io');

  return (
    <div className="w-full">
      {/* Badge environnement */}
      <div className="mb-3 flex items-center justify-center gap-2 flex-wrap">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            isLive
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isLive ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
            }`}
          />
          {isLive ? '🚀 MODE LIVE' : '🧪 MODE TEST'}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-medium">
          ✅ Script prêt
        </span>
        {isNgrok && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-medium">
            🔌 ngrok
          </span>
        )}
      </div>

      {/* Bouton FedaPay */}
      <FedaCheckoutButton options={checkoutOptions} />

      {/* Sécurité */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[10px] text-gray-400">
        <span className="flex items-center gap-1">🔒 Paiement sécurisé</span>
        <span className="w-px h-3 bg-gray-200" />
        <span className="flex items-center gap-1">💳 Cartes & Mobile Money</span>
        <span className="w-px h-3 bg-gray-200" />
        <span className="flex items-center gap-1">⚡ Instantané</span>
      </div>
    </div>
  );
}