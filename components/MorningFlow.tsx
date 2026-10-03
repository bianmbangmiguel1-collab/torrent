// components/MorningFlow.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Loader2,
  RefreshCw,
  AlertCircle,
  Lightbulb,
  ListChecks,
  Flame,
} from 'lucide-react'

// ============================================================
// TYPES (exportés pour être réutilisés dans app/dashboard/page.tsx)
// ============================================================

export interface Step {
  id: number
  journey_id: number
  step_number: number
  title: string
  description: string
  mission_text: string
  success_criteria: string
  estimated_minutes: number
  status: 'locked' | 'available' | 'in_progress' | 'completed'
  // ⭐ NOUVEAUX CHAMPS
  how_to?: string | string[]
  why?: string
  tip?: string
  resources?: string[]
  example?: string
}

export interface Goal {
  id: number
  raw_text: string
  clarified_text: string | null
  category: string | null
  status: string
}

export interface Journey {
  id: number
  goal_id: number
  user_id: number
  title: string
  description: string | null
  total_steps: number
  current_step: number
  progress_percent: number
  status: string
}

interface MorningFlowProps {
  onJourneyChange?: (
    goal: Goal | null,
    journey: Journey | null,
    steps: Step[]
  ) => void
}

interface ClarifiedResult {
  goal: Goal
  journey: Journey & { steps: Step[] }
}

// ============================================================
// HELPER : parse how_to (string JSON ou array)
// ============================================================

function parseHowTo(raw: string | string[] | undefined): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch {
    return []
  }
}

// ============================================================
// COMPOSANT
// ============================================================

export default function MorningFlow({ onJourneyChange }: MorningFlowProps = {}) {
  const [loading, setLoading] = useState(true)
  const [goal, setGoal] = useState<Goal | null>(null)
  const [journey, setJourney] = useState<Journey | null>(null)
  const [steps, setSteps] = useState<Step[]>([])

  const [rawInput, setRawInput] = useState('')
  const [clarifying, setClarifying] = useState(false)
  const [clarified, setClarified] = useState<ClarifiedResult | null>(null)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ============================================================
  // 🔔 FIX BOUCLE INFINIE : ref pour le callback
  // ============================================================
  const onJourneyChangeRef = useRef(onJourneyChange)

  // Met à jour la ref à chaque render (ne déclenche AUCUN re-render)
  useEffect(() => {
    onJourneyChangeRef.current = onJourneyChange
  })

  // Appelle le callback SEULEMENT quand goal/journey/steps changent vraiment
  useEffect(() => {
    if (onJourneyChangeRef.current) {
      onJourneyChangeRef.current(goal, journey, steps)
    }
  }, [goal, journey, steps])

  // ============================================================
  // 📥 Charger l'objectif actif
  // ============================================================
  const loadActiveGoal = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/goals', {
        credentials: 'include',
        cache: 'no-store',
      })

      if (!res.ok) {
        console.warn('⚠️ /api/goals status:', res.status)
        setGoal(null)
        setJourney(null)
        setSteps([])
        return
      }

      const text = await res.text()
      if (!text || text.trim() === '') {
        setGoal(null)
        setJourney(null)
        setSteps([])
        return
      }

      let data: any
      try {
        data = JSON.parse(text)
      } catch (parseErr) {
        console.error('❌ JSON invalide:', parseErr)
        setGoal(null)
        setJourney(null)
        setSteps([])
        return
      }

      setGoal(data.goal || null)
      setJourney(data.journey || null)
      setSteps(Array.isArray(data.steps) ? data.steps : [])
    } catch (err: any) {
      console.warn('⚠️ loadActiveGoal error:', err)
      setGoal(null)
      setJourney(null)
      setSteps([])
    }
  }, [])

  // ============================================================
  // 🔄 Chargement initial
  // ============================================================
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      await loadActiveGoal()
      if (!cancelled) setLoading(false)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [loadActiveGoal])

  // ============================================================
  // ✨ Étape 1 : reformuler l'objectif
  // ============================================================
  const handleClarify = async () => {
    if (!rawInput.trim() || clarifying) return
    setClarifying(true)
    setError(null)

    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ raw_text: rawInput.trim() }),
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        throw new Error(errText || `Erreur ${res.status}`)
      }

      const text = await res.text()
      if (!text) throw new Error('Réponse vide du serveur')

      const data = JSON.parse(text)

      const normalized: ClarifiedResult = {
        goal: {
          id: data.goalId,
          raw_text: rawInput.trim(),
          clarified_text: data.clarified?.text || rawInput.trim(),
          category: data.clarified?.category || 'autre',
          status: 'active',
        },
        journey: {
          id: data.journeyId,
          goal_id: data.goalId,
          user_id: 0,
          title: data.journey?.title || 'Ton parcours',
          description: data.journey?.description || null,
          total_steps: data.steps?.length || data.journey?.steps?.length || 3,
          current_step: 1,
          progress_percent: 0,
          status: 'active',
          // @ts-ignore
          steps: data.steps || data.journey?.steps || [],
        },
      }

      setClarified(normalized)
    } catch (err: any) {
      console.error('❌ handleClarify:', err)
      setError(err.message || 'Impossible de créer ton objectif')
    } finally {
      setClarifying(false)
    }
  }

  // ============================================================
  // ✅ Étape 2 : confirmer
  // ============================================================
  const handleConfirm = async () => {
    if (!clarified) return
    setGoal(clarified.goal)
    setJourney(clarified.journey)
    setSteps(clarified.journey.steps || [])
    setClarified(null)
    setRawInput('')
    await loadActiveGoal()
  }

  // ============================================================
  // 🎯 Valider la mission en cours
  // ============================================================
  const handleCompleteMission = async (stepId: number) => {
    if (validating) return
    setValidating(true)
    setError(null)

    try {
      const res = await fetch('/api/journeys/step/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ stepId }),
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        throw new Error(errText || `Erreur ${res.status}`)
      }

      const text = await res.text()
      const data = text ? JSON.parse(text) : {}

      await loadActiveGoal()

      if (data.suggestNewGoal) {
        setTimeout(() => {
          setGoal(null)
          setJourney(null)
          setSteps([])
          setRawInput('')
        }, 1500)
      }
    } catch (err: any) {
      console.error('❌ handleCompleteMission:', err)
      setError(err.message || 'Impossible de valider la mission')
    } finally {
      setValidating(false)
    }
  }

  // ============================================================
  // 🔄 Nouvel objectif
  // ============================================================
  const handleNewGoal = () => {
    setGoal(null)
    setJourney(null)
    setSteps([])
    setClarified(null)
    setRawInput('')
    setError(null)
  }

  // ============================================================
  // ⏳ LOADING
  // ============================================================
  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center mb-8">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
        <p className="text-sm text-gray-500 mt-3">Chargement de ton parcours...</p>
      </div>
    )
  }

  // ============================================================
  // 🎯 ÉTAT A : Aucun objectif
  // ============================================================
  if (!goal) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-8 text-white shadow-2xl mb-8 relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-7 h-7" />
            <h2 className="text-2xl font-bold">Que veux-tu réussir en ce moment ?</h2>
          </div>
          <p className="text-white/80 mb-6">
            Dis-le en une phrase. On va t'aider à le transformer en un parcours concret.
          </p>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 flex items-start gap-2 bg-red-500/20 border border-red-300/40 rounded-xl p-3 text-sm"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {!clarified ? (
              <motion.div
                key="input"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <textarea
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleClarify()
                    }
                  }}
                  placeholder="Ex : Je veux apprendre à vendre en ligne"
                  className="w-full p-4 rounded-2xl text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-4 focus:ring-white/30"
                  rows={2}
                  disabled={clarifying}
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleClarify}
                  disabled={clarifying || !rawInput.trim()}
                  className="w-full sm:w-auto px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {clarifying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Continuer
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="clarified"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="bg-white/15 backdrop-blur rounded-2xl p-4">
                  <p className="text-sm text-white/70 mb-1">Si je comprends bien :</p>
                  <p className="text-lg font-semibold">
                    {clarified.goal.clarified_text}
                  </p>
                  {clarified.goal.category && (
                    <span className="inline-block mt-2 text-xs bg-white/20 px-2 py-1 rounded-full">
                      {clarified.goal.category}
                    </span>
                  )}
                </div>

                <div className="bg-white/15 backdrop-blur rounded-2xl p-4">
                  <p className="text-sm text-white/70 mb-2">
                    Ton parcours en {clarified.journey.steps?.length || 3} étapes :
                  </p>
                  <ol className="space-y-2">
                    {(clarified.journey.steps || []).map((s: any, i: number) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </span>
                        <div>
                          <p className="font-semibold">{s.title}</p>
                          <p className="text-sm text-white/70">{s.description}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setClarified(null)}
                    className="px-4 py-2 bg-white/20 rounded-xl hover:bg-white/30 transition text-sm font-medium"
                  >
                    Modifier
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleConfirm}
                    className="px-6 py-2 bg-white text-indigo-600 rounded-xl font-bold hover:shadow-xl transition text-sm"
                  >
                    C'est parti 🚀
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    )
  }

  // ============================================================
  // 🎯 ÉTAT B : Objectif actif
  // ============================================================
  const currentStep = steps.find(
    (s) => s.status === 'available' || s.status === 'in_progress'
  )
  const completedSteps = steps.filter((s) => s.status === 'completed').length
  const totalSteps = journey?.total_steps || steps.length || 3
  const progress = journey
    ? journey.progress_percent || Math.round((completedSteps / totalSteps) * 100)
    : Math.round((completedSteps / totalSteps) * 100)
  const nextStep = currentStep
    ? steps.find((s) => s.step_number === currentStep.step_number + 1)
    : null
  const isCompleted = !currentStep && journey?.status === 'completed'

  // Parse how_to du currentStep
  const currentHowTo = currentStep ? parseHowTo(currentStep.how_to) : []

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border border-gray-200 p-6 shadow-lg mb-8"
    >
      {/* Erreur */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 overflow-hidden"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* En-tête objectif */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex-shrink-0">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Ton objectif
            </p>
            <h2 className="text-xl font-bold text-gray-900 break-words">
              {goal.clarified_text || goal.raw_text}
            </h2>
            {goal.category && (
              <span className="inline-block mt-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                {goal.category}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleNewGoal}
          className="text-xs text-gray-400 hover:text-gray-600 transition flex items-center gap-1"
          title="Choisir un nouvel objectif"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Nouvel objectif
        </button>
      </div>

      {/* Barre de progression */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">Progression du parcours</span>
          <span className="font-bold text-indigo-600">{progress}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Étape {journey?.current_step || 1} sur {totalSteps}
        </p>
      </div>

      {/* ============================================================
          🎯 MISSION DU JOUR — VERSION EXPLICATIVE
      ============================================================ */}
      {currentStep && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-100"
        >
          {/* Badge */}
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">
              🎯 Mission du jour
            </span>
          </div>

          {/* Titre */}
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {currentStep.title}
          </h3>

          {/* QUOI faire */}
          <p className="text-gray-800 font-medium mb-4 leading-relaxed">
            {currentStep.mission_text}
          </p>

          {/* COMMENT faire */}
          {currentHowTo.length > 0 && (
            <div className="bg-white rounded-xl p-4 mb-3 border border-indigo-100">
              <div className="flex items-center gap-2 mb-3">
                <ListChecks className="w-4 h-4 text-indigo-600" />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Comment faire
                </p>
              </div>
              <ol className="space-y-2">
                {currentHowTo.map((h, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{h}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* POURQUOI ça motive */}
          {currentStep.why && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 mb-3">
              <div className="flex items-start gap-2">
                <Flame className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900 leading-relaxed">
                  <strong>Pourquoi c'est puissant : </strong>
                  {currentStep.why}
                </p>
              </div>
            </div>
          )}

          {/* ASTUCE expert */}
          {currentStep.tip && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-3 mb-3">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-900 leading-relaxed">
                  <strong>Astuce d'expert : </strong>
                  {currentStep.tip}
                </p>
              </div>
            </div>
          )}

          {/* Validation + durée */}
          <div className="flex flex-wrap gap-2 mb-4 text-xs">
            {currentStep.estimated_minutes && (
              <span className="px-3 py-1 bg-white rounded-full text-gray-600 border border-gray-200">
                ⏱️ ~{currentStep.estimated_minutes} min
              </span>
            )}
            {currentStep.success_criteria && (
              <span className="px-3 py-1 bg-emerald-50 rounded-full text-emerald-700 border border-emerald-200">
                ✅ {currentStep.success_criteria}
              </span>
            )}
          </div>

          {/* Bouton validation */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCompleteMission(currentStep.id)}
            disabled={validating}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {validating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Validation...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                J'ai terminé cette mission
              </>
            )}
          </motion.button>
        </motion.div>
      )}

      {/* Suggestion suivante */}
      {currentStep && nextStep && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <ArrowRight className="w-4 h-4" />
          <span>
            Prochaine étape : <strong>{nextStep.title}</strong>
          </span>
        </div>
      )}

      {/* Parcours terminé */}
      {isCompleted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-6"
        >
          <div className="text-5xl mb-3">🎉</div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">
            Parcours terminé !
          </h3>
          <p className="text-gray-500 mb-4">
            Bravo, tu as accompli toutes les étapes. Prêt pour un nouvel objectif ?
          </p>
          <button
            onClick={handleNewGoal}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-xl transition inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Choisir un nouvel objectif
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}