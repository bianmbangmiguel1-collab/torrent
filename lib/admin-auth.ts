// lib/admin-auth.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

/**
 * Vérifie que la requête est effectuée par un administrateur authentifié.
 * Utilise l'en-tête `x-admin-id` ajouté par le middleware.
 * @returns l'objet admin (id, email, name, role) ou null si non autorisé.
 */
export async function requireAdmin(request: NextRequest) {
  try {
    // 1. Récupérer l'ID admin depuis les headers ajoutés par le middleware
    const adminId = request.headers.get('x-admin-id')
    if (!adminId) {
      console.warn('⚠️ requireAdmin: x-admin-id manquant')
      return null
    }

    // 2. Vérifier que l'admin existe encore en base et est actif
    const db = await getDB()
    const admin = await db.get(
      `SELECT id, email, name, role
       FROM admin_accounts
       WHERE id = ? AND isActive = 1`,
      [adminId]
    )

    if (!admin) {
      console.warn(`⚠️ requireAdmin: Admin ${adminId} introuvable ou inactif`)
      return null
    }

    console.log(`✅ requireAdmin: Admin ${admin.email} authentifié`)
    return admin
  } catch (error) {
    console.error('❌ Erreur dans requireAdmin:', error)
    return null
  }
}

/**
 * Génère une réponse d'erreur standard pour les accès admin refusés.
 * @param message message d'erreur personnalisé (optionnel)
 * @param status code HTTP (par défaut 401)
 */
export function createAdminErrorResponse(
  message: string = 'Accès administrateur requis',
  status: number = 401
) {
  return NextResponse.json(
    { error: message },
    { status }
  )
}

/**
 * Version simplifiée pour récupérer l'admin avec moins de logs (pour usage interne)
 */
export async function getAdminFromRequest(request: NextRequest) {
  const adminId = request.headers.get('x-admin-id')
  if (!adminId) return null
  const db = await getDB()
  return db.get(
    `SELECT id, email, name, role FROM admin_accounts WHERE id = ? AND isActive = 1`,
    [adminId]
  )
}