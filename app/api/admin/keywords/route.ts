// app/api/admin/keywords/route.ts
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

// Mots vides français + anglais à exclure
const STOP_WORDS = new Set([
  // Français
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'dans', 'sur', 'sous', 'avec',
  'pour', 'par', 'vers', 'chez', 'sans', 'est', 'sont', 'etre', 'été', 'etait',
  'etre', 'avoir', 'fait', 'faire', 'cette', 'cet', 'ce', 'ces', 'son', 'sa',
  'ses', 'leur', 'leurs', 'notre', 'nos', 'votre', 'vos', 'mon', 'ma', 'mes',
  'ton', 'ta', 'tes', 'qui', 'que', 'quoi', 'dont', 'ou', 'et', 'donc', 'or',
  'ni', 'car', 'mais', 'si', 'comme', 'tout', 'tous', 'toute', 'toutes', 'meme',
  'aussi', 'tres', 'plus', 'moins', 'bien', 'peu', 'beaucoup', 'trop', 'assez',
  'a', 'au', 'aux', 'en', 'y', 'il', 'elle', 'ils', 'elles', 'nous', 'vous',
  'je', 'tu', 'on', 'se', 'ne', 'pas', 'plus', 'jamais', 'toujours', 'deja',
  'ici', 'la', 'la', 'celui', 'celle', 'ceux', 'celles', 'ceci', 'cela',
  'pour', 'afin', 'lors', 'alors', 'puis', 'ensuite', 'enfin', 'bref',
  'http', 'https', 'www', 'com', 'net', 'org', 'fr', 'php', 'html',
  // Anglais
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'is', 'are',
  'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
  'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
  'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very',
])

// Nettoyer et tokeniser un texte
function tokenize(text: string): string[] {
  if (!text) return []
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ') // retirer le HTML
    .replace(/[^\wàâäéèêëïîôöùûüçñ\s'-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && w.length <= 30)
    .filter(w => !STOP_WORDS.has(w))
    .filter(w => !/^\d+$/.test(w))
}

// ============================================================
// GET /api/admin/keywords?limit=50
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { db } = await requireAdmin(request)
    const { searchParams } = new URL(request.url)
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 10),
      200
    )

    // ============================================================
    // 1. Récupérer tous les textes indexables
    // ============================================================
    let products: any[] = []
    let pages: any[] = []
    let categories: any[] = []

    try {
      products = await db.all(
        `SELECT id, title, description, content, meta_title, meta_description, meta_keywords
         FROM products`
      )
    } catch {}

    try {
      pages = await db.all(
        `SELECT id, title, content, meta_title, meta_description
         FROM pages`
      )
    } catch {}

    try {
      categories = await db.all(`SELECT id, name, description FROM categories`)
    } catch {}

    // ============================================================
    // 2. Tokeniser tous les textes
    // ============================================================
    const globalCounts: Record<string, number> = {}
    const productCounts: Record<string, number> = {}
    const pageCounts: Record<string, number> = {}
    const categoryCounts: Record<string, number> = {}

    const incrementMap = (map: Record<string, number>, words: string[]) => {
      for (const w of words) {
        map[w] = (map[w] || 0) + 1
        globalCounts[w] = (globalCounts[w] || 0) + 1
      }
    }

    // Produits
    for (const p of products) {
      const words = [
        ...tokenize(p.title || ''),
        ...tokenize(p.description || ''),
        ...tokenize(p.content || ''),
        ...tokenize(p.meta_keywords || ''),
      ]
      incrementMap(productCounts, words)
    }

    // Pages
    for (const p of pages) {
      const words = [
        ...tokenize(p.title || ''),
        ...tokenize(p.content || ''),
      ]
      incrementMap(pageCounts, words)
    }

    // Catégories
    for (const c of categories) {
      const words = [
        ...tokenize(c.name || ''),
        ...tokenize(c.description || ''),
      ]
      incrementMap(categoryCounts, words)
    }

    // ============================================================
    // 3. Construire le top des mots-clés
    // ============================================================
    const sortedGlobal = Object.entries(globalCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)

    const topKeywords = sortedGlobal.map(([word, count]) => ({
      word,
      count,
      inProducts: productCounts[word] || 0,
      inPages: pageCounts[word] || 0,
      inCategories: categoryCounts[word] || 0,
      // Score de présence relative
      score: Math.round(
        ((productCounts[word] || 0) * 1 +
          (pageCounts[word] || 0) * 0.7 +
          (categoryCounts[word] || 0) * 0.5) *
          10
      ),
    }))

    // ============================================================
    // 4. Mots-clés rares (utilisés une seule fois)
    // ============================================================
    const rareKeywords = Object.entries(globalCounts)
      .filter(([_, count]) => count === 1)
      .map(([word]) => word)
      .slice(0, 30)

    // ============================================================
    // 5. Nuage de mots (top 40 avec poids 1-10)
    // ============================================================
    const maxCount = sortedGlobal[0]?.[1] || 1
    const wordCloud = sortedGlobal.slice(0, 40).map(([word, count]) => ({
      word,
      count,
      weight: Math.max(1, Math.round((count / maxCount) * 10)),
    }))

    // ============================================================
    // 6. Analyse des longueurs
    // ============================================================
    const totalUniqueWords = Object.keys(globalCounts).length
    const totalWords = Object.values(globalCounts).reduce((s, c) => s + c, 0)
    const avgWordFrequency = Math.round(totalWords / Math.max(totalUniqueWords, 1))

    // ============================================================
    // 7. Stats
    // ============================================================
    const stats = {
      totalUniqueWords,
      totalWords,
      avgWordFrequency,
      productsAnalyzed: products.length,
      pagesAnalyzed: pages.length,
      categoriesAnalyzed: categories.length,
    }

    return NextResponse.json({
      success: true,
      stats,
      topKeywords,
      rareKeywords,
      wordCloud,
    })
  } catch (error: any) {
    console.error('❌ GET /api/admin/keywords:', error)
    if (error.message === 'TOKEN_MISSING')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (error.message === 'NOT_ADMIN')
      return NextResponse.json({ error: 'Admin requis' }, { status: 403 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'