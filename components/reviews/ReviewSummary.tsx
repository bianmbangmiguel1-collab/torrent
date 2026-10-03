'use client';

import { ReviewSummary as SummaryType } from '@/lib/services/reviews';
import ReviewStars from './ReviewStars';

export default function ReviewSummary({ summary }: { summary: SummaryType }) {
  const { average, total, distribution, positive, neutral, negative } = summary;
  const maxCount = Math.max(1, ...Object.values(distribution));
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex flex-col sm:flex-row gap-8">
        <div className="text-center sm:text-left">
          <div className="text-4xl font-bold text-gray-900">{average.toFixed(1)}</div>
          <ReviewStars rating={average} size={24} />
          <div className="text-sm text-gray-500 mt-1">{total} avis</div>
        </div>
        <div className="flex-1 space-y-1">
          {[5,4,3,2,1].map((star) => {
            const count = distribution[star] || 0;
            const percent = maxCount > 0 ? (count / maxCount) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-sm">
                <span className="w-6 text-right font-medium">{star}</span>
                <span className="text-yellow-400">★</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${percent}%` }} />
                </div>
                <span className="w-8 text-gray-500 text-right">{count}</span>
              </div>
            );
          })}
        </div>
        <div className="min-w-[80px] space-y-1 text-sm">
          <div className="flex justify-between"><span>Positifs</span><span className="font-bold text-green-600">{positive}</span></div>
          <div className="flex justify-between"><span>Neutres</span><span className="font-bold text-gray-600">{neutral}</span></div>
          <div className="flex justify-between"><span>Négatifs</span><span className="font-bold text-red-600">{negative}</span></div>
        </div>
      </div>
    </div>
  );
}