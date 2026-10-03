// app/api/admin/integrations/route.ts
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
    return { db }
  } catch (err: any) {
    if (err.message === 'TOKEN_MISSING' || err.message === 'NOT_ADMIN') throw err
    throw new Error('TOKEN_INVALID')
  }
}

// Catégories d'intégrations
const CATEGORIES = [
  {
    id: 'analytics',
    name: 'Analytics',
    icon: '📊',
    description: 'Mesurez votre audience et vos conversions',
    href: '/admin/integrations/analytics',
    providers: ['Google Analytics', 'Plausible', 'Matomo', 'Umami', 'Hotjar'],
    table: 'analytics_integrations',
  },
  {
    id: 'crm',
    name: 'CRM',
    icon: '🤝',
    description: 'Gérez vos contacts, clients et prospects',
    href: '/admin/integrations/crm',
    providers: ['HubSpot', 'Salesforce', 'Pipedrive', 'Zoho', 'Airtable', 'Notion'],
    table: 'crm_integrations',
  },
  {
    id: 'email',
    name: 'Email Marketing',
    icon: '📧',
    description: 'Newsletters et campagnes email',
    href: '/admin/integrations/email',
    providers: ['Mailchimp', 'SendGrid', 'Brevo', 'Mailgun', 'Postmark'],
    table: 'email_integrations',
  },
  {
    id: 'payments',
    name: 'Paiements',
    icon: '💳',
    description: 'Encaissement et facturation',
    href: '/admin/integrations/payments',
    providers: ['FedaPay', 'Stripe', 'PayPal', 'LeekPay'],
    table: 'payment_integrations',
  },
  {
    id: 'shipping',
    name: 'Livraison',
    icon: '📦',
    description: 'Expédition et suivi de colis',
    href: '/admin/integrations/shipping',
    providers: ['DHL', 'UPS', 'FedEx', 'La Poste'],
    table: 'shipping_integrations',
  },
  {
    id: 'social',
    name: 'Réseaux sociaux',
    icon: '📱',
    description: 'Connexion aux plateformes sociales',
    href: '/admin/integrations/social',
    providers: ['Facebook', 'Instagram', 'Twitter/X', 'TikTok', 'LinkedIn'],
    table: 'social_integrations',
  },
  {
    id: 'ai',
    name: 'IA & Automatisation',
    icon: '🤖',
    description: 'Intelligence artificielle et workflows',
    href: '/admin/integrations/ai',
    providers: ['OpenRouter', 'OpenAI', 'Anthropic', 'Zapier', 'Make'],
    table: 'ai_integrations',
  },
  {
    id: 'storage',
    name: 'Stockage cloud',
    icon: '☁️',
    description: 'Fichiers et médias',
    href: '/admin/integrations/storage',
    providers: ['AWS S3', 'Cloudflare R2', 'Google Drive', 'Dropbox'],
    table: 'storage_integrations',
  },
]

// ============================================================
// GET — Vue d'ensemble des intégrations
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)

    const categories = []

    for (const cat of CATEGORIES) {
      let installedCount = 0
      let enabledCount = 0

      // Compter les intégrations installées/actives
      try {
        const tableExists = await db.get(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
          [cat.table]
        )

        if (tableExists) {
          const installed = await db.get(
            `SELECT COUNT(*) as c FROM ${cat.table}`
          )
          const enabled = await db.get(
            `SELECT COUNT(*) as c FROM ${cat.table} WHERE is_enabled = 1`
          )
          installedCount = installed?.c || 0
          enabledCount = enabled?.c || 0
        }
      } catch {}

      categories.push({
        ...cat,
        installedCount,
        enabledCount,
        providersCount: cat.providers.length,
      })
    }

    // Stats globales
    const stats = {
      totalCategories: CATEGORIES.length,
      totalInstalled: categories.reduce((s, c) => s + c.installedCount, 0),
      totalEnabled: categories.reduce((s, c) => s + c.enabledCount, 0),
      totalProviders: CATEGORIES.reduce((s, c) => s + c.providers.length, 0),
    }

    return NextResponse.json({ success: true, stats, categories })
  } catch (error: any) {
    console.error('❌ GET /api/admin/integrations:', error)
    if (error.message === 'TOKEN_MISSING') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN') return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'