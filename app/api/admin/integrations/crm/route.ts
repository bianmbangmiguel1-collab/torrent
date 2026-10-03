// app/api/admin/integrations/crm/route.ts
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
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS crm_integrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          provider TEXT UNIQUE NOT NULL,
          api_key TEXT,
          api_url TEXT,
          config TEXT,
          is_enabled INTEGER DEFAULT 0,
          last_sync DATETIME,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
    } catch {}
    return { db }
  } catch (err: any) {
    if (err.message === 'TOKEN_MISSING' || err.message === 'NOT_ADMIN') throw err
    throw new Error('TOKEN_INVALID')
  }
}

const PROVIDERS = [
  {
    id: 'hubspot',
    name: 'HubSpot',
    icon: '🟠',
    description: 'CRM marketing et ventes tout-en-un',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'pat-xxxxx' },
      { key: 'api_url', label: 'Portal ID (optionnel)', placeholder: '12345678' },
    ],
    docs: 'https://developers.hubspot.com',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    icon: '☁️',
    description: 'CRM entreprise le plus utilisé au monde',
    fields: [
      { key: 'api_key', label: 'Access Token', placeholder: 'xxxxx' },
      { key: 'api_url', label: 'Instance URL', placeholder: 'https://xxx.salesforce.com' },
    ],
    docs: 'https://developer.salesforce.com',
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    icon: '🔵',
    description: 'CRM pipeline simple et efficace',
    fields: [
      { key: 'api_key', label: 'API Token', placeholder: 'xxxxx' },
    ],
    docs: 'https://developers.pipedrive.com',
  },
  {
    id: 'zoho',
    name: 'Zoho CRM',
    icon: '🔴',
    description: 'Suite CRM abordable',
    fields: [
      { key: 'api_key', label: 'OAuth Token', placeholder: 'xxxxx' },
      { key: 'api_url', label: 'Domain', placeholder: 'https://www.zohoapis.com' },
    ],
    docs: 'https://www.zoho.com/crm/developer',
  },
  {
    id: 'airtable',
    name: 'Airtable',
    icon: '🟡',
    description: 'Base de données flexible (équivalent CRM)',
    fields: [
      { key: 'api_key', label: 'Personal Access Token', placeholder: 'patXXXXX' },
      { key: 'api_url', label: 'Base ID', placeholder: 'appXXXXX' },
    ],
    docs: 'https://airtable.com/developers',
  },
  {
    id: 'notion',
    name: 'Notion',
    icon: '⚫',
    description: 'Base de données Notion comme CRM',
    fields: [
      { key: 'api_key', label: 'Integration Token', placeholder: 'secret_xxx' },
      { key: 'api_url', label: 'Database ID', placeholder: 'xxxxx' },
    ],
    docs: 'https://developers.notion.com',
  },
]

export async function GET(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)
    const rows = await db.all('SELECT * FROM crm_integrations')
    const map: Record<string, any> = {}
    for (const r of rows || []) {
      map[r.provider] = {
        ...r,
        is_enabled: r.is_enabled === 1,
        config: r.config ? JSON.parse(r.config) : {},
      }
    }

    const integrations = PROVIDERS.map(p => ({
      ...p,
      installed: !!map[p.id],
      is_enabled: map[p.id]?.is_enabled || false,
      api_key: map[p.id]?.api_key || '',
      api_url: map[p.id]?.api_url || '',
      last_sync: map[p.id]?.last_sync || null,
      updated_at: map[p.id]?.updated_at || null,
    }))

    const stats = {
      total: PROVIDERS.length,
      installed: integrations.filter(i => i.installed).length,
      enabled: integrations.filter(i => i.is_enabled).length,
      lastSyncAll: integrations
        .filter(i => i.last_sync)
        .sort((a, b) => new Date(b.last_sync).getTime() - new Date(a.last_sync).getTime())[0]?.last_sync || null,
    }

    return NextResponse.json({ success: true, integrations, stats })
  } catch (error: any) {
    console.error('❌ GET crm:', error)
    if (error.message === 'TOKEN_MISSING') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN') return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================================
// Types
// ============================================================
interface CrmIntegrationBody {
  provider?: string
  api_key?: string
  api_url?: string
  config?: Record<string, unknown>
  is_enabled?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)
    const body = (await request.json()) as CrmIntegrationBody
    const provider = String(body.provider || '').trim()
    if (!provider) return NextResponse.json({ error: 'provider requis' }, { status: 400 })

    const existing = await db.get('SELECT id FROM crm_integrations WHERE provider = ?', [provider])
    const apiKey = body.api_key ? String(body.api_key).trim() : null
    const apiUrl = body.api_url ? String(body.api_url).trim() : null
    const config = body.config ? JSON.stringify(body.config) : null
    const isEnabled = body.is_enabled ? 1 : 0

    if (existing) {
      await db.run(
        `UPDATE crm_integrations SET api_key=?, api_url=?, config=?, is_enabled=?, updated_at=datetime('now') WHERE provider=?`,
        [apiKey, apiUrl, config, isEnabled, provider]
      )
    } else {
      await db.run(
        `INSERT INTO crm_integrations (provider, api_key, api_url, config, is_enabled) VALUES (?,?,?,?,?)`,
        [provider, apiKey, apiUrl, config, isEnabled]
      )
    }
    console.log(`✅ CRM ${provider} ${existing ? 'modifié' : 'ajouté'}`)
    return NextResponse.json({ success: true, message: `Intégration ${provider} ${existing ? 'mise à jour' : 'ajoutée'}` })
  } catch (error: any) {
    console.error('❌ POST crm:', error)
    if (error.message === 'TOKEN_MISSING') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN') return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)
    const provider = new URL(request.url).searchParams.get('provider')
    if (!provider) return NextResponse.json({ error: 'provider requis' }, { status: 400 })
    await db.run('DELETE FROM crm_integrations WHERE provider = ?', [provider])
    return NextResponse.json({ success: true, message: 'Intégration supprimée' })
  } catch (error: any) {
    if (error.message === 'TOKEN_MISSING') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN') return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'