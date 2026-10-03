// app/api/admin/setup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDB } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'

export async function POST(request: NextRequest) {
  try {
    const db = await getDB()
    
    // Vérifier si un admin existe déjà
    const existingAdmin = await db.get(
      'SELECT id FROM users WHERE is_admin = 1 LIMIT 1'
    )
    
    if (existingAdmin) {
      return NextResponse.json({
        success: false,
        message: 'Un administrateur existe déjà',
        adminExists: true
      })
    }

    // Créer l'admin avec les valeurs par défaut
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@torrenttwist.com'
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!'
    const adminName = process.env.ADMIN_NAME || 'Administrateur'
    
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(adminPassword, salt)
    
    await db.run(
      `INSERT INTO users 
       (name, email, password, role, is_admin, is_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [adminName, adminEmail, hashedPassword, 'admin', 1, 1]
    )
    
    return NextResponse.json({
      success: true,
      message: 'Administrateur créé avec succès',
      credentials: {
        email: adminEmail,
        password: adminPassword
      }
    })
    
  } catch (error) {
    console.error('❌ Erreur création admin:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'