export const dynamic = 'force-dynamic';

// app/api/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import path from 'path';
import fs from 'fs';

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
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 });
    }

    await db.run(
      'UPDATE orders SET download_count = download_count + 1 WHERE id = ?',
      [order.id]
    );

    const filePath = path.join(process.cwd(), 'public', order.file_path);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${path.basename(filePath)}"`,
      },
    });
  } catch (error) {
    console.error('❌ Erreur téléchargement:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}