// app/api/admin/orders/recent/route.ts
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { requireAdmin, createAdminErrorResponse } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) return createAdminErrorResponse()

    const db = await getDB()
    const limit = Number(request.nextUrl.searchParams.get('limit')) || 5

    const orders = await db.all(`
      SELECT 
        o.id,
        o.order_number as orderNumber,
        u.name as userName,
        o.total as amount,
        o.status,
        o.created_at as createdAt
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT ?
    `, [limit])

    // Transformer le statut pour correspondre au frontend
    const formatted = orders.map((order: any) => {
      let status = order.status
      if (status === 'completed' || status === 'paid') status = 'completed'
      else if (status === 'pending') status = 'pending'
      else if (status === 'refunded') status = 'refunded'
      else status = 'pending'
      return { ...order, status }
    })

    return NextResponse.json({ success: true, orders: formatted })
  } catch (error) {
    console.error('❌ Erreur orders recent:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}