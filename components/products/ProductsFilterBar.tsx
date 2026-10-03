// components/products/ProductsFilterBar.tsx
'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useState } from 'react';

interface ProductsFilterBarProps {
  initialSearch: string;
  initialSort: string;
  categories: { id: number; name: string; slug: string }[];
  currentCategory: string;
  promoActive: boolean;
}

export default function ProductsFilterBar({
  initialSearch,
  initialSort,
  categories,
  currentCategory,
  promoActive,
}: ProductsFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState(initialSearch);

  // Construire une URL avec les paramètres actuels + modifications
  const buildUrl = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    return `${pathname}?${params.toString()}`;
  };

  // Gestion du tri
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sort = e.target.value;
    router.push(buildUrl({ sort, page: '1' }));
  };

  // Gestion de la recherche (soumission du formulaire)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(buildUrl({ search: searchInput || null, page: '1' }));
  };

  // Effacer la recherche
  const clearSearch = () => {
    setSearchInput('');
    router.push(buildUrl({ search: null, page: '1' }));
  };

  return (
    <div className="space-y-6 mb-8">
      {/* Barre de recherche */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <input
          type="text"
          name="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Rechercher un produit..."
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition bg-white shadow-sm"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        {searchInput && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <button type="submit" className="sr-only">Rechercher</button>
      </form>

      {/* Filtres et tri */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Catégories (liens, pas besoin de client) */}
          <a
            href={buildUrl({ category: 'all', page: '1', promo: null })}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              currentCategory === 'all' && !promoActive
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tous
          </a>
          {categories.map((cat) => (
            <a
              key={cat.id}
              href={buildUrl({ category: cat.slug, page: '1', promo: null })}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                currentCategory === cat.slug
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </a>
          ))}
          <a
            href={buildUrl({ promo: 'true', page: '1', category: null })}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              promoActive
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            En promotion
          </a>
        </div>

        {/* Tri */}
        <div className="flex items-center gap-3">
          <label htmlFor="sort" className="text-sm text-gray-600 sr-only sm:not-sr-only">
            Trier par
          </label>
          <select
            id="sort"
            defaultValue={initialSort}
            onChange={handleSortChange}
            className="px-4 py-2 rounded-xl border border-gray-300 bg-white text-sm text-gray-700 focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
          >
            <option value="default">Recommandés</option>
            <option value="newest">Plus récents</option>
            <option value="popular">Plus populaires</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
            <option value="rating">Meilleures notes</option>
            <option value="promo_desc">Meilleures promotions</option>
          </select>
        </div>
      </div>
    </div>
  );
}