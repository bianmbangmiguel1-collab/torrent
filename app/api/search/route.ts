export const dynamic = 'force-dynamic';

// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!query || query.length < 2) {
      return NextResponse.json({ products: [] });
    }

    const db = await getDB();

    // Recherche sur le titre, la description et les tags
    const products = await db.all(
      `
      SELECT 
        p.id,
        p.title,
        p.slug,
        p.price,
        p.compare_price,
        p.type,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) as main_image,
        (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) as avg_rating,
        (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as review_count,
        (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) as sales_count
      FROM products p
      WHERE p.status = 'published'
        AND (
          p.title LIKE '%' || ? || '%'
          OR p.description LIKE '%' || ? || '%'
          OR p.slug LIKE '%' || ? || '%'
        )
      ORDER BY 
        CASE 
          WHEN p.title LIKE ? || '%' THEN 1
          WHEN p.title LIKE '%' || ? || '%' THEN 2
          ELSE 3
        END,
        p.created_at DESC
      LIMIT ?
      `,
      [query, query, query, query, query, limit]
    );

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Erreur de recherche:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}