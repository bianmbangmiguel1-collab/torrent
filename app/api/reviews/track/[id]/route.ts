// app/api/reviews/track/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { trackReviewDisplay, trackReviewClick, trackReviewConversion } from '@/lib/services/reviews';

interface TrackReviewBody {
  type?: 'display' | 'click' | 'conversion';
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviewId = Number(params.id);
    if (isNaN(reviewId) || reviewId <= 0) {
      return NextResponse.json(
        { error: 'ID d’avis invalide' },
        { status: 400 }
      );
    }

    const body = (await request.json()) as TrackReviewBody;
    const { type } = body; // 'display' | 'click' | 'conversion'

    if (!type || !['display', 'click', 'conversion'].includes(type)) {
      return NextResponse.json(
        { error: 'Type de tracking invalide. Utilisez display, click ou conversion.' },
        { status: 400 }
      );
    }

    // Exécuter la fonction de tracking appropriée
    switch (type) {
      case 'display':
        await trackReviewDisplay(reviewId);
        break;
      case 'click':
        await trackReviewClick(reviewId);
        break;
      case 'conversion':
        await trackReviewConversion(reviewId);
        break;
      default:
        // Ne devrait jamais arriver grâce à la validation
        return NextResponse.json(
          { error: 'Type non supporté' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur dans POST /api/reviews/track/[id]:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors du tracking' },
      { status: 500 }
    );
  }
}