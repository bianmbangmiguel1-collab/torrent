// app/admin/security/users/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { getDB } from '@/lib/db';
import Link from 'next/link';
import SecurityUsersTable from '@/components/admin/security/SecurityUsersTable';
import { getSecurityStats } from '@/lib/services/security';

export const metadata = {
  title: 'Sécurité utilisateurs | TorrentTwist Admin',
};

export default async function SecurityUsersPage() {
  await requireAdmin({
    cookies: cookies(),
    headers: { get: () => null },
  }).catch(() => redirect('/admin/login'));

  const db = await getDB();
  const stats = await getSecurityStats();

  // Récupérer tous les utilisateurs avec leur statut de sécurité
  const users = await db.all(
    `
    SELECT 
      u.id,
      u.name,
      u.email,
      u.phone,
      u.is_active,
      u.banned,
      u.banned_reason,
      u.banned_at,
      u.suspended,
      u.suspended_until,
      u.suspension_reason,
      u.created_at,
      b.name as banned_by_name,
      s.name as suspended_by_name
    FROM users u
    LEFT JOIN users b ON u.banned_by = b.id
    LEFT JOIN users s ON u.suspended_by = s.id
    ORDER BY u.banned DESC, u.suspended DESC, u.created_at DESC
    `
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🛡️ Sécurité utilisateurs</h1>
            <p className="text-gray-600 mt-1">Gérez les bans et suspensions des utilisateurs</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin/security"
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition"
            >
              ← Sécurité
            </Link>
            <Link
              href="/admin"
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition"
            >
              Tableau de bord
            </Link>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">Total utilisateurs</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-red-200">
            <p className="text-sm text-gray-500">Utilisateurs bannis</p>
            <p className="text-2xl font-bold text-red-600">{stats.banned}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-yellow-200">
            <p className="text-sm text-gray-500">Utilisateurs suspendus</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.suspended}</p>
          </div>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <SecurityUsersTable users={users} />
        </div>
      </div>
    </div>
  );
}