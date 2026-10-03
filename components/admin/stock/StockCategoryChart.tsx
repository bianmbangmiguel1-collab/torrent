'use client';

import { CategoryStat } from '@/lib/stock/getCategoryStats';

interface StockCategoryChartProps {
  data: CategoryStat[];
}

export default function StockCategoryChart({ data }: StockCategoryChartProps) {
  const maxCount = Math.max(...data.map((d) => d.product_count), 1);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Produits par catégorie</h3>
      <div className="space-y-3">
        {data.length === 0 ? (
          <p className="text-gray-400 text-sm">Aucune catégorie</p>
        ) : (
          data.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700 w-32 truncate">
                {cat.name}
              </span>
              <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${(cat.product_count / maxCount) * 100}%` }}
                />
              </div>
              <span className="text-sm font-bold text-gray-700 min-w-[30px] text-right">
                {cat.product_count}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}