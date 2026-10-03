// app/api/users/library/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import { getDB } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'

async function getUserId(request: NextRequest): Promise<number | null> {
  let token =
    request.cookies.get('user_session')?.value ||
    request.cookies.get('admin_session')?.value ||
    request.cookies.get('token')?.value

  if (!token) {
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7)
  }

  if (!token) return null

  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jose.jwtVerify(token, secret, { algorithms: ['HS256'] })
    const rawId = (payload as any).id || (payload as any).userId || (payload as any).sub
    const userId = parseInt(String(rawId), 10)
    return Number.isNaN(userId) ? null : userId
  } catch {
    return null
  }
}

// ============================================================
// GET /api/users/library — Bibliothèque utilisateur
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = (searchParams.get('search') || '').trim()
    const type = searchParams.get('type') || ''
    const sort = searchParams.get('sort') || 'recent' // recent | title | downloads
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10) || 0

    const db = await getDB()

    // ============================================================
    // 1. Récupérer tous les produits achetés (via order_items payés)
    // ============================================================
    let where = `WHERE o.user_id = ? AND o.payment_status = 'paid'`
    const params: any[] = [userId]

    if (search) {
      where += ' AND (oi.product_title LIKE ? OR p.title LIKE ?)'
      const like = `%${search}%`
      params.push(like, like)
    }

    if (type) {
      where += ' AND p.type = ?'
      params.push(type)
    }

    // Order by
    let orderBy = 'o.created_at DESC'
    if (sort === 'title') orderBy = 'p.title ASC'
    if (sort === 'downloads') orderBy = 'download_count DESC'

    const sql = `
      SELECT
        oi.id as item_id,
        oi.product_id,
        oi.product_title as item_title,
        oi.price,
        oi.quantity,
        oi.total,
        oi.created_at as purchase_date,
        o.id as order_id,
        o.order_number,
        o.created_at as order_date,
        o.payment_method,
        o.download_token,
        o.download_count,
        o.download_limit,
        o.download_expires_at,
        p.id,
        p.title,
        p.slug,
        p.description,
        p.content,
        p.type,
        p.file_path,
        p.file_size,
        p.file_format,
        p.download_limit as product_download_limit,
        p.download_expires_days,
        p.license_validity_days,
        p.validity_end_date,
        p.has_auto_renewal,
        p.renewal_price,
        p.avg_rating,
        p.total_reviews,
        p.author,
        p.chapters,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) as main_image,
        (SELECT code FROM licenses WHERE product_id = p.id AND user_id = o.user_id LIMIT 1) as license_code,
        (SELECT status FROM licenses WHERE product_id = p.id AND user_id = o.user_id LIMIT 1) as license_status,
        (SELECT expires_at FROM licenses WHERE product_id = p.id AND user_id = o.user_id LIMIT 1) as license_expires_at
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      ${where}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `
    params.push(limit, offset)

    const items = await db.all(sql, params)

    // ============================================================
    // 2. Compter le total
    // ============================================================
    const countSql = `
      SELECT COUNT(*) as total
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      ${where}
    `
    const countRow = await db.get(countSql, params.slice(0, -2))
    const total = countRow?.total || 0

    // ============================================================
    // 3. Stats
    // ============================================================
    const stats: any = {
      totalItems: 0,
      totalSpent: 0,
      totalDownloads: 0,
      totalLicenses: 0,
      expiringSoon: 0,
    }
    try {
      const s = await db.get(
        `SELECT
           COUNT(DISTINCT oi.product_id) as items,
           COALESCE(SUM(oi.total), 0) as spent
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         WHERE o.user_id = ? AND o.payment_status = 'paid'`,
        [userId]
      )
      stats.totalItems = s?.items || 0
      stats.totalSpent = s?.spent || 0

      const d = await db.get(
        `SELECT COALESCE(SUM(download_count), 0) as downloads
         FROM orders
         WHERE user_id = ? AND payment_status = 'paid'`,
        [userId]
      )
      stats.totalDownloads = d?.downloads || 0

      const l = await db.get(
        `SELECT COUNT(*) as licenses FROM licenses WHERE user_id = ? AND status = 'active'`,
        [userId]
      )
      stats.totalLicenses = l?.licenses || 0

      const e = await db.get(
        `SELECT COUNT(*) as expiring
         FROM licenses
         WHERE user_id = ?
           AND status = 'active'
           AND expires_at IS NOT NULL
           AND expires_at BETWEEN datetime('now') AND datetime('now', '+30 days')`,
        [userId]
      )
      stats.expiringSoon = e?.expiring || 0
    } catch (err) {
      console.warn('⚠️ Stats partiels:', err)
    }

    // ============================================================
    // 4. Enrichir les items
    // ============================================================
    const enriched = (items || []).map((it: any) => {
      const downloadLimit = it.download_limit || it.product_download_limit || 0
      const downloadsLeft = downloadLimit > 0 ? Math.max(0, downloadLimit - (it.download_count || 0)) : -1 // -1 = illimité

      const expiresAt = it.download_expires_at || it.validity_end_date
      let daysLeft: number | null = null
      if (expiresAt) {
        daysLeft = Math.ceil(
          (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      }

      // Licence
      let licenseStatus = 'none'
      if (it.license_code) {
        if (it.license_status === 'active') {
          licenseStatus = 'active'
        } else if (it.license_status === 'expired') {
          licenseStatus = 'expired'
        } else {
          licenseStatus = it.license_status || 'inactive'
        }
      }

      return {
        id: it.item_id,
        product_id: it.product_id,
        title: it.title || it.item_title || 'Produit',
        slug: it.slug,
        description: it.description,
        type: it.type || 'file',
        image: it.main_image,
        price: it.price,
        quantity: it.quantity,
        total: it.total,
        purchase_date: it.purchase_date,
        order_id: it.order_id,
        order_number: it.order_number,
        payment_method: it.payment_method,
        // Fichier
        file_path: it.file_path,
        file_size: it.file_size,
        file_format: it.file_format,
        // Téléchargement
        download_token: it.download_token,
        download_count: it.download_count || 0,
        download_limit: downloadLimit,
        downloads_left: downloadsLeft,
        // Validité
        expires_at: expiresAt,
        days_left: daysLeft,
        // Licence
        license_code: it.license_code,
        license_status: licenseStatus,
        license_validity_days: it.license_validity_days,
        license_expires_at: it.license_expires_at,
        // Renouvellement
        has_auto_renewal: it.has_auto_renewal === 1,
        renewal_price: it.renewal_price,
        // Auteur
        author: it.author,
        chapters: it.chapters ? (() => { try { return JSON.parse(it.chapters) } catch { return null } })() : null,
        // Notes
        avg_rating: it.avg_rating || 0,
        total_reviews: it.total_reviews || 0,
      }
    })

    return NextResponse.json({
      success: true,
      items: enriched,
      total,
      limit,
      offset,
      stats,
    })
  } catch (error: any) {
    console.error('❌ Erreur GET /api/users/library:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'