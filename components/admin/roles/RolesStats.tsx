'use client';
import { Shield, Users } from 'lucide-react';

export default function RolesStats({ stats }: { stats: { total: number; users: number } }) {
  const cards = [
    { label: 'Rôles', value: stats.total, icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Utilisateurs avec rôle', value: stats.users, icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 mb-8">
      {cards.map((c, i) => (
        <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
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