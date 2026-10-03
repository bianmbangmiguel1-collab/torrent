// app/api/onboarding/step1-goal/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import { getDB } from '@/lib/db'
import { getUserId } from '@/lib/auth'

// ============================================
// TYPES
// ============================================

interface OnboardingGoalBody {
  mainGoal?: string
}

// ============================================
// CONFIGURATION - ⭐ SYNCHRONISÉ AVEC LE BACKEND
// ============================================

const JWT_SECRET = process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'

// ============================================
// ROUTE POST /api/onboarding/step1-goal
// ============================================

export async function POST(request: NextRequest) {
  try {
    // 1. Récupérer le token depuis les cookies
    let token = request.cookies.get('token')?.value
    
    // 2. Si pas dans les cookies, essayer depuis le header Authorization
    if (!token) {
      const authHeader = request.headers.get('Authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    console.log('🔍 Token reçu (step1):', token ? 'Présent' : 'Absent')

    if (!token) {
      return NextResponse.json(
        { error: 'Non authentifié - Token manquant' },
        { status: 401 }
      )
    }

    // 3. Vérifier le token avec jose
    let payload: any
    try {
      const secret = new TextEncoder().encode(JWT_SECRET)
      const result = await jose.jwtVerify(token, secret, {
        algorithms: ['HS256']
      })
      payload = result.payload
      console.log('✅ Token vérifié pour:', payload.email || payload.id)
    } catch (error) {
      console.error('❌ Erreur vérification token:', error)
      return NextResponse.json(
        { error: 'Token invalide ou expiré' },
        { status: 401 }
      )
    }

    // 4. Récupérer l'userId (supporte id, userId, sub)
    const userId = getUserId(payload)
    if (!userId) {
      console.error('❌ userId manquant dans le token:', payload)
      return NextResponse.json(
        { error: 'Token invalide - userId manquant' },
        { status: 401 }
      )
    }

    // 5. Récupérer les données
    const body = (await request.json()) as OnboardingGoalBody
    const { mainGoal } = body

    if (!mainGoal) {
      return NextResponse.json(
        { error: 'Objectif principal requis' },
        { status: 400 }
      )
    }

    const db = await getDB()
    
    // ✅ VÉRIFIER LES COLONNES SANS AJOUTER DE DEFAULT NON CONSTANT
    const columns = await db.all('PRAGMA table_info(users)')
    const columnNames = columns.map((c: any) => c.name)
    
    // 🔥 CORRECTION : Ajouter les colonnes SANS DEFAULT pour ALTER TABLE
    if (!columnNames.includes('main_goal')) {
      await db.exec('ALTER TABLE users ADD COLUMN main_goal TEXT')
      console.log('✅ Colonne main_goal ajoutée')
    }
    if (!columnNames.includes('onboarding_step')) {
      await db.exec('ALTER TABLE users ADD COLUMN onboarding_step INTEGER')
      console.log('✅ Colonne onboarding_step ajoutée')
    }
    if (!columnNames.includes('updated_at')) {
      await db.exec('ALTER TABLE users ADD COLUMN updated_at DATETIME')
      console.log('✅ Colonne updated_at ajoutée')
    }

    // ✅ Exécuter la mise à jour avec les noms snake_case
    const result = await db.run(
      `UPDATE users 
       SET main_goal = ?, 
           onboarding_step = 1, 
           updated_at = datetime('now') 
       WHERE id = ?`,
      [mainGoal, String(userId)]
    )

    if (result.changes === 0) {
      console.log(`⚠️ Utilisateur ${userId} non trouvé`)
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    console.log(`✅ Objectif enregistré pour l'utilisateur ${userId}: ${mainGoal}`)

    return NextResponse.json({
      success: true,
      message: 'Objectif enregistré avec succès'
    })

  } catch (error) {
    console.error('❌ Erreur step1-goal:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}

// ============================================
// EXPORT
// ============================================

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'