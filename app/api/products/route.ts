export const dynamic = 'force-dynamic';

// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

// ============================================================
// GET : Récupérer les produits
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const db = await getDB()
    const searchParams = request.nextUrl.searchParams
    
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '1')
    const offset = (page - 1) * limit
    const category = searchParams.get('category') || ''
    const search = searchParams.get('search') || ''
    const sort = searchParams.get('sort') || 'newest'

    let whereClause = "WHERE p.status = 'published'"
    const params: any[] = []

    if (category) {
      whereClause += ' AND p.category_id = ?'
      params.push(category)
    }

    if (search) {
      whereClause += ' AND (p.title LIKE ? OR p.description LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    let orderBy = 'p.created_at DESC'
    if (sort === 'popular') orderBy = 'p.sales DESC'
    if (sort === 'price-low') orderBy = 'p.price ASC'
    if (sort === 'price-high') orderBy = 'p.price DESC'
    if (sort === 'trending') orderBy = 'p.sales DESC, p.created_at DESC'
    if (sort === 'best-sellers') orderBy = 'p.sales DESC'
    if (sort === 'newest') orderBy = 'p.created_at DESC'

    // 🔥 Récupérer les produits avec leurs images
    const products = await db.all(`
      SELECT 
        p.id,
        p.title,
        p.slug,
        p.description,
        p.price,
        p.compare_price,
        p.category_id,
        c.name as category_name,
        p.status,
        p.type,
        p.file_path,
        p.avg_rating,
        p.sales as sales_count,
        p.created_at,
        p.featured,
        p.stock,
        p.sku,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) as image,
        (SELECT COUNT(*) FROM reviews WHERE product_id = p.id AND status = 'approved') as review_count,
        CASE 
          WHEN p.created_at >= datetime('now', '-30 days') THEN 1 
          ELSE 0 
        END as is_new
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `, [...params, limit, offset])

    // 🔥 Récupérer le nombre total
    const countResult = await db.get(`
      SELECT COUNT(*) as total FROM products p
      ${whereClause}
    `, params)

    const total = countResult?.total || 0

    // 🔥 Ajouter les images supplémentaires pour chaque produit
    for (const product of products) {
      const images = await db.all(`
        SELECT url, is_main FROM product_images WHERE product_id = ?
        ORDER BY position ASC
      `, [product.id])
      product.images = images || []
    }

    return NextResponse.json({
      success: true,
      products: products || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
    
  } catch (error) {
    console.error('❌ Erreur GET /api/products:', error)
    return NextResponse.json({
      success: false,
      error: 'Erreur lors du chargement des produits',
      products: []
    }, { status: 500 })
  }
}