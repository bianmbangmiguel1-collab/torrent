export const dynamic = 'force-dynamic';

// app/api/admin/revoke/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import { getDB } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'

export async function POST(request: NextRequest) {
  try {
    // Récupérer le token du cookie
    const token = request.cookies.get('token')?.value
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé - Token manquant' },
        { status: 401 }
      )
    }

    // Vérifier le token
    let payload: any
    try {
      const secret = new TextEncoder().encode(JWT_SECRET)
      const result = await jose.jwtVerify(token, secret)
      payload = result.payload
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Token invalide' },
        { status: 401 }
      )
    }

    const userId = payload.id
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non identifié' },
        { status: 401 }
      )
    }

    // Révoquer tous les tokens de l'utilisateur
    const db = await getDB()
    await db.run(
      `UPDATE users SET tokenVersion = tokenVersion + 1 WHERE id = ?`,
      [parseInt(userId)]
    )

    // Créer la réponse
    const response = NextResponse.json({
      success: true,
      message: 'Tous vos tokens ont été révoqués avec succès. Veuillez vous reconnecter.',
      revoked: true
    })

    // Supprimer les cookies
    response.cookies.delete('token')
    response.cookies.delete('userInfo')

    console.log(`🔒 Tokens révoqués pour l'utilisateur ${userId}`)
    return response

  } catch (error) {
    console.error('Erreur révocation:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la révocation des tokens' },
      { status: 500 }
    )
  }
}