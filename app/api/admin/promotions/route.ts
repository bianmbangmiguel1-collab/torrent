// app/api/admin/promotions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import { getDB } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'

// ============================================================
// Types
// ============================================================
interface PromotionRequestBody {
  id?: number | string
  name?: string
  code?: string | null
  description?: string | null
  type?: string
  value?: number | string
  min_order_amount?: number | string
  max_discount_amount?: number | string | null
  usage_limit?: number | string
  user_limit?: number | string
  product_ids?: unknown
  category_ids?: unknown
  start_date?: string | null
  end_date?: string | null
  is_active?: boolean
}

async function requireAdmin(request: NextRequest) {
  const adminSession = request.cookies.get('admin_session')?.value
  const userSession = request.cookies.get('user_session')?.value
  let token = adminSession || userSession
  if (!token) {
    const h = request.headers.get('authorization')
    if (h?.startsWith('Bearer ')) token = h.substring(7)
  }
  if (!token) throw new Error('TOKEN_MISSING')

  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jose.jwtVerify(token, secret, { algorithms: ['HS256'] })
    const isAdmin =
      (payload as any).role === 'admin' ||
      (payload as any).isAdmin === true ||
      (payload as any).is_admin === true ||
      !!adminSession
    if (!isAdmin) throw new Error('NOT_ADMIN')
    const db = await getDB()
    return { db }
  } catch (err: any) {
    if (err.message === 'TOKEN_MISSING' || err.message === 'NOT_ADMIN') throw err
    throw new Error('TOKEN_INVALID')
  }
}

// ============================================================
// GET — Liste des promotions
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const search = (searchParams.get('search') || '').trim()

    let where = 'WHERE 1=1'
    const params: any[] = []

    if (status === 'active') {
      where += " AND is_active = 1 AND (start_date IS NULL OR start_date <= datetime('now')) AND (end_date IS NULL OR end_date >= datetime('now'))"
    } else if (status === 'scheduled') {
      where += " AND start_date > datetime('now')"
    } else if (status === 'expired') {
      where += " AND end_date < datetime('now')"
    } else if (status === 'inactive') {
      where += ' AND is_active = 0'
    }

    if (search) {
      where += ' AND (name LIKE ? OR code LIKE ? OR description LIKE ?)'
      const like = `%${search}%`
      params.push(like, like, like)
    }

    const promotions = await db.all(
      `SELECT * FROM promotions ${where} ORDER BY created_at DESC`,
      params
    )

    // Stats
    const stats = { total: 0, active: 0, scheduled: 0, expired: 0, inactive: 0, totalUses: 0 }
    try {
      const all = await db.all('SELECT * FROM promotions')
      stats.total = all.length
      for (const p of all) {
        if (!p.is_active) stats.inactive++
        else if (p.start_date && new Date(p.start_date) > new Date()) stats.scheduled++
        else if (p.end_date && new Date(p.end_date) < new Date()) stats.expired++
        else stats.active++
      }
      const uses = await db.get('SELECT COALESCE(SUM(used_count), 0) as total FROM promotions')
      stats.totalUses = uses?.total || 0
    } catch {}

    return NextResponse.json({ success: true, promotions: promotions || [], stats })
  } catch (error: any) {
    console.error('❌ GET /api/admin/promotions:', error)
    if (error.message === 'TOKEN_MISSING') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN') return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================================
// POST — Créer ou modifier une promotion
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)
    const body: PromotionRequestBody = await request.json()

    const id = body.id ? parseInt(String(body.id), 10) : null
    const name = String(body.name || '').trim()
    const code = body.code ? String(body.code).trim().toUpperCase() : null
    const description = body.description ? String(body.description).trim() : null
    const type = body.type || 'percentage'
    const value = parseFloat(String(body.value || 0))
    const minOrderAmount = parseInt(String(body.min_order_amount || 0), 10)
    const maxDiscountAmount = body.max_discount_amount ? parseInt(String(body.max_discount_amount), 10) : null
    const usageLimit = parseInt(String(body.usage_limit || 0), 10)
    const userLimit = parseInt(String(body.user_limit || 1), 10)
    const productIds = body.product_ids ? JSON.stringify(body.product_ids) : null
    const categoryIds = body.category_ids ? JSON.stringify(body.category_ids) : null
    const startDate = body.start_date || null
    const endDate = body.end_date || null
    const isActive = body.is_active !== false ? 1 : 0

    if (!name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
    if (!value || value <= 0) return NextResponse.json({ error: 'Valeur invalide' }, { status: 400 })

    if (id) {
      await db.run(
        `UPDATE promotions SET
          name=?, code=?, description=?, type=?, value=?,
          min_order_amount=?, max_discount_amount=?, usage_limit=?, user_limit=?,
          product_ids=?, category_ids=?, start_date=?, end_date=?, is_active=?,
          updated_at=datetime('now')
         WHERE id=?`,
        [name, code, description, type, value, minOrderAmount, maxDiscountAmount,
         usageLimit, userLimit, productIds, categoryIds, startDate, endDate, isActive, id]
      )
      console.log(`✅ Promotion ${id} mise à jour`)
      return NextResponse.json({ success: true, message: 'Promotion mise à jour', id })
    } else {
      const result = await db.run(
        `INSERT INTO promotions
         (name, code, description, type, value, min_order_amount, max_discount_amount,
          usage_limit, user_limit, product_ids, category_ids, start_date, end_date, is_active)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [name, code, description, type, value, minOrderAmount, maxDiscountAmount,
         usageLimit, userLimit, productIds, categoryIds, startDate, endDate, isActive]
      )
      console.log(`✅ Promotion créée: ${name}`)
      return NextResponse.json({ success: true, message: 'Promotion créée', id: result.lastID })
    }
  } catch (error: any) {
    console.error('❌ POST /api/admin/promotions:', error)
    if (error.message === 'TOKEN_MISSING') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN') return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================================
// DELETE
// ============================================================
export async function DELETE(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)
    const id = parseInt(new URL(request.url).searchParams.get('id') || '', 10)
    if (!id || isNaN(id)) return NextResponse.json({ error: 'id requis' }, { status: 400 })
    await db.run('DELETE FROM promotions WHERE id = ?', [id])
    console.log(`🗑️ Promotion ${id} supprimée`)
    return NextResponse.json({ success: true, message: 'Promotion supprimée' })
  } catch (error: any) {
    if (error.message === 'TOKEN_MISSING') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN') return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================================
// PATCH — Basculer actif/inactif
// ============================================================
export async function PATCH(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)
    const body: PromotionRequestBody = await request.json()
    const id = parseInt(String(body.id || ''), 10)
    if (!id || isNaN(id)) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    const current = await db.get('SELECT is_active FROM promotions WHERE id = ?', [id])
    if (!current) return NextResponse.json({ error: 'Promotion introuvable' }, { status: 404 })

    const newValue = current.is_active === 1 ? 0 : 1
    await db.run('UPDATE promotions SET is_active = ?, updated_at = datetime("now") WHERE id = ?', [newValue, id])

    return NextResponse.json({ success: true, is_active: newValue === 1 })
  } catch (error: any) {
    if (error.message === 'TOKEN_MISSING') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN') return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'