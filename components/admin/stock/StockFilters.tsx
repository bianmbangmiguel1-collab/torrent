'use client';

import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { CategoryStat } from '@/lib/stock/getCategoryStats';

interface StockFiltersProps {
  currentCategory: string;
  currentStatus: string;
  currentSearch: string;
  categories: CategoryStat[];
}

export default function StockFilters({
  currentCategory,
  currentStatus,
  currentSearch,
  categories,
}: StockFiltersProps) {
  const router = useRouter();
  const [search, setSearch] = useState(currentSearch);

  const buildUrl = (updates: Record<string, string>) => {
    const params = new URLSearchParams();
    const finalCategory = updates.category !== undefined ? updates.category : currentCategory;
    const finalStatus = updates.status !== undefined ? updates.status : currentStatus;
    const finalSearch = updates.search !== undefined ? updates.search : currentSearch;

    if (finalCategory !== 'all') params.set('category', finalCategory);
    if (finalStatus !== 'all') params.set('status', finalStatus);
    if (finalSearch) params.set('search', finalSearch);
    params.set('page', '1');

    return `/admin/stock?${params.toString()}`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(buildUrl({ search }));
  };

  const clearSearch = () => {
    setSearch('');
    router.push(buildUrl({ search: '' }));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Recherche */}
        <form onSubmit={handleSearch} className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit..."
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          {search && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Filtre catégorie */}
        <select
          value={currentCategory}
          onChange={(e) => router.push(buildUrl({ category: e.target.value }))}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">Toutes les catégories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.slug}>
              {cat.name} ({cat.product_count})
            </option>
          ))}
        </select>

        {/* Filtre statut */}
        <select
          value={currentStatus}
          onChange={(e) => router.push(buildUrl({ status: e.target.value }))}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">Tous les statuts</option>
          <option value="published">📗 Publiés</option>
          <option value="draft">📄 Brouillons</option>
          <option value="archived">📕 Archivés</option>
        </select>
      </div>
    </div>
  );
}