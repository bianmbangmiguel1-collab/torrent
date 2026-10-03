// app/api/admin/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import bcrypt from 'bcryptjs'
import { getDB } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'

// ⚠️ Durée de session ADMIN : 8 heures (sécurisé)
const TOKEN_DURATION_SECONDS = 60 * 60 * 8 // 8h

// ============================================================
// Types
// ============================================================
interface AdminLoginBody {
  email?: string
  password?: string
  twoFactorCode?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AdminLoginBody
    const { email, password, twoFactorCode } = body

    // Ne jamais logger le mot de passe
    console.log('🔐 Tentative connexion admin:', { email, hasPassword: !!password })

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      )
    }

    const db = await getDB()

    // 1. Rechercher l'admin
    const admin = await db.get(
      `SELECT id, email, passwordHash, name, role, isActive, twoFactorEnabled
       FROM admin_accounts
       WHERE email = ?`,
      [email]
    )

    if (!admin) {
      return NextResponse.json(
        { error: 'Identifiants invalides' },
        { status: 401 }
      )
    }

    if (admin.isActive === 0) {
      return NextResponse.json(
        { error: 'Compte administrateur désactivé' },
        { status: 403 }
      )
    }

    // 2. Vérifier le mot de passe
    const isValid = await bcrypt.compare(password, admin.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Identifiants invalides' },
        { status: 401 }
      )
    }

    // 3. 2FA (si activé)
    if (admin.twoFactorEnabled === 1) {
      if (!twoFactorCode) {
        return NextResponse.json(
          { error: 'Code 2FA requis', require2FA: true },
          { status: 400 }
        )
      }

      // Vérifier le code en base (table TwoFactorCode)
      const codeValid = await db.get(
        `SELECT id FROM two_factor_codes
         WHERE userId = ? AND code = ? AND used = 0 AND expiresAt > datetime('now')`,
        [admin.id, twoFactorCode]
      )

      if (!codeValid) {
        return NextResponse.json(
          { error: 'Code 2FA invalide ou expiré' },
          { status: 401 }
        )
      }

      // Marquer le code comme utilisé
      await db.run(
        `UPDATE two_factor_codes SET used = 1 WHERE id = ?`,
        [codeValid.id]
      )
    }

    // 4. Générer le JWT admin
    const payload = {
      sub: String(admin.id),
      id: String(admin.id),
      email: admin.email,
      name: admin.name || 'Administrateur',
      role: 'admin',
      isAdmin: true,
      is_admin: true,
    }
    const secret = new TextEncoder().encode(JWT_SECRET)
    const token = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${TOKEN_DURATION_SECONDS}s`)
      .sign(secret)

    // 5. Mettre à jour lastLogin
    await db.run(
      `UPDATE admin_accounts SET lastLogin = CURRENT_TIMESTAMP WHERE id = ?`,
      [admin.id]
    )

    // 6. Réponse avec cookie admin_session UNIQUEMENT
    const response = NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      }
    })

    // ⚠️ NE PAS supprimer user_session – on laisse les sessions cohabiter
    // ⚠️ NE PAS supprimer token (compatibilité) – on utilise admin_session

    response.cookies.set('admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: TOKEN_DURATION_SECONDS,
      path: '/',
    })

    console.log(`✅ Admin connecté : ${admin.email}`)
    return response
  } catch (error) {
    console.error('❌ Erreur /api/admin/login:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'