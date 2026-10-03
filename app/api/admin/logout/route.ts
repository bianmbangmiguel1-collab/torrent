// app/api/admin/logout/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Créer la réponse de succès
    const response = NextResponse.json({
      success: true,
      message: 'Déconnexion administrateur réussie'
    })

    // Supprimer uniquement le cookie admin_session
    // ⚠️ NE PAS supprimer user_session – on laisse les sessions cohabiter
    response.cookies.delete('admin_session')

    console.log('👋 Admin déconnecté (admin_session supprimé)')

    return response
  } catch (error) {
    console.error('❌ Erreur /api/admin/logout:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la déconnexion' },
      { status: 500 }
    )
  }
}

// ✅ Gestion des pré-requêtes CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'