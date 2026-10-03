// components/admin/newsletter/SubscribersWrapper.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Download, ArrowLeft } from 'lucide-react';
import SubscribersTable from './SubscribersTable';
import SubscribersFilters from './SubscribersFilters';

interface SubscribersWrapperProps {
  initialData: {
    subscribers: any[];
    total: number;
    totalPages: number;
    sources: string[];
    countries: string[];
    currentPage: number;
    search: string;
    status: string;
    source: string;
    country: string;
  };
}

export default function SubscribersWrapper({ initialData }: SubscribersWrapperProps) {
  const { 
    subscribers, 
    total, 
    totalPages, 
    sources, 
    countries,
    currentPage,
    search,
    status,
    source,
    country
  } = initialData;

  const stats = {
    total,
    active: subscribers.filter(s => s.status === 'active' && s.opt_in === 1).length,
    inactive: subscribers.filter(s => s.status === 'inactive' || s.opt_in === 0).length,
    sources: sources.length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/admin/newsletter" className="p-2 hover:bg-gray-100 rounded-lg transition">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">📧 Abonnés</h1>
                <p className="text-gray-600 text-sm">Gérez votre liste de diffusion</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link
              href="/admin/newsletter/subscribers/new"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" />
              Ajouter un abonné
            </Link>
            <button
              onClick={() => {
                const params = new URLSearchParams();
                if (status !== 'all') params.set('status', status);
                if (source !== 'all') params.set('source', source);
                if (country !== 'all') params.set('country', country);
                window.location.href = `/api/admin/newsletter/export?${params.toString()}`;
              }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              <Download className="w-4 h-4" />
              Exporter
            </button>
            <Link
              href="/admin"
              className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Tableau de bord
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total abonnés</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Actifs</p>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Inactifs</p>
            <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Sources</p>
            <p className="text-2xl font-bold text-blue-600">{stats.sources}</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <SubscribersFilters
            currentSearch={search}
            currentStatus={status}
            currentSource={source}
            currentCountry={country}
            sources={sources}
            countries={countries}
          />
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <SubscribersTable
            subscribers={subscribers}
            total={total}
            currentPage={currentPage}
            totalPages={totalPages}
          />
        </div>
      </div>
    </div>
  );
}