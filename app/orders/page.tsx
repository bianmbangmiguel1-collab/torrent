// app/orders/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  ArrowLeft, 
  Eye, 
  Download, 
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  ShoppingBag,
  Calendar,
  CreditCard,
  FileText,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Sparkles,
  FileCheck,
  Truck,
  Home,
  User,
  LogOut
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
  image?: string;
}

interface Order {
  id: number;
  order_number: string;
  total: number;
  subtotal: number;
  shipping_cost: number;
  tax: number;
  status: string;
  payment_status: string;
  payment_method: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  download_token?: string;
  download_expires_at?: string;
  shipping_address?: {
    name: string;
    address: string;
    city: string;
    country: string;
    phone: string;
  };
}

interface OrdersResponse {
  orders?: any[];
  error?: string;
  message?: string;
}

// ============================================================
// 🔥 FORMATAGE DES DATES - ULTRA ROBUSTE
// ============================================================

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) {
    return 'Date non disponible';
  }

  try {
    let date: Date;

    if (typeof dateString === 'number') {
      date = new Date(dateString);
    } 
    else if (typeof dateString === 'string') {
      const cleanString = dateString.trim();
      
      if (!cleanString) {
        return 'Date non disponible';
      }

      date = new Date(cleanString);
      
      if (isNaN(date.getTime())) {
        const formats = [
          (s: string) => new Date(s.replace('T', ' ')),
          (s: string) => new Date(s.replace(/-/g, '/')),
          (s: string) => new Date(parseInt(s)),
        ];

        for (const parser of formats) {
          try {
            const parsed = parser(cleanString);
            if (!isNaN(parsed.getTime())) {
              date = parsed;
              break;
            }
          } catch {
            continue;
          }
        }
      }
    } else {
      return 'Date non disponible';
    }

    if (isNaN(date.getTime())) {
      console.warn('⚠️ Date invalide après parsing:', dateString);
      return 'Date invalide';
    }

    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);

  } catch (error) {
    console.error('❌ Erreur formatage date:', error, 'Valeur:', dateString);
    return 'Date invalide';
  }
};

// ============================================================
// 🔥 NETTOYAGE DES DONNÉES - ULTRA ROBUSTE
// ============================================================

const sanitizeOrder = (order: any): Order => {
  const sanitizedCreatedAt = order.created_at 
    ? (() => {
        try {
          const d = new Date(order.created_at);
          return !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
        } catch {
          return new Date().toISOString();
        }
      })()
    : new Date().toISOString();

  const sanitizedUpdatedAt = order.updated_at
    ? (() => {
        try {
          const d = new Date(order.updated_at);
          return !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
        } catch {
          return new Date().toISOString();
        }
      })()
    : new Date().toISOString();

  return {
    id: typeof order.id === 'number' ? order.id : parseInt(order.id) || 0,
    order_number: order.order_number || 'N/A',
    total: typeof order.total === 'number' ? order.total : parseFloat(order.total) || 0,
    subtotal: typeof order.subtotal === 'number' ? order.subtotal : parseFloat(order.subtotal) || 0,
    shipping_cost: typeof order.shipping_cost === 'number' ? order.shipping_cost : parseFloat(order.shipping_cost) || 0,
    tax: typeof order.tax === 'number' ? order.tax : parseFloat(order.tax) || 0,
    status: order.status || 'pending',
    payment_status: order.payment_status || 'pending',
    payment_method: order.payment_method || 'fidepay',
    created_at: sanitizedCreatedAt,
    updated_at: sanitizedUpdatedAt,
    items: Array.isArray(order.items) 
      ? order.items.map((item: any) => ({
          id: typeof item.id === 'number' ? item.id : parseInt(item.id) || 0,
          product_id: typeof item.product_id === 'number' ? item.product_id : parseInt(item.product_id) || 0,
          product_title: item.product_title || item.title || 'Produit',
          quantity: typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 1,
          price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
          image: item.image || null,
        }))
      : [],
    download_token: order.download_token || null,
    download_expires_at: order.download_expires_at || null,
    shipping_address: order.shipping_address || null,
  };
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function OrdersPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: userLoading } = useUser();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');

  // ============================================================
  // REDIRECTION SI NON AUTHENTIFIÉ
  // ============================================================
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.replace('/login?redirect=/orders');
    }
  }, [userLoading, isAuthenticated, router]);

  // ============================================================
  // CHARGEMENT DES COMMANDES - AVEC NETTOYAGE COMPLET
  // ============================================================
  const fetchOrders = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }

    setDebugInfo('');

    try {
      console.log('🔍 Chargement des commandes...');
      
      const response = await fetch('/api/orders', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        cache: 'no-store',
      });

      console.log('📊 Status /api/orders:', response.status);

      if (response.status === 401) {
        console.log('🔑 Non authentifié, redirection vers login');
        router.push('/login?redirect=/orders');
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API /api/orders Error:', errorText);
        
        let errorMessage = `Erreur HTTP ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText) as OrdersResponse;
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch (e) {
          // Ignorer
        }
        
        throw new Error(errorMessage);
      }

      const data = (await response.json()) as OrdersResponse;
      console.log('✅ Données brutes:', data);
      console.log('✅ Commandes brutes:', data.orders?.length || 0);
      
      // 🔥🔥🔥 NETTOYAGE COMPLET DES DONNÉES 🔥🔥🔥
      const cleanOrders = Array.isArray(data.orders) 
        ? data.orders.map((order: any) => sanitizeOrder(order))
        : [];

      console.log('✅ Commandes nettoyées:', cleanOrders.length);
      
      cleanOrders.forEach((order: any, index: number) => {
        try {
          const testDate = new Date(order.created_at);
          if (isNaN(testDate.getTime())) {
            console.warn(`⚠️ Commande ${index} - Date invalide:`, order.created_at);
            order.created_at = new Date().toISOString();
          }
        } catch (e) {
          console.warn(`⚠️ Commande ${index} - Erreur date:`, e);
          order.created_at = new Date().toISOString();
        }
      });
      
      setOrders(cleanOrders);
      setError(null);
      setDebugInfo(`✅ ${cleanOrders.length} commandes chargées`);
      
      if (cleanOrders.length > 0) {
        localStorage.setItem('cachedOrders', JSON.stringify(cleanOrders));
      }
      
    } catch (error) {
      console.error('❌ Erreur chargement commandes:', error);
      const errorMessage = error instanceof Error ? error.message : 'Impossible de charger vos commandes. Veuillez réessayer.';
      setError(errorMessage);
      setDebugInfo(`❌ ${errorMessage}`);
      
      const cachedOrders = localStorage.getItem('cachedOrders');
      if (cachedOrders) {
        try {
          const parsed = JSON.parse(cachedOrders);
          if (parsed && parsed.length > 0) {
            const cleanCached = parsed.map((order: any) => sanitizeOrder(order));
            setOrders(cleanCached);
            setError('Données en cache - Connexion au serveur instable');
            setDebugInfo(`📦 ${cleanCached.length} commandes depuis le cache`);
          }
        } catch (e) {
          console.error('❌ Erreur parsing cache:', e);
        }
      }
      
    } finally {
      setLoading(false);
      if (isRefresh) {
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated]);

  // ============================================================
  // STATUT DES COMMANDES
  // ============================================================
  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string; icon: any }> = {
      'pending': { 
        label: 'En attente', 
        color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        icon: Clock
      },
      'confirmed': { 
        label: 'Confirmée', 
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: CheckCircle
      },
      'processing': { 
        label: 'En traitement', 
        color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        icon: Truck
      },
      'completed': { 
        label: 'Terminée', 
        color: 'bg-green-100 text-green-700 border-green-200',
        icon: FileCheck
      },
      'cancelled': { 
        label: 'Annulée', 
        color: 'bg-red-100 text-red-700 border-red-200',
        icon: XCircle
      },
      'refunded': { 
        label: 'Remboursée', 
        color: 'bg-gray-100 text-gray-700 border-gray-200',
        icon: XCircle
      }
    };
    const s = map[status] || map['pending'];
    const Icon = s.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${s.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {s.label}
      </span>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      'pending': { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
      'paid': { label: 'Payée', color: 'bg-green-100 text-green-700' },
      'failed': { label: 'Échouée', color: 'bg-red-100 text-red-700' },
      'refunded': { label: 'Remboursée', color: 'bg-gray-100 text-gray-700' }
    };
    const s = map[status] || map['pending'];
    return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>;
  };

  // ============================================================
  // GESTION DES ACTIONS
  // ============================================================
  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleDownload = (token: string) => {
    if (token) {
      window.open(`/api/download/${token}`, '_blank');
    }
  };

  // ============================================================
  // ÉTATS DE CHARGEMENT
  // ============================================================
  if (userLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement de vos commandes...</p>
          <p className="text-sm text-gray-400 mt-1">Préparation de votre espace</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // AFFICHAGE DES ERREURS
  // ============================================================
  if (error && orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Erreur de chargement</h2>
          <p className="text-gray-500 mt-2">{error}</p>
          
          {debugInfo && (
            <div className="mt-3 p-3 bg-gray-100 rounded-lg text-left">
              <p className="text-xs font-mono text-gray-600 break-all">
                <span className="font-bold">🔍 Debug:</span> {debugInfo}
              </p>
            </div>
          )}
          
          <div className="mt-6 space-y-3">
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchOrders();
              }}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Réessayer
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('cachedOrders');
                setError(null);
                setLoading(true);
                fetchOrders();
              }}
              className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
            >
              🗑️ Réessayer sans cache
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-white/30 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Retour</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-blue-600" />
              Mes commandes
            </h1>
            <span className="text-sm text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
              {orders.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchOrders(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition disabled:opacity-50 text-sm font-medium text-gray-700"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Chargement...' : 'Rafraîchir'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Statistiques rapides */}
        {orders.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total commandes', value: orders.length, icon: ShoppingBag, color: 'blue' },
              { label: 'Terminées', value: orders.filter(o => o.status === 'completed').length, icon: CheckCircle, color: 'green' },
              { label: 'En attente', value: orders.filter(o => o.status === 'pending').length, icon: Clock, color: 'yellow' },
              { label: 'Total dépensé', value: `${orders.reduce((sum, o) => sum + (o.total || 0), 0).toLocaleString()} FCFA`, icon: CreditCard, color: 'purple' },
            ].map((stat, index) => {
              const Icon = stat.icon;
              const colorMap = {
                blue: 'bg-blue-100 text-blue-600',
                green: 'bg-green-100 text-green-600',
                yellow: 'bg-yellow-100 text-yellow-600',
                purple: 'bg-purple-100 text-purple-600'
              };
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50"
                >
                  <div className={`inline-flex p-2 rounded-lg ${colorMap[stat.color as keyof typeof colorMap]}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-bold text-gray-900 mt-2">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Liste des commandes */}
        {orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 text-center border border-white/50"
          >
            <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <ShoppingBag className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">Aucune commande</h3>
            <p className="text-gray-500 mb-6">Vous n'avez pas encore passé de commande.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/products"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition font-medium"
              >
                Découvrir les produits
                <ChevronRight className="w-4 h-4 inline ml-1" />
              </Link>
              <Link
                href="/dashboard"
                className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
              >
                Retour au tableau de bord
              </Link>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, index) => (
              <motion.div
                key={order.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/50 hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Numéro de commande */}
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Commande</p>
                    <p className="font-bold text-gray-900 text-lg">#{order.order_number || 'N/A'}</p>
                  </div>

                  {/* Date */}
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Date</p>
                    <p className="text-sm text-gray-700">{formatDate(order.created_at)}</p>
                  </div>

                  {/* Total */}
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total</p>
                    <p className="font-bold text-gray-900 text-lg">{(order.total || 0).toLocaleString()} FCFA</p>
                  </div>

                  {/* Statut */}
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Statut</p>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(order.status || 'pending')}
                      {getPaymentStatusBadge(order.payment_status || 'pending')}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewOrder(order)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      Détails
                    </button>

                    {order.download_token && order.status === 'completed' && (
                      <button
                        onClick={() => handleDownload(order.download_token!)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition text-sm font-medium"
                      >
                        <Download className="w-4 h-4" />
                        Télécharger
                      </button>
                    )}
                  </div>
                </div>

                {/* Aperçu des articles */}
                {order.items && order.items.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200/50">
                    <div className="flex flex-wrap gap-3">
                      {order.items.slice(0, 3).map((item, idx) => (
                        <span key={idx} className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                          {item.product_title || 'Produit'} × {item.quantity || 1}
                        </span>
                      ))}
                      {order.items.length > 3 && (
                        <span className="text-sm text-gray-400">
                          +{order.items.length - 3} autres
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Footer avec infos utilisateur */}
        <div className="mt-8 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600">
              Connecté en tant que <span className="font-medium text-gray-900">{user?.email || 'Utilisateur'}</span>
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <Link href="/dashboard" className="hover:text-blue-600 transition flex items-center gap-1">
              <Home className="w-4 h-4" />
              Dashboard
            </Link>
            <Link href="/account" className="hover:text-blue-600 transition flex items-center gap-1">
              <User className="w-4 h-4" />
              Compte
            </Link>
          </div>
        </div>
      </div>

      {/* ============================================================
          MODAL DES DÉTAILS D'UNE COMMANDE
      ============================================================ */}
      <AnimatePresence>
        {showOrderDetails && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowOrderDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Commande #{selectedOrder.order_number || 'N/A'}
                  </h2>
                  <p className="text-sm text-gray-500">{formatDate(selectedOrder.created_at)}</p>
                </div>
                <button
                  onClick={() => setShowOrderDetails(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  ✕
                </button>
              </div>

              {/* Statuts */}
              <div className="flex flex-wrap gap-3 mb-6">
                {getStatusBadge(selectedOrder.status || 'pending')}
                {getPaymentStatusBadge(selectedOrder.payment_status || 'pending')}
              </div>

              {/* Articles */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Articles</h3>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div>
                          <p className="font-medium text-gray-900">{item.product_title || 'Produit'}</p>
                          <p className="text-sm text-gray-500">× {item.quantity || 1}</p>
                        </div>
                        <p className="font-bold text-gray-900">{((item.price || 0) * (item.quantity || 1)).toLocaleString()} FCFA</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Totaux */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Sous-total</span>
                  <span>{(selectedOrder.subtotal || 0).toLocaleString()} FCFA</span>
                </div>
                {(selectedOrder.shipping_cost || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Livraison</span>
                    <span>{(selectedOrder.shipping_cost || 0).toLocaleString()} FCFA</span>
                  </div>
                )}
                {(selectedOrder.tax || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Taxes</span>
                    <span>{(selectedOrder.tax || 0).toLocaleString()} FCFA</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span className="text-blue-600">{(selectedOrder.total || 0).toLocaleString()} FCFA</span>
                </div>
              </div>

              {/* Adresse de livraison */}
              {selectedOrder.shipping_address && (
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Adresse de livraison</h3>
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700">
                    <p>{selectedOrder.shipping_address.name || 'N/A'}</p>
                    <p>{selectedOrder.shipping_address.address || 'N/A'}</p>
                    <p>{selectedOrder.shipping_address.city || ''}, {selectedOrder.shipping_address.country || ''}</p>
                    <p>📞 {selectedOrder.shipping_address.phone || 'N/A'}</p>
                  </div>
                </div>
              )}

              {/* Téléchargement */}
              {selectedOrder.download_token && selectedOrder.status === 'completed' && (
                <div className="mt-6">
                  <button
                    onClick={() => handleDownload(selectedOrder.download_token!)}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium"
                  >
                    <Download className="w-5 h-5" />
                    Télécharger vos fichiers
                  </button>
                </div>
              )}

              {/* Bouton de fermeture */}
              <button
                onClick={() => setShowOrderDetails(false)}
                className="w-full mt-4 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
              >
                Fermer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}