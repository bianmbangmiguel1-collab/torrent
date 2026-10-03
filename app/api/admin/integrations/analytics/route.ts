// app/api/admin/integrations/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import { getDB } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'

async function requireAdmin(request: NextRequest) {
  const adminSession = request.cookies.get('admin_session')?.value
  const userSession = request.cookies.get('user_session')?.value
  let token = adminSession || userSession
  if (!token) {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) token = authHeader.substring(7)
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
        CREATE TABLE IF NOT EXISTS analytics_integrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          provider TEXT UNIQUE NOT NULL,
          tracking_id TEXT,
          config TEXT,
          is_enabled INTEGER DEFAULT 0,
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

// Providers disponibles
const PROVIDERS = [
  {
    id: 'google_analytics',
    name: 'Google Analytics 4',
    icon: '📊',
    description: 'Mesure d\'audience complète de Google',
    fields: [{ key: 'tracking_id', label: 'ID de mesure (G-XXXXXXX)', placeholder: 'G-XXXXXXXXXX' }],
    docs: 'https://analytics.google.com',
  },
  {
    id: 'google_tag_manager',
    name: 'Google Tag Manager',
    icon: '🏷️',
    description: 'Gestionnaire de balises Google',
    fields: [{ key: 'tracking_id', label: 'Container ID (GTM-XXXXXX)', placeholder: 'GTM-XXXXXX' }],
    docs: 'https://tagmanager.google.com',
  },
  {
    id: 'plausible',
    name: 'Plausible Analytics',
    icon: '🌱',
    description: 'Analytics respectueux de la vie privée',
    fields: [{ key: 'tracking_id', label: 'Nom de domaine', placeholder: 'torrenttwist.com' }],
    docs: 'https://plausible.io',
  },
  {
    id: 'matomo',
    name: 'Matomo',
    icon: '🔍',
    description: 'Alternative open source à Google Analytics',
    fields: [
      { key: 'tracking_id', label: 'Site ID', placeholder: '1' },
      { key: 'url', label: 'URL Matomo', placeholder: 'https://matomo.example.com' },
    ],
    docs: 'https://matomo.org',
  },
  {
    id: 'umami',
    name: 'Umami',
    icon: '📈',
    description: 'Analytics open source minimaliste',
    fields: [
      { key: 'tracking_id', label: 'Website ID', placeholder: 'uuid-xxxx' },
      { key: 'url', label: 'URL Umami', placeholder: 'https://umami.example.com' },
    ],
    docs: 'https://umami.is',
  },
  {
    id: 'facebook_pixel',
    name: 'Meta Pixel',
    icon: '📘',
    description: 'Suivi des conversions Facebook/Instagram',
    fields: [{ key: 'tracking_id', label: 'Pixel ID', placeholder: '1234567890' }],
    docs: 'https://business.facebook.com',
  },
  {
    id: 'hotjar',
    name: 'Hotjar',
    icon: '🔥',
    description: 'Heatmaps et enregistrements de sessions',
    fields: [{ key: 'tracking_id', label: 'Site ID', placeholder: '1234567' }],
    docs: 'https://hotjar.com',
  },
]

// ============================================================
// GET — Liste des intégrations configurées
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)

    const rows = await db.all('SELECT * FROM analytics_integrations')

    // Map par provider
    const integrationsMap: Record<string, any> = {}
    for (const row of rows || []) {
      integrationsMap[row.provider] = {
        ...row,
        is_enabled: row.is_enabled === 1,
        config: row.config ? JSON.parse(row.config) : {},
      }
    }

    // Enrichir avec les définitions
    const integrations = PROVIDERS.map(p => ({
      ...p,
      installed: !!integrationsMap[p.id],
      is_enabled: integrationsMap[p.id]?.is_enabled || false,
      tracking_id: integrationsMap[p.id]?.tracking_id || '',
      config: integrationsMap[p.id]?.config || {},
      updated_at: integrationsMap[p.id]?.updated_at || null,
    }))

    // Stats
    const stats = {
      total: PROVIDERS.length,
      installed: integrations.filter(i => i.installed).length,
      enabled: integrations.filter(i => i.is_enabled).length,
    }

    return NextResponse.json({ success: true, integrations, stats })
  } catch (error: any) {
    console.error('❌ GET analytics:', error)
    if (error.message === 'TOKEN_MISSING')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN')
      return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================================
// Types
// ============================================================
interface AnalyticsIntegrationBody {
  provider?: string
  tracking_id?: string
  config?: Record<string, unknown>
  is_enabled?: boolean
}

// ============================================================
// POST — Configurer une intégration
// Body : { provider, tracking_id, config, is_enabled }
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)
    const body = (await request.json()) as AnalyticsIntegrationBody

    const provider = String(body.provider || '').trim()
    if (!provider) {
      return NextResponse.json({ error: 'provider requis' }, { status: 400 })
    }

    const existing = await db.get(
      'SELECT id FROM analytics_integrations WHERE provider = ?',
      [provider]
    )

    const trackingId = body.tracking_id ? String(body.tracking_id).trim() : null
    const config = body.config ? JSON.stringify(body.config) : null
    const isEnabled = body.is_enabled ? 1 : 0

    if (existing) {
      await db.run(
        `UPDATE analytics_integrations
         SET tracking_id = ?, config = ?, is_enabled = ?, updated_at = datetime('now')
         WHERE provider = ?`,
        [trackingId, config, isEnabled, provider]
      )
    } else {
      await db.run(
        `INSERT INTO analytics_integrations (provider, tracking_id, config, is_enabled)
         VALUES (?, ?, ?, ?)`,
        [provider, trackingId, config, isEnabled]
      )
    }

    console.log(`✅ Analytics ${provider} ${existing ? 'modifié' : 'ajouté'}`)

    return NextResponse.json({
      success: true,
      message: `Intégration ${provider} ${existing ? 'mise à jour' : 'ajoutée'}`,
    })
  } catch (error: any) {
    console.error('❌ POST analytics:', error)
    if (error.message === 'TOKEN_MISSING')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN')
      return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================================
// DELETE — Supprimer une intégration
// ============================================================
export async function DELETE(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')

    if (!provider) {
      return NextResponse.json({ error: 'provider requis' }, { status: 400 })
    }

    await db.run('DELETE FROM analytics_integrations WHERE provider = ?', [provider])

    return NextResponse.json({ success: true, message: 'Intégration supprimée' })
  } catch (error: any) {
    console.error('❌ DELETE analytics:', error)
    if (error.message === 'TOKEN_MISSING')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN')
      return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'