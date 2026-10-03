// app/admin/users/[id]/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { getUserById, getActiveSessions, getLastPurchase, getUserSegmentation } from '@/lib/services/users';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Shield,
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  ShoppingBag,
  Star,
  Heart,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Globe,
  Smartphone,
  Clock,
  MessageCircle,
  Lock,
  Key,
  Edit,
  Trash2,
} from 'lucide-react';
import { getFlagEmoji } from '@/lib/geo';

export const metadata = {
  title: 'Détails de l\'utilisateur | TorrentTwist Admin',
};

interface Props {
  params: Promise<{ id: string }> | { id: string };
}

export default async function UserDetailPage({ params }: Props) {
  await requireAdmin({
    cookies: cookies(),
    headers: { get: () => null },
  }).catch(() => redirect('/admin/login'));

  const resolvedParams = params instanceof Promise ? await params : params;
  const userId = Number(resolvedParams.id);

  if (isNaN(userId) || userId <= 0) {
    notFound();
  }

  const db = await getDB();

  // Récupérer l'utilisateur
  const user = await getUserById(userId);
  if (!user) {
    notFound();
  }

  // Récupérer les statistiques
  const stats = await db.get<{
    total_spent: number;
    orders_count: number;
    last_order_date: string;
  }>(
    `SELECT 
       COALESCE(SUM(total), 0) as total_spent,
       COUNT(*) as orders_count,
       MAX(created_at) as last_order_date
     FROM orders
     WHERE user_id = ? AND status = 'completed'`,
    [userId]
  );

  // Récupérer les commandes
  const orders = await db.all(
    `
    SELECT 
      id,
      order_number,
      total,
      status,
      created_at,
      payment_status
    FROM orders
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 10
    `,
    [userId]
  );

  // Récupérer les sessions actives
  const sessions = await getActiveSessions(userId);

  // Récupérer le dernier achat
  const lastPurchase = await getLastPurchase(userId);

  // Récupérer la segmentation
  const segments = await getUserSegmentation(userId);

  // Récupérer les favoris
  const favorites = await db.all(
    `
    SELECT p.id, p.title, p.price, p.slug
    FROM user_favorites f
    JOIN products p ON f.product_id = p.id
    WHERE f.user_id = ?
    LIMIT 5
    `,
    [userId]
  );

  // Récupérer l'historique des modifications
  const profileLogs = await db.all(
    `
    SELECT * FROM user_profile_logs
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 10
    `,
    [userId]
  );

  // Récupérer les alertes de sécurité
  const securityAlerts = await db.all(
    `
    SELECT * FROM admin_activity_logs
    WHERE user_id = ? AND action LIKE 'connexion_inhabituelle%'
    ORDER BY created_at DESC
    LIMIT 5
    `,
    [userId]
  );

  // Calculer la date d'inscription
  const joinDate = user.created_at ? new Date(user.created_at) : null;
  const memberSince = joinDate ? joinDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }) : 'Inconnue';

  const totalSpent = stats?.total_spent || 0;
  const ordersCount = stats?.orders_count || 0;
  const lastOrderDate = stats?.last_order_date;

  // Niveau VIP
  let vipLevel = user.vip_level || 'standard';
  const vipLevels: Record<string, { label: string; color: string; icon: JSX.Element }> = {
    standard: { label: 'Standard', color: 'text-gray-600 bg-gray-100', icon: <UserIcon className="w-4 h-4" /> },
    pro: { label: '⭐ Pro', color: 'text-blue-600 bg-blue-100', icon: <Star className="w-4 h-4" /> },
    vip: { label: '⭐ VIP', color: 'text-purple-600 bg-purple-100', icon: <Star className="w-4 h-4" /> },
    premium: { label: '⭐ Premium', color: 'text-yellow-600 bg-yellow-100', icon: <Star className="w-4 h-4" /> },
  };
  const vipInfo = vipLevels[vipLevel] || vipLevels.standard;

  // Statut de sécurité
  const isVerified = user.is_verified === 1;
  const hasPhone = !!user.phone;
  const hasSuspicious = securityAlerts.length > 0;

  // Score de sécurité (simplifié)
  const securityScore = (isVerified ? 40 : 0) + (hasPhone ? 30 : 0) + (user.is_active ? 20 : 0) - (hasSuspicious ? 30 : 0);
  const securityLevel = securityScore >= 80 ? 'Élevé' : securityScore >= 50 ? 'Moyen' : 'Faible';
  const securityColor = securityScore >= 80 ? 'text-green-600' : securityScore >= 50 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/users"
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Fiche utilisateur</h1>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/admin/users/${user.id}/edit`}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Edit className="w-4 h-4" />
              Modifier
            </Link>
            <Link
              href="/admin"
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition"
            >
              Tableau de bord
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne gauche - Informations personnelles */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profil */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-600">
                  {user.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-500">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {user.country && (
                      <span className="text-sm text-gray-600 flex items-center gap-1">
                        <span>{getFlagEmoji(user.country)}</span> {user.country}
                        {user.city && ` • ${user.city}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Statut</span>
                  <span className={user.is_active ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                    {user.is_active ? '✅ Actif' : '❌ Inactif'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Rôle</span>
                  <span className={user.is_admin ? 'text-purple-600 font-medium' : 'text-gray-600'}>
                    {user.is_admin ? '👑 Administrateur' : '👤 Utilisateur'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Téléphone</span>
                  <span className="text-gray-800">{user.phone || '-'}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Membre depuis</span>
                  <span className="text-gray-800">{memberSince}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-500">Niveau</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${vipInfo.color}`}>
                    {vipInfo.icon} {vipInfo.label}
                  </span>
                </div>
              </div>

              {user.phone && (
                <a
                  href={`https://wa.me/${user.phone.replace(/[^0-9+]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  Contacter sur WhatsApp
                </a>
              )}
            </div>

            {/* Sécurité */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Sécurité
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Score</span>
                  <span className={`font-medium ${securityColor}`}>
                    {securityScore}% - {securityLevel}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Email vérifié</span>
                  {isVerified ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Téléphone</span>
                  {hasPhone ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Connexions suspectes</span>
                  {hasSuspicious ? (
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </div>
              </div>
            </div>

            {/* Sessions actives */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4" /> Sessions actives
              </h3>
              {sessions.length === 0 ? (
                <p className="text-sm text-gray-500">Aucune session active</p>
              ) : (
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div key={session.id} className="text-sm p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-gray-400" />
                        <span>{session.device_type || 'Inconnu'}</span>
                        <span className="text-gray-400">•</span>
                        <span>{session.browser || 'Inconnu'}</span>
                        <span className="text-gray-400">•</span>
                        <span>{session.os || 'Inconnu'}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {session.created_at ? new Date(session.created_at).toLocaleString() : 'Inconnue'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Colonne droite - Statistiques et activités */}
          <div className="lg:col-span-2 space-y-6">
            {/* Statistiques */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-4">📊 Statistiques</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <DollarSign className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-900">
                    {totalSpent.toLocaleString()} FCFA
                  </p>
                  <p className="text-xs text-gray-500">Total dépensé</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <ShoppingBag className="w-5 h-5 text-green-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-900">{ordersCount}</p>
                  <p className="text-xs text-gray-500">Commandes</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg text-center">
                  <Heart className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-900">{favorites.length}</p>
                  <p className="text-xs text-gray-500">Favoris</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg text-center col-span-1">
                  <Star className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-900">
                    {ordersCount > 0 ? (totalSpent / ordersCount).toFixed(0) : 0} FCFA
                  </p>
                  <p className="text-xs text-gray-500">Panier moyen</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg text-center col-span-1">
                  <Calendar className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                  <p className="text-sm font-bold text-gray-900">
                    {lastOrderDate ? new Date(lastOrderDate).toLocaleDateString('fr-FR') : '-'}
                  </p>
                  <p className="text-xs text-gray-500">Dernier achat</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg text-center col-span-1">
                  <UserIcon className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
                  <p className="text-sm font-bold text-gray-900">
                    {segments?.map(s => {
                      const labels: Record<string, string> = {
                        vip: '⭐ VIP',
                        regular: '🔄 Régulier',
                        new: '🆕 Nouveau',
                        inactive: '💤 Inactif',
                      };
                      return labels[s] || s;
                    }).join(', ') || 'Standard'}
                  </p>
                  <p className="text-xs text-gray-500">Segmentation</p>
                </div>
              </div>
            </div>

            {/* Dernières commandes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-4">🛒 Dernières commandes</h3>
              {orders.length === 0 ? (
                <p className="text-sm text-gray-500">Aucune commande</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Commande</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {orders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900">{order.order_number}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs">
                            {new Date(order.created_at).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-900">
                            {order.total.toLocaleString()} FCFA
                          </td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              order.status === 'completed' ? 'bg-green-100 text-green-700' :
                              order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {order.status === 'completed' ? '✅ Payée' :
                               order.status === 'pending' ? '⏳ En attente' :
                               '❌ Annulée'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Dernier achat */}
            {lastPurchase && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-800 mb-2">📦 Dernier achat</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{lastPurchase.product_title}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(lastPurchase.order_date).toLocaleDateString('fr-FR')} • {lastPurchase.amount.toLocaleString()} FCFA
                    </p>
                  </div>
                  <Link
                    href={`/product/${lastPurchase.product_slug}`}
                    target="_blank"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Voir le produit →
                  </Link>
                </div>
              </div>
            )}

            {/* Favoris */}
            {favorites.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-800 mb-3">❤️ Favoris</h3>
                <div className="flex flex-wrap gap-2">
                  {favorites.map((fav) => (
                    <Link
                      key={fav.id}
                      href={`/product/${fav.slug}`}
                      target="_blank"
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition"
                    >
                      {fav.title} ({fav.price.toLocaleString()} FCFA)
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Historique des modifications */}
            {profileLogs.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-800 mb-3">📋 Historique des modifications</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {profileLogs.map((log) => (
                    <div key={log.id} className="text-sm p-2 bg-gray-50 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-700">{log.field}</span>
                        <span className="text-gray-500">: {log.old_value || 'vide'} → {log.new_value || 'vide'}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(log.created_at).toLocaleString('fr-FR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alertes de sécurité */}
            {securityAlerts.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-yellow-200 p-6">
                <h3 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Alertes de sécurité
                </h3>
                <div className="space-y-2">
                  {securityAlerts.map((alert) => (
                    <div key={alert.id} className="text-sm p-2 bg-yellow-50 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="font-medium text-yellow-700">{alert.action}</span>
                        {alert.details && (
                          <span className="text-yellow-600 text-xs ml-2">
                            {(() => {
                              try {
                                const details = JSON.parse(alert.details);
                                return details.new_country ? `Pays: ${details.new_country}` : '';
                              } catch { return ''; }
                            })()}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-yellow-500">
                        {new Date(alert.created_at).toLocaleString('fr-FR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}