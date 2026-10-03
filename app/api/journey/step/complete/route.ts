// app/api/journeys/step/complete/route.ts
import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

interface CompleteStepBody {
  stepId?: number | string
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = (await req.json()) as CompleteStepBody
  const { stepId } = body

  if (!stepId) {
    return NextResponse.json({ error: 'stepId requis' }, { status: 400 })
  }

  const db = await getDB()

  // 1. Marquer l'étape comme complétée
  await db.run(
    `UPDATE journey_steps SET status = 'completed', completed_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [stepId]
  )

  // 2. Récupérer l'étape + le journey
  const step = await db.get(`SELECT * FROM journey_steps WHERE id = ?`, [stepId])
  const journey = await db.get(`SELECT * FROM journeys WHERE id = ?`, [step.journey_id])

  // 3. Débloquer l'étape suivante
  const nextStep = await db.get(
    `SELECT * FROM journey_steps WHERE journey_id = ? AND step_number = ?`,
    [journey.id, step.step_number + 1]
  )

  let completed = false
  if (nextStep) {
    await db.run(`UPDATE journey_steps SET status = 'available' WHERE id = ?`, [nextStep.id])
    await db.run(`UPDATE journeys SET current_step = ?, progress_percent = ? WHERE id = ?`,
      [step.step_number + 1, Math.round((step.step_number / journey.total_steps) * 100), journey.id])
  } else {
    // Dernière étape → parcours terminé
    await db.run(`UPDATE journeys SET status = 'completed', progress_percent = 100, completed_at = CURRENT_TIMESTAMP WHERE id = ?`, [journey.id])
    await db.run(`UPDATE goals SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?`, [journey.goal_id])
    completed = true
  }

  // 4. Créer une notification
  await db.run(
    `INSERT INTO notifications (user_id, type, title, message, link)
     VALUES (?, 'success', ?, ?, ?)`,
    [user.id, '✅ Mission accomplie', 
     completed ? 'Tu as terminé ton parcours ! Choisis un nouvel objectif.' : 'Étape suivante débloquée',
     '/dashboard']
  )

  return NextResponse.json({
    success: true,
    completed,
    nextStep: nextStep || null,
    suggestNewGoal: completed,
  })
}