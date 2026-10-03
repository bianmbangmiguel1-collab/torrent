// app/api/ai/generate-product/route.ts
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { requireAdmin, createAdminErrorResponse } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ============================================================
// TYPES
// ============================================================
interface UnsplashResponse {
  urls?: {
    regular?: string;
  };
}

interface GenerateProductRequest {
  title: string;
  type?: string;
  brand?: string;
  category?: string;
}

interface GeneratedProductData {
  description?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  tags?: string[];
  price?: number;
  compare_price?: number | null;
  cost_price?: number | null;
  stock?: number;
  stock_alert?: number;
  sku?: string;
  brand?: string;
  weight?: number;
  dimensions?: string;
  validity_start_date?: string;
  validity_end_date?: string;
  validity_duration_days?: number;
}

// ============================================================
// RECHERCHE D'IMAGE SUR UNSPLASH (optionnel)
// ============================================================
async function searchUnsplashImage(query: string): Promise<string | null> {
  try {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY
    if (!accessKey) return null

    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape`,
      {
        headers: { Authorization: `Client-ID ${accessKey}` },
      }
    )
    if (!res.ok) return null
    const data = (await res.json()) as UnsplashResponse
    return data.urls?.regular || null
  } catch {
    return null
  }
}

// ============================================================
// GÉNÉRATION MOCK (FALLBACK)
// ============================================================
function generateMockData(title: string, type: string, imageUrl?: string) {
  const typeLabels: Record<string, string> = {
    file: 'fichier numérique',
    license: 'licence logicielle',
    subscription: 'abonnement',
    course: 'formation en ligne',
    event: 'événement',
    credits: 'crédits',
    consultation: 'consultation',
    affiliate: 'affiliation',
    certificate: 'certification',
    data: 'données',
    ia_generation: 'contenu IA',
    custom: 'contenu personnalisé',
    survey: 'questionnaire',
    streaming: 'streaming',
    group_access: 'accès groupe'
  }

  const typeLabel = typeLabels[type] || 'produit numérique'
  const now = new Date()
  const startDate = now.toISOString().slice(0, 16)
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)

  return {
    description: `<p><strong>✨ Découvrez "${title}"</strong></p>
      <p>Ce ${typeLabel} a été conçu pour vous offrir une expérience exceptionnelle. 
      Il allie qualité, performance et innovation.</p>
      <ul>
        <li>✅ Contenu de haute qualité</li>
        <li>✅ Livraison instantanée après paiement</li>
        <li>✅ Support client réactif</li>
        <li>✅ Garantie satisfait ou remboursé</li>
      </ul>
      <p>Ne manquez pas cette opportunité unique d'enrichir votre expérience.</p>`,
    meta_title: `${title} | Acheter en ligne sur TorrentTwist`,
    meta_description: `Découvrez ${title} sur TorrentTwist. ${typeLabel} de qualité, livraison rapide et sécurisée.`,
    meta_keywords: `${title}, ${typeLabel}, e-commerce, achat en ligne, TorrentTwist`,
    tags: [typeLabel, 'qualité', 'livraison rapide', 'satisfaction garantie'],
    price: 9900,
    compare_price: 14900,
    cost_price: 5000,
    stock: 50,
    stock_alert: 5,
    sku: `${type.toUpperCase()}-${Date.now().toString().slice(-6)}`,
    brand: 'TorrentTwist',
    weight: 0,
    dimensions: '',
    validity_start_date: startDate,
    validity_end_date: endDate,
    validity_duration_days: 30,
    image_url: imageUrl || null
  }
}

// ============================================================
// FONCTION POUR EXTRAIRE LE JSON D'UNE RÉPONSE TEXTE
// ============================================================
function extractJSON(text: string): GeneratedProductData | null {
  // Essayer de parser directement
  try {
    return JSON.parse(text)
  } catch {
    // Si échec, chercher un bloc JSON avec regex
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0])
      } catch {
        // Ignorer
      }
    }
    // Sinon, essayer de réparer un JSON brisé (approche simple)
    try {
      // Remplacer les guillemets simples par doubles (pour les clés)
      const fixed = text.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":')
      return JSON.parse(fixed)
    } catch {
      // Échec final
      return null
    }
  }
}

// ============================================================
// POST : Génération IA avec authentification admin
// ============================================================
export async function POST(request: NextRequest) {
  try {
    // ✅ Vérification admin via le middleware (cookie admin_session)
    const admin = await requireAdmin(request)
    if (!admin) {
      return createAdminErrorResponse()
    }

    // 1. Données du formulaire
    const { title, type, brand, category } =
      (await request.json()) as GenerateProductRequest

    if (!title || title.length < 3) {
      return NextResponse.json(
        { error: 'Le titre doit faire au moins 3 caractères.' },
        { status: 400 }
      )
    }

    // 2. Vérifier la clé OpenRouter
    const apiKey = process.env.OPENROUTER_API_KEY
    const useMock = !apiKey || process.env.USE_MOCK_AI === 'true'

    // 3. Récupérer une image depuis Unsplash (si la clé est configurée)
    let imageUrl = null
    if (process.env.UNSPLASH_ACCESS_KEY) {
      try {
        imageUrl = await searchUnsplashImage(title)
        console.log(`🖼️ Image trouvée: ${imageUrl || 'aucune'}`)
      } catch {}
    }

    if (useMock) {
      console.log('🧪 Utilisation du fallback IA (mock)')
      const mockData = generateMockData(title, type || 'file', imageUrl || undefined)
      return NextResponse.json({
        success: true,
        data: mockData,
        source: 'mock',
        image: imageUrl
      })
    }

    // 4. Client OpenRouter
    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'TorrentTwist',
      }
    })

    // 5. Prompt
    const now = new Date()
    const defaultStart = now.toISOString().slice(0, 16)
    const defaultEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)

    const prompt = `
      Tu es un expert en rédaction e-commerce, marketing, et pricing.
      À partir des informations suivantes, génère un produit numérique complet sous forme d'objet JSON.

      Titre : "${title}"
      Type de produit : "${type || 'fichier numérique'}"
      Marque : "${brand || 'TorrentTwist'}"
      Catégorie : "${category || 'Non spécifiée'}"

      Tu dois répondre UNIQUEMENT avec un objet JSON valide contenant tous ces champs :

      {
        "description": "Une description marketing complète et persuasive (150-200 mots) en français, avec des emojis, des puces HTML (<ul><li>...</li></ul>), et des balises <strong> pour mettre en avant les bénéfices.",
        "meta_title": "Titre SEO optimisé (50-60 caractères) avec le nom du produit et un mot-clé fort.",
        "meta_description": "Meta description accrocheuse (150-160 caractères) qui donne envie de cliquer.",
        "meta_keywords": "5 à 8 mots-clés pertinents séparés par des virgules.",
        "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
        "price": Un prix recommandé en FCFA (nombre entier, entre 1000 et 500000),
        "compare_price": Un prix barré plus élevé pour créer un sentiment d'économie (ou null),
        "cost_price": Un prix de revient estimé (ou null),
        "stock": Quantité en stock (entre 10 et 1000),
        "stock_alert": Seuil d'alerte (entre 1 et 20),
        "sku": Un code SKU unique de 6 à 10 caractères alphanumériques (ex: "PRD-1234"),
        "brand": Marque du produit (ou "TorrentTwist" par défaut),
        "weight": Poids en kg (ex: 0.5, 1, 2.5) ou 0 si numérique,
        "dimensions": Dimensions au format "Lxlxh" (ex: "30x20x5") ou "",
        "validity_start_date": Date de début de validité au format "YYYY-MM-DDTHH:mm" (ex: "${defaultStart}"),
        "validity_end_date": Date de fin de validité au format "YYYY-MM-DDTHH:mm" (ex: "${defaultEnd}"),
        "validity_duration_days": Durée en jours (ex: 30, 90, 365)
      }

      Important : 
      - Tous les prix doivent être en FCFA (sans virgule).
      - Les dates doivent être cohérentes (fin > début).
      - La description doit être en HTML avec des balises appropriées.
      - N'ajoute aucun autre texte que le JSON.
      - Si tu ne sais pas pour un champ, mets null (ex: cost_price).
    `

    // 6. Appel à OpenRouter
    console.log('🔄 Appel à openrouter/free pour générer le produit complet...')
    const completion = await client.chat.completions.create({
      model: 'openrouter/free',
      messages: [
        {
          role: 'system',
          content: `Tu es un expert en e-commerce, marketing, et pricing. Tu génères des fiches produits complètes et irrésistibles.`
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const usedModel = completion.model || 'unknown'
    console.log(`✅ Modèle utilisé: ${usedModel}`)

    const rawContent = completion.choices[0]?.message?.content || '{}'
    console.log(`📝 Contenu brut: ${rawContent.substring(0, 200)}...`)

    // 7. Extraction robuste du JSON
    let parsedData: GeneratedProductData | null
    try {
      parsedData = extractJSON(rawContent)
      if (!parsedData) {
        throw new Error('Impossible d\'extraire un JSON valide')
      }
    } catch (parseError) {
      console.warn('⚠️ Échec du parsing JSON, utilisation du fallback')
      const fallbackData = generateMockData(title, type || 'file', imageUrl || undefined)
      return NextResponse.json({
        success: true,
        data: fallbackData,
        source: 'mock-fallback',
        note: 'La réponse de l\'IA n\'était pas un JSON valide'
      })
    }

    // 8. Fusion avec l'image
    const result = {
      description: parsedData.description || '',
      meta_title: parsedData.meta_title || '',
      meta_description: parsedData.meta_description || '',
      meta_keywords: parsedData.meta_keywords || '',
      tags: Array.isArray(parsedData.tags) ? parsedData.tags : [],
      price: parsedData.price || 9900,
      compare_price: parsedData.compare_price || null,
      cost_price: parsedData.cost_price || null,
      stock: parsedData.stock || 50,
      stock_alert: parsedData.stock_alert || 5,
      sku: parsedData.sku || `PRD-${Date.now().toString().slice(-6)}`,
      brand: parsedData.brand || 'TorrentTwist',
      weight: parsedData.weight || 0,
      dimensions: parsedData.dimensions || '',
      validity_start_date: parsedData.validity_start_date || defaultStart,
      validity_end_date: parsedData.validity_end_date || defaultEnd,
      validity_duration_days: parsedData.validity_duration_days || 30,
      image_url: imageUrl
    }

    return NextResponse.json({
      success: true,
      data: result,
      source: 'openrouter',
      model: usedModel
    })
  } catch (error: any) {
    console.error('❌ Erreur OpenRouter:', error)

    // Fallback ultime
    try {
      const body = (await request.json()) as GenerateProductRequest
      const fallbackData = generateMockData(
        body.title || 'Produit',
        body.type || 'file'
      )
      return NextResponse.json({
        success: true,
        data: fallbackData,
        source: 'mock-fallback',
        note: 'Utilisation du fallback suite à une erreur API'
      })
    } catch {
      return NextResponse.json(
        { error: 'Erreur lors de la génération IA' },
        { status: 500 }
      )
    }
  }
}