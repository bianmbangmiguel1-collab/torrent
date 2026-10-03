// app/api/admin/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// ============================================================
// Types
// ============================================================
interface CreateCategoryBody {
  name: string
  slug: string
  parent_id?: number | string | null
  description?: string | null
  position?: number | string
  is_active?: number | boolean
}

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const db = await getDB();
    const categories = await db.all(`
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.parent_id,
        c.description,
        c.position,
        c.is_active,
        c.created_at,
        p.name as parent_name
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      ORDER BY c.position ASC, c.name ASC
    `);

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Erreur GET /api/admin/categories:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = (await request.json()) as CreateCategoryBody;
    const { name, slug, parent_id, description, position, is_active } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Nom et slug requis' }, { status: 400 });
    }

    const db = await getDB();

    // Vérifier l'unicité du slug
    const existing = await db.get('SELECT id FROM categories WHERE slug = ?', [slug.trim()]);
    if (existing) {
      return NextResponse.json({ error: 'Ce slug existe déjà' }, { status: 400 });
    }

    const result = await db.run(
      `INSERT INTO categories (name, slug, parent_id, description, position, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        slug.trim(),
        parent_id ? Number(parent_id) : null,
        description?.trim() || null,
        Number(position) || 0,
        is_active !== undefined ? Number(is_active) : 1
      ]
    );

    const newCategory = await db.get('SELECT * FROM categories WHERE id = ?', [result.lastID]);

    // ✅ Revalidation pour rafraîchir automatiquement la page /admin/categories
    revalidatePath('/admin/categories');

    return NextResponse.json(
      { success: true, category: newCategory },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erreur POST /api/admin/categories:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}