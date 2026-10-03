// components/reviews/ReviewCarousel.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import ReviewStars from './ReviewStars';

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

interface ReviewCarouselProps {
  reviews: Review[];
  autoPlay?: boolean;
  interval?: number;
  title?: string;
  subtitle?: string;
  onReviewClick?: (review: Review) => void;
  onReviewImpression?: (reviewId: number) => void;
  variant?: 'default' | 'compact' | 'featured';
  className?: string;
}

export default function ReviewCarousel({
  reviews,
  autoPlay = true,
  interval = 7000,
  title = '⭐ Ce que nos clients disent',
  subtitle = 'Découvrez les témoignages de nos clients satisfaits',
  onReviewClick,
  onReviewImpression,
  variant = 'default',
  className = '',
}: ReviewCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [trackedIds, setTrackedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (reviews.length > 0 && currentIndex < reviews.length) {
      const currentReview = reviews[currentIndex];
      if (currentReview && !trackedIds.has(currentReview.id)) {
        setTrackedIds((prev) => new Set(prev).add(currentReview.id));
        onReviewImpression?.(currentReview.id);
        
        fetch(`/api/reviews/track/${currentReview.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'display' }),
        }).catch(() => {});
      }
    }
  }, [currentIndex, reviews, onReviewImpression, trackedIds]);

  useEffect(() => {
    if (!autoPlay || isPaused || reviews.length <= 1 || isAnimating) return;
    const timer = setTimeout(() => {
      handleNext();
    }, interval);
    return () => clearTimeout(timer);
  }, [currentIndex, autoPlay, interval, isPaused, reviews.length, isAnimating]);

  const handlePrev = useCallback(() => {
    if (isAnimating || reviews.length <= 1) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
    setTimeout(() => setIsAnimating(false), 500);
  }, [isAnimating, reviews.length]);

  const handleNext = useCallback(() => {
    if (isAnimating || reviews.length <= 1) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev + 1) % reviews.length);
    setTimeout(() => setIsAnimating(false), 500);
  }, [isAnimating, reviews.length]);

  const handleReviewClick = (review: Review) => {
    fetch(`/api/reviews/track/${review.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'click' }),
    }).catch(() => {});
    onReviewClick?.(review);
  };

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <span className="text-5xl block mb-4">💬</span>
        <p className="text-lg">Aucun avis à afficher pour le moment.</p>
        <p className="text-sm">Soyez le premier à donner votre avis !</p>
      </div>
    );
  }

  const currentReview = reviews[currentIndex];

  const variantStyles = {
    default: {
      container: 'bg-white rounded-2xl shadow-lg border border-gray-200 p-6',
      title: 'text-3xl font-bold text-center text-gray-900',
      subtitle: 'text-center text-gray-500 mt-2 mb-8',
    },
    compact: {
      container: 'bg-white rounded-xl shadow-md border border-gray-100 p-4',
      title: 'text-xl font-bold text-gray-900',
      subtitle: 'text-sm text-gray-500 mt-1 mb-4',
    },
    featured: {
      container: 'bg-gradient-to-br from-blue-50 via-white to-indigo-50 rounded-3xl shadow-xl border border-blue-100 p-8',
      title: 'text-4xl font-black text-center text-gray-900',
      subtitle: 'text-center text-gray-500 mt-2 mb-10',
    },
  };

  const style = variantStyles[variant] || variantStyles.default;

  // ⭐ Fonction pour afficher l'avatar avec fallback
  const renderAvatar = (review: Review) => {
    const initial = (review.user_name || 'C')[0].toUpperCase();
    
    // Si l'avatar existe, on essaie de le charger
    if (review.user_avatar) {
      // ⭐ CORRECTION : Utiliser directement le chemin /uploads/avatars/
      // Le frontend ira chercher via la route API /api/uploads/avatars/
      let avatarUrl = review.user_avatar;
      
      // Si le chemin commence par /uploads/avatars/, le garder tel quel
      // Le frontend fera la requête vers /uploads/avatars/ qui sera redirigé
      // ou on utilise directement /api/uploads/avatars/
      
      // On garde le chemin tel qu'il est dans la base
      // La route API /api/uploads/avatars/ servira les fichiers
      
      return (
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xl font-bold overflow-hidden flex-shrink-0">
          <img
            src={avatarUrl}
            alt={review.user_name || 'Client'}
            className="w-full h-full object-cover"
            onError={(e) => {
              // ⭐ En cas d'erreur, afficher les initiales
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.textContent = initial;
                parent.className = 'w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0';
              }
            }}
          />
        </div>
      );
    }
    
    // ⭐ Pas d'avatar → afficher les initiales
    return (
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
        {initial}
      </div>
    );
  };

  return (
    <div className={`${className}`}>
      {(title || subtitle) && (
        <div className="mb-8">
          {title && <h2 className={style.title}>{title}</h2>}
          {subtitle && <p className={style.subtitle}>{subtitle}</p>}
        </div>
      )}

      <div
        className={`relative ${style.container}`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {reviews.length > 1 && (
          <div className="absolute top-4 right-4 text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full z-10">
            {currentIndex + 1} / {reviews.length}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={currentReview.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center"
          >
            {/* Étoiles */}
            <div className="mb-3">
              <ReviewStars rating={currentReview.rating} size={28} />
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 justify-center mb-3">
              {currentReview.is_featured && (
                <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3" />
                  Mis en avant
                </span>
              )}
              {currentReview.is_verified_purchase && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  ✓ Achat vérifié
                </span>
              )}
            </div>

            {/* Commentaire */}
            <blockquote className="text-lg md:text-xl italic text-gray-700 max-w-2xl leading-relaxed">
              "{currentReview.comment}"
            </blockquote>

            {/* ⭐ Auteur avec avatar */}
            <div className="mt-6 flex items-center gap-4">
              {renderAvatar(currentReview)}
              <div className="text-left">
                <p className="font-bold text-gray-900">
                  {currentReview.user_name || 'Client'}
                </p>
                <p className="text-sm text-gray-500">
                  {currentReview.product_title}
                  {currentReview.category_name && (
                    <span className="text-gray-400"> • {currentReview.category_name}</span>
                  )}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                  <span>{new Date(currentReview.created_at).toLocaleDateString('fr-FR')}</span>
                  {currentReview.helpful_count > 0 && (
                    <span>👍 {currentReview.helpful_count}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Lien vers le produit */}
            <Link
              href={`/product/${currentReview.product_slug}`}
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition"
              onClick={() => handleReviewClick(currentReview)}
            >
              Voir le produit →
            </Link>
          </motion.div>
        </AnimatePresence>

        {reviews.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white shadow-md hover:bg-gray-50 transition border border-gray-200 z-10"
              aria-label="Précédent"
              disabled={isAnimating}
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white shadow-md hover:bg-gray-50 transition border border-gray-200 z-10"
              aria-label="Suivant"
              disabled={isAnimating}
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </>
        )}

        {reviews.length > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {reviews.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (!isAnimating) {
                    setIsAnimating(true);
                    setCurrentIndex(index);
                    setTimeout(() => setIsAnimating(false), 500);
                  }
                }}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'bg-blue-600 w-6'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Aller au témoignage ${index + 1}`}
              />
            ))}
          </div>
        )}

        {autoPlay && isPaused && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-100 rounded-b-2xl overflow-hidden">
            <div className="h-full bg-blue-500 animate-pulse" />
          </div>
        )}
      </div>

      {variant === 'featured' && reviews.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)}
            </p>
            <p className="text-xs text-gray-500">Note moyenne</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{reviews.length}</p>
            <p className="text-xs text-gray-500">Témoignages</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {reviews.filter(r => r.is_verified_purchase).length}
            </p>
            <p className="text-xs text-gray-500">Achats vérifiés</p>
          </div>
        </div>
      )}
    </div>
  );
}