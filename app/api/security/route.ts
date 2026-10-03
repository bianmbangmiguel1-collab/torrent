export const dynamic = 'force-dynamic';

// app/api/security/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import bcrypt from 'bcryptjs'

// ============================================================
// TYPES
// ============================================================

interface ChangePasswordBody {
  current_password?: string
  new_password?: string
}

interface TwoFactorBody {
  enable?: boolean
}

interface UserSecurityRecord {
  id: number
  name: string
  email: string
  is_verified: number
  is_admin: number
  two_factor_enabled: number
  two_factor_secret: string | null
  login_attempts: number
  lock_until: string | null
  last_login: string | null
  created_at: string
}

interface UserPasswordRecord {
  id: number
  password: string
}

interface DecodedToken {
  id?: number | string
  userId?: number | string
}

// ============================================================
// UTILITAIRE : Récupérer l'ID utilisateur depuis le token
// ============================================================

function getUserIdFromToken(token: string): number | null {
  try {
    const parts = token.split('.')

    if (parts.length < 2) {
      return null
    }

    const base64Url = parts[1]
    const base64 = base64Url
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => {
          return (
            '%' +
            ('00' + c.charCodeAt(0).toString(16)).slice(-2)
          )
        })
        .join('')
    )

    const decoded: DecodedToken = JSON.parse(jsonPayload)

    const rawUserId = decoded.id ?? decoded.userId

    if (rawUserId === undefined || rawUserId === null) {
      return null
    }

    const parsedUserId =
      typeof rawUserId === 'number'
        ? rawUserId
        : Number(rawUserId)

    return Number.isFinite(parsedUserId) ? parsedUserId : null
  } catch {
    return null
  }
}

// ============================================================
// UTILITAIRE : Récupérer le token de session
// ============================================================

function getSessionToken(request: NextRequest): string | null {
  return (
    request.cookies.get('user_session')?.value ||
    request.cookies.get('token')?.value ||
    null
  )
}

// ============================================================
// GET : Récupérer les informations de sécurité de l'utilisateur
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const token = getSessionToken(request)

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Non authentifié',
        },
        { status: 401 }
      )
    }

    const userId = getUserIdFromToken(token)

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token invalide',
        },
        { status: 401 }
      )
    }

    const db = await getDB()

    const user = await db.get<UserSecurityRecord>(
      `
        SELECT 
          id,
          name,
          email,
          is_verified,
          is_admin,
          two_factor_enabled,
          two_factor_secret,
          login_attempts,
          lock_until,
          last_login,
          created_at
        FROM users
        WHERE id = ?
      `,
      [userId]
    )

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Utilisateur non trouvé',
        },
        { status: 404 }
      )
    }

    // Récupérer les sessions actives
    const sessions = await db.all(
      `
        SELECT 
          id,
          device_type,
          browser,
          os,
          ip,
          created_at,
          expires_at,
          is_active
        FROM user_sessions
        WHERE user_id = ? AND is_active = 1
        ORDER BY created_at DESC
      `,
      [userId]
    )

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        two_factor_enabled: user.two_factor_enabled === 1,
        is_verified: user.is_verified === 1,
        is_admin: user.is_admin === 1,
      },
      sessions: sessions || [],
    })
  } catch (error) {
    console.error('❌ Erreur GET /api/security:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Erreur serveur',
      },
      { status: 500 }
    )
  }
}

// ============================================================
// PATCH : Changer le mot de passe
// ============================================================

export async function PATCH(request: NextRequest) {
  try {
    const token = getSessionToken(request)

    if (!token) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const userId = getUserIdFromToken(token)

    if (!userId) {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      )
    }

    const body = (await request.json()) as ChangePasswordBody

    const currentPassword = body.current_password
    const newPassword = body.new_password

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        {
          error:
            'Mot de passe actuel et nouveau mot de passe requis',
        },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        {
          error:
            'Le nouveau mot de passe doit contenir au moins 6 caractères',
        },
        { status: 400 }
      )
    }

    const db = await getDB()

    // Vérifier l'utilisateur
    const user = await db.get<UserPasswordRecord>(
      'SELECT id, password FROM users WHERE id = ?',
      [userId]
    )

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier l'ancien mot de passe
    const isValid = await bcrypt.compare(
      currentPassword,
      user.password
    )

    if (!isValid) {
      return NextResponse.json(
        {
          error: 'Mot de passe actuel incorrect',
        },
        { status: 400 }
      )
    }

    // Hasher le nouveau mot de passe
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(
      newPassword,
      salt
    )

    // Mettre à jour
    await db.run(
      `
        UPDATE users
        SET password = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [hashedPassword, userId]
    )

    return NextResponse.json({
      success: true,
      message: 'Mot de passe modifié avec succès',
    })
  } catch (error) {
    console.error('❌ Erreur PATCH /api/security:', error)

    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// ============================================================
// POST : Activer/Désactiver la double authentification
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const token = getSessionToken(request)

    if (!token) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const userId = getUserIdFromToken(token)

    if (!userId) {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      )
    }

    const body = (await request.json()) as TwoFactorBody

    const enable = body.enable === true

    const db = await getDB()

    await db.run(
      `
        UPDATE users
        SET two_factor_enabled = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [enable ? 1 : 0, userId]
    )

    return NextResponse.json({
      success: true,
      message: enable
        ? 'Double authentification activée'
        : 'Double authentification désactivée',
      enabled: enable,
    })
  } catch (error) {
    console.error('❌ Erreur POST /api/security:', error)

    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// ============================================================
// DELETE : Déconnecter toutes les sessions
// ============================================================

export async function DELETE(request: NextRequest) {
  try {
    const token = getSessionToken(request)

    if (!token) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const userId = getUserIdFromToken(token)

    if (!userId) {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      )
    }

    const db = await getDB()

    // Désactiver toutes les sessions
    await db.run(
      `
        UPDATE user_sessions
        SET is_active = 0
        WHERE user_id = ?
      `,
      [userId]
    )

    return NextResponse.json({
      success: true,
      message: 'Toutes les sessions ont été déconnectées',
    })
  } catch (error) {
    console.error('❌ Erreur DELETE /api/security:', error)

    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// ============================================================
// OPTIONS : CORS
// ============================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods':
        'GET, PATCH, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, Cookie',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  })
}