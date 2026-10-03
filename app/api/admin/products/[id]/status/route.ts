// app/api/admin/products/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { requireAdmin, createAdminErrorResponse } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ============================================================
// Types
// ============================================================
interface UpdateProductStatusBody {
  status: 'draft' | 'published' | 'archived'
}

// ============================================================
// PATCH : CHANGEMENT DE STATUT
// ============================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ Vérification admin via les headers ajoutés par le middleware
    const admin = await requireAdmin(request)
    if (!admin) {
      return createAdminErrorResponse()
    }

    const db = await getDB()
    const { id } = params
    const body = (await request.json()) as UpdateProductStatusBody
    const { status } = body

    // 1. Validation du statut
    const validStatuses = ['draft', 'published', 'archived']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Statut invalide. Autorise: draft, published, archived' },
        { status: 400 }
      )
    }

    // 2. Vérifier l'existence du produit
    const product = await db.get('SELECT id, status, title FROM products WHERE id = ?', [id])
    if (!product) {
      return NextResponse.json(
        { error: 'Produit non trouvé' },
        { status: 404 }
      )
    }

    // 3. Vérifier si la colonne published_at existe
    const columns = await db.all(`PRAGMA table_info(products)`)
    const columnNames = columns.map((c: any) => c.name)
    const hasPublishedAt = columnNames.includes('published_at')

    // 4. Mise à jour du statut
    if (status === 'published') {
      if (hasPublishedAt) {
        await db.run(`
          UPDATE products 
          SET status = ?, 
              published_at = datetime('now'), 
              updated_at = datetime('now') 
          WHERE id = ?
        `, [status, id])
      } else {
        // Si la colonne n'existe pas, l'ajouter puis mettre à jour
        await db.exec('ALTER TABLE products ADD COLUMN published_at DATETIME')
        console.log('✅ Colonne published_at ajoutée')
        await db.run(`
          UPDATE products 
          SET status = ?, 
              published_at = datetime('now'), 
              updated_at = datetime('now') 
          WHERE id = ?
        `, [status, id])
      }
    } else {
      await db.run(`
        UPDATE products 
        SET status = ?, 
            updated_at = datetime('now') 
        WHERE id = ?
      `, [status, id])
    }

    // 5. Récupérer le produit mis à jour
    const updatedProduct = await db.get('SELECT * FROM products WHERE id = ?', [id])

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      message: `Statut changé de "${product.status}" vers "${status}" pour "${product.title}"`
    })
  } catch (error: any) {
    console.error('❌ Erreur changement de statut:', error)

    // Si la colonne published_at n'existe pas encore, l'ajouter et réessayer
    if (error.message && error.message.includes('no such column: published_at')) {
      try {
        const db = await getDB()
        await db.exec('ALTER TABLE products ADD COLUMN published_at DATETIME')
        console.log('✅ Colonne published_at ajoutée avec succès')

        // Réessayer la mise à jour
        const { id } = params
        const body = (await request.json()) as UpdateProductStatusBody
        const { status } = body

        if (status === 'published') {
          await db.run(`
            UPDATE products 
            SET status = ?, 
                published_at = datetime('now'), 
                updated_at = datetime('now') 
            WHERE id = ?
          `, [status, id])
        } else {
          await db.run(`
            UPDATE products 
            SET status = ?, 
                updated_at = datetime('now') 
            WHERE id = ?
          `, [status, id])
        }

        const updatedProduct = await db.get('SELECT * FROM products WHERE id = ?', [id])
        return NextResponse.json({
          success: true,
          product: updatedProduct,
          message: `Statut changé vers "${status}" (colonne published_at ajoutée automatiquement)`
        })
      } catch (addError) {
        console.error('❌ Erreur ajout colonne published_at:', addError)
        return NextResponse.json(
          { error: 'Erreur lors de l\'ajout de la colonne published_at' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Erreur lors du changement de statut: ' + error.message },
      { status: 500 }
    )
  }
}