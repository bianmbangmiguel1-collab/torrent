'use client';

import { MessageCircle, Clock, Star, Award } from 'lucide-react';

interface DashboardStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  average: number;
  positive: number;
  neutral: number;
  negative: number;
  featured: number;
}

export default function AdminReviewDashboard({ stats }: { stats: DashboardStats }) {
  const cards = [
    {
      label: 'Total avis',
      value: stats.total,
      icon: MessageCircle,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'À modérer',
      value: stats.pending,
      icon: Clock,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      label: 'Moyenne',
      value: stats.average > 0 ? stats.average.toFixed(1) + ' ★' : '—',
      icon: Star,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      label: 'Mis en avant',
      value: stats.featured,
      icon: Award,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">{card.label}</p>
              <p className={`text-2xl font-bold text-gray-900 mt-1 ${card.color}`}>
                {card.value}
              </p>
            </div>
            <div className={`${card.bg} p-3 rounded-full`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}