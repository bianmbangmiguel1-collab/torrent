// app/api/admin/reviews/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { updateReview, deleteReview } from '@/lib/services/reviews';
import { revalidatePath } from 'next/cache';

// ============================================================
// Types
// ============================================================
interface UpdateReviewBody {
  status?: string;
  admin_reply?: string | null;
  is_featured?: boolean;
  is_visible?: boolean;
  display_priority?: number | string;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
}

// ============================================================
// PATCH : Mettre à jour un avis (statut, réponse admin, etc.)
// ============================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log(`🔄 PATCH /api/admin/reviews/${params.id} - Début`);

  try {
    // 1. Vérification admin
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // 2. Valider l'ID
    const reviewId = Number(params.id);
    if (isNaN(reviewId) || reviewId <= 0) {
      return NextResponse.json(
        { success: false, error: 'ID d\'avis invalide' },
        { status: 400 }
      );
    }

    // 3. Lire le body
    const body: UpdateReviewBody = await request.json();
    const {
      status,
      admin_reply,
      is_featured,
      is_visible,
      display_priority,
      scheduled_start,
      scheduled_end,
    } = body;

    // 4. Construire l'objet de mise à jour (uniquement les champs présents)
    const updateData: {
      status?: string;
      admin_reply?: string | null;
      is_featured?: boolean;
      is_visible?: boolean;
      display_priority?: number;
      scheduled_start?: string | null;
      scheduled_end?: string | null;
    } = {};

    if (status !== undefined) {
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return NextResponse.json(
          { success: false, error: 'Statut invalide' },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    if (admin_reply !== undefined) {
      updateData.admin_reply = admin_reply?.trim() || null;
    }

    if (is_featured !== undefined) {
      updateData.is_featured = Boolean(is_featured);
    }

    if (is_visible !== undefined) {
      updateData.is_visible = Boolean(is_visible);
    }

    if (display_priority !== undefined) {
      const priority = Number(display_priority);
      if (!Number.isFinite(priority)) {
        return NextResponse.json(
          { success: false, error: 'Priorité invalide' },
          { status: 400 }
        );
      }
      updateData.display_priority = priority;
    }

    if (scheduled_start !== undefined) {
      updateData.scheduled_start = scheduled_start || null;
    }

    if (scheduled_end !== undefined) {
      updateData.scheduled_end = scheduled_end || null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucune donnée à mettre à jour' },
        { status: 400 }
      );
    }

    // 5. Mettre à jour l'avis
    const updated = await updateReview(reviewId, updateData);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Avis non trouvé' },
        { status: 404 }
      );
    }

    // 6. Purger le cache des pages concernées
    revalidatePath('/admin/reviews');

    // 7. Réponse
    return NextResponse.json({
      success: true,
      message: 'Avis mis à jour avec succès',
      review: updated,
    });
  } catch (error) {
    console.error(`❌ Erreur PATCH /api/admin/reviews/${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE : Supprimer un avis
// ============================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log(`🗑️ DELETE /api/admin/reviews/${params.id} - Début`);

  try {
    // 1. Vérification admin
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // 2. Valider l'ID
    const reviewId = Number(params.id);
    if (isNaN(reviewId) || reviewId <= 0) {
      return NextResponse.json(
        { success: false, error: 'ID d\'avis invalide' },
        { status: 400 }
      );
    }

    // 3. Supprimer l'avis
    const success = await deleteReview(reviewId);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Avis non trouvé' },
        { status: 404 }
      );
    }

    // 4. Purger le cache des pages concernées
    revalidatePath('/admin/reviews');

    // 5. Réponse
    return NextResponse.json({
      success: true,
      message: 'Avis supprimé avec succès',
    });
  } catch (error) {
    console.error(`❌ Erreur DELETE /api/admin/reviews/${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// ============================================================
// OPTIONS (CORS)
// ============================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
      'Access-Control-Max-Age': '86400',
    },
  });
}