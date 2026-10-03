export const dynamic = 'force-dynamic';

// app/api/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

// ============================================================
// Types
// ============================================================
interface UpdateSettingsRequest {
  name?: string;
  phone?: string;
  bio?: string;
  address?: string;
  city?: string;
  country?: string;
  postal_code?: string;
  avatar?: string | null;
  language?: string;
  currency?: string;
  timezone?: string;
  email_notifications?: boolean;
  push_notifications?: boolean;
  whatsapp_notifications?: boolean;
}

// ============================================================
// GET : Récupérer les paramètres de l'utilisateur
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Non authentifié' 
      }, { status: 401 })
    }

    let userId = null
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join('')
      )
      const decoded = JSON.parse(jsonPayload)
      userId = decoded?.id || decoded?.userId || null
    } catch (e) {
      return NextResponse.json({ 
        success: false, 
        error: 'Token invalide' 
      }, { status: 401 })
    }

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Utilisateur non identifié' 
      }, { status: 401 })
    }

    const db = await getDB()

    const user = await db.get(`
      SELECT 
        id,
        name,
        email,
        phone,
        bio,
        address,
        city,
        country,
        postal_code,
        avatar,
        preferences,
        language,
        currency,
        timezone,
        email_notifications,
        push_notifications,
        whatsapp_notifications,
        created_at,
        updated_at
      FROM users
      WHERE id = ?
    `, [userId])

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Utilisateur non trouvé' 
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user
    })
    
  } catch (error) {
    console.error('❌ Erreur GET /api/settings:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Erreur serveur' 
    }, { status: 500 })
  }
}

// ============================================================
// PATCH : Mettre à jour les paramètres de l'utilisateur
// ============================================================
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('user_session')?.value ||
                  request.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    let userId = null
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join('')
      )
      const decoded = JSON.parse(jsonPayload)
      userId = decoded?.id || decoded?.userId || null
    } catch (e) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 })
    }

    const body = await request.json() as UpdateSettingsRequest
    const {
      name,
      phone,
      bio,
      address,
      city,
      country,
      postal_code,
      avatar,
      language,
      currency,
      timezone,
      email_notifications,
      push_notifications,
      whatsapp_notifications
    } = body

    const db = await getDB()

    const updates: string[] = []
    const values: any[] = []

    if (name !== undefined) { updates.push('name = ?'); values.push(name) }
    if (phone !== undefined) { updates.push('phone = ?'); values.push(phone) }
    if (bio !== undefined) { updates.push('bio = ?'); values.push(bio) }
    if (address !== undefined) { updates.push('address = ?'); values.push(address) }
    if (city !== undefined) { updates.push('city = ?'); values.push(city) }
    if (country !== undefined) { updates.push('country = ?'); values.push(country) }
    if (postal_code !== undefined) { updates.push('postal_code = ?'); values.push(postal_code) }
    if (avatar !== undefined) { updates.push('avatar = ?'); values.push(avatar) }
    if (language !== undefined) { updates.push('language = ?'); values.push(language) }
    if (currency !== undefined) { updates.push('currency = ?'); values.push(currency) }
    if (timezone !== undefined) { updates.push('timezone = ?'); values.push(timezone) }
    if (email_notifications !== undefined) { updates.push('email_notifications = ?'); values.push(email_notifications ? 1 : 0) }
    if (push_notifications !== undefined) { updates.push('push_notifications = ?'); values.push(push_notifications ? 1 : 0) }
    if (whatsapp_notifications !== undefined) { updates.push('whatsapp_notifications = ?'); values.push(whatsapp_notifications ? 1 : 0) }

    if (updates.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Aucune donnée à mettre à jour' 
      }, { status: 400 })
    }

    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(userId)

    await db.run(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    )

    const updatedUser = await db.get(`
      SELECT 
        id,
        name,
        email,
        phone,
        bio,
        address,
        city,
        country,
        postal_code,
        avatar,
        preferences,
        language,
        currency,
        timezone,
        email_notifications,
        push_notifications,
        whatsapp_notifications,
        created_at,
        updated_at
      FROM users
      WHERE id = ?
    `, [userId])

    return NextResponse.json({
      success: true,
      message: 'Paramètres mis à jour avec succès',
      user: updatedUser
    })
    
  } catch (error) {
    console.error('❌ Erreur PATCH /api/settings:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// ============================================================
// OPTIONS : CORS
// ============================================================
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  })
}