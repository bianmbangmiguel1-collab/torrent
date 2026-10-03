// app/api/admin/collections/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import { getDB } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'

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
    return { db, adminId: (payload as any).id }
  } catch (err: any) {
    if (err.message === 'TOKEN_MISSING' || err.message === 'NOT_ADMIN') throw err
    throw new Error('TOKEN_INVALID')
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

// ============================================================
// Types
// ============================================================
interface CollectionBody {
  id?: number | string
  name?: string
  slug?: string
  description?: string | null
  image?: string | null
  product_ids?: unknown[]
  is_active?: boolean
  position?: number | string
}

interface CollectionPatchBody {
  id?: number | string
  action?: 'toggle'
  position?: number | string
}

// ============================================================
// GET — Liste des collections
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)
    const { searchParams } = new URL(request.url)
    const search = (searchParams.get('search') || '').trim()
    const active = searchParams.get('active')

    let where = 'WHERE 1=1'
    const params: any[] = []

    if (search) {
      where += ' AND (name LIKE ? OR slug LIKE ? OR description LIKE ?)'
      const like = `%${search}%`
      params.push(like, like, like)
    }

    if (active === 'true') where += ' AND is_active = 1'
    if (active === 'false') where += ' AND is_active = 0'

    const collections = await db.all(
      `SELECT * FROM collections ${where} ORDER BY position ASC, created_at DESC`,
      params
    )

    // Enrichir avec le nombre de produits
    const enriched = await Promise.all(
      (collections || []).map(async (c: any) => {
        let productCount = 0
        try {
          if (c.product_ids) {
            const ids = JSON.parse(c.product_ids)
            productCount = Array.isArray(ids) ? ids.length : 0
          }
        } catch {}
        return { ...c, product_count: productCount, is_active: c.is_active === 1 }
      })
    )

    // Stats
    const stats = {
      total: enriched.length,
      active: enriched.filter(c => c.is_active).length,
      inactive: enriched.filter(c => !c.is_active).length,
      totalProducts: enriched.reduce((s, c) => s + c.product_count, 0),
    }

    return NextResponse.json({ success: true, collections: enriched, stats })
  } catch (error: any) {
    console.error('❌ GET /api/admin/collections:', error)
    if (error.message === 'TOKEN_MISSING') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN') return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================================
// POST — Créer / modifier une collection
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const { db, adminId } = await requireAdmin(request)
    const body = (await request.json()) as CollectionBody

    const id = body.id ? parseInt(String(body.id), 10) : null
    const name = String(body.name || '').trim()
    let slug = body.slug ? slugify(String(body.slug)) : slugify(name)
    const description = body.description ? String(body.description).trim() : null
    const image = body.image ? String(body.image).trim() : null
    const productIds = Array.isArray(body.product_ids) ? JSON.stringify(body.product_ids) : null
    const isActive = body.is_active !== false ? 1 : 0
    const position = parseInt(String(body.position || 0), 10)

    if (!name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

    // Vérifier slug unique
    const existing = await db.get(
      'SELECT id FROM collections WHERE slug = ? AND id != ?',
      [slug, id || 0]
    )
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-5)}`
    }

    if (id) {
      await db.run(
        `UPDATE collections SET
          name=?, slug=?, description=?, image=?, product_ids=?, is_active=?, position=?,
          updated_at=datetime('now')
         WHERE id=?`,
        [name, slug, description, image, productIds, isActive, position, id]
      )
      console.log(`✅ Collection ${id} mise à jour`)
      return NextResponse.json({ success: true, message: 'Collection mise à jour', id, slug })
    } else {
      const result = await db.run(
        `INSERT INTO collections
         (name, slug, description, image, product_ids, is_active, position, created_by)
         VALUES (?,?,?,?,?,?,?,?)`,
        [name, slug, description, image, productIds, isActive, position, adminId || null]
      )
      console.log(`✅ Collection créée: ${slug}`)
      return NextResponse.json({ success: true, message: 'Collection créée', id: result.lastID, slug })
    }
  } catch (error: any) {
    console.error('❌ POST /api/admin/collections:', error)
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
    await db.run('DELETE FROM collections WHERE id = ?', [id])
    console.log(`🗑️ Collection ${id} supprimée`)
    return NextResponse.json({ success: true, message: 'Collection supprimée' })
  } catch (error: any) {
    if (error.message === 'TOKEN_MISSING') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN') return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================================
// PATCH — Activer/désactiver ou changer la position
// ============================================================
export async function PATCH(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)
    const body = (await request.json()) as CollectionPatchBody
    const id = parseInt(String(body.id || ''), 10)
    if (!id || isNaN(id)) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    if (body.action === 'toggle') {
      const cur = await db.get('SELECT is_active FROM collections WHERE id = ?', [id])
      if (!cur) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
      const newVal = cur.is_active === 1 ? 0 : 1
      await db.run('UPDATE collections SET is_active = ?, updated_at = datetime("now") WHERE id = ?', [newVal, id])
      return NextResponse.json({ success: true, is_active: newVal === 1 })
    }

    if (body.position !== undefined) {
      const pos = parseInt(String(body.position), 10) || 0
      await db.run('UPDATE collections SET position = ?, updated_at = datetime("now") WHERE id = ?', [pos, id])
      return NextResponse.json({ success: true, position: pos })
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  } catch (error: any) {
    if (error.message === 'TOKEN_MISSING') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN') return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'