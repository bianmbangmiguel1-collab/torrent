// components/checkout/BuyNowButton.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useUser } from '@/context/UserContext';

interface BuyNowButtonProps {
  productId: number;
  productTitle: string;
  price: number;
  className?: string;
  children?: React.ReactNode;
}

// ============================================================
// Types de réponses API
// ============================================================
interface AuthMeResponse {
  token?: string;
}

interface OrderErrorResponse {
  error?: string;
}

interface OrderResponse {
  orderId?: number | string;
}

interface PaymentResponse {
  paymentUrl?: string;
  error?: string;
}

export default function BuyNowButton({
  productId,
  productTitle,
  price,
  className,
  children
}: BuyNowButtonProps) {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    console.log('🔍 BuyNowButton - Monté');
    console.log('📦 productId reçu:', productId);
    console.log('📦 productTitle reçu:', productTitle);
    console.log('💰 price reçu:', price);
  }, [productId, productTitle, price]);

  // 🔥 Récupérer le token depuis localStorage ou via /api/auth/me
  const getToken = async (): Promise<string | null> => {
    if (typeof window === 'undefined') return null;

    // 1. Essayer localStorage
    let token = localStorage.getItem('token');
    if (token && token !== 'null' && token !== 'undefined' && token.length > 10) {
      console.log('✅ Token trouvé dans localStorage');
      return token;
    }

    // 2. Récupérer via /api/auth/me
    try {
      console.log('🔄 Récupération du token via /api/auth/me...');
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data: AuthMeResponse = await response.json();
        console.log('📡 Réponse /api/auth/me reçue');
        
        if (data.token && data.token !== 'null' && data.token.length > 10) {
          token = data.token;
          if (token) localStorage.setItem('token', token);
          console.log('✅ Token récupéré depuis /api/auth/me');
          return token;
        }
      }
    } catch (err) {
      console.log('❌ Erreur récupération token:', err);
    }

    console.log('❌ Aucun token trouvé');
    return null;
  };

  const handleBuyNow = async () => {
    console.log('🔍 BuyNowButton - handleBuyNow appelé');
    console.log('📦 Product ID:', productId);
    console.log('👤 User:', user?.email);
    console.log('🔐 Authenticated:', isAuthenticated);
    console.log('🔐 authLoading:', authLoading);

    if (authLoading) {
      setError('Vérification de l\'authentification en cours...');
      return;
    }

    if (!isAuthenticated || !user) {
      console.log('🔑 Non authentifié, redirection vers login');
      router.push(`/login?redirect=/product/${productId}`);
      return;
    }

    if (!productId || productId === 0) {
      console.error('❌ Product ID manquant:', productId);
      setError('Erreur: produit non identifié.');
      return;
    }

    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      // 🔥 Récupérer le token
      const token = await getToken();
      console.log('🔑 Token utilisé:', token ? '✅' : '❌ (fallback cookie)');

      // 🔥 1. Créer la commande
      console.log('📡 Création de la commande...');
      const orderResponse = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        credentials: 'include',
        body: JSON.stringify({
          productId: productId,
          quantity: 1,
          userId: user?.id,
          userEmail: user?.email
        })
      });

      if (!orderResponse.ok) {
        const data: OrderErrorResponse = await orderResponse.json();
        throw new Error(data.error || 'Erreur lors de la création de la commande');
      }

      const order: OrderResponse = await orderResponse.json();
      console.log('✅ Commande créée:', order);

      if (!order.orderId) {
        throw new Error('ID de commande non reçu');
      }

      // 🔥 2. Lancer le paiement FedaPay
      console.log('📡 Initialisation du paiement FedaPay...');
      console.log('📦 orderId:', order.orderId);
      console.log('📦 productId:', productId);

      const paymentResponse = await fetch('/api/payments/fedapay/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        credentials: 'include',
        body: JSON.stringify({
          orderId: order.orderId,
          productId: productId
        })
      });

      console.log('📡 Réponse FedaPay status:', paymentResponse.status);

      if (!paymentResponse.ok) {
        const data: OrderErrorResponse = await paymentResponse.json();
        console.error('❌ Erreur FedaPay:', data);
        throw new Error(data.error || 'Erreur lors de l\'initialisation du paiement');
      }

      const payment: PaymentResponse = await paymentResponse.json();
      console.log('✅ Paiement initialisé:', payment);

      if (payment.paymentUrl) {
        console.log('🔀 Redirection vers:', payment.paymentUrl);
        window.location.assign(payment.paymentUrl);
      } else {
        throw new Error('URL de paiement non reçue');
      }

    } catch (err: any) {
      console.error('❌ Erreur:', err);
      setError(err.message || 'Une erreur est survenue');
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="w-full">
        <button
          disabled
          className={className || `w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl font-semibold shadow-lg shadow-emerald-500/30 transition hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Loader2 className="w-5 h-5 animate-spin" />
          Chargement...
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <button
        onClick={handleBuyNow}
        disabled={loading || authLoading}
        className={className || `w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl font-semibold shadow-lg shadow-emerald-500/30 transition hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading || authLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {authLoading ? 'Vérification...' : 'Préparation du paiement...'}
          </>
        ) : paymentSuccess ? (
          <>
            <CheckCircle2 className="w-5 h-5" />
            Paiement réussi !
          </>
        ) : (
          children || (
            <>
              <Zap className="w-5 h-5" />
              Acheter maintenant
            </>
          )
        )}
      </button>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-xs text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}