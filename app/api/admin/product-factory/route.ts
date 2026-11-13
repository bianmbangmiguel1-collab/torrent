import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, createAdminErrorResponse } from '@/lib/admin-auth'

type Opportunity = {
  id: string
  title: string
  category: string
  trend: string
  targetAudience: string
  problem: string
  confidence: number
  demandScore: number
  justification: string
  keywords: string[]
  sources: string[]
}

const opportunities: Opportunity[] = [
  {
    id: 'ai-business-systems',
    title: 'Systèmes IA pour entrepreneurs africains',
    category: 'Templates & automations',
    trend: 'Croissance forte des PME digitals',
    targetAudience: 'Fondateurs de micro-entreprises, freelancers, agences',
    problem: 'Ils veulent automatiser la prospection, les rendez-vous et la gestion client sans embaucher une équipe.',
    confidence: 92,
    demandScore: 88,
    justification:
      'Le besoin de plug-and-play business systems est très fort dans les marchés émergents, où l’exécution rapide prime sur la complexité.',
    keywords: ['automation', 'saas', 'lead generation', 'ai workflow'],
    sources: ['Google Trends', 'Gumroad marketplace', 'forums entrepreneurs'],
  },
  {
    id: 'creator-growth-kit',
    title: 'Kit de croissance pour créateurs de contenu',
    category: 'Digital Products',
    trend: 'Montée des créateurs de niche',
    targetAudience: 'YouTubers, TikTokers, enseignants, infopreneurs',
    problem: 'Ils doivent convertir leur audience en ventes sans savoir structurer une offre, un funnel ou des livrables.',
    confidence: 89,
    demandScore: 86,
    justification:
      'Les créateurs ont besoin d’outils concrets pour transformer l’audience en revenus, souvent sans équipe marketing.',
    keywords: ['creator economy', 'content strategy', 'funnel', 'offer kit'],
    sources: ['Creator economy reports', 'marketplaces', 'community feedback'],
  },
  {
    id: 'micro-education-pack',
    title: 'Packs d’apprentissage micro-qualitatifs',
    category: 'Courses & guides',
    trend: 'Demande solide sur la montée en compétences',
    targetAudience: 'Professionnels, étudiants, débutants en commerce digital',
    problem: 'Ils recherchent des ressources rapides, spécifiques et actionnables, faciles à consommer sur mobile.',
    confidence: 91,
    demandScore: 84,
    justification:
      'Les achats courts, orientés résultats et compréhensibles sont plus faciles à vendre que les formations longues et génériques.',
    keywords: ['micro learning', 'digital skills', 'career growth', 'practical guide'],
    sources: ['e-learning trend data', 'SEO keyword clusters', 'audience interviews'],
  },
]

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return createAdminErrorResponse('Accès administrateur requis')

  return NextResponse.json({
    success: true,
    opportunities,
  })
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return createAdminErrorResponse('Accès administrateur requis')

  let payload: Partial<Opportunity> & { title?: string; category?: string }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Corps JSON invalide' },
      { status: 400 },
    )
  }

  const title = payload.title || 'Produit numérique premium'
  const category = payload.category || 'Digital products'

  const brief = {
    title,
    category,
    targetAudience:
      payload.targetAudience || 'Professionnels qui souhaitent gagner du temps et augmenter leur efficacité.',
    marketGap:
      payload.problem || 'Le marché manque d’outils concrets, faciles à mettre en œuvre et directement monétisables.',
    valueProposition: [
      'Résout un besoin immédiat avec une proposition claire',
      'Livrable utilisable en moins d’une heure',
      'Compatible mobile, desktop et workflow de travail',
      'Facile à commercialiser avec une fiche produit rassurante',
    ],
    deliverables: [
      'Guide PDF premium',
      'Template editable',
      'Checklist d’action',
      'Vidéos de démonstration',
      'Mise à jour de 30 jours',
    ],
    priceEstimate: 25000,
    comparePrice: 45000,
    seo: {
      metaTitle: `${title} | Outil pratique et premium`,
      metaDescription: `Découvrez ${title}, un pack digital conçu pour aller droit au résultat sans friction.`,
      keywords: (payload.keywords || ['digital product', 'ai tools', 'growth']).slice(0, 6),
    },
    qualityScore: 94,
    confidence: payload.confidence ?? 90,
    demandScore: payload.demandScore ?? 88,
    sources: payload.sources || ['TikTok trend analysis', 'marketplaces insights', 'keyword research'],
    qaChecklist: [
      'Message clair et orienté client',
      'Contenu utilisable sans dépendance complexe',
      'Fichiers prêts à la livraison',
      'Prix cohérent avec la valeur perçue',
      'Droits et licences validés',
    ],
  }

  return NextResponse.json({
    success: true,
    product: brief,
  })
}
