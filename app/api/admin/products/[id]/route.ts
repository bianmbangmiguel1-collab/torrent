// app/api/admin/products/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { requireAdmin, createAdminErrorResponse } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ============================================================
// GET : DÉTAIL D'UN PRODUIT
// ============================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()
  const rawId = params.id
  console.log(`[GET /admin/products/${rawId}] Début`)

  try {
    // 1. Vérification admin
    const admin = await requireAdmin(request)
    if (!admin) {
      console.warn(`[GET /admin/products/${rawId}] Admin non authentifié`)
      return createAdminErrorResponse()
    }
    console.log(`[GET /admin/products/${rawId}] Admin: ${admin.email}`)

    // 2. Conversion de l'ID en nombre
    const productId = parseInt(rawId, 10)
    if (isNaN(productId) || productId <= 0) {
      console.warn(`[GET /admin/products/${rawId}] ID invalide`)
      return NextResponse.json(
        { error: 'ID de produit invalide' },
        { status: 400 }
      )
    }

    const db = await getDB()

    // 3. Vérification d'existence simple (pour diagnostiquer)
    const exists = await db.get('SELECT id FROM products WHERE id = ?', [productId])
    console.log(`[GET /admin/products/${productId}] Existence brute : ${exists ? `OUI (id=${exists.id})` : 'NON'}`)

    if (!exists) {
      // On va vérifier si l'ID existe sous forme de chaîne (au cas où)
      const existsStr = await db.get('SELECT id FROM products WHERE id = ?', [rawId])
      console.log(`[GET /admin/products/${rawId}] Existence avec chaîne : ${existsStr ? 'OUI' : 'NON'}`)
      return NextResponse.json(
        { error: 'Produit non trouvé' },
        { status: 404 }
      )
    }

    // 4. Requête complète
    const product = await db.get(
      `
      SELECT 
        p.*,
        c.name as category_name,
        u.name as creator_name,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.product_id = p.id) as sales_count,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) as main_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = ?
      `,
      [productId]
    )

    if (!product) {
      // Cela ne devrait pas arriver si exists est vrai, mais on gère
      console.error(`[GET /admin/products/${productId}] Incohérence : exists=true mais product=null`)
      return NextResponse.json(
        { error: 'Produit non trouvé' },
        { status: 404 }
      )
    }
    console.log(`[GET /admin/products/${productId}] Produit trouvé : ${product.title}`)

    // 5. Récupération des images, tags, variants
    const images = await db.all(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY position ASC',
      [productId]
    )
    const tags = await db.all(
      `
      SELECT t.name FROM tags t
      JOIN product_tags pt ON pt.tag_id = t.id
      WHERE pt.product_id = ?
      `,
      [productId]
    )
    const variants = await db.all(
      'SELECT * FROM product_variants WHERE product_id = ?',
      [productId]
    )

    const formattedImages = images.map((img: any) => ({
      ...img,
      isMain: img.is_main === 1
    }))

    const duration = Date.now() - startTime
    console.log(`[GET /admin/products/${productId}] Terminé en ${duration}ms`)

    return NextResponse.json({
      success: true,
      product,
      images: formattedImages,
      tags: tags.map((t: any) => t.name),
      variants
    })
  } catch (error: any) {
    console.error(`[GET /admin/products/${rawId}] ERREUR:`, error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du produit: ' + error.message },
      { status: 500 }
    )
  }
}

// ============================================================
// PUT : MISE À JOUR D'UN PRODUIT
// ============================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()
  const rawId = params.id
  console.log(`[PUT /admin/products/${rawId}] Début`)

  try {
    const admin = await requireAdmin(request)
    if (!admin) {
      console.warn(`[PUT /admin/products/${rawId}] Admin non authentifié`)
      return createAdminErrorResponse()
    }
    console.log(`[PUT /admin/products/${rawId}] Admin: ${admin.email}`)

    const productId = parseInt(rawId, 10)
    if (isNaN(productId) || productId <= 0) {
      return NextResponse.json(
        { error: 'ID de produit invalide' },
        { status: 400 }
      )
    }

    const db = await getDB()
    const existing = await db.get('SELECT id FROM products WHERE id = ?', [productId])
    if (!existing) {
      console.warn(`[PUT /admin/products/${productId}] Produit non trouvé`)
      return NextResponse.json(
        { error: 'Produit non trouvé' },
        { status: 404 }
      )
    }

    const body = await request.json() as {
  title?: string
  price?: number | string
  slug?: string
  description?: string | null
  content?: string | null
  type?: string
  compare_price?: number | string | null
  cost_price?: number | string | null
  sku?: string | null
  barcode?: string | null
  stock?: number
  stock_alert?: number
  category_id?: number | null
  brand?: string | null
  status?: string
  visibility?: string
  password?: string | null
  published_at?: string | null
  scheduled_at?: string | null
  featured?: boolean | number
  weight?: number | null
  dimensions?: string | null
  file_path?: string | null
  file_size?: number | null
  file_format?: string | null
  download_limit?: number
  download_expires_days?: number
  validity_start_date?: string | null
  validity_end_date?: string | null
  validity_duration_days?: number
  validity_duration_unit?: string
  has_auto_renewal?: boolean | number
  renewal_price?: number | string | null
  base_currency?: string
  price_usd?: number | string | null
  price_eur?: number | string | null
  price_gbp?: number | string | null
  license_validity_days?: number
  license_quantity?: number
  group_id?: number | null
  group_link?: string | null
  require_phone?: boolean | number
  course_id?: number | null
  event_id?: number | null
  event_date?: string | null
  event_link?: string | null
  credits_amount?: number
  subscription_interval?: string | null
  subscription_trial_days?: number
  consultation_duration?: number
  affiliate_commission?: number | string
  meta_title?: string | null
  meta_description?: string | null
  meta_keywords?: string | null
}
    const { title, price } = body
    if (!title || price === undefined) {
      return NextResponse.json(
        { error: 'Le titre et le prix sont requis' },
        { status: 400 }
      )
    }

    const slug = body.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    const slugCheck = await db.get(
      'SELECT id FROM products WHERE slug = ? AND id != ?',
      [slug, productId]
    )
    if (slugCheck) {
      return NextResponse.json(
        { error: 'Ce slug est déjà utilisé' },
        { status: 400 }
      )
    }

    await db.run(
      `
      UPDATE products 
      SET 
        title = ?, slug = ?, description = ?, content = ?, type = ?,
        price = ?, compare_price = ?, cost_price = ?, sku = ?, barcode = ?,
        stock = ?, stock_alert = ?, category_id = ?, brand = ?,
        status = ?, visibility = ?, password = ?,
        published_at = ?, scheduled_at = ?, featured = ?,
        weight = ?, dimensions = ?,
        file_path = ?, file_size = ?, file_format = ?,
        download_limit = ?, download_expires_days = ?,
        validity_start_date = ?, validity_end_date = ?,
        validity_duration_days = ?, validity_duration_unit = ?,
        has_auto_renewal = ?, renewal_price = ?,
        base_currency = ?, price_usd = ?, price_eur = ?, price_gbp = ?,
        license_validity_days = ?, license_quantity = ?,
        group_id = ?, group_link = ?, require_phone = ?,
        course_id = ?, event_id = ?, event_date = ?, event_link = ?,
        credits_amount = ?, subscription_interval = ?, subscription_trial_days = ?,
        consultation_duration = ?, affiliate_commission = ?,
        meta_title = ?, meta_description = ?, meta_keywords = ?,
        updated_at = datetime('now')
      WHERE id = ?
      `,
      [
        title, slug, body.description ?? null, body.content ?? null, body.type || 'file',
        Number(price), body.compare_price ?? null, body.cost_price ?? null, body.sku ?? null, body.barcode ?? null,
        body.stock ?? 0, body.stock_alert ?? 5, body.category_id ?? null, body.brand ?? null,
        body.status || 'draft', body.visibility || 'public', body.password ?? null,
        body.published_at ?? null, body.scheduled_at ?? null, body.featured ? 1 : 0,
        body.weight ?? null, body.dimensions ?? null,
        body.file_path ?? null, body.file_size ?? null, body.file_format ?? null,
        body.download_limit ?? 0, body.download_expires_days ?? 30,
        body.validity_start_date ?? null, body.validity_end_date ?? null,
        body.validity_duration_days ?? 0, body.validity_duration_unit || 'days',
        body.has_auto_renewal ? 1 : 0, body.renewal_price ?? null,
        body.base_currency || 'FCFA', body.price_usd ?? null, body.price_eur ?? null, body.price_gbp ?? null,
        body.license_validity_days ?? 365, body.license_quantity ?? 1,
        body.group_id ?? null, body.group_link ?? null, body.require_phone ? 1 : 0,
        body.course_id ?? null, body.event_id ?? null, body.event_date ?? null, body.event_link ?? null,
        body.credits_amount ?? 0, body.subscription_interval ?? null, body.subscription_trial_days ?? 0,
        body.consultation_duration ?? 30, body.affiliate_commission ?? 10,
        body.meta_title ?? null, body.meta_description ?? null, body.meta_keywords ?? null,
        productId
      ]
    )

    const updatedProduct = await db.get('SELECT * FROM products WHERE id = ?', [productId])
    const duration = Date.now() - startTime
    console.log(`[PUT /admin/products/${productId}] Terminé en ${duration}ms`)

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      message: 'Produit mis à jour avec succès'
    })
  } catch (error: any) {
    console.error(`[PUT /admin/products/${rawId}] ERREUR:`, error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du produit: ' + error.message },
      { status: 500 }
    )
  }
}

// ============================================================
// DELETE : SUPPRESSION D'UN PRODUIT
// ============================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()
  const rawId = params.id
  console.log(`[DELETE /admin/products/${rawId}] Début`)

  try {
    const admin = await requireAdmin(request)
    if (!admin) {
      console.warn(`[DELETE /admin/products/${rawId}] Admin non authentifié`)
      return createAdminErrorResponse()
    }
    console.log(`[DELETE /admin/products/${rawId}] Admin: ${admin.email}`)

    const productId = parseInt(rawId, 10)
    if (isNaN(productId) || productId <= 0) {
      return NextResponse.json(
        { error: 'ID de produit invalide' },
        { status: 400 }
      )
    }

    const db = await getDB()
    const product = await db.get('SELECT id, title FROM products WHERE id = ?', [productId])
    if (!product) {
      console.warn(`[DELETE /admin/products/${productId}] Produit non trouvé`)
      return NextResponse.json(
        { error: 'Produit non trouvé' },
        { status: 404 }
      )
    }

    await db.run('DELETE FROM products WHERE id = ?', [productId])

    const duration = Date.now() - startTime
    console.log(`[DELETE /admin/products/${productId}] Terminé en ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: `Produit "${product.title}" supprimé avec succès`
    })
  } catch (error: any) {
    console.error(`[DELETE /admin/products/${rawId}] ERREUR:`, error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du produit: ' + error.message },
      { status: 500 }
    )
  }
}