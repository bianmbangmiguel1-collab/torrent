'use client';

import { Review } from '@/lib/services/reviews';
import ReviewStars from './ReviewStars';
import { useState } from 'react';

interface ReviewCardProps {
  review: Review;
  showHelpful?: boolean;
}

export default function ReviewCard({ review, showHelpful = true }: ReviewCardProps) {
  const [helpful, setHelpful] = useState(review.helpful_count || 0);
  const [notHelpful, setNotHelpful] = useState(review.not_helpful_count || 0);
  const [userAction, setUserAction] = useState<'helpful' | 'nothelpful' | null>(null);

  const handleHelpful = async () => {
    if (userAction === 'helpful') return;
    await fetch(`/api/reviews/${review.id}/helpful`, { method: 'POST' });
    setHelpful(prev => prev + 1);
    if (userAction === 'nothelpful') setNotHelpful(prev => prev - 1);
    setUserAction('helpful');
  };

  const handleNotHelpful = async () => {
    if (userAction === 'nothelpful') return;
    await fetch(`/api/reviews/${review.id}/nothelpful`, { method: 'POST' });
    setNotHelpful(prev => prev + 1);
    if (userAction === 'helpful') setHelpful(prev => prev - 1);
    setUserAction('nothelpful');
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <ReviewStars rating={review.rating} />
            <span className="text-sm font-medium text-gray-700">{review.user_name || 'Anonyme'}</span>
            
            {/* ✅ Badge "En attente de validation" */}
            {review.status === 'pending' && (
              <span className="text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
                En attente de validation
              </span>
            )}

            {review.is_verified_purchase && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Achat vérifié</span>
            )}
          </div>
          {review.is_featured && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full mt-1 inline-block">⭐ Mis en avant</span>
          )}
        </div>
        <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString()}</span>
      </div>

      <div className="mt-2 text-gray-700 whitespace-pre-wrap">{review.comment}</div>

      {review.admin_reply && (
        <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
          <span className="font-medium text-gray-700">Réponse de l'équipe :</span>
          <p className="mt-1 text-gray-600">{review.admin_reply}</p>
        </div>
      )}

      {showHelpful && (
        <div className="mt-3 flex items-center gap-4 text-sm">
          <button onClick={handleHelpful} className="flex items-center gap-1 text-gray-500 hover:text-blue-600 transition">
            👍 <span>{helpful}</span>
          </button>
          <button onClick={handleNotHelpful} className="flex items-center gap-1 text-gray-500 hover:text-red-600 transition">
            👎 <span>{notHelpful}</span>
          </button>
        </div>
      )}
    </div>
  );
}