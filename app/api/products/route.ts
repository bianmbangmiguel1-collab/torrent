export const dynamic = 'force-dynamic'

// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

const MAX_PAGE_SIZE = 50
const MAX_SEARCH_LENGTH = 100

export async function GET(request: NextRequest) {
  try {
    const db = await getDB()
    const searchParams = request.nextUrl.searchParams
    const requestedLimit = Number.parseInt(searchParams.get('limit') || '20', 10)
    const requestedPage = Number.parseInt(searchParams.get('page') || '1', 10)
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), MAX_PAGE_SIZE)
      : 20
    const page = Number.isFinite(requestedPage)
      ? Math.min(Math.max(requestedPage, 1), 100_000)
      : 1
    const offset = (page - 1) * limit
    const category = (searchParams.get('category') || '').trim()
    const search = (searchParams.get('search') || '').trim().slice(0, MAX_SEARCH_LENGTH)
    const requestedSort = searchParams.get('sort') || 'newest'

    const whereParts = ["p.status = 'published'"]
    const params: Array<string | number> = []

    if (category) {
      const categoryId = Number(category)
      if (!Number.isInteger(categoryId) || categoryId < 1) {
        return NextResponse.json({ success: false, error: 'Catégorie invalide', products: [] }, { status: 400 })
      }
      whereParts.push('p.category_id = ?')
      params.push(categoryId)
    }

    if (search) {
      whereParts.push('(p.title LIKE ? OR p.description LIKE ?)')
      params.push(`%${search}%`, `%${search}%`)
    }

    const sortColumns: Record<string, string> = {
      popular: 'p.sales DESC, p.created_at DESC',
      'price-low': 'p.price ASC, p.created_at DESC',
      'price-high': 'p.price DESC, p.created_at DESC',
      trending: 'p.sales DESC, p.created_at DESC',
      'best-sellers': 'p.sales DESC, p.created_at DESC',
      newest: 'p.created_at DESC',
    }
    const orderBy = sortColumns[requestedSort] || sortColumns.newest
    const whereClause = `WHERE ${whereParts.join(' AND ')}`

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
        p.avg_rating,
        p.sales as sales_count,
        p.created_at,
        p.featured,
        p.stock,
        p.sku,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) as image,
        (SELECT COUNT(*) FROM reviews WHERE product_id = p.id AND status = 'approved') as review_count,
        CASE WHEN p.created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END as is_new
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `, [...params, limit, offset])

    const countResult = await db.get<{ total: number }>(`
      SELECT COUNT(*) as total
      FROM products p
      ${whereClause}
    `, params)

    const total = Number(countResult?.total || 0)

    return NextResponse.json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur GET /api/products:', error)
    return NextResponse.json({
      success: false,
      error: 'Erreur lors du chargement des produits',
      products: [],
    }, { status: 500 })
  }
}
