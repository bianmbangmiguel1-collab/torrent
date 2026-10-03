// app/api/admin/products/upload-file/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import { getDB } from '@/lib/db'
import { uploadToSupabase, deleteFromSupabase } from '@/lib/storage'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const JWT_SECRET = process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'

// ⚠️ Supabase plan gratuit : 50 MB max par fichier
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

const ALLOWED_EXTENSIONS: Record<string, string> = {
  '.pdf': 'PDF', '.zip': 'ZIP', '.rar': 'RAR', '.7z': '7Z', '.tar': 'TAR', '.gz': 'GZ',
  '.doc': 'DOC', '.docx': 'DOCX', '.xls': 'XLS', '.xlsx': 'XLSX', '.ppt': 'PPT', '.pptx': 'PPTX',
  '.mp3': 'MP3', '.mp4': 'MP4', '.avi': 'AVI', '.mov': 'MOV', '.mkv': 'MKV', '.wav': 'WAV',
  '.epub': 'EPUB', '.mobi': 'MOBI',
  '.psd': 'PSD', '.ai': 'AI', '.fig': 'FIG', '.sketch': 'SKETCH',
  '.txt': 'TXT', '.csv': 'CSV', '.json': 'JSON',
  '.png': 'PNG', '.jpg': 'JPG', '.jpeg': 'JPEG', '.webp': 'WEBP', '.gif': 'GIF', '.svg': 'SVG',
}

// ============================================================
// CONTENT TYPES PAR EXTENSION
// ============================================================
function getContentType(ext: string): string {
  const types: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.mkv': 'video/x-matroska',
    '.wav': 'audio/wav',
    '.epub': 'application/epub+zip',
    '.mobi': 'application/x-mobipocket-ebook',
    '.psd': 'image/vnd.adobe.photoshop',
    '.ai': 'application/postscript',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
  }
  return types[ext] || 'application/octet-stream'
}

// ============================================================
// AUTH ADMIN
// ============================================================
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
// FORMATAGE
// ============================================================
function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB'
}

// ============================================================
// POST — Upload vers Supabase Storage
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)

    const formData = await request.formData()
    const file = formData.get('file')
    const productId = formData.get('productId')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `Fichier trop volumineux (max ${formatBytes(MAX_FILE_SIZE)}). Votre fichier : ${formatBytes(file.size)}. Découpez-le en parties ou utilisez un autre hébergeur.`,
        },
        { status: 413 }
      )
    }

    const originalName = file.name
    const ext = '.' + originalName.split('.').pop()?.toLowerCase()

    if (!ALLOWED_EXTENSIONS[ext]) {
      return NextResponse.json(
        { error: `Type de fichier non autorisé : ${ext}` },
        { status: 400 }
      )
    }

    const format = ALLOWED_EXTENSIONS[ext]
    const contentType = getContentType(ext)

    // 🔥 Nom unique pour Supabase Storage
    const sanitizedName = originalName
      .replace(/\.[^/.]+$/, '')       // sans extension
      .replace(/[^\w\s-]/g, '_')      // caractères sûrs
      .replace(/\s+/g, '-')
      .slice(0, 60)
    const uniqueId = randomUUID().slice(0, 8)
    const key = `products/${Date.now()}-${uniqueId}-${sanitizedName}${ext}`

    // 🔥 Upload vers Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer())

    try {
      await uploadToSupabase(key, buffer, contentType)
    } catch (uploadErr: any) {
      console.error('❌ Supabase upload:', uploadErr)
      return NextResponse.json(
        { error: `Erreur d'upload Supabase : ${uploadErr.message}` },
        { status: 502 }
      )
    }

    const sizeStr = formatBytes(file.size)

    console.log(`✅ Fichier uploadé sur Supabase : ${key} (${sizeStr})`)

    // 🔥 Mise à jour de la base si productId fourni
    if (productId) {
      const pid = parseInt(String(productId), 10)
      if (!isNaN(pid)) {
        try {
          // Récupérer l'ancien file_path
          const oldProduct = await db.get(
            'SELECT file_path FROM products WHERE id = ?',
            [pid]
          )

          // Mettre à jour
          await db.run(
            `UPDATE products
             SET file_path = ?, file_size = ?, file_format = ?, updated_at = datetime('now')
             WHERE id = ?`,
            [key, sizeStr, format, pid]
          )

          // Supprimer l'ancien fichier si différent
          if (oldProduct?.file_path && oldProduct.file_path !== key) {
            // Ancien chemin local (/uploads/products/...) → pas besoin de supprimer sur Supabase
            if (oldProduct.file_path.startsWith('/uploads/')) {
              console.log(`ℹ️ Ancien fichier local ignoré (non Supabase) : ${oldProduct.file_path}`)
            } else {
              await deleteFromSupabase(oldProduct.file_path)
              console.log(`🗑️ Ancien fichier Supabase supprimé : ${oldProduct.file_path}`)
            }
          }
        } catch (dbErr) {
          console.warn('⚠️ Impossible de mettre à jour la base:', dbErr)
        }
      }
    }

    return NextResponse.json({
      success: true,
      path: key,                 // ⚠️ Maintenant c'est une clé Supabase
      size: sizeStr,
      format: format,
      originalName: originalName,
      bytes: file.size,
    })
  } catch (error: any) {
    console.error('❌ Erreur upload-file:', error)

    if (error.message === 'TOKEN_MISSING') {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    if (error.message === 'NOT_ADMIN') {
      return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    }
    if (error.message === 'TOKEN_INVALID') {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}