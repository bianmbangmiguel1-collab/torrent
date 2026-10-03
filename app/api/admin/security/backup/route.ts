// app/api/admin/security/backup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import { getDB } from '@/lib/db'
import fs from 'fs/promises'
import path from 'path'

const JWT_SECRET = process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'
const BACKUP_DIR = path.join(process.cwd(), 'torrenttwist-backend', 'backups')
const DB_PATH = path.join(process.cwd(), 'torrenttwist-backend', 'database.sqlite')

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

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// ============================================================
// GET — Liste des backups + infos
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)

    // Créer le dossier si inexistant
    await fs.mkdir(BACKUP_DIR, { recursive: true })

    // Lister les backups
    const files = await fs.readdir(BACKUP_DIR)
    const backups = []

    for (const file of files) {
      if (!file.endsWith('.sqlite') && !file.endsWith('.db') && !file.endsWith('.backup')) continue
      try {
        const stat = await fs.stat(path.join(BACKUP_DIR, file))
        backups.push({
          name: file,
          size: stat.size,
          sizeFormatted: formatBytes(stat.size),
          created_at: stat.mtime.toISOString(),
        })
      } catch {}
    }

    // Tri par date décroissante
    backups.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    // Infos DB actuelle
    let dbSize = 0
    try {
      const stat = await fs.stat(DB_PATH)
      dbSize = stat.size
    } catch {}

    // Stats de la base
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

    // Calcul de la prochaine sauvegarde auto
    const lastBackup = backups[0]
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
        size: dbSize,
        sizeFormatted: formatBytes(dbSize),
        path: DB_PATH,
        stats: dbStats,
      },
      lastBackup: lastBackup || null,
      nextAutoBackup,
    })
  } catch (error: any) {
    console.error('❌ GET backup:', error)
    if (error.message === 'TOKEN_MISSING')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN')
      return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================================
// POST — Créer un backup
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)
    const body = (await request.json().catch(() => ({}))) as CreateBackupBody
    const label = body.label ? String(body.label).trim() : ''

    // Créer le dossier
    await fs.mkdir(BACKUP_DIR, { recursive: true })

    // Nom du fichier : backup-YYYY-MM-DD-HH-MM-SS[-label].sqlite
    const now = new Date()
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const safeLabel = label.replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 40)
    const filename = `backup-${dateStr}${safeLabel ? '-' + safeLabel : ''}.sqlite`
    const destPath = path.join(BACKUP_DIR, filename)

    // Copie du fichier SQLite
    try {
      await fs.copyFile(DB_PATH, destPath)
    } catch (err: any) {
      throw new Error(`Impossible de copier la base : ${err.message}`)
    }

    const stat = await fs.stat(destPath)

    console.log(`✅ Backup créé : ${filename} (${formatBytes(stat.size)})`)

    return NextResponse.json({
      success: true,
      message: 'Sauvegarde créée avec succès',
      backup: {
        name: filename,
        size: stat.size,
        sizeFormatted: formatBytes(stat.size),
        created_at: stat.mtime.toISOString(),
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
    const { db } = await requireAdmin(request)
    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')

    if (!name) {
      return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
    }

    // Sécurité : pas de traversée de dossier
    if (name.includes('/') || name.includes('\\') || name.includes('..')) {
      return NextResponse.json({ error: 'Nom invalide' }, { status: 400 })
    }

    const filePath = path.join(BACKUP_DIR, name)
    await fs.unlink(filePath)

    console.log(`🗑️ Backup supprimé : ${name}`)

    return NextResponse.json({ success: true, message: 'Backup supprimé' })
  } catch (error: any) {
    console.error('❌ DELETE backup:', error)
    if (error.message === 'TOKEN_MISSING')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN')
      return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'