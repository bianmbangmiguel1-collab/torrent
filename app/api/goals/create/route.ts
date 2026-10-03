// app/api/goals/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import { getDB } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'

interface CreateGoalBody {
  raw_text: string
}

interface OpenRouterGoalResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

async function getUserId(request: NextRequest) {
  let token =
    request.cookies.get('user_session')?.value ||
    request.cookies.get('admin_session')?.value ||
    request.cookies.get('token')?.value

  if (!token) {
    const h = request.headers.get('authorization')
    if (h?.startsWith('Bearer ')) token = h.substring(7)
  }
  if (!token) return null

  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jose.jwtVerify(token, secret, { algorithms: ['HS256'] })
    return parseInt(String((payload as any).id || (payload as any).userId || (payload as any).sub), 10)
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { raw_text } = (await request.json()) as CreateGoalBody
    if (!raw_text || raw_text.trim().length < 5) {
      return NextResponse.json({ error: 'Objectif trop court' }, { status: 400 })
    }

    const db = await getDB()

    // 1️⃣ Créer l'objectif en base (status "clarifying")
    const goalResult = await db.run(
      `INSERT INTO goals (user_id, raw_text, status) VALUES (?, ?, 'active')`,
      [userId, raw_text.trim()]
    )
    const goalId = goalResult.lastID

    // 2️⃣ Appeler l'IA pour reformuler + générer le parcours
    // (Utilisez votre API OpenRouter existante)
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Tu es un coach. L'utilisateur te donne un objectif.
Reformule-le pour le clarifier, puis génère un parcours en 3 étapes concrètes.

Réponds STRICTEMENT en JSON :
{
  "clarified": "Objectif reformulé, clair et motivant (max 100 char)",
  "category": "santé|business|compétence|finance|personnel|autre",
  "journey_title": "Titre du parcours (max 50 char)",
  "journey_description": "Ce que l'utilisateur va accomplir (max 150 char)",
  "steps": [
    {
      "step_number": 1,
      "title": "Titre étape 1",
      "description": "Pourquoi cette étape (max 100 char)",
      "mission_text": "Action concrète à faire aujourd'hui (max 200 char)",
      "success_criteria": "Comment savoir si c'est réussi (max 100 char)",
      "estimated_minutes": 15
    },
    { "step_number": 2, ... },
    { "step_number": 3, ... }
  ]
}`,
          },
          {
            role: 'user',
            content: raw_text,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    })

    if (!aiResponse.ok) {
      // Fallback : on garde l'objectif brut, sans parcours
      await db.run(`UPDATE goals SET clarified_text = raw_text WHERE id = ?`, [goalId])
      return NextResponse.json({
        goalId,
        fallback: true,
        message: "Objectif enregistré. L'analyse IA est indisponible.",
      })
    }

    const aiData = (await aiResponse.json()) as OpenRouterGoalResponse
    const content = aiData.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('Réponse IA invalide')
    }

    const parsed = JSON.parse(content)

    // 3️⃣ Mettre à jour l'objectif
    await db.run(
      `UPDATE goals SET clarified_text = ?, category = ? WHERE id = ?`,
      [parsed.clarified, parsed.category, goalId]
    )

    // 4️⃣ Créer le parcours
    const journeyResult = await db.run(
      `INSERT INTO journeys (goal_id, user_id, title, description, total_steps, current_step, progress_percent, status)
       VALUES (?, ?, ?, ?, ?, 1, 0, 'active')`,
      [goalId, userId, parsed.journey_title, parsed.journey_description, parsed.steps.length]
    )
    const journeyId = journeyResult.lastID

    // 5️⃣ Créer les étapes
    for (const step of parsed.steps) {
      await db.run(
        `INSERT INTO journey_steps (journey_id, step_number, title, description, mission_text, success_criteria, estimated_minutes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          journeyId,
          step.step_number,
          step.title,
          step.description,
          step.mission_text,
          step.success_criteria,
          step.estimated_minutes || 15,
          step.step_number === 1 ? 'available' : 'locked',
        ]
      )
    }

    // 6️⃣ Associer les produits recommandés à chaque étape
    // (algorithme simple : produits les plus vendus de la catégorie)
    const relevantProducts = await db.all(
      `SELECT id FROM products WHERE status = 'published'
       ORDER BY sales DESC LIMIT 3`
    )

    const steps = await db.all(`SELECT id FROM journey_steps WHERE journey_id = ?`, [journeyId])
    for (const step of steps) {
      for (const product of relevantProducts) {
        await db.run(
          `INSERT INTO step_recommendations (step_id, product_id, reason)
           VALUES (?, ?, ?)`,
          [step.id, product.id, 'Recommandé pour t\'aider dans cette étape']
        )
      }
    }

    return NextResponse.json({
      success: true,
      goalId,
      journeyId,
      clarified: parsed.clarified,
      journey_title: parsed.journey_title,
      steps_count: parsed.steps.length,
    })
  } catch (error: any) {
    console.error('❌ Erreur création objectif:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'