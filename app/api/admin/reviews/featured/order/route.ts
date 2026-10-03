// app/api/admin/reviews/featured/order/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { getDB } from '@/lib/db';

// ============================================================
// Types
// ============================================================
interface UpdateFeaturedOrderBody {
  order: Array<number | string>
}

interface ResetFeaturedOrderBody {
  action: 'reset'
}

// ─── PUT : Mettre à jour l'ordre des avis vedettes ────────────────
export async function PUT(request: NextRequest) {
  try {
    // Vérifier que l'utilisateur est admin
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = (await request.json()) as UpdateFeaturedOrderBody;
    const { order } = body;

    if (!order || !Array.isArray(order) || order.length === 0) {
      return NextResponse.json(
        { error: 'Ordre invalide. Veuillez fournir un tableau d\'IDs.' },
        { status: 400 }
      );
    }

    const db = await getDB();

    // Commencer une transaction
    await db.exec('BEGIN TRANSACTION');

    try {
      // Mettre à jour la priorité de chaque avis
      for (let i = 0; i < order.length; i++) {
        const reviewId = order[i];
        const priority = i + 1;

        await db.run(
          `UPDATE reviews SET display_priority = ? WHERE id = ?`,
          [priority, reviewId]
        );
      }

      // Valider la transaction
      await db.exec('COMMIT');

      return NextResponse.json({
        success: true,
        message: `Ordre mis à jour avec succès (${order.length} avis)`,
        order,
      });
    } catch (error) {
      // En cas d'erreur, annuler la transaction
      await db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Erreur PUT /api/admin/reviews/featured/order:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la mise à jour de l\'ordre' },
      { status: 500 }
    );
  }
}

// ─── GET : Récupérer l'ordre actuel ────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    // Vérifier que l'utilisateur est admin
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const db = await getDB();

    // Récupérer les avis avec leur priorité
    const reviews = await db.all(`
      SELECT 
        id,
        display_priority,
        is_featured,
        is_visible,
        rating,
        comment,
        user_id,
        (SELECT name FROM users WHERE id = reviews.user_id) as user_name,
        (SELECT title FROM products WHERE id = reviews.product_id) as product_title
      FROM reviews
      WHERE status = 'approved' AND is_featured = 1
      ORDER BY display_priority ASC, created_at DESC
    `);

    return NextResponse.json({
      success: true,
      order: reviews.map(r => r.id),
      reviews,
    });
  } catch (error) {
    console.error('Erreur GET /api/admin/reviews/featured/order:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération de l\'ordre' },
      { status: 500 }
    );
  }
}

// ─── POST : Réinitialiser l'ordre ──────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // Vérifier que l'utilisateur est admin
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = (await request.json()) as ResetFeaturedOrderBody;
    const { action } = body;

    if (action !== 'reset') {
      return NextResponse.json(
        { error: 'Action non reconnue. Utilisez "reset"' },
        { status: 400 }
      );
    }

    const db = await getDB();

    // Réinitialiser toutes les priorités
    await db.run(
      `UPDATE reviews SET display_priority = 0 WHERE is_featured = 1`
    );

    return NextResponse.json({
      success: true,
      message: 'Ordre réinitialisé avec succès',
    });
  } catch (error) {
    console.error('Erreur POST /api/admin/reviews/featured/order:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la réinitialisation' },
      { status: 500 }
    );
  }
}