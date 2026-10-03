// app/api/admin/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import { getDB } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 1. Récupérer le cookie admin_session
    const token = request.cookies.get('admin_session')?.value

    if (!token) {
      return NextResponse.json(
        { authenticated: false, error: 'Session admin manquante' },
        { status: 401 }
      )
    }

    // 2. Vérifier la validité du JWT
    let payload: any
    try {
      const secret = new TextEncoder().encode(JWT_SECRET)
      const { payload: decoded } = await jose.jwtVerify(token, secret, {
        algorithms: ['HS256'],
      })
      payload = decoded
    } catch (error) {
      console.error('❌ Erreur de vérification JWT:', error)
      return NextResponse.json(
        { authenticated: false, error: 'Token invalide ou expiré' },
        { status: 401 }
      )
    }

    // 3. Vérifier que le payload correspond à un admin
    if (payload.role !== 'admin' && !payload.isAdmin && !payload.is_admin) {
      return NextResponse.json(
        { authenticated: false, error: 'Non autorisé' },
        { status: 403 }
      )
    }

    const adminId = payload.sub || payload.id
    if (!adminId) {
      return NextResponse.json(
        { authenticated: false, error: 'Identifiant administrateur manquant' },
        { status: 401 }
      )
    }

    // 4. Récupérer l'admin en base
    const db = await getDB()
    const admin = await db.get(
      `SELECT id, email, name, role, isActive
       FROM admin_accounts
       WHERE id = ?`,
      [adminId]
    )

    if (!admin) {
      return NextResponse.json(
        { authenticated: false, error: 'Administrateur non trouvé' },
        { status: 401 }
      )
    }

    if (admin.isActive === 0) {
      return NextResponse.json(
        { authenticated: false, error: 'Compte administrateur désactivé' },
        { status: 403 }
      )
    }

    // 5. Réponse avec les infos admin
    return NextResponse.json({
      authenticated: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    })
  } catch (error) {
    console.error('❌ Erreur inattendue dans /api/admin/me:', error)
    return NextResponse.json(
      { authenticated: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}