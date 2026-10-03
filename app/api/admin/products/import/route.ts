export const dynamic = 'force-dynamic';

// app/api/admin/products/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyAdmin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_session')?.value ||
                  request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value;
    if (!token || !(await verifyAdmin(token))) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return NextResponse.json({ error: 'Fichier vide' }, { status: 400 });
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const results = { created: 0, updated: 0, errors: 0 };

    const db = await getDB();

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || null; });

        const slug = row.slug || row.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `produit-${Date.now()}-${i}`;

        // Vérifier si le produit existe (par SKU ou slug)
        const existing = await db.get(
          'SELECT id FROM products WHERE sku = ? OR slug = ?',
          [row.sku || null, slug]
        );

        const data = {
          title: row.title || 'Produit sans titre',
          slug,
          description: row.description || null,
          price: Number(row.price) || 0,
          compare_price: row.compare_price ? Number(row.compare_price) : null,
          stock: Number(row.stock) || 0,
          sku: row.sku || null,
          barcode: row.barcode || null,
          status: row.status || 'draft',
          type: row.type || 'file',
          category_id: row.category_id ? Number(row.category_id) : null,
          brand: row.brand || null,
          file_path: row.file_path || null,
          file_size: row.file_size || null,
          file_format: row.file_format || null,
          featured: row.featured ? Number(row.featured) : 0,
        };

        if (existing) {
          // Mise à jour
          await db.run(`
            UPDATE products SET
              title = ?, slug = ?, description = ?, price = ?, compare_price = ?,
              stock = ?, sku = ?, barcode = ?, status = ?, type = ?,
              category_id = ?, brand = ?, file_path = ?, file_size = ?,
              file_format = ?, featured = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [
            data.title, data.slug, data.description, data.price, data.compare_price,
            data.stock, data.sku, data.barcode, data.status, data.type,
            data.category_id, data.brand, data.file_path, data.file_size,
            data.file_format, data.featured, existing.id
          ]);
          results.updated++;
        } else {
          // Création
          await db.run(`
            INSERT INTO products (
              title, slug, description, price, compare_price, stock,
              sku, barcode, status, type, category_id, brand,
              file_path, file_size, file_format, featured,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [
            data.title, data.slug, data.description, data.price, data.compare_price,
            data.stock, data.sku, data.barcode, data.status, data.type,
            data.category_id, data.brand, data.file_path, data.file_size,
            data.file_format, data.featured
          ]);
          results.created++;
        }
      } catch (err) {
        results.errors++;
        console.error(`❌ Erreur ligne ${i}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${results.created} créés, ${results.updated} mis à jour, ${results.errors} erreurs`
    });
  } catch (error) {
    console.error('❌ Erreur import:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}