'use client';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useState } from 'react';

interface UserFiltersProps {
  currentSearch: string;
  currentRole: string;
  currentStatus: string;
  currentCountry?: string;
  countries: string[];
}

export default function UserFilters({ 
  currentSearch, 
  currentRole, 
  currentStatus,
  currentCountry = 'all',
  countries 
}: UserFiltersProps) {
  const router = useRouter();
  const [search, setSearch] = useState(currentSearch);

  const buildUrl = (updates: Record<string, string>) => {
    const params = new URLSearchParams();
    const finalSearch = updates.search !== undefined ? updates.search : currentSearch;
    const finalRole = updates.role !== undefined ? updates.role : currentRole;
    const finalStatus = updates.status !== undefined ? updates.status : currentStatus;
    const finalCountry = updates.country !== undefined ? updates.country : currentCountry;

    if (finalSearch) params.set('search', finalSearch);
    if (finalRole && finalRole !== 'all') params.set('role', finalRole);
    if (finalStatus && finalStatus !== 'all') params.set('status', finalStatus);
    if (finalCountry && finalCountry !== 'all') params.set('country', finalCountry);
    params.set('page', '1');
    return `/admin/users?${params.toString()}`;
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
          placeholder="Rechercher par nom ou email..." 
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

      {/* Filtre rôle */}
      <select 
        value={currentRole} 
        onChange={(e) => router.push(buildUrl({ role: e.target.value }))} 
        className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="all">Tous les rôles</option>
        <option value="admin">Administrateurs</option>
        <option value="user">Utilisateurs</option>
      </select>

      {/* Filtre statut */}
      <select 
        value={currentStatus} 
        onChange={(e) => router.push(buildUrl({ status: e.target.value }))} 
        className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="all">Tous les statuts</option>
        <option value="active">Actifs</option>
        <option value="inactive">Inactifs</option>
      </select>

      {/* ✅ Filtre pays */}
      <select 
        value={currentCountry} 
        onChange={(e) => router.push(buildUrl({ country: e.target.value }))} 
        className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[150px]"
      >
        <option value="all">🌍 Tous les pays</option>
        {countries.map((country) => (
          <option key={country} value={country}>
            {country}
          </option>
        ))}
      </select>
    </div>
  );
}