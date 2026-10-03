// app/api/admin/activities/route.ts
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { requireAdmin, createAdminErrorResponse } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) return createAdminErrorResponse()

    const db = await getDB()
    const limit = Number(request.nextUrl.searchParams.get('limit')) || 10

    // Récupérer les activités récentes depuis la table activities
    const activities = await db.all(`
      SELECT 
        id,
        action,
        created_at as createdAt
      FROM activities
      ORDER BY created_at DESC
      LIMIT ?
    `, [limit])

    return NextResponse.json({ success: true, activities })
  } catch (error) {
    console.error('❌ Erreur activities:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}