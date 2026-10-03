// app/api/recommendations/for-step/route.ts
import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const url = new URL(req.url)
  const stepId = url.searchParams.get('stepId')
  if (!stepId) return NextResponse.json({ products: [] })

  const db = await getDB()

  // 1. Produits liés directement à cette étape
  let products = await db.all(`
    SELECT p.*, sr.reason, sr.relevance_score
    FROM step_recommendations sr
    JOIN products p ON p.id = sr.product_id
    WHERE sr.step_id = ? AND p.status = 'published'
    ORDER BY sr.relevance_score DESC
    LIMIT 4
  `, [stepId])

  // 2. Fallback : si rien, prendre les best-sellers de la catégorie de l'objectif
  if (products.length === 0) {
    const step = await db.get(`SELECT * FROM journey_steps WHERE id = ?`, [stepId])
    const journey = await db.get(`SELECT * FROM journeys WHERE id = ?`, [step.journey_id])
    const goal = await db.get(`SELECT * FROM goals WHERE id = ?`, [journey.goal_id])

    products = await db.all(`
      SELECT p.*, 'Recommandé pour ton objectif' as reason
      FROM products p
      WHERE p.status = 'published' AND p.sales > 0
      ORDER BY p.sales DESC
      LIMIT 4
    `)
  }

  return NextResponse.json({ products })
}