// app/api/admin/security/backup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import { getDB } from '@/lib/db'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { createClient } from '@supabase/supabase-js'

const JWT_SECRET = process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'
const BACKUP_BUCKET = 'uploads'
const BACKUP_PREFIX = 'backups/'

interface CreateBackupBody {
  label?: string
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
    return { db, adminEmail: (payload as any).email }
  } catch (err: any) {
    if (err.message === 'TOKEN_MISSING' || err.message === 'NOT_ADMIN') throw err
    throw new Error('TOKEN_INVALID')
  }
}

async function getSupabase() {
  const { env } = await getCloudflareContext({ async: true })
  const e = env as any
  const url = e.SUPABASE_URL
  const key = e.SUPABASE_SECRET_KEY || e.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase non configuré')
  return createClient(url, key)
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// Liste des tables à sauvegarder
const BACKUP_TABLES = [
  'users',
  'products',
  'categories',
  'orders',
  'order_items',
  'reviews',
  'banners',
  'campaigns',
  'slides',
  'pages',
  'promotions',
  'newsletter_subscribers',
  'newsletter_campaigns',
  'newsletter_templates',
  'media_library',
  'collections',
  'tags',
  'licenses',
  'notifications',
  'settings',
  'admin_accounts',
]

// ============================================================
// GET — Liste des backups + infos
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)

    // Lister les backups depuis Supabase Storage
    const supabase = await getSupabase()
    const { data: files, error } = await supabase.storage
      .from(BACKUP_BUCKET)
      .list(BACKUP_PREFIX, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      })

    if (error) {
      console.warn('⚠️ Erreur listing Supabase:', error.message)
    }

    const backups = (files || [])
      .filter((f) => f.name.endsWith('.json'))
      .map((f) => {
        const size = (f.metadata as any)?.size || 0
        return {
          name: f.name,
          size,
          sizeFormatted: formatBytes(size),
          created_at: f.created_at || f.updated_at || new Date().toISOString(),
        }
      })

    // Stats de la base D1
    const dbStats: any = {
      users: 0,
      products: 0,
      orders: 0,
      reviews: 0,
    }
    try {
      const u = await db.get('SELECT COUNT(*) as c FROM users')
      dbStats.users = u?.c || 0
      const p = await db.get('SELECT COUNT(*) as c FROM products')
      dbStats.products = p?.c || 0
      const o = await db.get('SELECT COUNT(*) as c FROM orders')
      dbStats.orders = o?.c || 0
      const r = await db.get('SELECT COUNT(*) as c FROM reviews')
      dbStats.reviews = r?.c || 0
    } catch {}

    const lastBackup = backups[0] || null
    let nextAutoBackup: string | null = null
    if (lastBackup) {
      const last = new Date(lastBackup.created_at)
      const next = new Date(last.getTime() + 24 * 60 * 60 * 1000)
      nextAutoBackup = next.toISOString()
    }

    return NextResponse.json({
      success: true,
      backups,
      totalBackups: backups.length,
      currentDb: {
        type: 'D1 (Cloudflare)',
        stats: dbStats,
      },
      lastBackup,
      nextAutoBackup,
    })
  } catch (error: any) {
    console.error('❌ GET backup:', error)
    if (error.message === 'TOKEN_MISSING')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN')
      return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// ============================================================
// POST — Créer un backup (export JSON des tables D1)
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)
    const body = (await request.json().catch(() => ({}))) as CreateBackupBody
    const label = body.label ? String(body.label).trim() : ''

    // Nom du fichier : backup-YYYY-MM-DD-HH-MM-SS[-label].json
    const now = new Date()
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const safeLabel = label.replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 40)
    const filename = `backup-${dateStr}${safeLabel ? '-' + safeLabel : ''}.json`

    // Exporter chaque table
    const dump: any = {
      meta: {
        created_at: now.toISOString(),
        label: label || null,
        source: 'cloudflare-d1',
        tables: [],
      },
      data: {},
    }

    for (const table of BACKUP_TABLES) {
      try {
        const rows = await db.all(`SELECT * FROM ${table}`)
        dump.data[table] = rows
        dump.meta.tables.push({ name: table, count: rows.length })
      } catch (err: any) {
        console.warn(`⚠️ Table ${table} ignorée:`, err.message)
        dump.data[table] = []
        dump.meta.tables.push({ name: table, count: 0, error: err.message })
      }
    }

    // Sérialiser en JSON
    const json = JSON.stringify(dump, null, 2)
    const buffer = Buffer.from(json, 'utf-8')

    // Upload vers Supabase Storage
    const supabase = await getSupabase()
    const key = `${BACKUP_PREFIX}${filename}`
    const { error: uploadError } = await supabase.storage
      .from(BACKUP_BUCKET)
      .upload(key, buffer, {
        contentType: 'application/json',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Upload Supabase: ${uploadError.message}`)
    }

    const totalRows = dump.meta.tables.reduce(
      (sum: number, t: any) => sum + (t.count || 0),
      0
    )

    console.log(`✅ Backup créé: ${filename} (${formatBytes(buffer.length)})`)

    return NextResponse.json({
      success: true,
      message: 'Sauvegarde créée avec succès sur Supabase Storage',
      backup: {
        name: filename,
        size: buffer.length,
        sizeFormatted: formatBytes(buffer.length),
        created_at: now.toISOString(),
        totalRows,
        tables: dump.meta.tables.length,
      },
    })
  } catch (error: any) {
    console.error('❌ POST backup:', error)
    if (error.message === 'TOKEN_MISSING')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN')
      return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// ============================================================
// DELETE — Supprimer un backup
// ============================================================
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin(request)
    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')

    if (!name) {
      return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
    }

    // Sécurité : pas de traversée de dossier
    if (name.includes('/') || name.includes('\\') || name.includes('..')) {
      return NextResponse.json({ error: 'Nom invalide' }, { status: 400 })
    }

    const supabase = await getSupabase()
    const key = `${BACKUP_PREFIX}${name}`
    const { error } = await supabase.storage.from(BACKUP_BUCKET).remove([key])

    if (error) {
      throw new Error(`Suppression Supabase: ${error.message}`)
    }

    console.log(`🗑️ Backup supprimé: ${name}`)

    return NextResponse.json({ success: true, message: 'Backup supprimé' })
  } catch (error: any) {
    console.error('❌ DELETE backup:', error)
    if (error.message === 'TOKEN_MISSING')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN')
      return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'