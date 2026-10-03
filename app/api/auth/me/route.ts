// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import { getDB } from '@/lib/db'

// ============================================
// CONFIGURATION
// ============================================

const JWT_SECRET =
  process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'

// Emails admin de secours (si le JWT ne contient pas role/isAdmin)
// Utile pour les anciens tokens déjà émis avant correction.
const FALLBACK_ADMIN_EMAILS = ['admin@torrenttwist.com']

// ============================================
// HELPERS
// ============================================

function isAdminPayload(payload: any, isAdminCookie: boolean): boolean {
  if (isAdminCookie) return true
  if (payload?.role === 'admin') return true
  if (payload?.isAdmin === true) return true
  if (payload?.is_admin === true) return true

  // Fallback : email reconnu comme admin
  const email = String(payload?.email || '').toLowerCase()
  if (email && FALLBACK_ADMIN_EMAILS.includes(email)) return true

  return false
}

function parseJSONField(value: any, fallback: any) {
  if (!value) return fallback
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

// ============================================
// ROUTE GET /api/auth/me
// ============================================

export async function GET(request: NextRequest) {
  try {
    // ----------------------------------------------------------
    // 1. Récupérer les cookies
    // ----------------------------------------------------------
    const adminSession = request.cookies.get('admin_session')?.value
    const userSession = request.cookies.get('user_session')?.value

    let token: string | undefined = adminSession || userSession
    const isAdminCookie = !!adminSession

    // Fallback Authorization Bearer
    if (!token) {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    if (!token) {
      console.warn('⚠️ /api/auth/me: Aucun token fourni')
      return NextResponse.json(
        { error: 'Non authentifié – Token manquant' },
        { status: 401 }
      )
    }

    // ----------------------------------------------------------
    // 2. Vérifier le JWT
    // ----------------------------------------------------------
    let payload: any
    try {
      const secret = new TextEncoder().encode(JWT_SECRET)
      const { payload: decoded } = await jose.jwtVerify(token, secret, {
        algorithms: ['HS256'],
      })
      payload = decoded
      console.log(
        '✅ Token décodé:',
        payload.email || payload.userId || payload.sub,
        '| role:',
        payload.role,
        '| isAdmin:',
        payload.isAdmin ?? payload.is_admin
      )
    } catch (error: any) {
      console.error('❌ JWT invalide:', error?.message || error)
      return NextResponse.json(
        { error: 'Token invalide ou expiré' },
        { status: 401 }
      )
    }

    // ----------------------------------------------------------
    // 3. Extraire l'ID utilisateur (multi-support)
    // ----------------------------------------------------------
    const rawUserId = payload.id || payload.userId || payload.sub
    if (!rawUserId) {
      console.error('❌ userId manquant dans le payload:', payload)
      return NextResponse.json(
        { error: 'Token invalide – identifiant utilisateur manquant' },
        { status: 401 }
      )
    }

    const userId = parseInt(String(rawUserId), 10)
    if (Number.isNaN(userId)) {
      console.error('❌ userId non numérique:', rawUserId)
      return NextResponse.json(
        { error: 'Token invalide – identifiant utilisateur invalide' },
        { status: 401 }
      )
    }

    // ----------------------------------------------------------
    // 4. Déterminer si admin
    // ----------------------------------------------------------
    const isAdmin = isAdminPayload(payload, isAdminCookie)

    console.log(
      `🔎 /api/auth/me → isAdmin=${isAdmin} ` +
        `(cookie=${isAdminCookie}, role=${payload.role}, userId=${userId})`
    )

    // ----------------------------------------------------------
    // 5. Chercher dans la bonne table
    // ----------------------------------------------------------
    const db = await getDB()
    let user: any = null

    if (isAdmin) {
      user = await db.get(
        `SELECT
           id,
           email,
           name,
           role,
           isActive,
           isFirstLogin,
           lastLogin,
           created_at,
           updated_at
         FROM admin_accounts
         WHERE id = ?`,
        [userId]
      )
    } else {
      user = await db.get(
        `SELECT
           id,
           name,
           email,
           phone,
           bio,
           address,
           city,
           country,
           postal_code,
           avatar,
           role,
           is_admin,
           is_verified,
           main_goal,
           interests,
           experience_level,
           profile_completeness,
           onboarding_completed,
           onboarding_step,
           engagement_score,
           total_time_spent,
           last_activity,
           preferences,
           created_at,
           updated_at
         FROM users
         WHERE id = ?`,
        [userId]
      )
    }

    if (!user) {
      console.warn(
        `⚠️ Utilisateur id=${userId} non trouvé (admin=${isAdmin})`
      )
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // ----------------------------------------------------------
    // 6. Construire la réponse
    // ----------------------------------------------------------
    if (isAdmin) {
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.name || 'Administrateur',
          email: user.email,
          role: 'admin',                    // forcé
          is_admin: true,                   // forcé
          is_first_login: user.isFirstLogin === 1,
          last_login: user.lastLogin || null,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      })
    }

    // Utilisateur client : parser les champs JSON
    const interests = parseJSONField(user.interests, [])
    const preferences = parseJSONField(user.preferences, {})

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        bio: user.bio || null,
        address: user.address || null,
        city: user.city || null,
        country: user.country || null,
        postal_code: user.postal_code || null,
        avatar: user.avatar || null,
        role: user.role || 'user',
        is_admin: user.is_admin === 1,
        is_verified: user.is_verified === 1,
        main_goal: user.main_goal || null,
        interests,
        experience_level: user.experience_level || null,
        profile_completeness: user.profile_completeness || 0,
        onboarding_completed: user.onboarding_completed === 1,
        onboarding_step: user.onboarding_step || 0,
        engagement_score: user.engagement_score || 0,
        total_time_spent: user.total_time_spent || 0,
        last_activity: user.last_activity || null,
        preferences,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    })
  } catch (error: any) {
    console.error('❌ Erreur inattendue /api/auth/me:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// ============================================
// OPTIONS CORS
// ============================================

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

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'