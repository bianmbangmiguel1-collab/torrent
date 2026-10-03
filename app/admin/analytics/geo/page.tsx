// app/admin/analytics/geo/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import Link from 'next/link';
import GeoDashboard from '@/components/admin/analytics/GeoDashboard';

export const metadata = {
  title: 'Analyse géographique | TorrentTwist Admin',
};

export default async function GeoAnalyticsPage() {
  await requireAdmin({
    cookies: cookies(),
    headers: { get: () => null },
  }).catch(() => redirect('/admin/login'));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🌍 Analyse géographique</h1>
            <p className="text-gray-600 mt-1">Visualisez la répartition de vos utilisateurs par pays</p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition"
          >
            Tableau de bord
          </Link>
        </div>

        <GeoDashboard />
      </div>
    </div>
  );
}