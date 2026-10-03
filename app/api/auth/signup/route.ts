// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import * as jose from 'jose'
import { getDB } from '@/lib/db'
import { detectGeo } from '@/lib/geo'

const JWT_SECRET = process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'
const TOKEN_DURATION_YEARS = 100000

interface SignupRequestBody {
  name: string
  email: string
  phone?: string
  password: string
}

// ============================================================
// FONCTIONS UTILES
// ============================================================

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const ips = forwarded.split(',').map(ip => ip.trim())
    return ips[0] || '127.0.0.1'
  }
  return request.headers.get('x-real-ip') || '127.0.0.1'
}

// ============================================================
// ROUTE POST /api/auth/signup
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SignupRequestBody
    const { name, email, phone, password } = body

    // 1. Validation des champs
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nom, email et mot de passe sont requis' },
        { status: 400 }
      )
    }

    // 2. Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Format d'email invalide" },
        { status: 400 }
      )
    }

    // 3. Validation mot de passe
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères' },
        { status: 400 }
      )
    }

    const db = await getDB()

    // 4. Vérifier si l'email existe déjà
    const existingUser = await db.get(
      'SELECT id FROM users WHERE email = ?',
      [email]
    )
    if (existingUser) {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé' },
        { status: 409 }
      )
    }

    // 5. Hasher le mot de passe
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // 6. Détection du pays, ville, fuseau horaire, devise (via detectGeo de lib/geo)
    const ip = getClientIP(request)
    const geoData = await detectGeo(ip)
    const country = geoData?.country || null
    const city = geoData?.city || null
    const timezone = geoData?.timezone || null
    const currency = geoData?.currency || 'XAF'

    // 7. Langue par défaut (français)
    const language = 'fr'

    // 8. Insertion de l'utilisateur avec toutes les colonnes
    const result = await db.run(
      `INSERT INTO users 
       (name, email, phone, password, role, is_verified, is_admin,
        country, city, timezone, language, currency, whatsapp_opt_in,
        total_spent, orders_count, vip_level, engagement_score,
        created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'standard', 0, datetime('now'), datetime('now'))`,
      [
        name,
        email,
        phone || null,
        hashedPassword,
        'user',
        1, // is_verified
        0, // is_admin
        country,
        city,
        timezone,
        language,
        currency,
        0, // whatsapp_opt_in (par défaut désactivé)
      ]
    )

    // 9. Récupérer l'utilisateur créé
    const newUser = await db.get(
      `SELECT 
        id,
        name,
        email,
        phone,
        role,
        is_admin,
        is_verified,
        country,
        city,
        timezone,
        language,
        currency,
        whatsapp_opt_in,
        total_spent,
        orders_count,
        vip_level,
        engagement_score,
        created_at,
        updated_at
       FROM users 
       WHERE id = ?`,
      [result.lastID]
    )

    if (!newUser) {
      return NextResponse.json(
        { error: 'Erreur lors de la création du compte' },
        { status: 500 }
      )
    }

    // 10. Générer le token JWT
    const secret = new TextEncoder().encode(JWT_SECRET)
    const token = await new jose.SignJWT({
      id: String(newUser.id),
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role || 'user',
      isAdmin: newUser.is_admin === 1,
      isVerified: newUser.is_verified === 1,
      created: Date.now()
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${TOKEN_DURATION_YEARS}y`)
      .sign(secret)

    console.log(`✅ Nouvel utilisateur inscrit: ${email}`)

    // 11. Réponse avec tous les champs utiles
    return NextResponse.json({
      success: true,
      message: 'Compte créé avec succès',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone || null,
        role: newUser.role || 'user',
        is_admin: newUser.is_admin === 1,
        is_verified: newUser.is_verified === 1,
        country: newUser.country || null,
        city: newUser.city || null,
        timezone: newUser.timezone || null,
        language: newUser.language || 'fr',
        currency: newUser.currency || 'XAF',
        whatsapp_opt_in: newUser.whatsapp_opt_in === 1,
        total_spent: newUser.total_spent || 0,
        orders_count: newUser.orders_count || 0,
        vip_level: newUser.vip_level || 'standard',
        engagement_score: newUser.engagement_score || 0,
        created_at: newUser.created_at,
        updated_at: newUser.updated_at
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('❌ Erreur inscription:', error)

    // Gérer les erreurs SQLite
    if (error.message && error.message.includes('SQLITE_CONSTRAINT')) {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé' },
        { status: 409 }
      )
    }

    // Si les colonnes n'existent pas
    if (error.message && error.message.includes('no such column')) {
      console.warn('⚠️ Colonnes manquantes dans users')
      return NextResponse.json(
        { 
          error: 'Erreur de configuration de la base de données. Veuillez contacter l\'administrateur.'
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: "Erreur lors de l'inscription: " + (error.message || '') },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'