// app/orders/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Download, 
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Package,
  User,
  CreditCard,
  Calendar,
  FileText,
  Printer,
  ShoppingBag,
  AlertCircle,
  RefreshCw,
  Shield,
  Truck,
  MapPin,
  Phone,
  Mail,
  FileCheck,
  Sparkles
} from 'lucide-react';

import { useUser } from '@/context/UserContext';

// ============================================================
// TYPES
// ============================================================

interface OrderItem {
  id: number;
  product_id: number;
  product_title: string;
  quantity: number;
  price: number;
  total: number;
  product_file_path?: string;
  image?: string;
}

interface OrderDetail {
  id: number;
  order_number: string;
  total: number;
  subtotal: number;
  shipping_cost: number;
  tax: number;
  currency: string;
  status: string;
  payment_status: string;
  payment_method: string;
  transaction_id: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  download_token?: string;
  download_expires_at?: string;
  download_count?: number;
  download_limit?: number;
  shipping_address?: {
    name: string;
    address: string;
    city: string;
    country: string;
    phone: string;
    postal_code?: string;
  };
  billing_address?: {
    name: string;
    address: string;
    city: string;
    country: string;
  };
}

interface OrderDetailResponse {
  order?: OrderDetail;
  error?: string;
  message?: string;
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, loading: userLoading } = useUser();
  
  const id = params?.id as string;
  
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [printing, setPrinting] = useState(false);

  // ============================================================
  // REDIRECTION SI NON AUTHENTIFIÉ
  // ============================================================
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.replace('/login?redirect=/orders');
    }
  }, [userLoading, isAuthenticated, router]);

  // ============================================================
  // CHARGEMENT DES DÉTAILS DE LA COMMANDE
  // ============================================================
  const fetchOrderDetail = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }

    if (!id) return;

    try {
      console.log(`🔍 Chargement de la commande #${id}...`);
      console.log(`📡 Appel à /api/orders/${id}`);
      
      const response = await fetch(`/api/orders/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        cache: 'no-store',
      });

      console.log(`📊 Status /api/orders/${id}:`, response.status);

      if (response.status === 401) {
        console.log('🔑 Non authentifié, redirection vers login');
        router.push('/login?redirect=/orders');
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API /api/orders/${id}`);
        console.error('Status:', response.status);
        console.error('Réponse:', errorText);
        
        if (response.status === 404) {
          setError('Commande non trouvée');
        } else {
          throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
        }
        return;
      }

      const data = (await response.json()) as OrderDetailResponse;
      console.log('✅ Commande chargée:', data.order?.order_number);
      
      setOrder(data.order || (data as unknown as OrderDetail));
      setError(null);
      
    } catch (error) {
      console.error('❌ Erreur chargement commande:', error);
      setError(error instanceof Error ? error.message : 'Impossible de charger les détails de cette commande.');
    } finally {
      setLoading(false);
      if (isRefresh) {
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    if (id && isAuthenticated) {
      fetchOrderDetail();
    }
  }, [id, isAuthenticated]);

  // ============================================================
  // IMPRESSION
  // ============================================================
  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 300);
  };

  // ============================================================
  // TÉLÉCHARGEMENT - URL RELATIVE
  // ============================================================
  const handleDownload = (token: string) => {
    window.open(`/api/download/${token}`, '_blank');
  };

  // ============================================================
  // STATUT DES COMMANDES
  // ============================================================
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; icon: any; bg: string }> = {
      'pending': { 
        label: 'En attente', 
        color: 'text-yellow-700', 
        icon: Clock,
        bg: 'bg-yellow-50 border-yellow-200'
      },
      'confirmed': { 
        label: 'Confirmée', 
        color: 'text-blue-700', 
        icon: CheckCircle,
        bg: 'bg-blue-50 border-blue-200'
      },
      'processing': { 
        label: 'En traitement', 
        color: 'text-indigo-700', 
        icon: Truck,
        bg: 'bg-indigo-50 border-indigo-200'
      },
      'completed': { 
        label: 'Terminée', 
        color: 'text-green-700', 
        icon: FileCheck,
        bg: 'bg-green-50 border-green-200'
      },
      'cancelled': { 
        label: 'Annulée', 
        color: 'text-red-700', 
        icon: XCircle,
        bg: 'bg-red-50 border-red-200'
      },
      'refunded': { 
        label: 'Remboursée', 
        color: 'text-gray-700', 
        icon: XCircle,
        bg: 'bg-gray-50 border-gray-200'
      }
    };
    const s = statusMap[status] || statusMap['pending'];
    const Icon = s.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${s.bg} ${s.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {s.label}
      </span>
    );
  };

  const getPaymentBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; bg: string }> = {
      'pending': { label: 'En attente', color: 'text-yellow-700', bg: 'bg-yellow-50' },
      'paid': { label: 'Payée ✅', color: 'text-green-700', bg: 'bg-green-50' },
      'successful': { label: 'Payée ✅', color: 'text-green-700', bg: 'bg-green-50' },
      'failed': { label: 'Échouée ❌', color: 'text-red-700', bg: 'bg-red-50' },
      'refunded': { label: 'Remboursée', color: 'text-gray-700', bg: 'bg-gray-50' }
    };
    const s = statusMap[status] || statusMap['pending'];
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.color}`}>
        {s.label}
      </span>
    );
  };

  // ============================================================
  // FORMATAGE DES DATES
  // ============================================================
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // ============================================================
  // ÉTATS DE CHARGEMENT
  // ============================================================
  if (userLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement des détails...</p>
          <p className="text-sm text-gray-400 mt-1">Préparation de votre commande</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // AFFICHAGE DES ERREURS
  // ============================================================
  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
          {error === 'Commande non trouvée' ? (
            <>
              <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-800">Commande non trouvée</h2>
              <p className="text-gray-500 mt-2">
                Cette commande n'existe pas ou vous n'y avez pas accès.
              </p>
            </>
          ) : (
            <>
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-800">Erreur de chargement</h2>
              <p className="text-gray-500 mt-2">{error}</p>
            </>
          )}
          <div className="mt-6 space-y-3">
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchOrderDetail();
              }}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Réessayer
            </button>
            <Link
              href="/orders"
              className="block w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
            >
              Retour à mes commandes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* En-tête */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/orders"
              className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl hover:bg-white transition shadow-sm text-gray-700"
            >
              <ArrowLeft className="w-5 h-5" />
              Retour
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                Commande #{order.order_number}
                <button
                  onClick={() => fetchOrderDetail(true)}
                  disabled={refreshing}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                {getStatusBadge(order.status)}
                {getPaymentBadge(order.payment_status)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={printing}
              className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl hover:bg-white transition shadow-sm text-sm text-gray-700 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              {printing ? 'Préparation...' : 'Imprimer'}
            </button>
          </div>
        </div>

        {/* Informations de la commande */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Date */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Date</span>
            </div>
            <p className="text-sm font-medium text-gray-900">{formatDate(order.created_at)}</p>
          </div>

          {/* Statut de paiement */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <CreditCard className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Paiement</span>
            </div>
            <div className="flex items-center gap-2">
              {getPaymentBadge(order.payment_status)}
              <span className="text-sm text-gray-600">{order.payment_method || 'Non spécifiée'}</span>
            </div>
          </div>

          {/* Total */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Package className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Total</span>
            </div>
            <p className="text-xl font-bold text-blue-600">{order.total.toLocaleString()} FCFA</p>
          </div>
        </div>

        {/* Produits */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/50 mb-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Produits commandés
          </h3>
          <div className="space-y-3">
            {order.items && order.items.length > 0 ? (
              order.items.map((item, index) => (
                <motion.div
                  key={item.id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.product_title}
                        className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                        <Package className="w-6 h-6 text-blue-500" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{item.product_title}</p>
                      <p className="text-sm text-gray-500">Quantité: {item.quantity}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{(item.price * item.quantity).toLocaleString()} FCFA</p>
                    <p className="text-xs text-gray-400">{item.price.toLocaleString()} FCFA × {item.quantity}</p>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">Aucun produit trouvé</p>
            )}
          </div>
        </div>

        {/* Client */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/50 mb-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600" />
            Informations client
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Nom</p>
              <p className="font-medium text-gray-900">{order.user_name || user?.name || 'Client'}</p>
            </div>
            <div>
              <p className="text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{order.user_email || user?.email}</p>
            </div>
            {order.user_phone && (
              <div>
                <p className="text-gray-500">Téléphone</p>
                <p className="font-medium text-gray-900">{order.user_phone}</p>
              </div>
            )}
          </div>
        </div>

        {/* Adresse de livraison */}
        {order.shipping_address && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/50 mb-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-600" />
              Adresse de livraison
            </h3>
            <div className="text-sm text-gray-700 space-y-1">
              <p className="font-medium">{order.shipping_address.name}</p>
              <p>{order.shipping_address.address}</p>
              <p>{order.shipping_address.city}, {order.shipping_address.country}</p>
              {order.shipping_address.postal_code && <p>Code postal: {order.shipping_address.postal_code}</p>}
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                {order.shipping_address.phone}
              </p>
            </div>
          </div>
        )}

        {/* Téléchargement */}
        {order.download_token && order.status === 'completed' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-green-50 to-emerald-50 backdrop-blur-sm rounded-xl p-6 border border-green-200 mb-4"
          >
            <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
              <Download className="w-5 h-5" />
              Téléchargement disponible
            </h3>
            <button
              onClick={() => handleDownload(order.download_token!)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium shadow-lg shadow-green-500/20"
            >
              <Download className="w-5 h-5" />
              Télécharger vos fichiers
            </button>
            <div className="mt-3 text-sm text-green-700 space-y-1">
              <p>Téléchargements: {order.download_count || 0} / {order.download_limit || 5}</p>
              {order.download_expires_at && (
                <p className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Expire le: {formatDate(order.download_expires_at)}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mt-6">
          <Link
            href="/products"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition font-medium"
          >
            Continuer les achats
            <ShoppingBag className="w-4 h-4" />
          </Link>
          <Link
            href="/invoices"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 bg-white/80 text-gray-700 rounded-xl hover:bg-white hover:shadow-md transition font-medium"
          >
            <FileText className="w-4 h-4" />
            Voir la facture
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-8 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <Shield className="w-4 h-4 text-green-500" />
            <span>Commande sécurisée • Transaction #{order.transaction_id?.slice(0, 12) || 'N/A'}</span>
          </div>
          <Link href="/support" className="text-sm text-blue-600 hover:text-blue-700 transition">
            Besoin d'aide ? Contactez-nous
          </Link>
        </div>
      </div>

      {/* ============================================================
          STYLES D'IMPRESSION
      ============================================================ */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .print-card {
            border: 1px solid #e5e7eb !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}