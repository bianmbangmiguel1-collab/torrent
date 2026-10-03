// app/api/admin/check/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const db = await getDB()
    
    const admin = await db.get(
      'SELECT id, email, name, role, is_admin FROM users WHERE is_admin = 1 LIMIT 1'
    )
    
    if (!admin) {
      return NextResponse.json({
        success: false,
        message: 'Aucun administrateur trouvé',
        adminExists: false
      })
    }
    
    return NextResponse.json({
      success: true,
      adminExists: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        isAdmin: admin.is_admin === 1
      }
    })
    
  } catch (error) {
    console.error('❌ Erreur vérification admin:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la vérification' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'