// app/api/admin/products/export/route.ts
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_session')?.value ||
                  request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value;
    if (!token || !(await verifyAdmin(token))) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const db = await getDB();
    const products = await db.all(`
      SELECT 
        p.id,
        p.title,
        p.slug,
        p.description,
        p.price,
        p.compare_price,
        p.stock,
        p.sku,
        p.barcode,
        p.status,
        p.type,
        p.category_id,
        c.name as category_name,
        p.brand,
        p.file_path,
        p.file_size,
        p.file_format,
        p.featured,
        p.created_at,
        p.updated_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.id DESC
    `);

    // Générer le CSV
    const headers = [
      'id', 'title', 'slug', 'description', 'price', 'compare_price',
      'stock', 'sku', 'barcode', 'status', 'type', 'category_id', 'category_name',
      'brand', 'file_path', 'file_size', 'file_format', 'featured',
      'created_at', 'updated_at'
    ];

    const rows = products.map(p => headers.map(h => p[h] ?? ''));
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=produits_${new Date().toISOString().slice(0,10)}.csv`,
      },
    });
  } catch (error) {
    console.error('❌ Erreur export:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}