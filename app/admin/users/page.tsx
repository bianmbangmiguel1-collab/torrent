// app/admin/users/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { getUsers } from '@/lib/services/users';
import { getDB } from '@/lib/db';
import Link from 'next/link';
import UserStats from '@/components/admin/users/UserStats';
import UserFilters from '@/components/admin/users/UserFilters';
import UserTable from '@/components/admin/users/UserTable';
import UserHeaderActions from '@/components/admin/users/UserHeaderActions';

export const metadata = {
  title: 'Gestion des utilisateurs | TorrentTwist Admin',
};

interface SearchParams {
  search?: string;
  role?: 'admin' | 'user' | 'all';
  status?: 'active' | 'inactive' | 'all';
  country?: string;
  page?: string;
  limit?: string;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams> | SearchParams;
}) {
  await requireAdmin({
    cookies: cookies(),
    headers: { get: () => null },
  }).catch(() => redirect('/admin/login'));

  const params = searchParams instanceof Promise ? await searchParams : searchParams;

  const search = params.search || '';
  const role = params.role || 'all';
  const status = params.status || 'all';
  const country = params.country || 'all';
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));

  // ✅ Récupération des utilisateurs avec le filtre pays
  const { users, total, totalPages } = await getUsers({ search, role, status, country, page, limit });

  const db = await getDB();
  const stats = {
    total: (await db.get('SELECT COUNT(*) as count FROM users'))?.count || 0,
    new: (await db.get('SELECT COUNT(*) as count FROM users WHERE created_at >= datetime("now", "-30 days")'))?.count || 0,
    active: (await db.get('SELECT COUNT(*) as count FROM users WHERE is_active = 1'))?.count || 0,
    admins: (await db.get('SELECT COUNT(*) as count FROM users WHERE is_admin = 1'))?.count || 0,
  };

  // ✅ Récupération de la liste des pays directement depuis la base
  let countries: string[] = [];
  try {
    const countriesRows = await db.all<{ country: string }>(
      'SELECT DISTINCT country FROM users WHERE country IS NOT NULL AND country != "" ORDER BY country'
    );
    countries = countriesRows.map(row => row.country);
  } catch (error) {
    console.warn('⚠️ Impossible de récupérer la liste des pays:', error);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">👥 Gestion des utilisateurs</h1>
            <p className="text-gray-600 mt-1">Gérez les comptes utilisateurs de TorrentTwist.</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin"
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition"
            >
              Tableau de bord
            </Link>
            <UserHeaderActions />
          </div>
        </div>

        <UserStats stats={stats} />

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <UserFilters
              currentSearch={search}
              currentRole={role}
              currentStatus={status}
              currentCountry={country}
              countries={countries}
            />
          </div>
          <UserTable users={users} total={total} currentPage={page} totalPages={totalPages} />
        </div>
      </div>
    </div>
  );
}