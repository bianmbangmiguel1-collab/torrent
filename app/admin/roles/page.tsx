// app/admin/roles/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { getRoles } from '@/lib/services/roles';
import Link from 'next/link';
import RolesTable from '@/components/admin/roles/RolesTable';
import RolesStats from '@/components/admin/roles/RolesStats';
import RolesHeaderActions from '@/components/admin/roles/RolesHeaderActions';

export const metadata = {
  title: 'Gestion des rôles | TorrentTwist Admin',
};

export default async function AdminRolesPage() {
  await requireAdmin({
    cookies: cookies(),
    headers: { get: () => null },
  }).catch(() => redirect('/admin/login'));

  const roles = await getRoles();

  const stats = {
    total: roles.length,
    users: roles.reduce((acc, r) => acc + (r as any).users_count, 0),
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🔐 Gestion des rôles</h1>
            <p className="text-gray-600 mt-1">Définissez les permissions pour chaque type d'utilisateur.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin" className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition">
              Tableau de bord
            </Link>
            <RolesHeaderActions />
          </div>
        </div>

        <RolesStats stats={stats} />

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <RolesTable roles={roles} />
        </div>
      </div>
    </div>
  );
}