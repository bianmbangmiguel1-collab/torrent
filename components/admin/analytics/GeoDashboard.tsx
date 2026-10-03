// components/admin/analytics/GeoDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { Globe, Users, ShoppingBag, DollarSign, TrendingUp } from 'lucide-react';

interface CountryStat {
  country: string;
  users: number;
  orders: number;
  revenue: number;
  completed_orders: number;
  completed_revenue: number;
  avg_order_value: number;
}

interface GeoData {
  countries: CountryStat[];
  totals: {
    users: number;
    orders: number;
    revenue: number;
  };
  topCountries: CountryStat[];
}

interface GeoApiResponse {
  data?: GeoData;
  error?: string;
}

export default function GeoDashboard() {
  const [data, setData] = useState<GeoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/admin/analytics/geo', {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Erreur de chargement');
        const json = (await res.json()) as GeoApiResponse;
        setData(json.data ?? null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-2 text-gray-500">Chargement des données...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        Erreur : {error}
      </div>
    );
  }

  if (!data || data.countries.length === 0) {
    return (
      <div className="text-center py-12">
        <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Aucune donnée géographique disponible</p>
        <p className="text-sm text-gray-400">Les utilisateurs doivent avoir un pays renseigné</p>
      </div>
    );
  }

  const { countries, totals, topCountries } = data;

  return (
    <div className="space-y-6">
      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total utilisateurs</p>
              <p className="text-2xl font-bold text-gray-900">{totals.users}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Commandes</p>
              <p className="text-2xl font-bold text-gray-900">{totals.orders}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <ShoppingBag className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">CA total</p>
              <p className="text-2xl font-bold text-gray-900">
                {totals.revenue.toLocaleString()} FCFA
              </p>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pays actifs</p>
              <p className="text-2xl font-bold text-gray-900">{countries.length}</p>
            </div>
            <div className="p-2 bg-orange-100 rounded-lg">
              <Globe className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Top pays */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">🌍 Répartition par pays</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Pays</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Utilisateurs</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Commandes</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">CA</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Panier moyen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {countries.map((country) => (
                <tr key={country.country} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {country.country}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{country.users}</td>
                  <td className="px-4 py-3 text-gray-600">{country.orders}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {country.revenue.toLocaleString()} FCFA
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {country.avg_order_value ? country.avg_order_value.toLocaleString() : '-'} FCFA
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}