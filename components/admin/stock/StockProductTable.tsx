'use client';

import Link from 'next/link';
import { Eye, Edit, MoreVertical, CheckCircle, XCircle } from 'lucide-react';
import { StockProduct } from '@/lib/stock/getStockProducts';
import Image from 'next/image';

interface StockProductTableProps {
  products: StockProduct[];
  total: number;
  currentPage: number;
  limit: number;
  category: string;
  status: string;
  search: string;
}

export default function StockProductTable({
  products,
  total,
  currentPage,
  limit,
  category,
  status,
  search,
}: StockProductTableProps) {
  const totalPages = Math.ceil(total / limit);

  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    if (status !== 'all') params.set('status', status);
    if (search) params.set('search', search);
    params.set('page', String(page));
    return `/admin/stock?${params.toString()}`;
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    published: { label: 'Publié', color: 'bg-green-100 text-green-700' },
    draft: { label: 'Brouillon', color: 'bg-orange-100 text-orange-700' },
    archived: { label: 'Archivé', color: 'bg-red-100 text-red-700' },
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left font-medium">IMAGE</th>
              <th className="px-4 py-3 text-left font-medium">PRODUIT</th>
              <th className="px-4 py-3 text-left font-medium">CATÉGORIE</th>
              <th className="px-4 py-3 text-left font-medium">PRIX</th>
              <th className="px-4 py-3 text-left font-medium">VENTES</th>
              <th className="px-4 py-3 text-left font-medium">STATUT</th>
              <th className="px-4 py-3 text-left font-medium">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map((product) => {
              const statusInfo = statusMap[product.status] || statusMap.draft;
              return (
                <tr key={product.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
                      {product.main_image ? (
                        <Image
                          src={product.main_image}
                          alt={product.title}
                          width={48}
                          height={48}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <span className="text-xl">📄</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900 truncate max-w-[200px]">
                        {product.title}
                      </p>
                      <p className="text-xs text-gray-400 truncate max-w-[200px]">
                        {product.slug}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{product.category_name || '-'}</td>
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-bold text-gray-900">
                        {product.price.toLocaleString()} FCFA
                      </span>
                      {product.compare_price && product.compare_price > product.price && (
                        <span className="text-xs text-red-500 block">
                          -{Math.round((1 - product.price / product.compare_price) * 100)}%
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{product.sales_count || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/product/${product.slug}`}
                        target="_blank"
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Aucun produit trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            {total} produit{total > 1 ? 's' : ''} au total
          </p>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p: number;
              if (totalPages <= 5) p = i + 1;
              else if (currentPage <= 3) p = i + 1;
              else if (currentPage >= totalPages - 2) p = totalPages - 4 + i;
              else p = currentPage - 2 + i;
              return (
                <Link
                  key={p}
                  href={buildUrl(p)}
                  className={`px-3 py-1 rounded-lg text-sm transition ${
                    p === currentPage
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  {p}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}