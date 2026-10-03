// app/api/admin/sitemap/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import { getDB } from '@/lib/db'
import fs from 'fs/promises'
import path from 'path'

const JWT_SECRET = process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'

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
    return { db }
  } catch (err: any) {
    if (err.message === 'TOKEN_MISSING' || err.message === 'NOT_ADMIN') throw err
    throw new Error('TOKEN_INVALID')
  }
}

// ============================================================
// GET /api/admin/sitemap — Analyse et génère le sitemap
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') // 'xml' ou 'json'

    const baseUrl =
      process.env.NODE_ENV === 'production'
        ? 'https://torrenttwist.com'
        : 'http://localhost:3000'

    // ============================================================
    // 1. Récupérer toutes les URLs
    // ============================================================
    const urls: Array<{ loc: string; lastmod: string; changefreq: string; priority: number; type: string; title: string }> = []

    // Pages statiques
    const staticPages = [
      { path: '/', priority: 1.0, changefreq: 'daily', title: 'Accueil' },
      { path: '/products', priority: 0.9, changefreq: 'daily', title: 'Produits' },
      { path: '/categories', priority: 0.8, changefreq: 'weekly', title: 'Catégories' },
      { path: '/about', priority: 0.5, changefreq: 'monthly', title: 'À propos' },
      { path: '/contact', priority: 0.5, changefreq: 'monthly', title: 'Contact' },
      { path: '/faq', priority: 0.6, changefreq: 'monthly', title: 'FAQ' },
      { path: '/login', priority: 0.3, changefreq: 'monthly', title: 'Connexion' },
      { path: '/signup', priority: 0.3, changefreq: 'monthly', title: 'Inscription' },
    ]
    for (const p of staticPages) {
      urls.push({
        loc: `${baseUrl}${p.path}`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: p.changefreq,
        priority: p.priority,
        type: 'page',
        title: p.title,
      })
    }

    // Produits publiés
    let products: any[] = []
    try {
      products = await db.all(
        `SELECT id, title, slug, updated_at FROM products
         WHERE status = 'published' OR status = 'active' OR status IS NULL
         ORDER BY updated_at DESC`
      )
    } catch {}

    for (const prod of products) {
      urls.push({
        loc: `${baseUrl}/product/${prod.slug}`,
        lastmod: prod.updated_at?.split(' ')[0] || new Date().toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: 0.8,
        type: 'product',
        title: prod.title,
      })
    }

    // Catégories
    let categories: any[] = []
    try {
      categories = await db.all(
        `SELECT id, name, slug FROM categories WHERE is_active = 1`
      )
    } catch {}

    for (const cat of categories) {
      urls.push({
        loc: `${baseUrl}/category/${cat.slug}`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: 0.7,
        type: 'category',
        title: cat.name,
      })
    }

    // Pages CMS
    let pages: any[] = []
    try {
      pages = await db.all(
        `SELECT id, title, slug, updated_at FROM pages WHERE status = 'published'`
      )
    } catch {}

    for (const pg of pages) {
      urls.push({
        loc: `${baseUrl}/${pg.slug}`,
        lastmod: pg.updated_at?.split(' ')[0] || new Date().toISOString().split('T')[0],
        changefreq: 'monthly',
        priority: 0.6,
        type: 'cms',
        title: pg.title,
      })
    }

    // ============================================================
    // 2. Génération XML
    // ============================================================
    const generateXML = () => {
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
      for (const url of urls) {
        xml += '  <url>\n'
        xml += `    <loc>${url.loc}</loc>\n`
        xml += `    <lastmod>${url.lastmod}</lastmod>\n`
        xml += `    <changefreq>${url.changefreq}</changefreq>\n`
        xml += `    <priority>${url.priority}</priority>\n`
        xml += '  </url>\n'
      }
      xml += '</urlset>'
      return xml
    }

    // Si format=xml, retourner directement le XML
    if (format === 'xml') {
      const xml = generateXML()
      return new NextResponse(xml, {
        headers: {
          'Content-Type': 'application/xml',
          'Content-Disposition': 'inline; filename="sitemap.xml"',
        },
      })
    }

    // ============================================================
    // 3. Stats
    // ============================================================
    const stats = {
      totalUrls: urls.length,
      products: products.length,
      categories: categories.length,
      pages: pages.length,
      staticPages: staticPages.length,
      cmsPages: pages.length,
    }

    // Répartition par type
    const byType = urls.reduce((acc: any, u) => {
      acc[u.type] = (acc[u.type] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      baseUrl,
      stats,
      byType,
      urls,
      xml: generateXML(),
    })
  } catch (error: any) {
    console.error('❌ GET /api/admin/sitemap:', error)
    if (error.message === 'TOKEN_MISSING')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN')
      return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ============================================================
// POST /api/admin/sitemap — Écrire le fichier sitemap.xml
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)

    const baseUrl =
      process.env.NODE_ENV === 'production'
        ? 'https://torrenttwist.com'
        : 'http://localhost:3000'

    // Reconstruction rapide (simplifié)
    const staticPages = ['/', '/products', '/categories', '/about', '/contact', '/faq']
    const products = await db.all(`SELECT slug, updated_at FROM products WHERE status = 'published' OR status = 'active' OR status IS NULL`)
    const categories = await db.all(`SELECT slug FROM categories WHERE is_active = 1`)
    const pages = await db.all(`SELECT slug, updated_at FROM pages WHERE status = 'published'`)

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

    for (const p of staticPages) {
      xml += `  <url><loc>${baseUrl}${p}</loc><priority>0.8</priority></url>\n`
    }
    for (const p of products) {
      xml += `  <url><loc>${baseUrl}/product/${p.slug}</loc><lastmod>${p.updated_at?.split(' ')[0] || ''}</lastmod><priority>0.8</priority></url>\n`
    }
    for (const c of categories) {
      xml += `  <url><loc>${baseUrl}/category/${c.slug}</loc><priority>0.7</priority></url>\n`
    }
    for (const p of pages) {
      xml += `  <url><loc>${baseUrl}/${p.slug}</loc><priority>0.6</priority></url>\n`
    }
    xml += '</urlset>'

    // Écrire dans public/sitemap.xml
    const publicDir = path.join(process.cwd(), 'public')
    await fs.mkdir(publicDir, { recursive: true })
    await fs.writeFile(path.join(publicDir, 'sitemap.xml'), xml, 'utf-8')

    console.log('✅ Sitemap écrit dans public/sitemap.xml')

    return NextResponse.json({
      success: true,
      message: 'Sitemap généré et sauvegardé',
      path: '/sitemap.xml',
      urlCount: staticPages.length + products.length + categories.length + pages.length,
    })
  } catch (error: any) {
    console.error('❌ POST /api/admin/sitemap:', error)
    if (error.message === 'TOKEN_MISSING')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN')
      return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'