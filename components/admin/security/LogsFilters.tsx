// components/admin/security/LogsFilters.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useState, useEffect } from 'react';

interface LogsFiltersProps {
  currentSearch: string;
  currentAction: string;
  currentLimit: number;
  actions: string[];
}

export default function LogsFilters({
  currentSearch,
  currentAction,
  currentLimit,
  actions,
}: LogsFiltersProps) {
  const router = useRouter();
  const [search, setSearch] = useState(currentSearch);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const buildUrl = (updates: Record<string, string | number>) => {
    const params = new URLSearchParams();
    const finalSearch = updates.search !== undefined ? updates.search : currentSearch;
    const finalAction = updates.action !== undefined ? updates.action : currentAction;
    const finalLimit = updates.limit !== undefined ? updates.limit : currentLimit;

    if (finalSearch) params.set('search', String(finalSearch));
    if (finalAction && finalAction !== 'all') params.set('action', String(finalAction));
    if (finalLimit !== 20) params.set('limit', String(finalLimit));
    params.set('page', '1');
    return `/admin/security/logs?${params.toString()}`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(buildUrl({ search }));
  };

  const handleActionChange = (value: string) => {
    router.push(buildUrl({ action: value }));
  };

  const handleLimitChange = (value: string) => {
    router.push(buildUrl({ limit: Number(value) }));
  };

  if (!mounted) {
    return (
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <div className="w-full h-10 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="w-40 h-10 bg-gray-200 rounded-lg animate-pulse" />
        <div className="w-40 h-10 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-4 items-center">
      <form onSubmit={handleSearch} className="flex-1 min-w-[200px] relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, email, action..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      </form>

      <select
        value={currentAction}
        onChange={(e) => handleActionChange(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="all">Toutes les actions</option>
        {actions.map((action) => (
          <option key={action} value={action}>
            {action}
          </option>
        ))}
      </select>

      <select
        value={currentLimit}
        onChange={(e) => handleLimitChange(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="10">10 par page</option>
        <option value="20">20 par page</option>
        <option value="50">50 par page</option>
        <option value="100">100 par page</option>
      </select>
    </div>
  );
}