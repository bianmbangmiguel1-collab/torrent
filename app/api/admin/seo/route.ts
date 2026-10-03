// app/api/admin/seo/route.ts
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
// Analyse SEO d'un produit
// ============================================================
function analyzeProduct(p: any) {
  const issues: string[] = []
  let score = 100

  // Titre
  if (!p.title || p.title.length < 10) {
    issues.push('Titre trop court (< 10 caractères)')
    score -= 15
  } else if (p.title.length > 70) {
    issues.push('Titre trop long (> 70 caractères)')
    score -= 5
  }

  // Description
  if (!p.description || p.description.length < 50) {
    issues.push('Description absente ou trop courte')
    score -= 20
  } else if (p.description.length > 5000) {
    issues.push('Description trop longue')
    score -= 3
  }

  // Slug
  if (!p.slug) {
    issues.push('Slug manquant')
    score -= 15
  } else if (p.slug.length > 60) {
    issues.push('Slug trop long (> 60 caractères)')
    score -= 5
  }

  // Meta title
  if (!p.meta_title) {
    issues.push('Meta title manquant')
    score -= 10
  } else if (p.meta_title.length > 60) {
    issues.push('Meta title trop long (> 60 caractères)')
    score -= 3
  }

  // Meta description
  if (!p.meta_description) {
    issues.push('Meta description manquante')
    score -= 10
  } else if (p.meta_description.length > 160) {
    issues.push('Meta description trop longue (> 160 caractères)')
    score -= 3
  }

  // Meta keywords
  if (!p.meta_keywords) {
    issues.push('Meta keywords manquants')
    score -= 3
  }

  // Image principale
  if (!p.main_image) {
    issues.push('Aucune image principale')
    score -= 12
  }

  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    score: Math.max(score, 0),
    issues,
  }
}

// ============================================================
// GET /api/admin/seo
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)

    // ============================================================
    // 1. Analyse des produits
    // ============================================================
    const products = await db.all(`
      SELECT
        p.id, p.title, p.slug, p.description, p.status,
        p.meta_title, p.meta_description, p.meta_keywords,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) AS main_image
      FROM products p
      ORDER BY p.created_at DESC
    `)

    const productAnalyses = products.map(analyzeProduct)
    const avgProductScore =
      productAnalyses.length > 0
        ? Math.round(
            productAnalyses.reduce((sum, p) => sum + p.score, 0) /
              productAnalyses.length
          )
        : 0

    // ============================================================
    // 2. Analyse des pages CMS
    // ============================================================
    let pages: any[] = []
    let pageAnalyses: any[] = []
    let avgPageScore = 0

    try {
      pages = await db.all(`
        SELECT id, title, slug, content, status, meta_title, meta_description
        FROM pages
      `)

      pageAnalyses = pages.map((p: any) => {
        const issues: string[] = []
        let score = 100

        if (!p.meta_title) {
          issues.push('Meta title manquant')
          score -= 15
        }
        if (!p.meta_description) {
          issues.push('Meta description manquante')
          score -= 15
        }
        if (!p.content || p.content.length < 100) {
          issues.push('Contenu trop court')
          score -= 20
        }

        return {
          id: p.id,
          title: p.title,
          slug: p.slug,
          status: p.status,
          score: Math.max(score, 0),
          issues,
        }
      })

      avgPageScore =
        pageAnalyses.length > 0
          ? Math.round(
              pageAnalyses.reduce((sum, p) => sum + p.score, 0) /
                pageAnalyses.length
            )
          : 0
    } catch {}

    // ============================================================
    // 3. Score global
    // ============================================================
    const globalScore = Math.round(
      (avgProductScore * 0.6 + avgPageScore * 0.4) || avgProductScore || 0
    )

    // ============================================================
    // 4. Stats globales
    // ============================================================
    const totalProducts = products.length
    const totalPages = pages.length

    const productsWithIssues = productAnalyses.filter(p => p.issues.length > 0)
    const pagesWithIssues = pageAnalyses.filter(p => p.issues.length > 0)

    const productsMissingMeta = productAnalyses.filter(p =>
      p.issues.some(i => i.toLowerCase().includes('meta'))
    ).length

    const productsMissingImage = productAnalyses.filter(p =>
      p.issues.some(i => i.toLowerCase().includes('image'))
    ).length

    // Top 10 priorités (score le plus bas)
    const priorityProducts = [...productAnalyses]
      .filter(p => p.issues.length > 0)
      .sort((a, b) => a.score - b.score)
      .slice(0, 10)

    const priorityPages = [...pageAnalyses]
      .filter(p => p.issues.length > 0)
      .sort((a, b) => a.score - b.score)
      .slice(0, 10)

    return NextResponse.json({
      success: true,
      globalScore,
      summary: {
        totalProducts,
        totalPages,
        avgProductScore,
        avgPageScore,
        productsWithIssues: productsWithIssues.length,
        pagesWithIssues: pagesWithIssues.length,
        productsMissingMeta,
        productsMissingImage,
      },
      priorityProducts,
      priorityPages,
      products: productAnalyses,
      pages: pageAnalyses,
    })
  } catch (error: any) {
    console.error('❌ GET /api/admin/seo:', error)
    if (error.message === 'TOKEN_MISSING')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN')
      return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'