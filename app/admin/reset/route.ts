// app/api/admin/reset/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDB } from '@/lib/db'

// ============================================================
// Types
// ============================================================
interface ResetPasswordBody {
  email: string
  newPassword: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ResetPasswordBody
    const { email, newPassword } = body
    
    if (!email || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Email et nouveau mot de passe requis' },
        { status: 400 }
      )
    }
    
    const db = await getDB()
    
    // Vérifier que l'utilisateur existe et est admin
    const user = await db.get(
      'SELECT id, is_admin FROM users WHERE email = ?',
      [email]
    )
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }
    
    if (user.is_admin !== 1) {
      return NextResponse.json(
        { success: false, error: 'Cet utilisateur n\'est pas administrateur' },
        { status: 403 }
      )
    }
    
    // Hasher le nouveau mot de passe
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)
    
    await db.run(
      'UPDATE users SET password = ?, updated_at = datetime("now") WHERE id = ?',
      [hashedPassword, user.id]
    )
    
    return NextResponse.json({
      success: true,
      message: 'Mot de passe administrateur réinitialisé avec succès'
    })
    
  } catch (error) {
    console.error('❌ Erreur réinitialisation:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la réinitialisation' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'