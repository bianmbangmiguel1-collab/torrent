// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server'

export async function POST() {
  // Réponse JSON de succès
  const response = NextResponse.json(
    { success: true, message: 'Déconnexion réussie' },
    { status: 200 }
  )

  // ------------------------------------------------------------
  // 1. Supprimer le cookie HttpOnly 'token'
  // ------------------------------------------------------------
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,        // expire immédiatement
    path: '/',
  })

  // ------------------------------------------------------------
  // 2. Optionnel : supprimer les autres cookies (ex: 'user' si présent)
  // ------------------------------------------------------------
  response.cookies.set('user', '', {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })

  // Retourner la réponse (le cookie est effacé)
  return response
}