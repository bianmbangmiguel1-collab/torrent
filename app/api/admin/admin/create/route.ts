// app/api/admin/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDB } from '@/lib/db'

// ============================================================
// Types
// ============================================================
interface CreateAdminBody {
  email: string
  password: string
  name?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateAdminBody
    const { email, password, name } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      )
    }

    const db = await getDB()

    // Vérifier si l'admin existe déjà
    const existingAdmin = await db.get(
      `SELECT id FROM users WHERE email = ? AND is_admin = 1`,
      [email]
    )

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Un administrateur existe déjà avec cet email' },
        { status: 409 }
      )
    }

    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Créer l'administrateur
    await db.run(
      `INSERT INTO users 
       (name, email, password, role, is_admin, is_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        name || 'Administrateur',
        email,
        hashedPassword,
        'admin',
        1, // is_admin
        1, // is_verified
      ]
    )

    console.log(`✅ Administrateur créé: ${email}`)

    return NextResponse.json({
      success: true,
      message: 'Administrateur créé avec succès'
    })

  } catch (error) {
    console.error('❌ Erreur création admin:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'