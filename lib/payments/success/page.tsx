// app/payment/success/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  CheckCircle2, 
  Download, 
  FileText, 
  Mail, 
  ArrowRight,
  Loader2,
  Package,
  Clock,
  CreditCard,
  User
} from 'lucide-react';

interface OrderDetails {
  id: number;
  orderNumber: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  productTitle: string;
  invoiceUrl?: string;
  downloadUrl?: string;
  createdAt: string;
  userEmail: string;
  userName: string;
}

// ============================================================
// Types de réponses API
// ============================================================
interface OrderResponse {
  order?: OrderDetails;
  error?: string;
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderNumber = searchParams.get('order');
  
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (!orderNumber) {
      router.push('/');
      return;
    }

    // Récupérer les détails de la commande
    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/orders/${orderNumber}`);
        const data: OrderResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erreur lors de la récupération de la commande');
        }

        setOrder(data.order || null);
      } catch (err: any) {
        setError(err.message);
        console.error('❌ Erreur:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();

    // Compte à rebours pour la redirection automatique
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);

  }, [orderNumber, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto" />
          <p className="mt-4 text-slate-600">Vérification de votre commande...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-4xl">😅</span>
          </div>
          <h1 className="mt-6 text-2xl font-bold text-slate-900">
            Oups ! Quelque chose s'est mal passé
          </h1>
          <p className="mt-2 text-slate-600">{error || 'Commande non trouvée'}</p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
          >
            Retour à l'accueil
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-4">
      <div className="max-w-4xl mx-auto py-12">
        {/* Header */}
        <div className="text-center">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          </div>
          <h1 className="text-4xl font-black text-slate-900">
            🎉 Paiement réussi !
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            Votre commande a été confirmée avec succès.
          </p>
          <p className="text-sm text-slate-400 mt-1">
            Redirection automatique dans {countdown} secondes...
          </p>
        </div>

        {/* Order Summary */}
        <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 shadow-xl p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                📦 Récapitulatif de la commande
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Commande #{order.orderNumber}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
              Confirmée
            </span>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <Package className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-slate-400">Produit</p>
                <p className="font-medium text-slate-900">{order.productTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <CreditCard className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-xs text-slate-400">Montant</p>
                <p className="font-bold text-blue-600">{order.totalAmount.toLocaleString()} FCFA</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <User className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-xs text-slate-400">Client</p>
                <p className="font-medium text-slate-900">{order.userName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <Clock className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-xs text-slate-400">Date</p>
                <p className="font-medium text-slate-900">
                  {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {order.downloadUrl && (
              <a
                href={order.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 transition hover:shadow-xl hover:-translate-y-0.5"
              >
                <Download className="w-5 h-5" />
                Télécharger
              </a>
            )}
            {order.invoiceUrl && (
              <a
                href={order.invoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-slate-200 hover:border-blue-500 text-slate-700 rounded-xl font-semibold transition hover:-translate-y-0.5"
              >
                <FileText className="w-5 h-5" />
                Voir la facture
              </a>
            )}
            <Link
              href="/account/orders"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition hover:-translate-y-0.5"
            >
              Mes commandes
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Email notification */}
        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
          <Mail className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              Un email de confirmation a été envoyé à {order.userEmail}
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              Vérifiez vos spams si vous ne le recevez pas dans les prochaines minutes.
            </p>
          </div>
        </div>

        {/* Continue browsing */}
        <div className="mt-8 text-center">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            Continuer vos achats
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}