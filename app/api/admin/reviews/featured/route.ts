// app/api/admin/reviews/featured/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { autoSelectFeaturedReviews } from '@/lib/services/reviews';

// ============================================================
// TYPES
// ============================================================

interface FeaturedActionBody {
  action?: string;
  limit?: number;
}

interface FeaturedSettingsBody {
  autoMode?: boolean;
}

// ─── GET : Récupérer les avis vedettes ──────────────────────────────
export async function GET(request: NextRequest) {
  try {
    // Vérifier que l'utilisateur est admin
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const db = await getDB();
    
    // Récupérer les avis avec leurs informations
    const reviews = await db.all(`
      SELECT
        r.id,
        r.user_id,
        r.rating,
        r.comment,
        r.is_visible,
        r.is_featured,
        r.display_priority,
        r.display_count,
        r.click_count,
        r.created_at,
        r.scheduled_start,
        r.scheduled_end,
        u.name as user_name,
        u.avatar as user_avatar,
        p.title as product_title,
        p.slug as product_slug
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN products p ON r.product_id = p.id
      WHERE r.status = 'approved'
      ORDER BY r.display_priority ASC, r.is_featured DESC, r.helpful_count DESC
      LIMIT 50
    `);

    // Récupérer le mode automatique depuis les paramètres (par défaut true)
    const settings = await db.get(
      `SELECT value FROM admin_settings WHERE key = 'review_auto_mode'`
    );
    const autoMode = settings?.value !== 'false';

    return NextResponse.json({ 
      reviews, 
      autoMode,
      total: reviews.length 
    });
  } catch (error) {
    console.error('Erreur GET /api/admin/reviews/featured:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération des avis vedettes' },
      { status: 500 }
    );
  }
}

// ─── POST : Lancer la sélection automatique ─────────────────────────
export async function POST(request: NextRequest) {
  try {
    // Vérifier que l'utilisateur est admin
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = (await request.json()) as FeaturedActionBody;
    const { action, limit = 10 } = body;

    if (action === 'auto-select') {
      // Lancer l'algorithme de sélection automatique
      const selectedIds = await autoSelectFeaturedReviews(limit);
      
      return NextResponse.json({ 
        success: true, 
        selectedIds,
        count: selectedIds.length,
        message: `${selectedIds.length} avis sélectionnés automatiquement`
      });
    }

    // Autres actions possibles
    if (action === 'clear-all') {
      const db = await getDB();
      await db.run('UPDATE reviews SET display_priority = 0, is_featured = 0 WHERE is_featured = 1');
      return NextResponse.json({ 
        success: true, 
        message: 'Tous les avis vedettes ont été réinitialisés' 
      });
    }

    return NextResponse.json(
      { error: 'Action non reconnue. Utilisez "auto-select" ou "clear-all"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Erreur POST /api/admin/reviews/featured:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'action' },
      { status: 500 }
    );
  }
}

// ─── PUT : Mettre à jour les paramètres ─────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    // Vérifier que l'utilisateur est admin
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = (await request.json()) as FeaturedSettingsBody;
    const { autoMode } = body;

    if (autoMode === undefined) {
      return NextResponse.json(
        { error: 'Le paramètre autoMode est requis' },
        { status: 400 }
      );
    }

    const db = await getDB();
    
    // Mettre à jour le mode automatique dans les paramètres
    await db.run(
      `INSERT INTO admin_settings (key, value) 
       VALUES ('review_auto_mode', ?) 
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [autoMode ? 'true' : 'false']
    );

    return NextResponse.json({ 
      success: true, 
      autoMode,
      message: `Mode automatique ${autoMode ? 'activé' : 'désactivé'}` 
    });
  } catch (error) {
    console.error('Erreur PUT /api/admin/reviews/featured:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la mise à jour des paramètres' },
      { status: 500 }
    );
  }
}