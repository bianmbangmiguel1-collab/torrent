'use client';
import { Users, UserPlus, CheckCircle, Shield } from 'lucide-react';

export default function UserStats({ stats }: { stats: { total: number; new: number; active: number; admins: number } }) {
  const cards = [
    { label: 'Total', value: stats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Nouveaux (30j)', value: stats.new, icon: UserPlus, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Actifs', value: stats.active, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Administrateurs', value: stats.admins, icon: Shield, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {cards.map((c, i) => (
        <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">{c.label}</p>
              <p className={`text-2xl font-bold text-gray-900 mt-1 ${c.color}`}>{c.value}</p>
            </div>
            <div className={`${c.bg} p-3 rounded-full`}>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}