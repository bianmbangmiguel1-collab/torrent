export const dynamic = 'force-dynamic';

// app/api/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getDownloadUrl } from '@/lib/storage';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 });
    }

    const db = await getDB();
    const order = await db.get(
      `SELECT o.*, p.file_path, p.file_size, p.file_format
       FROM orders o
       LEFT JOIN products p ON o.product_id = p.id
       WHERE o.download_token = ? AND o.download_expires_at > datetime('now')`,
      [token]
    );

    if (!order) {
      return NextResponse.json(
        { error: 'Lien invalide ou expiré' },
        { status: 404 }
      );
    }

    if (!order.file_path) {
      return NextResponse.json(
        { error: 'Fichier introuvable pour ce produit' },
        { status: 404 }
      );
    }

    // Incrémenter le compteur
    await db.run(
      'UPDATE orders SET download_count = download_count + 1 WHERE id = ?',
      [order.id]
    );

    // Générer une URL signée valide 5 minutes
    const filename = order.file_path.split('/').pop() || 'download';
    const signedUrl = await getDownloadUrl(order.file_path, 300, filename);

    console.log(`✅ Redirection téléchargement: ${order.file_path}`);

    // Rediriger vers Supabase (pas de fs.readFileSync)
    return NextResponse.redirect(signedUrl);
  } catch (error: any) {
    console.error('❌ Erreur téléchargement:', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}