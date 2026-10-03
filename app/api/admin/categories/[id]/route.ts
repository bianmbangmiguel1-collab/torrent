// app/api/admin/categories/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// ============================================================
// Types
// ============================================================
interface UpdateCategoryBody {
  name: string
  slug: string
  parent_id?: number | string | null
  description?: string | null
  position?: number | string
  is_active?: number | boolean
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Vérification admin
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Vérification de l'ID
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: 'ID de catégorie invalide' },
        { status: 400 }
      );
    }

    const body = (await request.json()) as UpdateCategoryBody;
    const {
      name,
      slug,
      parent_id,
      description,
      position,
      is_active,
    } = body;

    // Validation des champs obligatoires
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Nom et slug requis' },
        { status: 400 }
      );
    }

    const db = await getDB();

    // Vérifier que la catégorie existe
    const existingCategory = await db.get(
      'SELECT id FROM categories WHERE id = ?',
      [id]
    );
    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Catégorie introuvable' },
        { status: 404 }
      );
    }

    // Vérifier l'unicité du slug (hors cette catégorie)
    const existingSlug = await db.get(
      'SELECT id FROM categories WHERE slug = ? AND id != ?',
      [slug.trim(), id]
    );
    if (existingSlug) {
      return NextResponse.json(
        { error: 'Ce slug existe déjà pour une autre catégorie' },
        { status: 400 }
      );
    }

    // Empêcher une catégorie d'être son propre parent
    if (parent_id !== null && parent_id !== undefined) {
      const parentId = Number(parent_id);
      if (parentId === id) {
        return NextResponse.json(
          { error: 'Une catégorie ne peut pas être son propre parent' },
          { status: 400 }
        );
      }

      // Vérifier que le parent existe
      const parent = await db.get(
        'SELECT id FROM categories WHERE id = ?',
        [parentId]
      );
      if (!parent) {
        return NextResponse.json(
          { error: 'La catégorie parente n’existe pas' },
          { status: 400 }
        );
      }
    }

    // Mise à jour
    await db.run(
      `UPDATE categories
       SET
         name = ?,
         slug = ?,
         parent_id = ?,
         description = ?,
         position = ?,
         is_active = ?
       WHERE id = ?`,
      [
        name.trim(),
        slug.trim(),
        parent_id ? Number(parent_id) : null,
        description?.trim() || null,
        Number(position) || 0,
        is_active !== undefined ? Number(is_active) : 1,
        id,
      ]
    );

    // Récupérer la catégorie mise à jour avec son parent
    const updated = await db.get(
      `SELECT
        c.id,
        c.name,
        c.slug,
        c.parent_id,
        c.description,
        c.position,
        c.is_active,
        c.created_at,
        p.name AS parent_name
       FROM categories c
       LEFT JOIN categories p ON c.parent_id = p.id
       WHERE c.id = ?`,
      [id]
    );

    // ✅ Revalidation pour rafraîchir la page /admin/categories
    revalidatePath('/admin/categories');

    return NextResponse.json({
      success: true,
      category: updated,
    });
  } catch (error) {
    console.error('Erreur PUT /api/admin/categories/[id]:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Vérification admin
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Vérification de l'ID
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: 'ID de catégorie invalide' },
        { status: 400 }
      );
    }

    const db = await getDB();

    // Vérifier que la catégorie existe
    const category = await db.get(
      'SELECT id, name FROM categories WHERE id = ?',
      [id]
    );
    if (!category) {
      return NextResponse.json(
        { error: 'Catégorie introuvable' },
        { status: 404 }
      );
    }

    // Vérifier les sous-catégories
    const children = await db.get(
      'SELECT COUNT(*) as count FROM categories WHERE parent_id = ?',
      [id]
    );
    if (Number(children?.count || 0) > 0) {
      return NextResponse.json(
        {
          error: 'Cette catégorie a des sous-catégories. Supprimez-les d’abord.',
        },
        { status: 400 }
      );
    }

    // Supprimer
    await db.run(
      'DELETE FROM categories WHERE id = ?',
      [id]
    );

    // ✅ Revalidation pour rafraîchir la page /admin/categories
    revalidatePath('/admin/categories');

    return NextResponse.json({
      success: true,
      message: `Catégorie "${category.name}" supprimée avec succès`,
    });
  } catch (error) {
    console.error('Erreur DELETE /api/admin/categories/[id]:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}