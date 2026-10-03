'use client';

import { AlertTriangle, Eye } from 'lucide-react';
import { StockStats } from '@/lib/stock/getStockStats';
import { CategoryStat } from '@/lib/stock/getCategoryStats';
import Link from 'next/link';

interface StockAlertsProps {
  stats: StockStats;
  categoryStats: CategoryStat[];
}

export default function StockAlerts({ stats, categoryStats }: StockAlertsProps) {
  const alerts = [];

  if (stats.withoutImage > 0) {
    alerts.push({
      type: 'warning',
      message: `${stats.withoutImage} produit(s) publié(s) n'ont aucune image.`,
      link: '/admin/stock?withoutImage=true',
    });
  }

  const emptyCategories = categoryStats.filter((c) => c.product_count === 0);
  if (emptyCategories.length > 0) {
    alerts.push({
      type: 'danger',
      message: `${emptyCategories.length} catégorie(s) ne contiennent aucun produit.`,
      link: '/admin/categories',
    });
  }

  if (stats.draft > 10) {
    alerts.push({
      type: 'info',
      message: `${stats.draft} brouillons en attente de publication.`,
      link: '/admin/stock?status=draft',
    });
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8 text-green-700 text-sm">
        ✅ Tout est en ordre ! Aucune alerte.
      </div>
    );
  }

  return (
    <div className="space-y-3 mb-8">
      {alerts.map((alert, index) => (
        <div
          key={index}
          className={`
            flex items-center justify-between p-4 rounded-xl border
            ${alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : ''}
            ${alert.type === 'danger' ? 'bg-red-50 border-red-200 text-red-700' : ''}
            ${alert.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-700' : ''}
          `}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{alert.message}</span>
          </div>
          <Link
            href={alert.link}
            className="text-sm font-medium hover:underline flex items-center gap-1"
          >
            <Eye className="w-4 h-4" />
            Voir
          </Link>
        </div>
      ))}
    </div>
  );
}