export const dynamic = 'force-dynamic';

// app/api/products/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDB } from '@/lib/db';

interface CreateProductReviewBody {
  rating?: number;
  comment?: string;
}

export async function POST(request: NextRequest) {
  console.log('🚀 POST /api/products/reviews - DÉBUT');

  try {
    // 1. Récupérer le slug depuis les query params
    const searchParams = request.nextUrl.searchParams;
    const slug = searchParams.get('slug');
    console.log('📦 Slug reçu :', slug);

    if (!slug) {
      return NextResponse.json(
        { success: false, message: 'Slug produit requis' },
        { status: 400 }
      );
    }

    // 2. Récupérer le token (priorité: admin_session, user_session, puis token)
    const token = request.cookies.get('admin_session')?.value ||
                  request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value;
    console.log('🔐 Token présent ?', token ? 'OUI' : 'NON');

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentification requise' },
        { status: 401 }
      );
    }

    // 3. Vérifier le token
    const payload = await verifyToken(token);
    console.log('👤 Payload décodé :', payload);

    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Token invalide ou expiré' },
        { status: 401 }
      );
    }

    const userId = payload.userId || payload.sub;
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Utilisateur non reconnu' },
        { status: 401 }
      );
    }
    console.log('👤 userId =', userId);

    // 4. Lire le body
    const body: CreateProductReviewBody = await request.json();
    const { rating, comment } = body;
    console.log('⭐ Rating :', rating);
    console.log('💬 Comment :', comment);

    // 5. Validation
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, message: 'La note doit être comprise entre 1 et 5' },
        { status: 400 }
      );
    }
    if (!comment || comment.trim().length < 5) {
      return NextResponse.json(
        { success: false, message: 'Le commentaire doit contenir au moins 5 caractères' },
        { status: 400 }
      );
    }

    // 6. Connexion DB
    let db;
    try {
      db = await getDB();
      console.log('✅ DB connectée');
    } catch (dbError) {
      console.error('❌ Erreur connexion DB :', dbError);
      return NextResponse.json(
        { success: false, message: 'Erreur de connexion à la base' },
        { status: 500 }
      );
    }

    // 7. Récupérer le produit
    const product = await db.get(
      'SELECT id, title FROM products WHERE slug = ? AND status = ?',
      [slug, 'published']
    );
    console.log('📦 Produit trouvé :', product);

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Produit introuvable' },
        { status: 404 }
      );
    }

    // 8. Vérifier avis existant
    const existing = await db.get(
      'SELECT id FROM reviews WHERE user_id = ? AND product_id = ?',
      [userId, product.id]
    );
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Vous avez déjà donné votre avis' },
        { status: 409 }
      );
    }

    // 9. Insérer l’avis
    const result = await db.run(
      `INSERT INTO reviews (product_id, user_id, rating, comment, status, created_at)
       VALUES (?, ?, ?, ?, 'pending', datetime('now'))`,
      [product.id, userId, rating, comment.trim()]
    );
    console.log('✅ Avis inséré, id =', result.lastID);

    return NextResponse.json(
      {
        success: true,
        message: 'Avis envoyé avec succès',
        review: {
          id: result.lastID,
          productId: product.id,
          rating,
          comment: comment.trim(),
          status: 'pending',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ ERREUR GLOBALE POST /api/products/reviews :', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Erreur interne du serveur',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}