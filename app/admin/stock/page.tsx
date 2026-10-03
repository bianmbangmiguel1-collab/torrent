// app/admin/stock/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { getStockStats } from '@/lib/stock/getStockStats';
import { getCategoryStats } from '@/lib/stock/getCategoryStats';
import { getStockProducts } from '@/lib/stock/getStockProducts';
import Link from 'next/link';
import StockStats from '@/components/admin/stock/StockStats';
import StockCategoryChart from '@/components/admin/stock/StockCategoryChart';
import StockAlerts from '@/components/admin/stock/StockAlerts';
import StockFilters from '@/components/admin/stock/StockFilters';
import StockProductTable from '@/components/admin/stock/StockProductTable';

export const metadata = {
  title: 'Gestion du stock | TorrentTwist Admin',
};

export default async function AdminStockPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}) {
  // ✅ Vérification admin unifiée via requireAdmin()
  await requireAdmin({
    cookies: cookies(),
    headers: {
      get: () => null,
    },
  });

  // Résolution de searchParams (compatible Next.js 15+)
  const params = searchParams instanceof Promise ? await searchParams : searchParams;

  const category = (params.category as string) || 'all';
  const status = (params.status as string) || 'all';
  const search = (params.search as string) || '';
  const page = Math.max(1, Number(params.page) || 1);

  // Récupération des données
  const stats = await getStockStats(category);
  const categoryStats = await getCategoryStats();
  const { products, total } = await getStockProducts({
    category,
    status,
    search,
    page,
    limit: 20,
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête avec bouton Tableau de bord */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📦 Gestion du catalogue</h1>
            <p className="text-gray-600 mt-1">Surveillance des produits en temps réel</p>
          </div>

          <Link
            href="/admin"
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition"
          >
            Tableau de bord
          </Link>
        </div>

        {/* Statistiques */}
        <StockStats stats={stats} />

        {/* Alertes */}
        <StockAlerts stats={stats} categoryStats={categoryStats} />

        {/* Graphique par catégorie */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <StockCategoryChart data={categoryStats} />
          </div>
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Résumé rapide</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total produits</span>
                  <span className="font-bold text-gray-900">{stats.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Publiés</span>
                  <span className="font-bold text-green-600">{stats.published}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Brouillons</span>
                  <span className="font-bold text-orange-600">{stats.draft}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Archivés</span>
                  <span className="font-bold text-red-600">{stats.archived}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Catégories actives</span>
                  <span className="font-bold text-blue-600">{categoryStats.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres et tableau */}
        <StockFilters
          currentCategory={category}
          currentStatus={status}
          currentSearch={search}
          categories={categoryStats}
        />

        <StockProductTable
          products={products}
          total={total}
          currentPage={page}
          limit={20}
          category={category}
          status={status}
          search={search}
        />
      </div>
    </div>
  );
}