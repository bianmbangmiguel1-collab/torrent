// components/admin/reviews/AdminReviewFeaturedManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  GripVertical,
  Eye,
  EyeOff,
  Star,
  Trash2,
  Sparkles,
  Calendar,
  Clock,
  Play,
  Pause,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface FeaturedReview {
  id: number;
  user_name: string;
  rating: number;
  comment: string;
  product_title: string;
  is_visible: boolean;
  is_featured: boolean;
  display_priority: number;
  scheduled_start: string | null;
  scheduled_end: string | null;
  display_count: number;
  click_count: number;
  created_at: string;
}

interface FeaturedReviewsResponse {
  reviews?: FeaturedReview[];
  autoMode?: boolean;
}

interface AutoSelectResponse {
  selectedIds?: number[];
}

interface AdminReviewFeaturedManagerProps {
  initialReviews?: FeaturedReview[];
  onRefresh?: () => void;
}

export default function AdminReviewFeaturedManager({
  initialReviews = [],
  onRefresh,
}: AdminReviewFeaturedManagerProps) {
  const router = useRouter();
  const [reviews, setReviews] = useState<FeaturedReview[]>(initialReviews);
  const [loading, setLoading] = useState(true);
  const [autoMode, setAutoMode] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (initialReviews.length > 0) {
      setReviews(initialReviews);
      setLoading(false);
    } else {
      loadReviews();
    }
  }, [initialReviews]);

  const loadReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/reviews/featured');
      if (res.ok) {
        const data = (await res.json()) as FeaturedReviewsResponse;
        setReviews(data.reviews || []);
        setAutoMode(data.autoMode !== undefined ? data.autoMode : true);
      } else {
        setError('Erreur lors du chargement des avis vedettes');
      }
    } catch (error) {
      console.error('Erreur chargement des avis vedettes:', error);
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(reviews);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Mettre à jour les priorités
    const updated = items.map((item, index) => ({
      ...item,
      display_priority: index + 1,
    }));

    setReviews(updated);
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/admin/reviews/featured/order', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: updated.map(r => r.id) }),
      });
      if (res.ok) {
        setSuccess('Ordre mis à jour avec succès');
        setTimeout(() => setSuccess(null), 3000);
        router.refresh();
        if (onRefresh) onRefresh();
      } else {
        setError('Erreur lors de la sauvegarde de l\'ordre');
      }
    } catch (error) {
      console.error('Erreur sauvegarde ordre:', error);
      setError('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = async (id: number, current: boolean) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_visible: current ? 0 : 1 }),
      });
      if (res.ok) {
        setReviews(reviews.map(r => r.id === id ? { ...r, is_visible: !current } : r));
        setSuccess(`Avis ${current ? 'masqué' : 'affiché'} avec succès`);
        setTimeout(() => setSuccess(null), 3000);
        router.refresh();
        if (onRefresh) onRefresh();
      } else {
        setError('Erreur lors de la mise à jour de la visibilité');
      }
    } catch (error) {
      console.error('Erreur mise à jour visibilité:', error);
      setError('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const toggleFeatured = async (id: number, current: boolean) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: current ? 0 : 1 }),
      });
      if (res.ok) {
        setReviews(reviews.map(r => r.id === id ? { ...r, is_featured: !current } : r));
        setSuccess(`Avis ${current ? 'retiré des' : 'ajouté aux'} vedettes`);
        setTimeout(() => setSuccess(null), 3000);
        router.refresh();
        if (onRefresh) onRefresh();
      } else {
        setError('Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur mise à jour vedette:', error);
      setError('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const removeFromFeatured = async (id: number) => {
    if (!confirm('Supprimer cet avis des vedettes ?')) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setReviews(reviews.filter(r => r.id !== id));
        setSuccess('Avis retiré des vedettes');
        setTimeout(() => setSuccess(null), 3000);
        router.refresh();
        if (onRefresh) onRefresh();
      } else {
        setError('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
      setError('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const runAutoSelect = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/admin/reviews/featured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto-select' }),
      });
      if (res.ok) {
        const data = (await res.json()) as AutoSelectResponse;
        setSuccess(`Sélection automatique terminée (${data.selectedIds?.length || 0} avis sélectionnés)`);
        setTimeout(() => setSuccess(null), 3000);
        await loadReviews();
        router.refresh();
        if (onRefresh) onRefresh();
      } else {
        setError('Erreur lors de la sélection automatique');
      }
    } catch (error) {
      console.error('Erreur auto-select:', error);
      setError('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (review: FeaturedReview) => {
    if (!review.is_visible) return <XCircle className="w-4 h-4 text-red-500" />;
    if (review.is_featured) return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <AlertCircle className="w-4 h-4 text-yellow-500" />;
  };

  const getStatusLabel = (review: FeaturedReview) => {
    if (!review.is_visible) return 'Masqué';
    if (review.is_featured) return 'En vedette';
    return 'Visible';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-3 text-gray-500">Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-800">Gestion des vedettes</h3>
          <span className="text-sm text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {reviews.length}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={autoMode}
              onChange={(e) => setAutoMode(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            Mode automatique
          </label>
          <button
            onClick={runAutoSelect}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            Sélectionner
          </button>
          <button
            onClick={loadReviews}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Rafraîchir
          </button>
        </div>
      </div>

      {/* Messages de statut */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}

      {/* Liste des avis avec drag & drop */}
      {reviews.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Star className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Aucun avis sélectionné pour les vedettes.</p>
          <button
            onClick={runAutoSelect}
            disabled={saving}
            className="mt-3 text-blue-600 hover:underline text-sm"
          >
            Lancer la sélection automatique
          </button>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="reviews">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                {reviews.map((review, index) => (
                  <Draggable key={review.id} draggableId={String(review.id)} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition group ${
                          snapshot.isDragging ? 'shadow-lg bg-white border-2 border-blue-400' : ''
                        }`}
                      >
                        {/* Handle de drag */}
                        <div {...provided.dragHandleProps} className="cursor-grab">
                          <GripVertical className="w-5 h-5 text-gray-400" />
                        </div>

                        {/* Info utilisateur */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-800 truncate">
                              {review.user_name || 'Anonyme'}
                            </p>
                            <span className="text-xs text-gray-400">
                              #{review.display_priority || index + 1}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 line-clamp-1">{review.comment}</p>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                            <span>{review.product_title}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {review.display_count || 0}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Note */}
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="font-bold">{review.rating}</span>
                        </div>

                        {/* Statut */}
                        <div className="flex items-center gap-1 text-xs">
                          {getStatusIcon(review)}
                          <span className="hidden sm:inline text-gray-500">
                            {getStatusLabel(review)}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleFeatured(review.id, !!review.is_featured)}
                            className={`p-1.5 rounded-lg transition ${
                              review.is_featured
                                ? 'text-yellow-500 bg-yellow-50'
                                : 'text-gray-400 hover:bg-gray-200'
                            }`}
                            title="Mettre en vedette"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleVisibility(review.id, !!review.is_visible)}
                            className={`p-1.5 rounded-lg transition ${
                              review.is_visible
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-gray-400 hover:bg-gray-200'
                            }`}
                            title={review.is_visible ? 'Masquer' : 'Afficher'}
                          >
                            {review.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => removeFromFeatured(review.id)}
                            className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition"
                            title="Retirer des vedettes"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Informations supplémentaires */}
      {reviews.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-4">
            <span>
              <span className="font-medium text-gray-600">{reviews.filter(r => r.is_visible).length}</span> visibles
            </span>
            <span>
              <span className="font-medium text-gray-600">{reviews.filter(r => r.is_featured).length}</span> en vedette
            </span>
            <span>
              Total affichages: <span className="font-medium text-gray-600">
                {reviews.reduce((acc, r) => acc + (r.display_count || 0), 0)}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            <span>Glissez pour réorganiser</span>
          </div>
        </div>
      )}
    </div>
  );
}