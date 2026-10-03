'use client';

import { Package, FileText, Archive, ImageOff, Percent, Sparkles } from 'lucide-react';
import { StockStats as StatsType } from '@/lib/stock/getStockStats';

interface StockStatsProps {
  stats: StatsType;
}

export default function StockStats({ stats }: StockStatsProps) {
  const cards = [
    {
      label: 'Total produits',
      value: stats.total,
      icon: Package,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Publiés',
      value: stats.published,
      icon: FileText,
      color: 'bg-green-50 text-green-600',
    },
    {
      label: 'Brouillons',
      value: stats.draft,
      icon: FileText,
      color: 'bg-orange-50 text-orange-600',
    },
    {
      label: 'Archivés',
      value: stats.archived,
      icon: Archive,
      color: 'bg-red-50 text-red-600',
    },
    {
      label: 'Sans image',
      value: stats.withoutImage,
      icon: ImageOff,
      color: 'bg-yellow-50 text-yellow-600',
    },
    {
      label: 'En promotion',
      value: stats.withPromotion,
      icon: Percent,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      label: 'Nouveautés (7j)',
      value: stats.recent,
      icon: Sparkles,
      color: 'bg-indigo-50 text-indigo-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${card.color}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}