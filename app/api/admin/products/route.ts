// app/api/admin/products/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { requireAdmin, createAdminErrorResponse } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ============================================================
// GET : LISTE DES PRODUITS AVEC PAGINATION ET FILTRES
// ============================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  console.log(`[GET /api/admin/products] Début de la requête`)

  try {
    console.log(`[GET /api/admin/products] Vérification admin...`)
    const admin = await requireAdmin(request)
    if (!admin) {
      console.warn(`[GET /api/admin/products] Accès admin refusé`)
      return createAdminErrorResponse()
    }
    console.log(`[GET /api/admin/products] Admin authentifié: ${admin.email}`)

    const db = await getDB()
    const { searchParams } = request.nextUrl

    const page = Number(searchParams.get('page')) || 1
    const limit = Number(searchParams.get('limit')) || 10
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const type = searchParams.get('type') || ''
    const sort = searchParams.get('sort') || 'created_at'
    const order = searchParams.get('order') || 'DESC'

    console.log(`[GET /api/admin/products] Paramètres: page=${page}, limit=${limit}, search="${search}", status="${status}", type="${type}", sort=${sort}, order=${order}`)

    const offset = (page - 1) * limit

    let whereClauses: string[] = []
    const params: any[] = []

    if (search) {
      whereClauses.push(`(p.title LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)`)
      const pattern = `%${search}%`
      params.push(pattern, pattern, pattern)
      console.log(`[GET /api/admin/products] Recherche: "${search}"`)
    }

    if (status) {
      whereClauses.push(`p.status = ?`)
      params.push(status)
      console.log(`[GET /api/admin/products] Filtre statut: ${status}`)
    }

    if (type && type !== 'all') {
      whereClauses.push(`p.type = ?`)
      params.push(type)
      console.log(`[GET /api/admin/products] Filtre type: ${type}`)
    }

    const whereClause = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''

    const validSortColumns = ['title', 'price', 'created_at', 'updated_at', 'sales', 'avg_rating']
    const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at'
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

    // Requête SQL
    const sqlQuery = `
      SELECT 
        p.id,
        p.title,
        p.slug,
        p.description,
        p.price,
        p.compare_price,
        p.stock,
        p.category_id,
        c.name as category_name,
        p.status,
        p.type,
        p.featured,
        p.file_path,
        p.sales as sales_count,
        p.sku,
        p.created_at,
        u.name as creator_name,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) as main_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.created_by = u.id
      ${whereClause}
      ORDER BY p.${sortColumn} ${sortOrder}
      LIMIT ? OFFSET ?
    `
    console.log(`[GET /api/admin/products] SQL: ${sqlQuery}`)
    console.log(`[GET /api/admin/products] Paramètres SQL: ${JSON.stringify([...params, limit, offset])}`)

    const products = await db.all(sqlQuery, [...params, limit, offset])
    console.log(`[GET /api/admin/products] ${products.length} produits récupérés`)

    // Compter le total
    const countSql = `
      SELECT COUNT(*) as total
      FROM products p
      ${whereClause}
    `
    const totalResult = await db.get(countSql, params)
    const total = totalResult?.total || 0
    const totalPages = Math.ceil(total / limit)

    console.log(`[GET /api/admin/products] Total: ${total}, pages: ${totalPages}`)

    const duration = Date.now() - startTime
    console.log(`[GET /api/admin/products] Terminé en ${duration}ms`)

    return NextResponse.json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error: any) {
    console.error(`[GET /api/admin/products] ERREUR:`, error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des produits: ' + error.message },
      { status: 500 }
    )
  }
}

// ============================================================
// POST : CRÉATION D'UN PRODUIT
// ============================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log(`[POST /api/admin/products] Début de la requête`)

  try {
    console.log(`[POST /api/admin/products] Vérification admin...`)
    const admin = await requireAdmin(request)
    if (!admin) {
      console.warn(`[POST /api/admin/products] Accès admin refusé`)
      return createAdminErrorResponse()
    }
    console.log(`[POST /api/admin/products] Admin authentifié: ${admin.email}`)

    const db = await getDB()
    const body = await request.json() as {
  title?: string
  description?: string | null
  content?: string | null
  type?: string
  price?: number | string
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
  slug?: string
}
    console.log(`[POST /api/admin/products] Body reçu:`, JSON.stringify(body, null, 2))

    const {
      title,
      description,
      content,
      type = 'file',
      price,
      compare_price,
      cost_price,
      sku,
      barcode,
      stock = 0,
      stock_alert = 5,
      category_id,
      brand,
      status = 'draft',
      visibility = 'public',
      password,
      published_at,
      scheduled_at,
      featured = 0,
      weight,
      dimensions,
      file_path,
      file_size,
      file_format,
      download_limit = 0,
      download_expires_days = 30,
      validity_start_date,
      validity_end_date,
      validity_duration_days = 0,
      validity_duration_unit = 'days',
      has_auto_renewal = 0,
      renewal_price,
      base_currency = 'FCFA',
      price_usd,
      price_eur,
      price_gbp,
      license_validity_days = 365,
      license_quantity = 1,
      group_id,
      group_link,
      require_phone = 0,
      course_id,
      event_id,
      event_date,
      event_link,
      credits_amount = 0,
      subscription_interval,
      subscription_trial_days = 0,
      consultation_duration = 30,
      affiliate_commission = 10,
      meta_title,
      meta_description,
      meta_keywords,
    } = body

    // Validation
    if (!title) {
      console.warn(`[POST /api/admin/products] Titre manquant`)
      return NextResponse.json({ error: 'Le titre est requis' }, { status: 400 })
    }
    if (price === undefined || price === null || price === '') {
      console.warn(`[POST /api/admin/products] Prix manquant`)
      return NextResponse.json({ error: 'Le prix est requis' }, { status: 400 })
    }
    console.log(`[POST /api/admin/products] Titre: "${title}", Prix: ${price}`)

    // Génération du slug
    let slug = body.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    console.log(`[POST /api/admin/products] Slug généré: "${slug}"`)
    let slugCheck = await db.get('SELECT id FROM products WHERE slug = ?', [slug])
    let counter = 1
    while (slugCheck) {
      slug = `${slug}-${counter}`
      slugCheck = await db.get('SELECT id FROM products WHERE slug = ?', [slug])
      counter++
      console.log(`[POST /api/admin/products] Slug déjà pris, nouveau slug: "${slug}"`)
    }

    // Insertion du produit
    const insertSql = `
      INSERT INTO products (
        title, slug, description, content, type,
        price, compare_price, cost_price, sku, barcode,
        stock, stock_alert, category_id, brand,
        status, visibility, password,
        published_at, scheduled_at, featured,
        weight, dimensions,
        file_path, file_size, file_format,
        download_limit, download_expires_days,
        validity_start_date, validity_end_date,
        validity_duration_days, validity_duration_unit,
        has_auto_renewal, renewal_price,
        base_currency, price_usd, price_eur, price_gbp,
        license_validity_days, license_quantity,
        group_id, group_link, require_phone,
        course_id, event_id, event_date, event_link,
        credits_amount, subscription_interval, subscription_trial_days,
        consultation_duration, affiliate_commission,
        meta_title, meta_description, meta_keywords,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?,
        ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?,
        datetime('now'), datetime('now')
      )
    `
    console.log(`[POST /api/admin/products] SQL Insert: ${insertSql}`)
    const values = [
      title, slug, description || null, content || null, type,
      Number(price), compare_price ?? null, cost_price ?? null, sku ?? null, barcode ?? null,
      stock, stock_alert, category_id ?? null, brand ?? null,
      status, visibility, password ?? null,
      published_at ?? null, scheduled_at ?? null, featured ? 1 : 0,
      weight ?? null, dimensions ?? null,
      file_path ?? null, file_size ?? null, file_format ?? null,
      download_limit, download_expires_days,
      validity_start_date ?? null, validity_end_date ?? null,
      validity_duration_days, validity_duration_unit,
      has_auto_renewal ? 1 : 0, renewal_price ?? null,
      base_currency, price_usd ?? null, price_eur ?? null, price_gbp ?? null,
      license_validity_days, license_quantity,
      group_id ?? null, group_link ?? null, require_phone ? 1 : 0,
      course_id ?? null, event_id ?? null, event_date ?? null, event_link ?? null,
      credits_amount, subscription_interval ?? null, subscription_trial_days,
      consultation_duration, affiliate_commission,
      meta_title ?? null, meta_description ?? null, meta_keywords ?? null,
    ]
    console.log(`[POST /api/admin/products] Valeurs: ${JSON.stringify(values)}`)

    const result = await db.run(insertSql, values)
    const productId = result.lastID
    console.log(`[POST /api/admin/products] Produit créé avec ID ${productId}`)

    const newProduct = await db.get('SELECT * FROM products WHERE id = ?', [productId])
    console.log(`[POST /api/admin/products] Nouveau produit:`, newProduct)

    const duration = Date.now() - startTime
    console.log(`[POST /api/admin/products] Terminé en ${duration}ms`)

    return NextResponse.json(
      {
        success: true,
        product: newProduct,
        message: 'Produit créé avec succès',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error(`[POST /api/admin/products] ERREUR:`, error)
    // Si c'est une erreur de colonne manquante, on tente d'ajouter la colonne
    if (error.message && error.message.includes('no such column')) {
      try {
        const db = await getDB()
        const match = error.message.match(/no such column: (\w+)/)
        if (match) {
          const col = match[1]
          await db.exec(`ALTER TABLE products ADD COLUMN ${col} TEXT`)
          console.log(`[POST /api/admin/products] Colonne ${col} ajoutée automatiquement`)
          return NextResponse.json(
            { error: `Colonne ${col} manquante a été ajoutée. Veuillez réessayer.` },
            { status: 500 }
          )
        }
      } catch (addErr) {
        console.error(`[POST /api/admin/products] Erreur ajout colonne:`, addErr)
      }
    }
    return NextResponse.json(
      { error: 'Erreur lors de la création du produit: ' + error.message },
      { status: 500 }
    )
  }
}