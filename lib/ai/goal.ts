// lib/ai/goal.ts
// ============================================================
// 🧠 IA : parcours à VALEUR MAXIMALE via analyse en 2 passes
// ============================================================

import { getDB } from '@/lib/db'
import {
  callLLMWithFallback,
  extractJSON,
  isAIConfigured as isAIConfiguredBase,
} from '@/lib/ai'

// ============================================================
// TYPES
// ============================================================

export interface ClarifiedGoal {
  text: string
  category: GoalCategory
  keywords: string[]
  domain: string
  skillLevel: 'debutant' | 'intermediaire' | 'avance'
  confidence: number
}

export type GoalCategory =
  | 'santé' | 'business' | 'compétence' | 'finance'
  | 'relation' | 'créativité' | 'spiritualité' | 'autre'

export interface DomainKnowledge {
  concepts: string[]
  pitfalls: string[]
  resources: string[]
  quickWins: string[]
  vocabulary: string[]
}

export interface GeneratedStep {
  title: string
  description: string
  mission_text: string
  how_to: string[]
  why: string
  tip: string
  success_criteria: string
  example: string
  estimated_minutes: number
  resources: string[]
  suggested_product_keywords?: string[]
}

export interface GeneratedJourney {
  title: string
  description: string
  steps: GeneratedStep[]
  style?: string
  domainKnowledge?: DomainKnowledge
}

// ============================================================
// 🎨 STYLES ET ANGLES
// ============================================================

const PEDAGOGICAL_STYLES = [
  { id: 'project-first', label: 'Projet d\'abord', instruction: 'Chaque étape produit un LIVRABLE visible.' },
  { id: 'challenge-based', label: 'Défis progressifs', instruction: 'Chaque étape = un DÉFI avec contrainte précise.' },
  { id: 'mentor-guided', label: 'Mentor guidé', instruction: 'Ton de mentor : raccourcis, pièges à éviter.' },
  { id: 'micro-tasks', label: 'Micro-tâches', instruction: '3-4 micro-actions ultra-précises. Max 20 min.' },
  { id: 'story-driven', label: 'Scénario réaliste', instruction: 'Chaque étape = scénario concret.' },
  { id: 'analogy-heavy', label: 'Analogies concrètes', instruction: 'Analogies vie quotidienne.' },
] as const

function pickRandomStyle() {
  return PEDAGOGICAL_STYLES[Math.floor(Math.random() * PEDAGOGICAL_STYLES.length)]
}

const ANGLES = [
  'ultra-pratique, zéro blabla',
  'progression claire et rapide',
  'découverte guidée pas à pas',
  'défi quotidien de 15 min max',
  'livrable concret à chaque étape',
  'méthode éprouvée des experts',
  'anti-blocage avec solutions de contournement',
]

function pickRandomAngle(): string {
  return ANGLES[Math.floor(Math.random() * ANGLES.length)]
}

// ============================================================
// 🌅 PASSE 1 : REFORMULATION
// ============================================================

const CLARIFY_SYSTEM = `Tu es un coach d'élite. Tu comprends INSTANTANÉMENT le vrai besoin.

1. Identifie le DOMAINE PRÉCIS ("guitare acoustique", "Python data", "vente B2B")
2. Détecte le niveau (debutant/intermediaire/avance)
3. Reformule en UNE phrase actionnable (max 20 mots)

⚠️ Reste concret, jamais vague.

Réponds en JSON :
{
  "text": "phrase reformulée",
  "category": "santé|business|compétence|finance|relation|créativité|spiritualité|autre",
  "keywords": ["mot1", "mot2", "mot3", "mot4"],
  "domain": "domaine très précis",
  "skillLevel": "debutant|intermediaire|avance"
}`

export async function clarifyGoal(raw: string): Promise<ClarifiedGoal> {
  const clean = (raw || '').trim()
  if (!clean || clean.length < 4) return fallbackClarify(clean)
  if (!isAIConfiguredBase()) {
    console.warn('⚠️ IA non configurée → fallback clarify')
    return fallbackClarify(clean)
  }

  try {
    const seed = Math.floor(Math.random() * 1_000_000)
    const rawResponse = await callLLMWithFallback(
      CLARIFY_SYSTEM,
      `Objectif : "${clean}"`,
      { json: true, temperature: 0.6, maxTokens: 400, seed }
    )
    const parsed = extractJSON<any>(rawResponse)
    if (!parsed || !parsed.text) {
      console.warn('⚠️ clarifyGoal: JSON invalide, fallback')
      return fallbackClarify(clean)
    }

    return {
      text: String(parsed.text).trim().slice(0, 200),
      category: normalizeCategory(parsed.category),
      keywords: Array.isArray(parsed.keywords)
        ? parsed.keywords.filter((k: any) => typeof k === 'string').slice(0, 8)
        : extractKeywords(clean),
      domain: String(parsed.domain || clean).slice(0, 120),
      skillLevel: normalizeLevel(parsed.skillLevel),
      confidence: 0.85,
    }
  } catch (err) {
    console.error('❌ clarifyGoal échec TOTAL :', err)
    return fallbackClarify(clean)
  }
}

// ============================================================
// 🔬 PASSE 2 : ANALYSE EXPERTE DU DOMAINE
// ============================================================

const ANALYZE_DOMAIN_SYSTEM = `Tu es un EXPERT RECONNU du domaine. Tu fournis une ANALYSE TECHNIQUE PRÉCISE.

⚠️ Utilise le VOCABULAIRE TECHNIQUE exact. Sois SPÉCIFIQUE : noms, chiffres, techniques réelles.
Pas de généralités ("pratiquer régulièrement"). Cite de VRAIS outils, méthodes, concepts.

Réponds en JSON :
{
  "concepts": [
    "Concept clé 1 — description technique précise",
    "Concept clé 2 — description technique précise",
    "...5 à 8 concepts"
  ],
  "pitfalls": [
    "Piège classique débutant 1",
    "...3 à 5 pièges"
  ],
  "resources": [
    "Type de ressource précise 1",
    "...4 à 6 ressources"
  ],
  "quickWins": [
    "Victoire rapide 1 (< 30 min)",
    "...3 à 4 victoires"
  ],
  "vocabulary": [
    "Terme technique 1 — définition en 5 mots",
    "...5 à 8 termes"
  ]
}`

export async function analyzeDomain(goal: ClarifiedGoal): Promise<DomainKnowledge> {
  if (!isAIConfiguredBase()) return fallbackDomainKnowledge(goal)

  try {
    const seed = Math.floor(Math.random() * 1_000_000)
    const userPrompt = `Domaine : "${goal.domain}"
Objectif : "${goal.text}"
Niveau : ${goal.skillLevel}

Fournis une analyse technique EXPERTE.`

    const rawResponse = await callLLMWithFallback(ANALYZE_DOMAIN_SYSTEM, userPrompt, {
      json: true,
      temperature: 0.7,
      maxTokens: 2000,
      seed,
    })

    const parsed = extractJSON<any>(rawResponse)
    if (!parsed) return fallbackDomainKnowledge(goal)

    return {
      concepts: Array.isArray(parsed.concepts)
        ? parsed.concepts.filter((c: any) => typeof c === 'string').slice(0, 8)
        : fallbackDomainKnowledge(goal).concepts,
      pitfalls: Array.isArray(parsed.pitfalls)
        ? parsed.pitfalls.filter((p: any) => typeof p === 'string').slice(0, 5)
        : fallbackDomainKnowledge(goal).pitfalls,
      resources: Array.isArray(parsed.resources)
        ? parsed.resources.filter((r: any) => typeof r === 'string').slice(0, 6)
        : fallbackDomainKnowledge(goal).resources,
      quickWins: Array.isArray(parsed.quickWins)
        ? parsed.quickWins.filter((q: any) => typeof q === 'string').slice(0, 4)
        : fallbackDomainKnowledge(goal).quickWins,
      vocabulary: Array.isArray(parsed.vocabulary)
        ? parsed.vocabulary.filter((v: any) => typeof v === 'string').slice(0, 8)
        : fallbackDomainKnowledge(goal).vocabulary,
    }
  } catch (err) {
    console.error('❌ analyzeDomain échec :', err)
    return fallbackDomainKnowledge(goal)
  }
}

// ============================================================
// 🗺️ PASSE 3 : GÉNÉRATION DE MISSIONS
// ============================================================

const JOURNEY_SYSTEM = `Tu es un coach d'élite. Tu conçois des missions BREVES, EXPLICATIVES et MOTIVANTES.

Tu reçois une ANALYSE EXPERTE du domaine. Tu DOIS l'utiliser pour créer 3 missions PRÉCISES.

📐 FORMAT OBLIGATOIRE :

1. "mission_text" — 1 PHRASE MAX (verbe d'action)
2. "how_to" — 3 à 4 ÉTAPES, chacune ≤ 12 mots (verbe impératif)
3. "why" — 1 PHRASE (≤ 15 mots) qui motive
4. "tip" — 1 PHRASE (≤ 15 mots) : astuce expert OU piège
5. "success_criteria" — critère BINAIRE observable
6. "example" — résultat en 1 phrase
7. "estimated_minutes" — entre 15 et 30
8. "resources" — 2-3 ressources de l'analyse
9. "suggested_product_keywords" — 2-4 mots-clés

⚠️ RÈGLES ABSOLUES :
- JAMAIS : "renseigne-toi", "consacre X minutes", "explore", "pratique"
- TOUJOURS : nom précis, chiffre, technique réelle
- Utilise le VOCABULAIRE de l'analyse
- Cite au moins un CONCEPT de l'analyse par mission
- Évite au moins un PIÈGE de l'analyse

🎨 STYLE : {STYLE}
💡 ANGLE : {ANGLE}

STRUCTURE (3 étapes) :
- Étape 1 / DÉCOUVRIR : 20% des bases qui donnent 80%
- Étape 2 / PRATIQUER : première création mesurable
- Étape 3 / MAÎTRISER : consolider + créer

Réponds en JSON :
{
  "title": "...",
  "description": "...",
  "steps": [
    {
      "title": "2-4 mots",
      "description": "1 phrase",
      "mission_text": "1 phrase actionnable",
      "how_to": ["étape 1", "étape 2", "étape 3"],
      "why": "pourquoi ça motive",
      "tip": "astuce expert",
      "success_criteria": "critère binaire",
      "example": "résultat attendu",
      "estimated_minutes": 20,
      "resources": ["r1", "r2"],
      "suggested_product_keywords": ["mot1", "mot2"]
    },
    { ... },
    { ... }
  ]
}`

export async function generateJourney(
  goal: ClarifiedGoal,
  domainKnowledge: DomainKnowledge
): Promise<GeneratedJourney> {
  if (!isAIConfiguredBase()) {
    console.warn('⚠️ IA non configurée → fallback journey')
    return fallbackJourney(goal, domainKnowledge)
  }

  const style = pickRandomStyle()
  const angle = pickRandomAngle()

  try {
    const systemPrompt = JOURNEY_SYSTEM
      .replace('{STYLE}', `${style.label} — ${style.instruction}`)
      .replace('{ANGLE}', angle)

    const userPrompt = `Objectif : "${goal.text}"
Domaine : "${goal.domain}"
Niveau : ${goal.skillLevel}

🔬 ANALYSE EXPERTE :

CONCEPTS :
${domainKnowledge.concepts.map((c, i) => `${i + 1}. ${c}`).join('\n')}

PIÈGES :
${domainKnowledge.pitfalls.map((p, i) => `${i + 1}. ${p}`).join('\n')}

RESSOURCES :
${domainKnowledge.resources.map((r, i) => `${i + 1}. ${r}`).join('\n')}

QUICK WINS :
${domainKnowledge.quickWins.map((q, i) => `${i + 1}. ${q}`).join('\n')}

VOCABULAIRE :
${domainKnowledge.vocabulary.join(', ')}

Génère 3 missions EXPLICATIVES et BREVES.
Utilise OBLIGATOIREMENT les concepts et ressources ci-dessus.`

    const seed = Math.floor(Math.random() * 1_000_000)
    const rawResponse = await callLLMWithFallback(systemPrompt, userPrompt, {
      json: true,
      temperature: 0.9,
      maxTokens: 3000,
      seed,
    })

    const parsed = extractJSON<any>(rawResponse)
    if (!parsed || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      console.warn('⚠️ generateJourney: JSON invalide → fallback')
      return fallbackJourney(goal, domainKnowledge)
    }

    const steps: GeneratedStep[] = parsed.steps.slice(0, 3).map((s: any, i: number) =>
      normalizeStep(s, i, goal)
    )
    while (steps.length < 3) {
      steps.push(fallbackJourney(goal, domainKnowledge).steps[steps.length])
    }

    return {
      title: String(parsed.title || goal.text).slice(0, 120),
      description: String(parsed.description || `Parcours pour : ${goal.text}`).slice(0, 300),
      steps,
      style: style.id,
      domainKnowledge,
    }
  } catch (err) {
    console.error('❌ generateJourney échec TOTAL :', err)
    return fallbackJourney(goal, domainKnowledge)
  }
}

// ============================================================
// 🎯 MISSION DU JOUR
// ============================================================

const MISSION_SYSTEM = `Tu adaptes une mission selon l'heure. Garde la PRÉCISION. Ajoute une astuce contextuelle.

JSON : { "mission_text": "...", "tip": "..." }`

export async function adaptMissionForToday(
  step: { title: string; mission_text: string; success_criteria?: string },
  context: { hour: number; dayOfWeek: number; userLevel?: number }
): Promise<{ mission_text: string; success_criteria: string; tip: string }> {
  if (!isAIConfiguredBase()) {
    return {
      mission_text: step.mission_text,
      success_criteria: step.success_criteria || 'Mission réalisée',
      tip: '',
    }
  }

  try {
    const moment = context.hour < 12 ? 'matin' : context.hour < 18 ? 'après-midi' : 'soir'
    const rawResponse = await callLLMWithFallback(
      MISSION_SYSTEM,
      `Mission : "${step.mission_text}"\nMoment : ${moment}`,
      { json: true, temperature: 0.8, maxTokens: 500, seed: Math.floor(Math.random() * 1_000_000) }
    )
    const parsed = extractJSON<any>(rawResponse)
    if (!parsed || !parsed.mission_text) {
      return {
        mission_text: step.mission_text,
        success_criteria: step.success_criteria || 'Mission réalisée',
        tip: '',
      }
    }
    return {
      mission_text: String(parsed.mission_text).slice(0, 400),
      success_criteria: String(step.success_criteria || '').slice(0, 200),
      tip: String(parsed.tip || '').slice(0, 200),
    }
  } catch {
    return {
      mission_text: step.mission_text,
      success_criteria: step.success_criteria || 'Mission réalisée',
      tip: '',
    }
  }
}

// ============================================================
// 🔗 LIAISON PRODUITS ↔ ÉTAPES
// ============================================================

export async function linkProductsToStep(
  stepId: number,
  suggestedKeywords: string[],
  category: GoalCategory
): Promise<number> {
  const db = await getDB()
  let linked = 0
  if (!suggestedKeywords || suggestedKeywords.length === 0) return 0

  const likeClauses = suggestedKeywords
    .map(() => `(LOWER(p.title) LIKE ? OR LOWER(p.description) LIKE ? OR LOWER(p.meta_keywords) LIKE ?)`)
    .join(' OR ')

  const params: any[] = []
  for (const kw of suggestedKeywords) {
    const like = `%${kw.toLowerCase()}%`
    params.push(like, like, like)
  }

  try {
    const candidates = await db.all(
      `SELECT p.id, p.title FROM products p
       WHERE p.status = 'published' AND (${likeClauses})
       ORDER BY p.sales DESC, p.avg_rating DESC LIMIT 5`,
      params
    )
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i]
      const exists = await db.get(
        `SELECT id FROM step_recommendations WHERE step_id = ? AND product_id = ?`,
        [stepId, c.id]
      )
      if (exists) continue
      await db.run(
        `INSERT INTO step_recommendations (step_id, product_id, relevance_score, reason)
         VALUES (?, ?, ?, ?)`,
        [stepId, c.id, 100 - i * 10, `Recommandé pour l'étape "${category}"`]
      )
      linked++
    }
  } catch (err) {
    console.warn('⚠️ linkProductsToStep:', err)
  }
  return linked
}

// ============================================================
// 🛠️ FALLBACKS
// ============================================================

function fallbackClarify(raw: string): ClarifiedGoal {
  return {
    text: raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : 'Définir un objectif',
    category: detectCategory(raw),
    keywords: extractKeywords(raw),
    domain: raw || 'objectif',
    skillLevel: 'debutant',
    confidence: 0.3,
  }
}

function fallbackDomainKnowledge(goal: ClarifiedGoal): DomainKnowledge {
  const d = goal.domain || goal.text
  return {
    concepts: [
      `Les bases fondamentales de ${d}`,
      `Le vocabulaire technique essentiel`,
      `Les 3 techniques les plus utilisées`,
      `Les erreurs classiques à éviter`,
    ],
    pitfalls: ['Vouloir tout apprendre en même temps', 'Sauter les bases', 'Ne pas pratiquer'],
    resources: [`Tutoriels YouTube "${d} débutant"`, `Communautés ${d}`, `Applications mobiles`],
    quickWins: ['Fais un mini-exercice de 10 min', 'Regarde une démo d\'expert'],
    vocabulary: [d, 'technique', 'méthode', 'pratique', 'exercice'],
  }
}

function fallbackJourney(goal: ClarifiedGoal, dk: DomainKnowledge): GeneratedJourney {
  const d = goal.domain || goal.text
  const c1 = dk.concepts[0] || `les bases de ${d}`
  const c2 = dk.concepts[1] || `la première technique`
  const pitfall = dk.pitfalls[0] || 'aller trop vite'

  return {
    title: goal.text.slice(0, 120),
    description: `Parcours pour : ${goal.text}`,
    steps: [
      {
        title: 'Découvrir',
        description: c1.slice(0, 100),
        mission_text: `Découvre ${c1} en 15 minutes.`,
        how_to: [
          `Cherche "${dk.resources[0] || d}" sur YouTube`,
          'Filtre : moins de 15 min, récent',
          'Note 3 points clés dans ton carnet',
        ],
        why: `${c1} te débloque immédiatement pour la suite.`,
        tip: `Attention : ${pitfall}. Commence simple.`,
        success_criteria: '3 points clés notés',
        example: `Ton carnet contient 3 phrases sur ${c1}`,
        estimated_minutes: 15,
        resources: dk.resources.slice(0, 2),
        suggested_product_keywords: goal.keywords.slice(0, 3),
      },
      {
        title: 'Pratiquer',
        description: c2.slice(0, 100),
        mission_text: `Réalise ton premier ${dk.quickWins[0]?.toLowerCase() || 'exercice'}.`,
        how_to: [
          `Applique ${c2}`,
          'Refais l\'exercice 3 fois lentement',
          'Note ce qui est difficile',
        ],
        why: 'Le premier résultat concret rend accro.',
        tip: 'Si tu bloques, découpe en 2 et fais la moitié.',
        success_criteria: 'Exercice réussi 3 fois',
        example: `Tu as un premier résultat sur ${c2}`,
        estimated_minutes: 25,
        resources: dk.resources.slice(0, 2),
        suggested_product_keywords: goal.keywords.slice(0, 3),
      },
      {
        title: 'Maîtriser',
        description: 'Consolider',
        mission_text: `Refais l'exercice sans aide et note 1 point à améliorer.`,
        how_to: [
          'Ferme tous les tutos',
          `Reproduis ${c2} de mémoire`,
          'Note 1 amélioration pour demain',
        ],
        why: 'Refaire sans aide = mémorisation profonde.',
        tip: 'Enregistre-toi — tu verras tes progrès.',
        success_criteria: 'Exercice seul + 1 note',
        example: `Tu es autonome sur ${c2}`,
        estimated_minutes: 20,
        resources: dk.resources.slice(0, 2),
        suggested_product_keywords: goal.keywords.slice(0, 3),
      },
    ],
    style: 'fallback',
    domainKnowledge: dk,
  }
}

// ============================================================
// 🧰 HELPERS
// ============================================================

function normalizeCategory(cat: any): GoalCategory {
  const valid: GoalCategory[] = [
    'santé', 'business', 'compétence', 'finance',
    'relation', 'créativité', 'spiritualité', 'autre',
  ]
  const c = String(cat || '').toLowerCase().trim()
  if (valid.includes(c as GoalCategory)) return c as GoalCategory
  if (/sant|sport|forme|manger|sommeil|poids/.test(c)) return 'santé'
  if (/business|entrepr|vente|client|startup/.test(c)) return 'business'
  if (/apprend|compét|skill|langue|code|étud/.test(c)) return 'compétence'
  if (/argent|financ|épargn|invest|budget/.test(c)) return 'finance'
  if (/amour|ami|famille|relation|réseau/.test(c)) return 'relation'
  if (/créat|écri|art|musique|dessin/.test(c)) return 'créativité'
  if (/spirit|médit|prière|zen/.test(c)) return 'spiritualité'
  return 'autre'
}

function normalizeLevel(level: any): 'debutant' | 'intermediaire' | 'avance' {
  const l = String(level || '').toLowerCase()
  if (l.includes('avanc')) return 'avance'
  if (l.includes('inter')) return 'intermediaire'
  return 'debutant'
}

function detectCategory(raw: string): GoalCategory {
  return normalizeCategory(raw)
}

function extractKeywords(raw: string): string[] {
  if (!raw) return []
  const stopwords = new Set([
    'je','tu','il','elle','nous','vous','ils','elles',
    'veux','voudrais','aimerais','souhaite','désire',
    'le','la','les','un','une','des','de','du',
    'et','ou','mais','donc','car','pour','dans','sur',
    'à','au','aux','en','ce','cette','ces','mon','ma','mes',
    'apprendre','réussir','faire','être','avoir',
  ])
  return raw.toLowerCase()
    .replace(/[^\wàâäéèêëïîôöùûüç\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopwords.has(w))
    .slice(0, 8)
}

function normalizeStep(s: any, index: number, goal: ClarifiedGoal): GeneratedStep {
  const titles = ['Découvrir', 'Pratiquer', 'Maîtriser']
  const dk = fallbackDomainKnowledge(goal)
  const defaults = fallbackJourney(goal, dk).steps[index]

  return {
    title: String(s?.title || titles[index]).slice(0, 80),
    description: String(s?.description || defaults.description).slice(0, 250),
    mission_text: String(s?.mission_text || defaults.mission_text).slice(0, 400),
    how_to: Array.isArray(s?.how_to)
      ? s.how_to.filter((h: any) => typeof h === 'string' && h.length > 0).slice(0, 5)
      : defaults.how_to,
    why: String(s?.why || defaults.why).slice(0, 200),
    tip: String(s?.tip || defaults.tip).slice(0, 200),
    success_criteria: String(s?.success_criteria || defaults.success_criteria).slice(0, 200),
    example: String(s?.example || defaults.example).slice(0, 300),
    estimated_minutes: clampInt(s?.estimated_minutes, 10, 60, defaults.estimated_minutes),
    resources: Array.isArray(s?.resources)
      ? s.resources.filter((r: any) => typeof r === 'string').slice(0, 4)
      : defaults.resources,
    suggested_product_keywords: Array.isArray(s?.suggested_product_keywords)
      ? s.suggested_product_keywords.filter((k: any) => typeof k === 'string').slice(0, 5)
      : defaults.suggested_product_keywords,
  }
}

function clampInt(value: any, min: number, max: number, fallback: number): number {
  const n = parseInt(value, 10)
  if (isNaN(n)) return fallback
  return Math.min(Math.max(n, min), max)
}

// ============================================================
// 🎯 FONCTION MAÎTRESSE — 3 PASSES IA + ERREURS VISIBLES
// ============================================================

export async function createGoalWithJourney(
  userId: number,
  rawText: string
): Promise<{
  goalId: number
  journeyId: number
  clarified: ClarifiedGoal
  journey: GeneratedJourney
  aiWarning?: string
}> {
  const db = await getDB()

  let aiWarning: string | undefined

  if (!isAIConfiguredBase()) {
    aiWarning = 'OPENROUTER_API_KEY manquante — parcours basique généré'
    console.error('❌ ' + aiWarning)
  }

  // 🔵 PASSE 1
  console.log('🌅 Passe 1 : reformulation...')
  const clarified = await clarifyGoal(rawText)
  console.log('   → Clarifié :', clarified.text, '| Domaine :', clarified.domain)

  // 🔵 PASSE 2
  console.log('🔬 Passe 2 : analyse experte...')
  const domainKnowledge = await analyzeDomain(clarified)
  console.log(
    `   → ${domainKnowledge.concepts.length} concepts, ${domainKnowledge.pitfalls.length} pièges, ${domainKnowledge.quickWins.length} quick wins`
  )

  // 🔵 PASSE 3
  console.log('🗺️ Passe 3 : génération missions...')
  const journey = await generateJourney(clarified, domainKnowledge)
  console.log('   → Style :', journey.style)

  if (journey.style === 'fallback' && !aiWarning) {
    aiWarning = 'IA indisponible — parcours basique généré'
  }

  // 💾 Insertions
  const goalResult = await db.run(
    `INSERT INTO goals (user_id, raw_text, clarified_text, category, status)
     VALUES (?, ?, ?, ?, 'active')`,
    [userId, rawText, clarified.text, clarified.category]
  )
  const goalId = goalResult.lastID!

  const journeyResult = await db.run(
    `INSERT INTO journeys (goal_id, user_id, title, description, total_steps, current_step, progress_percent, status)
     VALUES (?, ?, ?, ?, 3, 1, 0, 'active')`,
    [goalId, userId, journey.title, journey.description]
  )
  const journeyId = journeyResult.lastID!

  for (let i = 0; i < journey.steps.length; i++) {
    const s = journey.steps[i]
    const status = i === 0 ? 'available' : 'locked'

    const stepResult = await db.run(
      `INSERT INTO journey_steps
       (journey_id, step_number, title, description, mission_text, success_criteria, estimated_minutes, status,
        how_to, why, tip)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        journeyId, i + 1,
        s.title, s.description, s.mission_text,
        s.success_criteria, s.estimated_minutes, status,
        JSON.stringify(s.how_to || []),
        s.why || '',
        s.tip || '',
      ]
    )

    if (s.suggested_product_keywords?.length) {
      await linkProductsToStep(stepResult.lastID!, s.suggested_product_keywords, clarified.category)
    }
  }

  console.log('✅ Parcours créé' + (aiWarning ? ` (⚠️ ${aiWarning})` : ''))
  return { goalId, journeyId, clarified, journey, aiWarning }
}

// ============================================================
// 🔌 EXPORTS DIAGNOSTIC — ⭐ AJOUTÉS
// ============================================================

/**
 * Indique si l'IA est configurée (une clé API est présente)
 * Re-export depuis lib/ai.ts pour que les routes puissent l'utiliser
 */
export function isAIConfigured(): boolean {
  return isAIConfiguredBase()
}

/**
 * Retourne le nom du provider IA actif
 * ('openrouter', 'groq', 'openai', ou 'none')
 */
export function getAIProviderName(): string {
  if (process.env.OPENROUTER_API_KEY) return 'openrouter'
  if (process.env.GROQ_API_KEY) return 'groq'
  if (process.env.OPENAI_API_KEY) return 'openai'
  return 'none'
}

// ============================================================
// CONSTANTES
// ============================================================

export const GOAL_CATEGORIES: GoalCategory[] = [
  'santé', 'business', 'compétence', 'finance',
  'relation', 'créativité', 'spiritualité', 'autre',
]