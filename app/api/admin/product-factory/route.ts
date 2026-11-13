import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, createAdminErrorResponse } from '@/lib/admin-auth'
import { callLLMWithFallback, extractJSON } from '@/lib/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface FactoryRequest {
  title?: string
  category?: string
  audience?: string
  problem?: string
  evidence?: string
}

interface ProductBrief {
  title: string
  positioning: string
  targetAudience: string
  customerOutcome: string
  outline: string[]
  deliverables: string[]
  salesDescription: string
  keywords: string[]
  metaTitle: string
  metaDescription: string
  validationNotes: string[]
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function cleanList(value: unknown, limit: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, limit)
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return createAdminErrorResponse('Accès administrateur requis')

  let input: FactoryRequest
  try {
    input = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const title = cleanText(input.title, 120)
  const category = cleanText(input.category, 80)
  const audience = cleanText(input.audience, 300)
  const problem = cleanText(input.problem, 500)
  const evidence = cleanText(input.evidence, 1200)

  if (title.length < 3 || !category || !audience || !problem) {
    return NextResponse.json(
      { error: 'Renseignez un titre, une catégorie, un public cible et le problème client.' },
      { status: 400 },
    )
  }

  if (!process.env.OPENROUTER_API_KEY || process.env.USE_MOCK_AI === 'true') {
    return NextResponse.json(
      { error: 'La Product Factory nécessite une clé OpenRouter active. Aucun contenu de démonstration ne sera présenté comme une recherche réelle.' },
      { status: 503 },
    )
  }

  const systemPrompt = `Tu es un assistant de conception de produits numériques. Tu aides un administrateur à préparer un brouillon à vérifier par un humain. Réponds uniquement en JSON valide. N'invente jamais des données de marché, des tendances, des sources, des ventes, des certifications, des témoignages, des droits ou des résultats. Utilise uniquement les informations soumises et signale les hypothèses comme devant être vérifiées. Ne copie aucun produit ni contenu tiers.`
  const userPrompt = `Prépare un brief produit en français à partir des informations ci-dessous.
Titre proposé : ${title}
Catégorie : ${category}
Public cible fourni par l'équipe : ${audience}
Problème client fourni par l'équipe : ${problem}
Notes ou sources de recherche fournies par l'équipe (peuvent être absentes) : ${evidence || 'Aucune source fournie'}

Retourne les champs JSON suivants : title, positioning (une phrase), targetAudience (reprends le public sans inventer des caractéristiques), customerOutcome (formulé sans garantie), outline (5 à 8 étapes), deliverables (3 à 6 livrables possibles), salesDescription (100 à 160 mots, sans promesse non étayée), keywords (5 à 8 expressions), metaTitle (maximum 60 caractères), metaDescription (maximum 160 caractères), validationNotes (3 à 6 vérifications humaines, notamment demande, droits et faisabilité). Si des informations manquent, indique-le clairement dans validationNotes. Ne donne ni score de demande ni estimation de ventes/prix.`

  try {
    const raw = await callLLMWithFallback(systemPrompt, userPrompt, {
      json: true,
      temperature: 0.4,
      maxTokens: 1800,
    })
    const parsed = extractJSON<Partial<ProductBrief>>(raw)
    if (!parsed || typeof parsed !== 'object') {
      return NextResponse.json({ error: 'La réponse IA ne pouvait pas être validée. Réessayez.' }, { status: 502 })
    }

    const brief: ProductBrief = {
      title: cleanText(parsed.title, 120) || title,
      positioning: cleanText(parsed.positioning, 240),
      targetAudience: cleanText(parsed.targetAudience, 300) || audience,
      customerOutcome: cleanText(parsed.customerOutcome, 300),
      outline: cleanList(parsed.outline, 8, 160),
      deliverables: cleanList(parsed.deliverables, 6, 160),
      salesDescription: cleanText(parsed.salesDescription, 1800),
      keywords: cleanList(parsed.keywords, 8, 80),
      metaTitle: cleanText(parsed.metaTitle, 60),
      metaDescription: cleanText(parsed.metaDescription, 160),
      validationNotes: cleanList(parsed.validationNotes, 6, 220),
    }

    if (!brief.positioning || brief.outline.length < 3 || !brief.salesDescription) {
      return NextResponse.json({ error: 'Le brief généré est incomplet. Réessayez ou complétez-le manuellement.' }, { status: 502 })
    }

    return NextResponse.json({
      success: true,
      brief,
      evidenceProvided: Boolean(evidence),
      note: 'Brouillon IA uniquement : aucune étude de marché indépendante n’a été réalisée et aucune donnée commerciale n’est vérifiée.',
    })
  } catch (error) {
    console.error('Product Factory generation failed:', error)
    return NextResponse.json(
      { error: 'La génération est temporairement indisponible. Vérifiez la configuration IA puis réessayez.' },
      { status: 503 },
    )
  }
}
