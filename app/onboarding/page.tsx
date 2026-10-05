'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { 
  ArrowLeft,
  Sparkles,
  Rocket,
  Shield,
  Zap,
  CheckCircle,
  ChevronRight,
  BookOpen,
  GraduationCap,
  Palette,
  Code2,
  Package,
  Video,
  Star,
  TrendingUp,
  Users,
  Gift,
  Award,
  Brain,
  Target,
  Clock,
  BarChart,
  Heart,
  Lightbulb,
  Crown,
  Gem,
  PartyPopper
} from 'lucide-react'

interface OnboardingResponse {
  message?: string
  error?: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    mainGoal: '',
    interests: [] as string[],
    experienceLevel: ''
  })

  const isSubmittingRef = useRef(false)
  const hasSubmittedStep1Ref = useRef(false)
  const hasSubmittedStep2Ref = useRef(false)
  const hasSubmittedStep3Ref = useRef(false)

  // ✅ Vérifier l'authentification au chargement
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login?redirect=/onboarding')
      return
    }
    
    // Vérifier si le token est valide
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (!response.ok) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          router.push('/login?redirect=/onboarding')
        }
      } catch (error) {
        console.error('Erreur vérification auth:', error)
      }
    }
    checkAuth()
  }, [router])

  const goals = [
    { value: 'apprendre', label: 'Apprendre de nouvelles compétences', icon: BookOpen, color: '#6366f1', desc: 'Formations, ebooks, tutoriels' },
    { value: 'business', label: 'Développer mon business', icon: Rocket, color: '#3b82f6', desc: 'Outils, templates, stratégies' },
    { value: 'outils', label: 'Trouver des outils pro', icon: Shield, color: '#8b5cf6', desc: 'Logiciels, SaaS, ressources' },
    { value: 'contenu', label: 'Créer du contenu', icon: Zap, color: '#06b6d4', desc: 'Vidéos, designs, articles' },
    { value: 'autre', label: 'Explorer', icon: Sparkles, color: '#f59e0b', desc: 'Découvrir de nouveaux horizons' }
  ]

  const interestOptions = [
    { value: 'ebooks', label: 'Ebooks & Guides', icon: BookOpen, color: '#6366f1' },
    { value: 'formations', label: 'Formations', icon: GraduationCap, color: '#3b82f6' },
    { value: 'logiciels', label: 'Logiciels', icon: Code2, color: '#8b5cf6' },
    { value: 'design', label: 'Design', icon: Palette, color: '#ec4899' },
    { value: 'videos', label: 'Vidéos', icon: Video, color: '#06b6d4' },
    { value: 'packs', label: 'Packs & Kits', icon: Package, color: '#f59e0b' }
  ]

  const levels = [
    { value: 'débutant', label: '🌟 Débutant', desc: 'Je découvre ce domaine', icon: Star },
    { value: 'intermédiaire', label: '🚀 Intermédiaire', desc: 'J\'ai des connaissances solides', icon: TrendingUp },
    { value: 'expert', label: '👑 Expert', desc: 'Je maîtrise parfaitement', icon: Crown }
  ]

  // ✅ HandleSubmitGoal avec gestion d'erreur améliorée
  const handleSubmitGoal = useCallback(async () => {
    if (!formData.mainGoal) {
      setError('Veuillez sélectionner un objectif')
      return
    }
    if (isSubmittingRef.current || hasSubmittedStep1Ref.current) return
    
    isSubmittingRef.current = true
    setLoading(true)
    setError(null)
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/onboarding/step1-goal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ mainGoal: formData.mainGoal }),
        credentials: 'include'
      })
      
      const data = (await response.json()) as OnboardingResponse
      
      if (response.ok) {
        setStep(1)
        hasSubmittedStep1Ref.current = true
      } else {
        setError(data.message || data.error || 'Erreur lors de l\'enregistrement')
      }
    } catch (err) {
      console.error('Erreur step1:', err)
      setError('Erreur de connexion au serveur')
    } finally {
      setLoading(false)
      isSubmittingRef.current = false
    }
  }, [formData.mainGoal])

  // ✅ HandleSubmitInterests
  const handleSubmitInterests = useCallback(async () => {
    if (formData.interests.length === 0) {
      setError('Veuillez sélectionner au moins un centre d\'intérêt')
      return
    }
    if (isSubmittingRef.current || hasSubmittedStep2Ref.current) return
    
    isSubmittingRef.current = true
    setLoading(true)
    setError(null)
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/onboarding/step2-interests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ interests: formData.interests }),
        credentials: 'include'
      })
      
      const data = (await response.json()) as OnboardingResponse
      
      if (response.ok) {
        setStep(2)
        hasSubmittedStep2Ref.current = true
      } else {
        setError(data.message || data.error || 'Erreur lors de l\'enregistrement des intérêts')
      }
    } catch (err) {
      console.error('Erreur step2:', err)
      setError('Erreur de connexion au serveur')
    } finally {
      setLoading(false)
      isSubmittingRef.current = false
    }
  }, [formData.interests])

  // ✅ HandleSubmitExperience
  const handleSubmitExperience = useCallback(async () => {
    if (!formData.experienceLevel) {
      setError('Veuillez sélectionner votre niveau')
      return
    }
    if (isSubmittingRef.current || hasSubmittedStep3Ref.current) return
    
    isSubmittingRef.current = true
    setLoading(true)
    setError(null)
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/onboarding/step3-experience', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ experienceLevel: formData.experienceLevel }),
        credentials: 'include'
      })
      
      const data = (await response.json()) as OnboardingResponse
      
      if (response.ok) {
        setCompleted(true)
        hasSubmittedStep3Ref.current = true
        setTimeout(() => router.push('/dashboard'), 2500)
      } else {
        setError(data.message || data.error || 'Erreur lors de l\'enregistrement')
      }
    } catch (err) {
      console.error('Erreur step3:', err)
      setError('Erreur de connexion au serveur')
    } finally {
      setLoading(false)
      isSubmittingRef.current = false
    }
  }, [formData.experienceLevel, router])

  const toggleInterest = useCallback((value: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(value)
        ? prev.interests.filter(i => i !== value)
        : [...prev.interests, value]
    }))
  }, [])

  const steps = [
    {
      title: 'Quel est votre objectif principal ?',
      subtitle: 'Choisissez ce qui vous motive à rejoindre TorrentTwist',
      icon: Target,
      content: (
        <div className="options-grid" key="step1">
          {goals.map((goal) => (
            <motion.label
              key={goal.value}
              className={`option-card ${formData.mainGoal === goal.value ? 'active' : ''}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <input
                type="radio"
                name="mainGoal"
                value={goal.value}
                checked={formData.mainGoal === goal.value}
                onChange={() => setFormData(prev => ({ ...prev, mainGoal: goal.value }))}
              />
              <div className="option-icon" style={{ background: `${goal.color}20` }}>
                <goal.icon size={28} style={{ color: goal.color }} />
              </div>
              <div className="option-content">
                <span className="option-label">{goal.label}</span>
                <span className="option-desc">{goal.desc}</span>
              </div>
              {formData.mainGoal === goal.value && (
                <CheckCircle size={20} className="check" />
              )}
            </motion.label>
          ))}
        </div>
      ),
      action: handleSubmitGoal,
      validate: () => !!formData.mainGoal
    },
    {
      title: 'Quels sont vos centres d\'intérêt ?',
      subtitle: 'Sélectionnez les catégories qui vous attirent le plus',
      icon: Heart,
      content: (
        <div className="options-grid interests" key="step2">
          {interestOptions.map((interest) => (
            <motion.label
              key={interest.value}
              className={`option-card interest ${formData.interests.includes(interest.value) ? 'active' : ''}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <input
                type="checkbox"
                value={interest.value}
                checked={formData.interests.includes(interest.value)}
                onChange={() => toggleInterest(interest.value)}
              />
              <div className="interest-icon" style={{ background: `${interest.color}20` }}>
                <interest.icon size={24} style={{ color: interest.color }} />
              </div>
              <span className="option-label">{interest.label}</span>
              {formData.interests.includes(interest.value) && (
                <CheckCircle size={18} className="check" />
              )}
            </motion.label>
          ))}
        </div>
      ),
      action: handleSubmitInterests,
      validate: () => formData.interests.length > 0
    },
    {
      title: 'Quel est votre niveau d\'expérience ?',
      subtitle: 'Nous adapterons nos recommandations à votre niveau',
      icon: Brain,
      content: (
        <div className="options-grid levels" key="step3">
          {levels.map((level) => (
            <motion.label
              key={level.value}
              className={`option-card level ${formData.experienceLevel === level.value ? 'active' : ''}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <input
                type="radio"
                name="experienceLevel"
                value={level.value}
                checked={formData.experienceLevel === level.value}
                onChange={() => setFormData(prev => ({ ...prev, experienceLevel: level.value }))}
              />
              <div className="level-icon">
                <level.icon size={24} />
              </div>
              <div className="level-content">
                <span className="level-label">{level.label}</span>
                <span className="level-desc">{level.desc}</span>
              </div>
              {formData.experienceLevel === level.value && (
                <CheckCircle size={20} className="check" />
              )}
            </motion.label>
          ))}
        </div>
      ),
      action: handleSubmitExperience,
      validate: () => !!formData.experienceLevel
    }
  ]

  if (completed) {
    return (
      <div className="onboarding-page">
        <motion.div
          className="success-screen"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="success-icon-wrapper">
            <PartyPopper size={64} className="success-icon" />
            <div className="success-ring" />
          </div>
          <h1>🎉 Bienvenue dans l'univers TorrentTwist !</h1>
          <p>Votre profil a été configuré avec succès</p>
          <div className="success-badges">
            <span className="badge">✨ Profil personnalisé</span>
            <span className="badge">🚀 Recommandations prêtes</span>
            <span className="badge">🎯 Objectifs définis</span>
          </div>
          <div className="redirecting">
            <div className="spinner" />
            <span>Redirection vers votre tableau de bord...</span>
          </div>
        </motion.div>
      </div>
    )
  }

  const currentStep = steps[step]
  const progress = ((step + 1) / steps.length) * 100

  return (
    <div className="onboarding-page">
      <div className="bg-decoration">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
        <div className="grid-pattern" />
      </div>

      <div className="onboarding-container">
        <button className="back-btn" onClick={() => router.push('/')}>
          <ArrowLeft size={20} />
        </button>

        <div className="logo-section">
          <Image src="/torrent-icon.png" alt="TorrentTwist" width={40} height={40} />
          <span className="logo-text">TorrentTwist</span>
        </div>

        <div className="progress-section">
          <div className="progress-bar">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="progress-steps">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`progress-dot ${index <= step ? 'active' : ''}`}
                />
              ))}
            </div>
          </div>
          <span className="progress-text">
            Étape {step + 1} sur {steps.length}
          </span>
        </div>

        {error && (
          <motion.div
            className="error-message"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="step-content"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.4 }}
          >
            <div className="step-header">
              <div className="step-number">{step + 1}</div>
              <div>
                <currentStep.icon size={24} className="step-icon" />
                <h2>{currentStep.title}</h2>
                <p>{currentStep.subtitle}</p>
              </div>
            </div>

            {currentStep.content}

            <div className="step-actions">
              <button
                className="next-btn"
                onClick={currentStep.action}
                disabled={loading || !currentStep.validate()}
              >
                {loading ? (
                  <div className="loader" />
                ) : (
                  <>
                    {step === steps.length - 1 ? (
                      <>
                        <Sparkles size={18} />
                        Commencer l'aventure
                      </>
                    ) : (
                      <>
                        Continuer
                        <ChevronRight size={20} />
                      </>
                    )}
                  </>
                )}
              </button>
              {step > 0 && (
                <button
                  className="skip-btn"
                  onClick={() => setStep(step - 1)}
                  disabled={loading}
                >
                  Retour
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="onboarding-footer">
          <span className="footer-text">
            {step === 0 && "💡 Choisissez l'objectif qui vous ressemble"}
            {step === 1 && "🎯 Sélectionnez au moins un centre d'intérêt"}
            {step === 2 && "⭐ Votre niveau nous aide à mieux vous conseiller"}
          </span>
        </div>
      </div>

      <style jsx>{`
        .onboarding-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 30%, #1a365d 60%, #0f172a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          position: relative;
          overflow: hidden;
        }

        .bg-decoration {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }

        .grid-pattern {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.12;
          animation: floatOrb 20s ease-in-out infinite;
        }

        .orb-1 {
          width: 400px;
          height: 400px;
          top: -100px;
          right: -100px;
          background: radial-gradient(circle, #6366f1, transparent);
          animation-delay: 0s;
        }

        .orb-2 {
          width: 300px;
          height: 300px;
          bottom: -50px;
          left: -50px;
          background: radial-gradient(circle, #3b82f6, transparent);
          animation-delay: -5s;
        }

        .orb-3 {
          width: 200px;
          height: 200px;
          top: 40%;
          left: 50%;
          transform: translateX(-50%);
          background: radial-gradient(circle, #8b5cf6, transparent);
          animation-delay: -10s;
        }

        .orb-4 {
          width: 250px;
          height: 250px;
          bottom: 20%;
          right: 20%;
          background: radial-gradient(circle, #06b6d4, transparent);
          animation-delay: -15s;
        }

        @keyframes floatOrb {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(60px, -40px) scale(1.1); }
          66% { transform: translate(-30px, 50px) scale(0.9); }
        }

        .onboarding-container {
          position: relative;
          z-index: 1;
          max-width: 640px;
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-radius: 28px;
          padding: 40px 36px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 28px;
        }

        .logo-text {
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          background: linear-gradient(135deg, #6366f1, #3b82f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .back-btn {
          position: absolute;
          top: 20px;
          left: 20px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .back-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.9);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .progress-section {
          margin-bottom: 32px;
        }

        .progress-bar {
          position: relative;
        }

        .progress-track {
          height: 4px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(135deg, #6366f1, #3b82f6, #8b5cf6);
          border-radius: 4px;
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .progress-steps {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-bottom: 8px;
        }

        .progress-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          transition: all 0.4s ease;
        }

        .progress-dot.active {
          background: #6366f1;
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
        }

        .progress-text {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.3);
          display: block;
          text-align: center;
        }

        .error-message {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.15);
          color: #fca5a5;
          padding: 12px 18px;
          border-radius: 12px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .error-message button {
          background: none;
          border: none;
          color: #fca5a5;
          cursor: pointer;
          font-size: 16px;
        }

        .step-content {
          animation: slideIn 0.4s ease;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .step-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 28px;
        }

        .step-number {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, #6366f1, #3b82f6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
        }

        .step-icon {
          color: #6366f1;
          margin-bottom: 4px;
        }

        .step-header h2 {
          font-size: 22px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 4px 0;
        }

        .step-header p {
          color: rgba(255, 255, 255, 0.4);
          font-size: 15px;
          margin: 0;
        }

        .options-grid {
          display: grid;
          gap: 12px;
          margin-bottom: 28px;
        }

        .options-grid:not(.interests):not(.levels) {
          grid-template-columns: 1fr 1fr;
        }

        .options-grid.interests {
          grid-template-columns: repeat(3, 1fr);
        }

        .options-grid.levels {
          grid-template-columns: 1fr;
        }

        .option-card {
          position: relative;
          padding: 16px 20px;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .option-card input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
          pointer-events: none;
        }

        .option-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.12);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
        }

        .option-card.active {
          border-color: #6366f1;
          background: rgba(99, 102, 241, 0.08);
          box-shadow: 0 0 40px rgba(99, 102, 241, 0.06);
        }

        .option-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .option-content {
          flex: 1;
        }

        .option-label {
          display: block;
          color: #ffffff;
          font-weight: 600;
          font-size: 15px;
        }

        .option-desc {
          display: block;
          color: rgba(255, 255, 255, 0.3);
          font-size: 13px;
          margin-top: 2px;
        }

        .option-card .check {
          color: #4ade80;
          flex-shrink: 0;
        }

        .option-card.interest {
          flex-direction: column;
          text-align: center;
          padding: 20px 16px;
          gap: 10px;
        }

        .interest-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .option-card.interest .option-label {
          font-size: 13px;
          font-weight: 500;
        }

        .option-card.interest .check {
          position: absolute;
          top: 8px;
          right: 8px;
        }

        .option-card.level {
          padding: 16px 20px;
          gap: 14px;
        }

        .level-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(99, 102, 241, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6366f1;
          flex-shrink: 0;
        }

        .level-content {
          flex: 1;
        }

        .level-label {
          display: block;
          color: #ffffff;
          font-weight: 600;
          font-size: 15px;
        }

        .level-desc {
          display: block;
          color: rgba(255, 255, 255, 0.3);
          font-size: 13px;
        }

        .option-card.level .check {
          position: static;
          margin-left: auto;
        }

        .step-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .next-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #6366f1, #3b82f6);
          border: none;
          border-radius: 14px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .next-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 40px rgba(99, 102, 241, 0.25);
        }

        .next-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .skip-btn {
          width: 100%;
          padding: 10px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.3);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .skip-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.6);
        }

        .loader {
          width: 22px;
          height: 22px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .onboarding-footer {
          margin-top: 24px;
          text-align: center;
        }

        .footer-text {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.15);
          font-style: italic;
        }

        .success-screen {
          position: relative;
          z-index: 1;
          text-align: center;
          padding: 40px 20px;
        }

        .success-icon-wrapper {
          position: relative;
          display: inline-block;
          margin-bottom: 24px;
        }

        .success-icon {
          color: #4ade80;
          position: relative;
          z-index: 1;
        }

        .success-ring {
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          border: 2px solid rgba(74, 222, 128, 0.2);
          animation: ringPulse 2s ease-in-out infinite;
        }

        @keyframes ringPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0; }
        }

        .success-screen h1 {
          font-size: 28px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 8px 0;
        }

        .success-screen p {
          color: rgba(255, 255, 255, 0.4);
          margin: 0 0 20px 0;
          font-size: 16px;
        }

        .success-badges {
          display: flex;
          gap: 8px;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }

        .badge {
          padding: 6px 14px;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.15);
          border-radius: 30px;
          color: #a5b4fc;
          font-size: 12px;
          font-weight: 500;
        }

        .redirecting {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: rgba(255, 255, 255, 0.2);
          font-size: 14px;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.05);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @media (max-width: 640px) {
          .onboarding-container {
            padding: 24px 16px;
          }

          .options-grid:not(.interests):not(.levels) {
            grid-template-columns: 1fr;
          }

          .options-grid.interests {
            grid-template-columns: 1fr 1fr;
          }

          .step-header {
            flex-direction: column;
            gap: 12px;
          }

          .step-number {
            width: 32px;
            height: 32px;
            font-size: 14px;
          }

          .step-header h2 {
            font-size: 18px;
          }

          .option-card {
            padding: 12px 16px;
          }

          .option-card.interest {
            padding: 14px 12px;
          }

          .option-card.interest .option-label {
            font-size: 12px;
          }

          .success-screen h1 {
            font-size: 22px;
          }
        }

        @media (max-width: 400px) {
          .options-grid.interests {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }

          .option-card.interest {
            padding: 12px 8px;
          }

          .interest-icon {
            width: 36px;
            height: 36px;
          }

          .option-card.interest .option-label {
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  )
}