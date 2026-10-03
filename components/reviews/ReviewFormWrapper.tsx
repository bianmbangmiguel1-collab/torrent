// components/reviews/ReviewFormWrapper.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useUser } from '@/context/UserContext';

interface ReviewFormWrapperProps {
  productSlug: string;
}

interface CreateReviewResponse {
  success?: boolean;
  error?: string;
  message?: string;
  review?: {
    id: number;
    rating: number;
    comment: string;
    status: string;
  };
}

export default function ReviewFormWrapper({ productSlug }: ReviewFormWrapperProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useUser();
  
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Si l'utilisateur n'est pas connecté, afficher un message
  if (!isAuthenticated) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50">
        <h3 className="text-lg font-bold text-slate-900 mb-3">Donner mon avis</h3>
        <p className="text-sm text-slate-600 mb-4">Connectez-vous pour laisser un avis</p>
        <button
          onClick={() => router.push(`/auth/login?redirect=/product/${productSlug}`)}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium"
        >
          Se connecter
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Veuillez sélectionner une note');
      return;
    }

    if (!content.trim()) {
      setError('Veuillez écrire votre avis');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/reviews/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productSlug,
          rating,
          title: title.trim() || undefined,
          content: content.trim(),
        }),
      });

      const data = (await response.json()) as CreateReviewResponse;

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'envoi de l\'avis');
      }

      setSuccess(true);
      setRating(0);
      setTitle('');
      setContent('');
      setShowForm(false);

      // Rafraîchir la page après 2 secondes
      setTimeout(() => {
        router.refresh();
      }, 2000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50">
        <div className="text-center py-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900">Merci pour votre avis !</h3>
          <p className="text-sm text-slate-600">Votre avis a été publié avec succès.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50">
      <h3 className="text-lg font-bold text-slate-900 mb-3">Donner mon avis</h3>
      
      {!showForm ? (
        <div>
          <p className="text-sm text-slate-600 mb-4">
            Partagez votre expérience avec ce produit
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-medium"
          >
            ✍️ Écrire un avis
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Votre note *
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoverRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-slate-300'
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {rating > 0 && (
                <span>
                  {rating === 1 && '⭐ Très déçu'}
                  {rating === 2 && '⭐ Pas satisfait'}
                  {rating === 3 && '⭐⭐ Correct'}
                  {rating === 4 && '⭐⭐⭐ Bien'}
                  {rating === 5 && '⭐⭐⭐⭐⭐ Excellent !'}
                </span>
              )}
            </p>
          </div>

          {/* Titre */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Titre (optionnel)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Résumé de votre avis..."
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white text-slate-900 placeholder:text-slate-400"
              maxLength={100}
            />
          </div>

          {/* Contenu */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Votre avis *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Décrivez votre expérience avec ce produit..."
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white text-slate-900 placeholder:text-slate-400 min-h-[120px]"
              maxLength={1000}
              required
            />
            <p className="text-xs text-slate-500 mt-1 text-right">
              {content.length}/1000
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Boutons */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                'Publier l\'avis'
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError(null);
                setTitle('');
                setContent('');
                setRating(0);
              }}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition font-medium"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}