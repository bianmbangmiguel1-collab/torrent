'use client';

import { useRouter } from 'next/navigation';
import { Search, X, Filter, Star, Package } from 'lucide-react';
import { useState } from 'react';

interface AdminReviewFiltersProps {
  currentStatus: string;
  currentRating: string;
  currentProductId: string;
  currentSearch: string;
  products: { id: number; title: string }[];
}

export default function AdminReviewFilters({
  currentStatus,
  currentRating,
  currentProductId,
  currentSearch,
  products,
}: AdminReviewFiltersProps) {
  const router = useRouter();
  const [search, setSearch] = useState(currentSearch);

  const buildUrl = (updates: Record<string, string>) => {
    const params = new URLSearchParams();

    const finalStatus = updates.status !== undefined ? updates.status : currentStatus;
    const finalRating = updates.rating !== undefined ? updates.rating : currentRating;
    const finalProductId = updates.productId !== undefined ? updates.productId : currentProductId;
    const finalSearch = updates.search !== undefined ? updates.search : currentSearch;

    if (finalStatus !== 'all') params.set('status', finalStatus);
    if (finalRating && finalRating !== 'all') params.set('rating', finalRating);
    if (finalProductId && finalProductId !== 'all') params.set('productId', finalProductId);
    if (finalSearch) params.set('search', finalSearch);

    params.set('page', '1');
    return `/admin/reviews?${params.toString()}`;
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
      <div className="flex flex-wrap gap-4 items-center">
        {/* Champ de recherche */}
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px] relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un avis..."
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

        {/* Filtre statut */}
        <select
          value={currentStatus}
          onChange={(e) => router.push(buildUrl({ status: e.target.value }))}
          className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">📋 Tous les statuts</option>
          <option value="pending">⏳ En attente</option>
          <option value="approved">✅ Approuvés</option>
          <option value="rejected">❌ Rejetés</option>
        </select>

        {/* Filtre note */}
        <select
          value={currentRating}
          onChange={(e) => router.push(buildUrl({ rating: e.target.value }))}
          className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">⭐ Toutes notes</option>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>
              {'★'.repeat(r)}
            </option>
          ))}
        </select>

        {/* Filtre produit */}
        <select
          value={currentProductId}
          onChange={(e) => router.push(buildUrl({ productId: e.target.value }))}
          className="px-4 py-2 border border-gray-300 rounded-lg bg-white min-w-[180px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">📦 Tous les produits</option>
          {products.map((product) => (
            <option key={product.id} value={String(product.id)}>
              {product.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}