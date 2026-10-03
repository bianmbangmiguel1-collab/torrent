// components/admin/newsletter/SubscribersFilters.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useState } from 'react';

interface SubscribersFiltersProps {
  currentSearch: string;
  currentStatus: string;
  currentSource: string;
  currentCountry: string;
  sources: string[];
  countries: string[];
}

export default function SubscribersFilters({
  currentSearch,
  currentStatus,
  currentSource,
  currentCountry,
  sources,
  countries,
}: SubscribersFiltersProps) {
  const router = useRouter();
  const [search, setSearch] = useState(currentSearch);

  const buildUrl = (updates: Record<string, string>) => {
    const params = new URLSearchParams();
    const finalSearch = updates.search !== undefined ? updates.search : currentSearch;
    const finalStatus = updates.status !== undefined ? updates.status : currentStatus;
    const finalSource = updates.source !== undefined ? updates.source : currentSource;
    const finalCountry = updates.country !== undefined ? updates.country : currentCountry;

    if (finalSearch) params.set('search', finalSearch);
    if (finalStatus && finalStatus !== 'all') params.set('status', finalStatus);
    if (finalSource && finalSource !== 'all') params.set('source', finalSource);
    if (finalCountry && finalCountry !== 'all') params.set('country', finalCountry);
    params.set('page', '1');
    return `/admin/newsletter/subscribers?${params.toString()}`;
  };

  return (
    <div className="flex flex-wrap gap-3">
      {/* Recherche */}
      <form
        onSubmit={(e) => { e.preventDefault(); router.push(buildUrl({ search })); }}
        className="flex-1 min-w-[200px] relative"
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par email, nom, téléphone..."
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(''); router.push(buildUrl({ search: '' })); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {/* Statut */}
      <select
        value={currentStatus}
        onChange={(e) => router.push(buildUrl({ status: e.target.value }))}
        className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="all">Tous les statuts</option>
        <option value="active">✅ Actifs</option>
        <option value="inactive">❌ Inactifs</option>
      </select>

      {/* Source */}
      <select
        value={currentSource}
        onChange={(e) => router.push(buildUrl({ source: e.target.value }))}
        className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="all">Toutes les sources</option>
        {sources.map((source) => (
          <option key={source} value={source}>
            {source}
          </option>
        ))}
      </select>

      {/* Pays */}
      {countries.length > 0 && (
        <select
          value={currentCountry}
          onChange={(e) => router.push(buildUrl({ country: e.target.value }))}
          className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Tous les pays</option>
          {countries.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}