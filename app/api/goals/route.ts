// app/api/goals/route.ts
import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import {
  createGoalWithJourney,
  isAIConfigured,
  getAIProviderName,
} from '@/lib/ai/goal'

interface CreateGoalBody {
  raw_text?: string
}

// ============================================================
// GET : récupérer l'objectif actif + parcours + étapes
// ============================================================
export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json(
        { goal: null, journey: null, steps: [], error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const db = await getDB()

    // 1. Objectif actif
    const goal = await db.get(
      `SELECT * FROM goals
       WHERE user_id = ? AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    )

    if (!goal) {
      return NextResponse.json({ goal: null, journey: null, steps: [] })
    }

    // 2. Parcours actif lié
    const journey = await db.get(
      `SELECT * FROM journeys
       WHERE goal_id = ? AND status = 'active'
       LIMIT 1`,
      [goal.id]
    )

    // 3. Étapes du parcours (avec how_to, why, tip)
    let steps: any[] = []
    if (journey) {
      steps = await db.all(
        `SELECT
           id,
           journey_id,
           step_number,
           title,
           description,
           mission_text,
           success_criteria,
           estimated_minutes,
           status,
           completed_at,
           created_at,
           how_to,
           why,
           tip
         FROM journey_steps
         WHERE journey_id = ?
         ORDER BY step_number ASC`,
        [journey.id]
      )

      // ⭐ Parse le champ how_to (stocké en JSON string)
      steps = steps.map((s) => ({
        ...s,
        how_to: parseHowToField(s.how_to),
      }))
    }

    return NextResponse.json({
      goal,
      journey,
      steps,
    })
  } catch (err: any) {
    console.error('❌ GET /api/goals:', err)
    return NextResponse.json(
      {
        goal: null,
        journey: null,
        steps: [],
        error: err.message || 'Erreur serveur',
      },
      { status: 500 }
    )
  }
}

// ============================================================
// POST : créer un objectif + parcours (3 passes IA)
// ============================================================
export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as CreateGoalBody
    const raw_text = (body.raw_text || '').trim()

    if (!raw_text || raw_text.length < 3) {
      return NextResponse.json(
        { error: 'Objectif trop court (min. 3 caractères)' },
        { status: 400 }
      )
    }

    // ⚠️ Vérif IA configurée
    if (!isAIConfigured()) {
      console.warn('⚠️ Aucune IA configurée — parcours basique généré')
    } else {
      console.log(`🤖 IA configurée : ${getAIProviderName()}`)
    }

    // 🎯 Appel de la fonction maîtresse (3 passes IA)
    const { goalId, journeyId, clarified, journey, aiWarning } =
      await createGoalWithJourney(user.id, raw_text)

    // 🔄 Recharger le parcours complet depuis la DB
    // (pour avoir les IDs définitifs et les how_to correctement stockés)
    const db = await getDB()

    const fullGoal = await db.get(
      `SELECT * FROM goals WHERE id = ?`,
      [goalId]
    )
    const fullJourney = await db.get(
      `SELECT * FROM journeys WHERE id = ?`,
      [journeyId]
    )
    let fullSteps = await db.all(
      `SELECT
         id, journey_id, step_number, title, description, mission_text,
         success_criteria, estimated_minutes, status, completed_at, created_at,
         how_to, why, tip
       FROM journey_steps
       WHERE journey_id = ?
       ORDER BY step_number ASC`,
      [journeyId]
    )

    // Parse how_to pour le client
    fullSteps = fullSteps.map((s) => ({
      ...s,
      how_to: parseHowToField(s.how_to),
    }))

    // ✅ Réponse complète
    return NextResponse.json({
      success: true,
      goalId,
      journeyId,
      goal: fullGoal,
      journey: fullJourney,
      steps: fullSteps,
      clarified,
      // ⚠️ Si présent → l'UI peut afficher un warning
      ...(aiWarning ? { warning: aiWarning } : {}),
    })
  } catch (err: any) {
    console.error('❌ POST /api/goals:', err)
    return NextResponse.json(
      {
        error: err.message || 'Impossible de créer ton objectif',
        detail: process.env.NODE_ENV === 'development' ? String(err) : undefined,
      },
      { status: 500 }
    )
  }
}

// ============================================================
// 🧰 HELPER : parse how_to (string JSON → array)
// ============================================================
function parseHowToField(raw: any): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.filter(Boolean) : []
    } catch {
      // Peut-être une string simple avec séparateur
      return raw.split('\n').map((l) => l.trim()).filter(Boolean)
    }
  }
  return []
}

// ============================================================
// OPTIONS (CORS)
// ============================================================
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}