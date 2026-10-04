// app/api/auth/avatar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import { getDB } from '@/lib/db'
import { randomUUID } from 'crypto'
import {
  uploadImageToSupabase,
  deleteImageFromSupabase,
  extractKeyFromPublicUrl,
} from '@/lib/storage'

const JWT_SECRET = process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

export async function POST(request: NextRequest) {
  try {
    // ============================================================
    // 1. RÉCUPÉRER LE TOKEN (user_session > admin_session > token > Bearer)
    // ============================================================
    let token =
      request.cookies.get('user_session')?.value ||
      request.cookies.get('admin_session')?.value ||
      request.cookies.get('token')?.value

    // Fallback : header Authorization Bearer
    if (!token) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    if (!token) {
      console.warn('⚠️ /api/auth/avatar : Aucun token trouvé (cookies ou header)')
      return NextResponse.json(
        { success: false, message: 'Non authentifié – Token manquant' },
        { status: 401 }
      )
    }

    // ============================================================
    // 2. VÉRIFIER LE JWT
    // ============================================================
    let payload: any
    try {
      const secret = new TextEncoder().encode(JWT_SECRET)
      const verified = await jose.jwtVerify(token, secret, {
        algorithms: ['HS256'],
      })
      payload = verified.payload
    } catch (error) {
      console.error('❌ JWT avatar invalide:', error)
      return NextResponse.json(
        { success: false, message: 'Token invalide ou expiré' },
        { status: 401 }
      )
    }

    // ============================================================
    // 3. RÉCUPÉRER L'UTILISATEUR
    // ============================================================
    const userId = payload.sub || payload.userId || payload.id
    const email = typeof payload.email === 'string' ? payload.email : null

    const db = await getDB()
    let user: any = null

    if (userId !== undefined && userId !== null) {
      const id = Number(userId)
      if (!isNaN(id)) {
        user = await db.get(
          `SELECT id, avatar FROM users WHERE id = ?`,
          [id]
        )
      }
    }

    if (!user && email) {
      user = await db.get(
        `SELECT id, avatar FROM users WHERE email = ?`,
        [email]
      )
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Utilisateur introuvable' },
        { status: 404 }
      )
    }

    // ============================================================
    // 4. RÉCUPÉRER LE FICHIER
    // ============================================================
    const formData = await request.formData()
    const avatar = formData.get('avatar')

    if (!avatar || !(avatar instanceof File)) {
      return NextResponse.json(
        { success: false, message: 'Aucune image reçue' },
        { status: 400 }
      )
    }

    // ============================================================
    // 5. VALIDATION
    // ============================================================
    if (!ALLOWED_TYPES[avatar.type]) {
      return NextResponse.json(
        { success: false, message: 'Format non supporté. Utilisez JPG, PNG, WEBP ou GIF.' },
        { status: 400 }
      )
    }

    if (avatar.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: "L'image ne doit pas dépasser 5 MB." },
        { status: 400 }
      )
    }

    // ============================================================
    // 6. UPLOAD VERS SUPABASE STORAGE
    // ============================================================
    const extension = ALLOWED_TYPES[avatar.type]
    const filename = `avatars/user-${user.id}-${randomUUID()}${extension}`

    const buffer = Buffer.from(await avatar.arrayBuffer())
    const avatarUrl = await uploadImageToSupabase(
      filename,
      buffer,
      avatar.type
    )

    // ============================================================
    // 7. SUPPRIMER L'ANCIEN AVATAR (sur Supabase)
    // ============================================================
    if (user.avatar && typeof user.avatar === 'string') {
      // Ignorer les anciens avatars locaux (/uploads/avatars/...)
      if (user.avatar.includes('supabase')) {
        const oldKey = extractKeyFromPublicUrl(user.avatar)
        if (oldKey) {
          try {
            await deleteImageFromSupabase(oldKey)
            console.log('🗑️ Ancien avatar Supabase supprimé:', oldKey)
          } catch {
            // Ignore
          }
        }
      } else {
        console.log('ℹ️ Ancien avatar local ignoré:', user.avatar)
      }
    }

    // ============================================================
    // 8. METTRE À JOUR LA BASE
    // ============================================================
    await db.run(
      `UPDATE users SET avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [avatarUrl, user.id]
    )

    console.log(`✅ Avatar utilisateur ${user.id} mis à jour : ${avatarUrl}`)

    // ============================================================
    // 9. RÉPONSE
    // ============================================================
    return NextResponse.json({
      success: true,
      message: 'Photo de profil mise à jour avec succès',
      avatar: avatarUrl,
      user: {
        id: user.id,
        avatar: avatarUrl,
      },
    })

  } catch (error: any) {
    console.error('❌ Erreur avatar:', error)
    return NextResponse.json(
      { success: false, message: error?.message || "Erreur lors de l'upload" },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'