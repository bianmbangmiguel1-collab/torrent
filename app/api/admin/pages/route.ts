// app/api/admin/pages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import { getDB } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'

// ============================================================
// Types
// ============================================================
interface CreatePageBody {
  title?: string
  slug?: string
  content?: string
  excerpt?: string | null
  status?: string
  template?: string
  meta_title?: string
  meta_description?: string | null
  meta_keywords?: string | null
}

interface UpdatePageBody extends CreatePageBody {
  id?: number | string
}

async function requireAdmin(request: NextRequest) {
  const adminSession = request.cookies.get('admin_session')?.value
  const userSession = request.cookies.get('user_session')?.value
  let token = adminSession || userSession

  if (!token) {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
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

    // Créer la table si elle n'existe pas
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS pages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          content TEXT,
          excerpt TEXT,
          status TEXT DEFAULT 'draft',
          template TEXT DEFAULT 'default',
          meta_title TEXT,
          meta_description TEXT,
          meta_keywords TEXT,
          author_id INTEGER,
          published_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
        )
      `)

      // Insérer quelques pages par défaut si vide
      const count = await db.get('SELECT COUNT(*) as c FROM pages')
      if ((count?.c || 0) === 0) {
        await db.exec(`
          INSERT INTO pages (title, slug, content, status, template, meta_title) VALUES
            ('À propos', 'a-propos', '<h1>À propos de TorrentTwist</h1><p>Bienvenue sur notre plateforme de produits numériques...</p>', 'published', 'default', 'À propos - TorrentTwist'),
            ('Conditions générales', 'cgv', '<h1>Conditions Générales de Vente</h1><p>...</p>', 'published', 'legal', 'CGV - TorrentTwist'),
            ('Politique de confidentialité', 'confidentialite', '<h1>Politique de confidentialité</h1><p>...</p>', 'published', 'legal', 'Confidentialité - TorrentTwist'),
            ('FAQ', 'faq', '<h1>Questions fréquentes</h1><p>...</p>', 'published', 'faq', 'FAQ - TorrentTwist')
        `)
      }
    } catch (err) {
      console.warn('⚠️ Init pages:', err)
    }

    return { db }
  } catch (err: any) {
    if (err.message === 'TOKEN_MISSING' || err.message === 'NOT_ADMIN') throw err
    throw new Error('TOKEN_INVALID')
  }
}

// ============================================================
// GET /api/admin/pages?status=&search=&page=1&limit=20
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const search = (searchParams.get('search') || '').trim()
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 100)
    const offset = (page - 1) * limit

    let where = 'WHERE 1=1'
    const params: any[] = []

    if (status) {
      where += ' AND status = ?'
      params.push(status)
    }

    if (search) {
      where += ' AND (title LIKE ? OR slug LIKE ? OR content LIKE ?)'
      const like = `%${search}%`
      params.push(like, like, like)
    }

    const sql = `
      SELECT id, title, slug, excerpt, status, template,
             meta_title, meta_description,
             published_at, created_at, updated_at
      FROM pages
      ${where}
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `
    params.push(limit, offset)

    const rows = await db.all(sql, params)

    const countSql = `SELECT COUNT(*) as total FROM pages ${where}`
    const countRow = await db.get(countSql, params.slice(0, -2))
    const total = countRow?.total || 0

    // Stats par statut
    const stats = { total: 0, published: 0, draft: 0, archived: 0 }
    try {
      const s = await db.all(
        'SELECT status, COUNT(*) as c FROM pages GROUP BY status'
      )
      for (const row of s) {
        if (row.status in stats) stats[row.status as keyof typeof stats] = row.c
        stats.total += row.c
      }
    } catch {}

    return NextResponse.json({
      success: true,
      pages: rows || [],
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      stats,
    })
  } catch (error: any) {
    console.error('❌ GET /api/admin/pages:', error)
    if (error.message === 'TOKEN_MISSING') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN') return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================================
// POST /api/admin/pages — Créer une page
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)
    const body = await request.json() as CreatePageBody

    const title = String(body.title || '').trim()
    const slug = String(body.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).trim()
    const content = String(body.content || '').trim()
    const excerpt = body.excerpt ? String(body.excerpt).trim() : null
    const status = body.status || 'draft'
    const template = body.template || 'default'
    const meta_title = body.meta_title || title
    const meta_description = body.meta_description || null
    const meta_keywords = body.meta_keywords || null

    if (!title || !slug) {
      return NextResponse.json({ error: 'Titre et slug requis' }, { status: 400 })
    }

    const existing = await db.get('SELECT id FROM pages WHERE slug = ?', [slug])
    if (existing) {
      return NextResponse.json({ error: 'Ce slug existe déjà' }, { status: 409 })
    }

    const publishedAt = status === 'published' ? new Date().toISOString() : null

    const result = await db.run(
      `INSERT INTO pages
       (title, slug, content, excerpt, status, template,
        meta_title, meta_description, meta_keywords, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [title, slug, content, excerpt, status, template, meta_title, meta_description, meta_keywords, publishedAt]
    )

    console.log(`✅ Page créée: ${slug}`)

    return NextResponse.json(
      {
        success: true,
        message: 'Page créée',
        page: { id: result.lastID, title, slug, status },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('❌ POST /api/admin/pages:', error)
    if (error.message === 'TOKEN_MISSING') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN') return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================================
// PUT /api/admin/pages — Modifier une page
// ============================================================
export async function PUT(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)
    const body = await request.json() as UpdatePageBody

    const id = parseInt(String(body.id || ''), 10)
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: 'id requis' }, { status: 400 })
    }

    const updates: string[] = []
    const values: any[] = []

    if (body.title !== undefined) {
      updates.push('title = ?')
      values.push(String(body.title).trim())
    }
    if (body.slug !== undefined) {
      updates.push('slug = ?')
      values.push(String(body.slug).trim())
    }
    if (body.content !== undefined) {
      updates.push('content = ?')
      values.push(String(body.content))
    }
    if (body.excerpt !== undefined) {
      updates.push('excerpt = ?')
      values.push(body.excerpt ? String(body.excerpt).trim() : null)
    }
    if (body.status !== undefined) {
      updates.push('status = ?')
      values.push(String(body.status))
      if (body.status === 'published') {
        updates.push('published_at = ?')
        values.push(new Date().toISOString())
      }
    }
    if (body.template !== undefined) {
      updates.push('template = ?')
      values.push(String(body.template))
    }
    if (body.meta_title !== undefined) {
      updates.push('meta_title = ?')
      values.push(String(body.meta_title))
    }
    if (body.meta_description !== undefined) {
      updates.push('meta_description = ?')
      values.push(body.meta_description ? String(body.meta_description) : null)
    }
    if (body.meta_keywords !== undefined) {
      updates.push('meta_keywords = ?')
      values.push(body.meta_keywords ? String(body.meta_keywords) : null)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
    }

    updates.push("updated_at = datetime('now')")
    values.push(id)

    await db.run(`UPDATE pages SET ${updates.join(', ')} WHERE id = ?`, values)

    return NextResponse.json({ success: true, message: 'Page mise à jour' })
  } catch (error: any) {
    console.error('❌ PUT /api/admin/pages:', error)
    if (error.message === 'TOKEN_MISSING') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN') return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================================
// DELETE /api/admin/pages?id=X
// ============================================================
export async function DELETE(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)
    const { searchParams } = new URL(request.url)
    const id = parseInt(searchParams.get('id') || '', 10)

    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: 'id requis' }, { status: 400 })
    }

    await db.run('DELETE FROM pages WHERE id = ?', [id])

    return NextResponse.json({ success: true, message: 'Page supprimée' })
  } catch (error: any) {
    console.error('❌ DELETE /api/admin/pages:', error)
    if (error.message === 'TOKEN_MISSING') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN') return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'