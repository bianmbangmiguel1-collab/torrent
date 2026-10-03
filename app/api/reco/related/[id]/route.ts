// app/api/reco/related/[id]/route.ts
import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const db = await getDB()
  const src = await db.get<{ category_id: number | null }>(
    `SELECT category_id FROM products WHERE id = ?`, [params.id])
  if (!src) return NextResponse.json({ products: [] })

  const rows = await db.all(`
    SELECT p.id, p.slug, p.title, p.price,
           (SELECT url FROM product_images WHERE product_id = p.id AND is_main=1 LIMIT 1) AS main_image
    FROM products p
    WHERE p.status='published' AND p.id != ?
    ORDER BY
      CASE WHEN p.category_id = ? THEN 0 ELSE 1 END,
      (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) DESC
    LIMIT 3
  `, [params.id, src.category_id])
  return NextResponse.json({ products: rows })
}