export const dynamic = 'force-dynamic';

// app/api/reviews/featured/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFeaturedReviews, trackReviewDisplay } from '@/lib/services/reviews';

interface FeaturedReviewsBody {
  action?: 'auto-select';
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Number(searchParams.get('limit')) || 5;
    const productId = searchParams.get('productId')
      ? Number(searchParams.get('productId'))
      : undefined;
    const context = (searchParams.get('context') || 'home') as 'home' | 'product' | 'category';
    const excludeIdsParam = searchParams.get('excludeIds');
    const excludeIds = excludeIdsParam ? excludeIdsParam.split(',').map(Number) : [];

    // Récupération des avis vedettes
    const reviews = await getFeaturedReviews({
      limit,
      productId,
      excludeIds,
      context,
    });

    // Incrémenter les compteurs d'affichage en arrière-plan (fire-and-forget)
    for (const review of reviews) {
      trackReviewDisplay(review.id).catch((err) =>
        console.error('Erreur lors du tracking d\'affichage:', err)
      );
    }

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error('Erreur dans GET /api/reviews/featured:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération des avis' },
      { status: 500 }
    );
  }
}

// Optionnel : route POST pour forcer la mise à jour des paramètres (admin)
export async function POST(request: NextRequest) {
  try {
    // Vérification admin
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { verifyAdmin } = await import('@/lib/auth');
    const isAdmin = await verifyAdmin(token);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Non autorisé - Admin requis' }, { status: 401 });
    }

    const body = (await request.json()) as FeaturedReviewsBody;
    const { action } = body;

    if (action === 'auto-select') {
      const { autoSelectFeaturedReviews } = await import('@/lib/services/reviews');
      const selectedIds = await autoSelectFeaturedReviews(10);
      return NextResponse.json({ success: true, selectedIds });
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
  } catch (error) {
    console.error('Erreur dans POST /api/reviews/featured:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}