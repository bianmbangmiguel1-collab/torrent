// app/api/admin/reviews/reject/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/auth'
import { updateReview } from '@/lib/services/reviews'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ============================================================
// POST /api/admin/reviews/reject
// ============================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Récupérer le token (cookie d'abord, puis Authorization)
    let token = request.cookies.get('token')?.value

    if (!token) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé – Token manquant' },
        { status: 401 }
      )
    }

    // 2. Vérifier que l'utilisateur est admin
    const isAdmin = await verifyAdmin(token)
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Accès refusé – Administrateur requis' },
        { status: 403 }
      )
    }

    // 3. Lire le body
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Format JSON invalide' },
        { status: 400 }
      )
    }

    const { reviewId } = body

    if (!reviewId) {
      return NextResponse.json(
        { success: false, error: 'ID d\'avis requis' },
        { status: 400 }
      )
    }

    const id = Number(reviewId)
    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { success: false, error: 'ID d\'avis invalide' },
        { status: 400 }
      )
    }

    // 4. Rejeter l'avis
    const success = await updateReview(id, {
      status: 'rejected',
      is_visible: false,
    })

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Avis non trouvé ou aucune modification' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Avis rejeté avec succès',
    })
  } catch (error) {
    console.error('❌ Erreur POST /admin/reviews/reject:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// ============================================================
// OPTIONS (CORS)
// ============================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
      'Access-Control-Max-Age': '86400',
    },
  })
}