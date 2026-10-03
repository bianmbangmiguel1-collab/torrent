// app/api/journey/complete-step/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'
import { getDB } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'torrenttwist_super_secret_key_2026'

interface CompleteStepBody {
  step_id: number | string
  notes?: string
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
    if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { step_id, notes } =
      (await request.json()) as CompleteStepBody
    if (!step_id) return NextResponse.json({ error: 'step_id requis' }, { status: 400 })

    const db = await getDB()

    // 1. Récupérer l'étape + le parcours
    const step = await db.get(
      `SELECT js.*, j.id AS jid, j.user_id, j.total_steps, j.current_step
       FROM journey_steps js
       JOIN journeys j ON js.journey_id = j.id
       WHERE js.id = ? AND j.user_id = ?`,
      [step_id, userId]
    )

    if (!step) return NextResponse.json({ error: 'Étape introuvable' }, { status: 404 })

    if (step.status === 'completed') {
      return NextResponse.json({ error: 'Étape déjà complétée' }, { status: 400 })
    }

    // 2. Marquer l'étape comme complétée
    await db.run(
      `UPDATE journey_steps SET status = 'completed', completed_at = datetime('now') WHERE id = ?`,
      [step_id]
    )

    // 3. Calculer la progression
    const completedCount = await db.get(
      `SELECT COUNT(*) as c FROM journey_steps WHERE journey_id = ? AND status = 'completed'`,
      [step.jid]
    )
    const progressPercent = Math.round((completedCount.c / step.total_steps) * 100)

    const isJourneyComplete = completedCount.c >= step.total_steps

    // 4. Débloquer l'étape suivante OU marquer le parcours terminé
    if (!isJourneyComplete) {
      const nextStep = await db.get(
        `SELECT id FROM journey_steps WHERE journey_id = ? AND step_number = ?`,
        [step.jid, step.current_step + 1]
      )
      if (nextStep) {
        await db.run(`UPDATE journey_steps SET status = 'available' WHERE id = ?`, [nextStep.id])
      }

      await db.run(
        `UPDATE journeys SET current_step = ?, progress_percent = ? WHERE id = ?`,
        [step.current_step + 1, progressPercent, step.jid]
      )
    } else {
      await db.run(
        `UPDATE journeys SET status = 'completed', progress_percent = 100, completed_at = datetime('now') WHERE id = ?`,
        [step.jid]
      )
      await db.run(
        `UPDATE goals SET status = 'completed', completed_at = datetime('now')
         WHERE id = (SELECT goal_id FROM journeys WHERE id = ?)`,
        [step.jid]
      )
    }

    // 5. Ajouter des points / badges (gamification)
    // Ex : +50 points par étape
    await db.run(
      `UPDATE users SET engagement_score = COALESCE(engagement_score, 0) + 50 WHERE id = ?`,
      [userId]
    )

    return NextResponse.json({
      success: true,
      step_completed: true,
      progress_percent: progressPercent,
      journey_completed: isJourneyComplete,
      points_earned: 50,
      next_action: isJourneyComplete ? 'new_goal' : 'next_step',
    })
  } catch (error: any) {
    console.error('❌ Erreur validation étape:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'