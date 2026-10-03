// app/api/journeys/step/complete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import {
  notifyMissionCompleted,
  notifyStepUnlocked,
  notifyJourneyCompleted,
} from '@/lib/notifications'

interface CompleteJourneyStepBody {
  stepId: number
}

// ============================================================
// Helper local : extraire l'userId depuis les cookies
// ============================================================
function getUserIdFromToken(request: NextRequest): number | null {
  try {
    const token =
      request.cookies.get('user_session')?.value ||
      request.cookies.get('token')?.value
    if (!token) return null

    const base64Url = token.split('.')[1]
    if (!base64Url) return null

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(
      decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
    )
    const id = payload?.id || payload?.userId
    return id ? Number(id) : null
  } catch {
    return null
  }
}

// ============================================================
// POST — Valider une étape et débloquer la suivante
// Body : { stepId: number }
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as Partial<CompleteJourneyStepBody>
    const { stepId } = body

    if (!stepId || typeof stepId !== 'number') {
      return NextResponse.json(
        { error: 'stepId requis' },
        { status: 400 }
      )
    }

    const db = await getDB()

    // 1. Récupérer l'étape + vérifier qu'elle appartient bien à l'user
    const step = await db.get(
      `SELECT js.*, j.user_id, j.id AS journey_id, j.total_steps, j.goal_id
       FROM journey_steps js
       JOIN journeys j ON j.id = js.journey_id
       WHERE js.id = ? AND j.user_id = ?
       LIMIT 1`,
      [stepId, userId]
    )

    if (!step) {
      return NextResponse.json(
        { error: 'Étape introuvable' },
        { status: 404 }
      )
    }

    // 2. Vérifier que l'étape est bien disponible (pas déjà complétée)
    if (step.status === 'completed') {
      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
        message: 'Cette étape est déjà validée',
      })
    }

    if (step.status === 'locked') {
      return NextResponse.json(
        { error: 'Cette étape est encore verrouillée' },
        { status: 400 }
      )
    }

    // 3. Marquer l'étape comme complétée
    await db.run(
      `UPDATE journey_steps
       SET status = 'completed', completed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [stepId]
    )

    // 4. Trouver et débloquer l'étape suivante
    const nextStep = await db.get(
      `SELECT * FROM journey_steps
       WHERE journey_id = ? AND step_number = ?
       LIMIT 1`,
      [step.journey_id, step.step_number + 1]
    )

    let suggestNewGoal = false
    let nextStepData: any = null

    if (nextStep) {
      // Débloquer la suivante
      await db.run(
        `UPDATE journey_steps SET status = 'available' WHERE id = ?`,
        [nextStep.id]
      )

      // Mettre à jour la progression du parcours
      const completedCount = await db.get(
        `SELECT COUNT(*) as count FROM journey_steps
         WHERE journey_id = ? AND status = 'completed'`,
        [step.journey_id]
      )

      const totalSteps = step.total_steps || 3
      const progressPercent = Math.round(
        ((completedCount?.count || 0) / totalSteps) * 100
      )

      await db.run(
        `UPDATE journeys
         SET current_step = ?, progress_percent = ?
         WHERE id = ?`,
        [step.step_number + 1, progressPercent, step.journey_id]
      )

      nextStepData = nextStep

      // 🔔 Notification : étape suivante débloquée
      try {
        await notifyStepUnlocked(userId, step.journey_id, {
          id: nextStep.id,
          step_number: nextStep.step_number,
          title: nextStep.title,
          mission_text: nextStep.mission_text,
        })
      } catch (e) {
        console.warn('⚠️ notifyStepUnlocked:', e)
      }

      // 🔔 Notification : mission validée (non finale)
      try {
        await notifyMissionCompleted(
          userId,
          stepId,
          step.title,
          progressPercent,
          false
        )
      } catch (e) {
        console.warn('⚠️ notifyMissionCompleted:', e)
      }
    } else {
      // 🎉 C'est la dernière étape → parcours terminé
      await db.run(
        `UPDATE journeys
         SET status = 'completed', progress_percent = 100, completed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [step.journey_id]
      )

      await db.run(
        `UPDATE goals
         SET status = 'completed', completed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [step.goal_id]
      )

      suggestNewGoal = true

      // 🔔 Notification : parcours terminé
      try {
        await notifyJourneyCompleted(userId, step.journey_id, 'Ton parcours')
      } catch (e) {
        console.warn('⚠️ notifyJourneyCompleted:', e)
      }

      // 🔔 Notification : dernière mission validée
      try {
        await notifyMissionCompleted(userId, stepId, step.title, 100, true)
      } catch (e) {
        console.warn('⚠️ notifyMissionCompleted final:', e)
      }
    }

    // 5. Réponse
    return NextResponse.json({
      success: true,
      stepCompleted: stepId,
      nextStep: nextStepData,
      suggestNewGoal,
    })
  } catch (error: any) {
    console.error('❌ POST /api/journeys/step/complete:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// ============================================================
// OPTIONS — CORS
// ============================================================
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}