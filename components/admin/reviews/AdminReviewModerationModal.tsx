// components/admin/reviews/AdminReviewModerationModal.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import ReviewStars from '@/components/reviews/ReviewStars';

type ReviewModalReview = {
  id: number;
  user_name?: string | null;
  user_email?: string | null;
  product_title?: string | null;
  product_slug?: string | null;
  rating: number;
  comment?: string | null;
  status: string;
  is_featured: boolean;
  is_verified_purchase: boolean;
  admin_reply?: string | null;
  created_at: string;
};

interface AdminReviewModerationModalProps {
  review: ReviewModalReview;
  onClose: () => void;
  onRefresh?: () => void;
}

interface ErrorResponse {
  error?: string;
  message?: string;
}

export default function AdminReviewModerationModal({
  review,
  onClose,
  onRefresh,
}: AdminReviewModerationModalProps) {
  const router = useRouter();
  const [reply, setReply] = useState(review.admin_reply || '');
  const [status, setStatus] = useState(review.status);
  const [isFeatured, setIsFeatured] = useState(review.is_featured);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      // ✅ Construire l'objet de mise à jour (uniquement les champs modifiés)
      const updateData: Record<string, unknown> = {};

      if (status !== review.status) {
        updateData.status = status;
      }

      if (reply !== (review.admin_reply || '')) {
        updateData.admin_reply = reply.trim() || null;
      }

      if (isFeatured !== review.is_featured) {
        updateData.is_featured = isFeatured;
      }

      // Si rien n'a changé, fermer simplement
      if (Object.keys(updateData).length === 0) {
        onClose();
        return;
      }

      // ✅ URL corrigée : paramètre id dans la query string
      const res = await fetch(`/api/admin/reviews?id=${review.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // ⭐ Envoie automatiquement les cookies (admin_session, etc.)
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as ErrorResponse;
        throw new Error(err.error || err.message || "Erreur lors de l'enregistrement");
      }

      // Rafraîchir la page et fermer la modale
      router.refresh();
      if (onRefresh) onRefresh();
      onClose();
    } catch (error: any) {
      console.error('❌ Erreur modération:', error);
      alert(error.message || 'Erreur lors de l’enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">Modération de l'avis</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Infos utilisateur */}
          <div className="flex items-center gap-2">
            <span className="font-medium">{review.user_name || 'Anonyme'}</span>
            {review.is_verified_purchase && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                ✓ Achat vérifié
              </span>
            )}
            <span className="text-xs text-gray-400">
              {new Date(review.created_at).toLocaleDateString()}
            </span>
          </div>

          {/* Note */}
          <div className="flex items-center gap-2">
            <ReviewStars rating={review.rating} />
            <span className="font-bold">{review.rating}</span>
          </div>

          {/* Commentaire */}
          <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap text-gray-700">
            {review.comment}
          </div>

          {/* Modération */}
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-800 mb-2">🛡️ Modération</h4>
            <div className="flex gap-4 flex-wrap">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="approved"
                  checked={status === 'approved'}
                  onChange={() => setStatus('approved')}
                />{' '}
                Approuver
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="rejected"
                  checked={status === 'rejected'}
                  onChange={() => setStatus('rejected')}
                />{' '}
                Rejeter
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="pending"
                  checked={status === 'pending'}
                  onChange={() => setStatus('pending')}
                />{' '}
                En attente
              </label>
            </div>
          </div>

          {/* Mettre en avant */}
          <div>
            <label className="block font-medium text-gray-800 mb-1">Mettre en avant</label>
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="w-5 h-5"
            />
          </div>

          {/* Réponse admin */}
          <div>
            <label className="block font-medium text-gray-800 mb-1">Réponse admin</label>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg p-2"
              placeholder="Répondre au client..."
            />
          </div>

          {/* Boutons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}