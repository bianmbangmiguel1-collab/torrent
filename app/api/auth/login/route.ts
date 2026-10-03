// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import bcrypt from 'bcryptjs'
import { getDB } from '@/lib/db'
import { createSession, getActiveSessions } from '@/lib/services/users'
import { detectGeo } from '@/lib/geo'

// ============================================
// CONFIGURATION
// ============================================

const JWT_SECRET = process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'

interface LoginRequestBody {
  email: string
  password: string
}

// 🔥 TOKEN VALIDE 100 000 ANS
const TOKEN_DURATION_YEARS = 100000
const TOKEN_DURATION_SECONDS = TOKEN_DURATION_YEARS * 365 * 24 * 60 * 60

// ============================================
// FONCTION D'EXTRACTION DES INFOS DU NAVIGATEUR
// ============================================

function getUserAgentInfo(userAgent: string) {
  const ua = userAgent || ''
  const deviceType = /mobile|android|iphone|ipad|ipod/i.test(ua) ? 'mobile' : 'desktop'
  const browser = /chrome|firefox|safari|edge|opera|brave/i.exec(ua)?.[0]?.toLowerCase() || 'unknown'
  const os = /windows|mac|linux|android|ios|iphone|ipad/i.exec(ua)?.[0]?.toLowerCase() || 'unknown'
  return { deviceType, browser, os }
}

// ============================================
// ROUTE POST /api/auth/login
// ============================================

export async function POST(request: NextRequest) {
  try {
    // 1. Récupération et validation des données
    const body = (await request.json()) as LoginRequestBody
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email et mot de passe requis' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Format d'email invalide" },
        { status: 400 }
      )
    }

    const db = await getDB()

    // ============================================================
    // 2. Vérification du compte ADMIN d'abord
    // ============================================================
    const admin = await db.get(
      `SELECT 
        id,
        email,
        passwordHash AS password,
        name,
        role,
        isActive,
        isFirstLogin
       FROM admin_accounts 
       WHERE email = ?`,
      [email]
    )

    if (admin) {
      if (admin.isActive === 0) {
        return NextResponse.json(
          { success: false, error: 'Compte administrateur désactivé' },
          { status: 403 }
        )
      }

      let isPasswordValid = false
      try {
        isPasswordValid = await bcrypt.compare(password, admin.password)
      } catch (err) {
        console.error('Erreur lors de la comparaison du mot de passe admin:', err)
        return NextResponse.json(
          { success: false, error: 'Erreur interne du serveur' },
          { status: 500 }
        )
      }

      if (!isPasswordValid) {
        return NextResponse.json(
          { success: false, error: 'Email ou mot de passe incorrect' },
          { status: 401 }
        )
      }

      const secret = new TextEncoder().encode(JWT_SECRET)
      const token = await new jose.SignJWT({
        id: String(admin.id),
        sub: String(admin.id),
        email: admin.email,
        name: admin.name || 'Administrateur',
        role: 'admin',
        isAdmin: true,
        is_admin: true,
        created: Date.now()
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${TOKEN_DURATION_YEARS}y`)
        .sign(secret)

      try {
        await db.run(
          `UPDATE admin_accounts SET lastLogin = CURRENT_TIMESTAMP WHERE id = ?`,
          [admin.id]
        )
      } catch (err) {
        console.warn('Impossible de mettre à jour lastLogin admin:', err)
      }

      const response = NextResponse.json({
        success: true,
        isAdmin: true,
        user: {
          id: String(admin.id),
          user_id: String(admin.id),
          email: admin.email,
          name: admin.name || 'Administrateur',
          role: 'admin',
          is_admin: true,
          isFirstLogin: admin.isFirstLogin === 1
        }
      })

      response.cookies.set('admin_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: TOKEN_DURATION_SECONDS,
        path: '/'
      })

      response.cookies.delete('token')
      response.cookies.delete('user_session')

      console.log(`✅ Connexion administrateur réussie pour ${admin.email}`)
      return response
    }

    // ============================================================
    // 3. Vérification du compte USER (client) si pas admin
    // ============================================================
    let user: any = null
try {
  user = await db.get(
    `SELECT 
      id,
      email,
      password,
      name,
      role,
      is_admin,
      is_verified
     FROM users 
     WHERE email = ?`,
    [email]
  )
} catch (err: any) {
  console.error('❌ Requête users échouée:', err.message)
  return NextResponse.json(
    { success: false, error: 'Erreur base de données: ' + err.message },
    { status: 500 }
  )
}

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      )
    }

    let isPasswordValid = false
    try {
      isPasswordValid = await bcrypt.compare(password, user.password)
    } catch (err) {
      console.error('Erreur lors de la comparaison du mot de passe user:', err)
      return NextResponse.json(
        { success: false, error: 'Erreur interne du serveur' },
        { status: 500 }
      )
    }

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      )
    }

    if (user.is_verified === 0) {
      return NextResponse.json(
        { success: false, error: 'Compte non vérifié. Vérifiez votre email.' },
        { status: 403 }
      )
    }

    // ============================================================
    // 4. Récupération des informations de connexion
    // ============================================================

    const userAgent = request.headers.get('user-agent') || ''
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
    const { deviceType, browser, os } = getUserAgentInfo(userAgent)

    // Détection de la géolocalisation
    const geoData = await detectGeo(ip)

    // ============================================================
    // 5. Mise à jour de l'utilisateur
    // ============================================================

    try {
      await db.run(
        `UPDATE users 
         SET last_login = CURRENT_TIMESTAMP, 
             last_activity = CURRENT_TIMESTAMP, 
             device_type = ?, 
             browser = ?, 
             os = ?,
             country = COALESCE(?, country),
             city = COALESCE(?, city),
             timezone = COALESCE(?, timezone)
         WHERE id = ?`,
        [
          deviceType, 
          browser, 
          os,
          geoData?.country || null,
          geoData?.city || null,
          geoData?.timezone || null,
          user.id
        ]
      )
    } catch (err) {
      console.warn('Impossible de mettre à jour les informations utilisateur:', err)
    }

    // ============================================================
    // 6. Génération du token JWT
    // ============================================================

    const secret = new TextEncoder().encode(JWT_SECRET)
    const token = await new jose.SignJWT({
      id: String(user.id),
      sub: String(user.id),
      userId: user.id,
      email: user.email,
      name: user.name || 'Utilisateur',
      role: user.role || 'user',
      isAdmin: false,
      is_admin: user.is_admin === 1,
      created: Date.now()
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${TOKEN_DURATION_YEARS}y`)
      .sign(secret)

    // ============================================================
    // 7. Création de la session
    // ============================================================

    const expiresAt = new Date(Date.now() + TOKEN_DURATION_SECONDS * 1000)
    try {
      await createSession(
        user.id,
        token,
        ip,
        userAgent,
        deviceType,
        browser,
        os,
        expiresAt
      )
    } catch (err) {
      console.warn('⚠️ Impossible de créer la session utilisateur:', err)
    }

    // ============================================================
    // 8. Détection de connexion inhabituelle
    // ============================================================

    try {
      const activeSessions = await getActiveSessions(user.id)
      const lastSession = activeSessions.length > 1 ? activeSessions[1] : null

      if (lastSession) {
        // Récupérer le pays de la dernière session
        const lastSessionCountry = lastSession.country || 'Inconnu'
        const currentCountry = geoData?.country || 'Inconnu'

        // Vérifier si le pays a changé
        if (lastSessionCountry !== currentCountry && currentCountry !== 'Inconnu') {
          console.warn(`⚠️ Connexion inhabituelle pour l'utilisateur ${user.email}: 
            Nouveau pays: ${currentCountry}, 
            Ancien pays: ${lastSessionCountry}`)

          // Journaliser dans admin_activity_logs
          await db.run(
            `INSERT INTO admin_activity_logs (user_id, action, details, created_at)
             VALUES (?, 'connexion_inhabituelle', ?, CURRENT_TIMESTAMP)`,
            [
              user.id,
              JSON.stringify({
                new_country: currentCountry,
                new_ip: ip,
                new_device: deviceType,
                new_browser: browser,
                new_os: os,
                previous_country: lastSessionCountry,
                previous_device: lastSession.device_type || 'Inconnu',
                previous_browser: lastSession.browser || 'Inconnu',
                timestamp: new Date().toISOString()
              })
            ]
          )

          // Optionnel : envoyer une alerte email
          // await sendSecurityAlert(user.email, user.name, currentCountry, lastSessionCountry)
        }
      }
    } catch (err) {
      console.warn('⚠️ Erreur lors de la détection de connexion inhabituelle:', err)
    }

    // ============================================================
    // 9. Réponse
    // ============================================================

    const response = NextResponse.json({
      success: true,
      isAdmin: false,
      user: {
        id: String(user.id),
        user_id: user.id,
        email: user.email,
        name: user.name || 'Utilisateur',
        role: user.role || 'user',
        is_admin: user.is_admin === 1,
        country: geoData?.country || user.country || null,
        city: geoData?.city || user.city || null,
        timezone: geoData?.timezone || user.timezone || null,
      }
    })

    response.cookies.set('user_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: TOKEN_DURATION_SECONDS,
      path: '/'
    })

    response.cookies.delete('token')
    response.cookies.delete('admin_session')

    console.log(`✅ Connexion utilisateur réussie pour ${user.email} (Next.js API) - Token valide ${TOKEN_DURATION_YEARS} ans`)
    return response

  } catch (error) {
    console.error('❌ Erreur lors du login (Next.js API):', error)
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// ============================================
// CORS
// ============================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'