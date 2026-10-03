// app/api/users/activities/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import { getDB } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'

// ============================================================
// Types
// ============================================================
interface ActivityRequest {
  action?: string;
  details?: unknown;
}

async function getUserId(request: NextRequest): Promise<number | null> {
  let token =
    request.cookies.get('user_session')?.value ||
    request.cookies.get('admin_session')?.value ||
    request.cookies.get('token')?.value

  if (!token) {
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
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

function parseDetails(value: any) {
  if (!value) return null
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) } catch { return value }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10) || 10, 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10) || 0
    const actionFilter = searchParams.get('type') || searchParams.get('action') || null

    const db = await getDB()

    let sql = `SELECT id, action, details, ip_address, user_agent, created_at
               FROM activities WHERE user_id = ?`
    const params: any[] = [userId]

    if (actionFilter) {
      sql += ` AND action = ?`
      params.push(actionFilter)
    }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
    params.push(limit, offset)

    const rows = await db.all(sql, params)

    let countSql = `SELECT COUNT(*) as total FROM activities WHERE user_id = ?`
    const countParams: any[] = [userId]
    if (actionFilter) {
      countSql += ` AND action = ?`
      countParams.push(actionFilter)
    }
    const countRow = await db.get(countSql, countParams)
    const total = countRow?.total || 0

    const activities = (rows || []).map((row: any) => ({
      id: row.id,
      action: row.action,
      details: parseDetails(row.details),
      ip_address: row.ip_address || null,
      user_agent: row.user_agent || null,
      created_at: row.created_at,
    }))

    return NextResponse.json({ success: true, activities, total, limit, offset })
  } catch (error: any) {
    console.error('❌ Erreur /api/users/activities GET:', error)

    if (error.message && error.message.includes('no such table')) {
      return NextResponse.json({ success: true, activities: [], total: 0, limit: 0, offset: 0 })
    }

    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json() as ActivityRequest
    const action = String(body.action || '').trim()
    const details = body.details || null

    if (!action) {
      return NextResponse.json({ success: false, error: 'action requise' }, { status: 400 })
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1'
    const userAgent = request.headers.get('user-agent') || ''

    const db = await getDB()

    await db.run(
      `INSERT INTO activities (user_id, action, details, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [userId, action, details ? JSON.stringify(details) : null, ip, userAgent]
    )

    return NextResponse.json({ success: true, message: 'Activité enregistrée' })
  } catch (error: any) {
    console.error('❌ Erreur /api/users/activities POST:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'