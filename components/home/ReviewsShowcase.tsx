// components/home/ReviewsShowcase.tsx
'use client';

import { useState, useEffect } from 'react';
import ReviewCarousel from '@/components/reviews/ReviewCarousel';
import { Sparkles } from 'lucide-react';

interface Review {
  id: number;
  user_id: number;
  user_name: string;
  user_avatar: string | null;
  rating: number;
  comment: string;
  is_verified_purchase: boolean;
  is_featured: boolean;
  product_title: string;
  product_slug: string;
  product_price: number;
  category_name: string;
  created_at: string;
  helpful_count: number;
}

interface ReviewsShowcaseProps {
  limit?: number;
  title?: string;
  subtitle?: string;
  variant?: 'default' | 'compact' | 'featured';
  className?: string;
  autoPlay?: boolean;
  interval?: number;
  onReviewClick?: (review: Review) => void;
}

interface FeaturedReviewsResponse {
  reviews?: Review[];
  error?: string;
  message?: string;
}

export default function ReviewsShowcase({
  limit = 5,
  title = '⭐ Ce que nos clients disent',
  subtitle = 'Découvrez les témoignages de nos clients satisfaits',
  variant = 'default',
  className = '',
  autoPlay = true,
  interval = 7000,
  onReviewClick,
}: ReviewsShowcaseProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/reviews/featured?limit=${limit}&context=home`
        );
        if (!response.ok) {
          throw new Error('Erreur lors du chargement des témoignages');
        }
        const data = (await response.json()) as FeaturedReviewsResponse;
        setReviews(data.reviews || []);
      } catch (err) {
        console.error('Erreur chargement témoignages:', err);
        setError('Impossible de charger les témoignages');
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [limit]);

  const handleReviewImpression = async (reviewId: number) => {
    try {
      await fetch(`/api/reviews/track/${reviewId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'display' }),
      });
    } catch (error) {
      // Silencieux pour ne pas impacter l'expérience utilisateur
    }
  };

  if (loading) {
    return (
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mx-auto" />
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mx-auto mt-2" />
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="flex flex-col items-center">
              <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
              <div className="h-16 w-full max-w-2xl bg-gray-200 rounded animate-pulse mt-4" />
              <div className="flex items-center gap-4 mt-6">
                <div className="w-14 h-14 rounded-full bg-gray-200 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="text-5xl mb-4">💬</div>
          <p className="text-gray-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return null;
  }

  return (
    <section className={`py-12 bg-gradient-to-b from-gray-50 to-white ${className}`}>
      <div className="max-w-6xl mx-auto px-4">
        <ReviewCarousel
          reviews={reviews}
          autoPlay={autoPlay}
          interval={interval}
          title={title}
          subtitle={subtitle}
          variant={variant}
          onReviewClick={onReviewClick}
          onReviewImpression={handleReviewImpression}
        />

        {/* Lien vers tous les témoignages */}
        {reviews.length > 0 && (
          <div className="text-center mt-6">
            <a
              href="/products"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition"
            >
              <Sparkles className="w-4 h-4" />
              Découvrir tous nos produits
              <span aria-hidden="true">→</span>
            </a>
          </div>
        )}
      </div>
    </section>
  );
}