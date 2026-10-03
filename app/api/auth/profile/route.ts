// app/api/auth/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import { getDB } from '@/lib/db'

const JWT_SECRET =
  process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'

// ============================================================
// Types
// ============================================================
interface ProfileUpdateBody {
  name?: string
  phone?: string
  bio?: string
  address?: string
  city?: string
  country?: string
  postal_code?: string
  preferences?: unknown
}

// ============================================================
// HELPER : Extraire l'utilisateur depuis le JWT
// ============================================================
async function getUserFromToken(request: NextRequest) {
  // ⚠️ CORRECTION : lire les bons cookies (user_session / admin_session)
  // avant l'ancien nom "token", puis fallback sur le header Bearer.
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

  if (!token) {
    throw new Error('TOKEN_MISSING')
  }

  let payload: jose.JWTPayload

  try {
    const secret = new TextEncoder().encode(JWT_SECRET)

    const result = await jose.jwtVerify(token, secret, {
      algorithms: ['HS256'],
    })

    payload = result.payload
  } catch (error) {
    console.error('❌ Token profil invalide:', error)
    throw new Error('TOKEN_INVALID')
  }

  const db = await getDB()

  // 1. ID dans sub
  if (payload.sub) {
    const userId = Number(payload.sub)

    if (Number.isInteger(userId)) {
      const user = await db.get(
        `SELECT * FROM users WHERE id = ?`,
        [userId]
      )

      if (user) {
        return { user, db }
      }
    }
  }

  // 2. userId
  if (payload.userId !== undefined) {
    const userId = Number(payload.userId)

    if (Number.isInteger(userId)) {
      const user = await db.get(
        `SELECT * FROM users WHERE id = ?`,
        [userId]
      )

      if (user) {
        return { user, db }
      }
    }
  }

  // 3. id
  if (payload.id !== undefined) {
    const userId = Number(payload.id)

    if (Number.isInteger(userId)) {
      const user = await db.get(
        `SELECT * FROM users WHERE id = ?`,
        [userId]
      )

      if (user) {
        return { user, db }
      }
    }
  }

  // 4. email
  if (typeof payload.email === 'string') {
    const user = await db.get(
      `SELECT * FROM users WHERE email = ?`,
      [payload.email]
    )

    if (user) {
      return { user, db }
    }
  }

  throw new Error('USER_NOT_FOUND')
}

export async function PUT(request: NextRequest) {
  try {
    console.log('🚀 PUT /api/auth/profile - début')

    const { user, db } = await getUserFromToken(request)

    console.log('👤 Utilisateur:', user.id, user.email)

    const body: ProfileUpdateBody = await request.json()

    console.log('📦 Données reçues:', body)

    const name =
      typeof body.name === 'string'
        ? body.name.trim()
        : ''

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: 'Le nom complet est obligatoire',
        },
        { status: 400 }
      )
    }

    const phone =
      typeof body.phone === 'string'
        ? body.phone.trim()
        : null

    const bio =
      typeof body.bio === 'string'
        ? body.bio.trim()
        : null

    const address =
      typeof body.address === 'string'
        ? body.address.trim()
        : null

    const city =
      typeof body.city === 'string'
        ? body.city.trim()
        : null

    const country =
      typeof body.country === 'string'
        ? body.country.trim()
        : null

    const postalCode =
      typeof body.postal_code === 'string'
        ? body.postal_code.trim()
        : null

    let preferences = user.preferences || null

    if (body.preferences !== undefined) {
      preferences = JSON.stringify(body.preferences)
    }

    await db.run(
      `
        UPDATE users
        SET
          name = ?,
          phone = ?,
          bio = ?,
          address = ?,
          city = ?,
          country = ?,
          postal_code = ?,
          preferences = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        name,
        phone,
        bio,
        address,
        city,
        country,
        postalCode,
        preferences,
        user.id,
      ]
    )

    const updatedUser = await db.get(
      `
        SELECT
          id,
          name,
          email,
          role,
          is_admin,
          is_verified,
          phone,
          bio,
          address,
          city,
          country,
          postal_code,
          avatar,
          preferences,
          profile_completeness,
          onboarding_completed,
          onboarding_step,
          engagement_score,
          total_time_spent,
          last_activity,
          created_at,
          updated_at
        FROM users
        WHERE id = ?
      `,
      [user.id]
    )

    if (!updatedUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'Utilisateur introuvable après mise à jour',
        },
        { status: 404 }
      )
    }

    let parsedPreferences = {}

    try {
      parsedPreferences = updatedUser.preferences
        ? JSON.parse(updatedUser.preferences)
        : {}
    } catch {
      parsedPreferences = {}
    }

    console.log(
      `✅ Profil utilisateur ${user.id} enregistré`
    )

    return NextResponse.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      user: {
        ...updatedUser,
        preferences: parsedPreferences,
      },
    })
  } catch (error: any) {
    console.error(
      '❌ ERREUR PUT /api/auth/profile:',
      error
    )

    if (error.message === 'TOKEN_MISSING') {
      return NextResponse.json(
        {
          success: false,
          message: 'Non authentifié',
        },
        { status: 401 }
      )
    }

    if (error.message === 'TOKEN_INVALID') {
      return NextResponse.json(
        {
          success: false,
          message: 'Token invalide ou expiré',
        },
        { status: 401 }
      )
    }

    if (error.message === 'USER_NOT_FOUND') {
      return NextResponse.json(
        {
          success: false,
          message: 'Utilisateur introuvable',
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          'Erreur lors de la mise à jour du profil',
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
  })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'