// app/api/orders/latest/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const provider = req.nextUrl.searchParams.get('provider') || 'chariow'
    const db = await getDB()

    // 🎯 On cherche en 2 temps :
    //   1. Une commande PAYÉE récente (priorité absolue)
    //   2. Sinon, la commande pending la plus récente

    // Étape 1 : une commande déjà payée dans les 2 dernières heures
    let order = await db.get<any>(
      `SELECT
         o.id, o.order_number, o.total, o.currency,
         o.status, o.payment_status, o.payment_method,
         o.paid_at, o.created_at,
         p.title AS product_title
       FROM orders o
       LEFT JOIN products p ON p.id = o.product_id
       WHERE o.user_id = ?
         AND o.payment_method = ?
         AND o.payment_status = 'paid'
         AND o.created_at > datetime('now', '-2 hours')
       ORDER BY o.paid_at DESC, o.id DESC
       LIMIT 1`,
      [user.id, provider],
    )

    // Étape 2 : sinon, chercher une commande pending récente
    if (!order) {
      order = await db.get<any>(
        `SELECT
           o.id, o.order_number, o.total, o.currency,
           o.status, o.payment_status, o.payment_method,
           o.paid_at, o.created_at,
           p.title AS product_title
         FROM orders o
         LEFT JOIN products p ON p.id = o.product_id
         WHERE o.user_id = ?
           AND o.payment_method = ?
           AND o.created_at > datetime('now', '-2 hours')
         ORDER BY o.id DESC
         LIMIT 1`,
        [user.id, provider],
      )
    }

    if (!order) {
      return NextResponse.json(
        { error: 'Aucune commande récente trouvée' },
        { status: 404 },
      )
    }

    console.log(
      `📦 Latest order for user ${user.id} (${provider}): #${order.id} (${order.payment_status})`,
    )

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        total: order.total,
        currency: order.currency || 'XAF',
        status: order.status,
        payment_status: order.payment_status,
        payment_method: order.payment_method,
        product_title: order.product_title,
        paid_at: order.paid_at,
      },
    })
  } catch (err: any) {
    console.error('❌ GET /api/orders/latest:', err)
    return NextResponse.json(
      { error: err.message || 'Erreur serveur' },
      { status: 500 },
    )
  }
}