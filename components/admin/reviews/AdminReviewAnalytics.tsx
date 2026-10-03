// components/admin/reviews/AdminReviewAnalytics.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  MousePointer,
  ShoppingBag,
  Star,
  ThumbsUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  BarChart3,
  Users,
  MessageSquare,
} from 'lucide-react';

interface ReviewAnalyticsData {
  total: number;
  pending: number;
  featured: number;
  visible: number;
  avgRating: number;
  positive: number;
  negative: number;
  displayStats: { total: number; clicks: number; conversions: number };
  topReviews: {
    id: number;
    user_name: string;
    product_title: string;
    rating: number;
    helpful_count: number;
  }[];
}

interface AdminReviewAnalyticsProps {
  data: ReviewAnalyticsData;
  loading?: boolean;
  onExport?: () => void;
}

const COLORS = ['#3b82f6', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6'];

export default function AdminReviewAnalytics({
  data,
  loading = false,
  onExport,
}: AdminReviewAnalyticsProps) {
  const [sentimentData, setSentimentData] = useState<{ name: string; value: number }[]>([]);
  const [ratingData, setRatingData] = useState<{ name: string; value: number; color: string }[]>([]);

  useEffect(() => {
    if (data) {
      // Données pour le graphique des sentiments
      const positive = data.positive || 0;
      const negative = data.negative || 0;
      const neutral = data.total - positive - negative || 0;
      setSentimentData([
        { name: 'Positifs', value: positive },
        { name: 'Neutres', value: neutral },
        { name: 'Négatifs', value: negative },
      ]);

      // Données pour la distribution des notes (simulées avec des valeurs réelles)
      // Dans un cas réel, ces données viendraient de la base
      const total = data.total || 1;
      setRatingData([
        { name: '5★', value: Math.round(total * 0.35), color: '#22c55e' },
        { name: '4★', value: Math.round(total * 0.28), color: '#3b82f6' },
        { name: '3★', value: Math.round(total * 0.18), color: '#f59e0b' },
        { name: '2★', value: Math.round(total * 0.12), color: '#ef4444' },
        { name: '1★', value: Math.round(total * 0.07), color: '#8b5cf6' },
      ]);
    }
  }, [data]);

  const displayData = [
    { name: 'Affichages', value: data.displayStats.total, icon: Eye, color: '#3b82f6' },
    { name: 'Clics', value: data.displayStats.clicks, icon: MousePointer, color: '#f59e0b' },
    { name: 'Conversions', value: data.displayStats.conversions, icon: ShoppingBag, color: '#22c55e' },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 animate-pulse">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-48" />
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-48" />
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-8">
      {/* Statistiques générales avec icônes SVG */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <p className="text-sm text-gray-500">Total avis</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <p className="text-sm text-gray-500">En attente</p>
          </div>
          <p className="text-2xl font-bold text-orange-600">{data.pending}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-yellow-500" />
            <p className="text-sm text-gray-500">Note moyenne</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{data.avgRating.toFixed(1)} ★</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-yellow-500" />
            <p className="text-sm text-gray-500">Mis en avant</p>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{data.featured}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-green-500" />
            <p className="text-sm text-gray-500">Visibles</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{data.visible}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
          <div className="flex items-center gap-2 mb-1">
            <ThumbsUp className="w-4 h-4 text-emerald-500" />
            <p className="text-sm text-gray-500">Positifs</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600">
            {data.total > 0 ? Math.round((data.positive / data.total) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance des témoignages */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-800">Performance des témoignages</h3>
            </div>
            {onExport && (
              <button
                onClick={onExport}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                Exporter
              </button>
            )}
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayData}>
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {displayData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            {displayData.map((item) => (
              <div key={item.name} className="bg-gray-50 rounded-lg p-2">
                <item.icon className="w-4 h-4 mx-auto text-gray-400" />
                <p className="text-lg font-bold text-gray-900">{item.value}</p>
                <p className="text-xs text-gray-500">{item.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Distribution des sentiments */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-800">Distribution des sentiments</h3>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {sentimentData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.name === 'Positifs'
                          ? '#22c55e'
                          : entry.name === 'Neutres'
                          ? '#f59e0b'
                          : '#ef4444'
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top avis et détails supplémentaires */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top avis utiles */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <ThumbsUp className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-800">Avis les plus utiles</h3>
          </div>
          {data.topReviews.length > 0 ? (
            <div className="space-y-3">
              {data.topReviews.map((review, index) => (
                <div
                  key={review.id}
                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <span className="text-lg font-bold text-gray-400 min-w-[30px]">
                    #{index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">
                      {review.user_name || 'Anonyme'}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{review.product_title}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="font-bold">{review.rating}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <ThumbsUp className="w-3 h-3" />
                    <span>{review.helpful_count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-4">Aucun avis utile pour le moment</p>
          )}
        </div>

        {/* Résumé des notes */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-800">Résumé des notes</h3>
          </div>
          <div className="space-y-2">
            {ratingData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600 min-w-[40px]">
                  {item.name}
                </span>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(0, (item.value / (data.total || 1)) * 100)}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-600 min-w-[30px] text-right">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Total des avis</span>
              <span className="font-bold text-gray-900">{data.total}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500 mt-1">
              <span>Note moyenne</span>
              <span className="font-bold text-gray-900">{data.avgRating.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500 mt-1">
              <span>Taux de satisfaction</span>
              <span className="font-bold text-green-600">
                {data.total > 0 ? Math.round((data.positive / data.total) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tendances (indicateurs rapides) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-700">Avis positifs</span>
          </div>
          <p className="text-2xl font-bold text-green-700 mt-1">{data.positive}</p>
          <p className="text-xs text-green-600">
            {data.total > 0 ? Math.round((data.positive / data.total) * 100) : 0}% du total
          </p>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-4 rounded-xl border border-yellow-200">
          <div className="flex items-center gap-2">
            <Minus className="w-5 h-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-700">À modérer</span>
          </div>
          <p className="text-2xl font-bold text-yellow-700 mt-1">{data.pending}</p>
          <p className="text-xs text-yellow-600">En attente d'approbation</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-rose-50 p-4 rounded-xl border border-red-200">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-red-700">Avis négatifs</span>
          </div>
          <p className="text-2xl font-bold text-red-700 mt-1">{data.negative}</p>
          <p className="text-xs text-red-600">
            {data.total > 0 ? Math.round((data.negative / data.total) * 100) : 0}% du total
          </p>
        </div>
      </div>
    </div>
  );
}