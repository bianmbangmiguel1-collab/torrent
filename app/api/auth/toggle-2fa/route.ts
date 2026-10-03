// app/api/auth/toggle-2fa/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import { getDB } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'

interface Toggle2FABody {
  enabled: boolean | number
}

// ============================================================
// HELPER : Extraire l'utilisateur du JWT
// ============================================================
async function getUserFromToken(request: NextRequest) {
  let token =
    request.cookies.get('user_session')?.value ||
    request.cookies.get('admin_session')?.value ||
    request.cookies.get('token')?.value

  if (!token) {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
  }

  if (!token) throw new Error('TOKEN_MISSING')

  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jose.jwtVerify(token, secret, { algorithms: ['HS256'] })

    const rawId = (payload as any).id || (payload as any).userId || (payload as any).sub
    const userId = parseInt(String(rawId), 10)
    if (Number.isNaN(userId)) throw new Error('USER_NOT_FOUND')

    const db = await getDB()
    const user = await db.get(`SELECT id, email, two_factor_enabled FROM users WHERE id = ?`, [userId])
    if (!user) throw new Error('USER_NOT_FOUND')

    return { user, db }
  } catch (err: any) {
    if (err.message === 'TOKEN_MISSING' || err.message === 'USER_NOT_FOUND') throw err
    console.error('❌ Token toggle-2fa invalide:', err)
    throw new Error('TOKEN_INVALID')
  }
}

// ============================================================
// POST /api/auth/toggle-2fa
// Body attendu : { enabled: boolean }
// ============================================================
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 POST /api/auth/toggle-2fa - début')

    const { user, db } = await getUserFromToken(request)
    const body = (await request.json()) as Toggle2FABody
    const enabled = body.enabled === true || body.enabled === 1 ? 1 : 0

    await db.run(
      `UPDATE users SET two_factor_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [enabled, user.id]
    )

    console.log(`✅ 2FA ${enabled ? 'activée' : 'désactivée'} pour ${user.email}`)

    return NextResponse.json({
      success: true,
      message: enabled ? 'Authentification à deux facteurs activée' : 'Authentification à deux facteurs désactivée',
      two_factor_enabled: enabled === 1,
    })
  } catch (error: any) {
    console.error('❌ ERREUR POST /api/auth/toggle-2fa:', error)

    if (error.message === 'TOKEN_MISSING') {
      return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 })
    }
    if (error.message === 'TOKEN_INVALID') {
      return NextResponse.json({ success: false, message: 'Token invalide ou expiré' }, { status: 401 })
    }
    if (error.message === 'USER_NOT_FOUND') {
      return NextResponse.json({ success: false, message: 'Utilisateur introuvable' }, { status: 404 })
    }

    return NextResponse.json(
      { success: false, message: error?.message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'