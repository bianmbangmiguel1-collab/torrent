// app/referral/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft,
  Users,
  Gift,
  Sparkles,
  Rocket,
  Clock,
  ChevronRight,
  Zap,
  Star,
  Heart,
  Crown,
  Diamond,
  Flame,
  Award,
  PartyPopper,
  Send,
  Mail,
  Bell,
  UserPlus,
  Share2,
  Copy,
  Check
} from 'lucide-react'
import { useUser } from '@/context/UserContext'

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function ReferralPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: userLoading } = useUser()
  
  const [isReady, setIsReady] = useState(false)
  const [showContent, setShowContent] = useState(false)
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // ============================================================
  // REDIRECTION SI NON AUTHENTIFIÉ
  // ============================================================
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.replace('/login?redirect=/referral')
    }
  }, [userLoading, isAuthenticated, router])

  // ============================================================
  // ANIMATION DE TYPE "OPENING ANIME"
  // ============================================================
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Particules pour l'effet anime
    const particles: {
      x: number
      y: number
      vx: number
      vy: number
      size: number
      color: string
      life: number
      maxLife: number
    }[] = []

    const colors = ['#ff6b35', '#f7931e', '#ff4757', '#ff6348', '#ff7f50', '#ff9f43', '#f368e0', '#a29bfe']

    // Créer des particules
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2 - 1,
        size: Math.random() * 4 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: Math.random() * 100 + 50,
        maxLife: Math.random() * 100 + 50
      })
    }

    // Étoiles filantes
    let shootingStars: {
      x: number
      y: number
      vx: number
      vy: number
      life: number
      maxLife: number
    }[] = []

    let frame = 0
    let animationStarted = false

    const animate = () => {
      if (!ctx || !canvas) return

      frame++
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Fond sombre
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.7
      )
      gradient.addColorStop(0, '#1a1a2e')
      gradient.addColorStop(0.5, '#16213e')
      gradient.addColorStop(1, '#0f0f1a')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Particules
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.life -= 0.3

        if (p.life <= 0) {
          p.x = Math.random() * canvas.width
          p.y = canvas.height
          p.vx = (Math.random() - 0.5) * 2
          p.vy = -Math.random() * 2 - 0.5
          p.life = p.maxLife
          p.color = colors[Math.floor(Math.random() * colors.length)]
        }

        const alpha = Math.max(0, p.life / p.maxLife)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
        ctx.fillStyle = p.color + Math.floor(alpha * 150).toString(16).padStart(2, '0')
        ctx.fill()

        // Trail
        ctx.beginPath()
        ctx.arc(p.x - p.vx * 2, p.y - p.vy * 2, p.size * alpha * 0.5, 0, Math.PI * 2)
        ctx.fillStyle = p.color + Math.floor(alpha * 50).toString(16).padStart(2, '0')
        ctx.fill()
      }

      // Étoiles filantes
      if (frame % 60 === 0 && Math.random() < 0.3) {
        shootingStars.push({
          x: Math.random() * canvas.width * 0.5,
          y: Math.random() * canvas.height * 0.3,
          vx: Math.random() * 8 + 4,
          vy: Math.random() * 4 + 2,
          life: 30 + Math.random() * 20,
          maxLife: 50
        })
      }

      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i]
        s.x += s.vx
        s.y += s.vy
        s.life--

        if (s.life <= 0) {
          shootingStars.splice(i, 1)
          continue
        }

        const alpha = s.life / s.maxLife
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(s.x - s.vx * 3, s.y - s.vy * 3)
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`
        ctx.lineWidth = 2
        ctx.stroke()

        // Glow
        ctx.beginPath()
        ctx.arc(s.x, s.y, 3 * alpha, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 200, 150, ${alpha * 0.5})`
        ctx.fill()
      }

      // Titre "TorrentTwist" avec effet anime
      if (frame > 30 && frame < 200) {
        const progress = Math.min(1, (frame - 30) / 60)
        const scale = 0.5 + progress * 0.5
        const opacity = Math.min(1, progress * 1.5)
        
        ctx.save()
        ctx.translate(canvas.width / 2, canvas.height / 2 - 60)
        ctx.scale(scale, scale)
        
        // Glow
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 150)
        glow.addColorStop(0, `rgba(255, 107, 53, ${opacity * 0.3})`)
        glow.addColorStop(1, 'rgba(255, 107, 53, 0)')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(0, 0, 150, 0, Math.PI * 2)
        ctx.fill()
        
        ctx.font = `bold ${60 * scale}px 'Arial Black', sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        
        // Dégradé de texte
        const grad = ctx.createLinearGradient(-200, 0, 200, 0)
        grad.addColorStop(0, '#ff6b35')
        grad.addColorStop(0.5, '#f7931e')
        grad.addColorStop(1, '#ff4757')
        ctx.fillStyle = grad
        ctx.globalAlpha = opacity
        ctx.fillText('TorrentTwist', 0, 0)
        
        // Contour lumineux
        ctx.shadowColor = '#ff6b35'
        ctx.shadowBlur = 30
        ctx.globalAlpha = opacity * 0.3
        ctx.fillText('TorrentTwist', 0, 0)
        ctx.shadowBlur = 0
        
        ctx.restore()
        
        // Sous-titre
        if (frame > 90) {
          const subOpacity = Math.min(1, (frame - 90) / 40)
          ctx.save()
          ctx.globalAlpha = subOpacity * 0.8
          ctx.font = `18px 'Arial', sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = '#a8a8b8'
          ctx.fillText('✦ Coming Soon ✦', canvas.width / 2, canvas.height / 2 + 80)
          ctx.restore()
        }
        
        // Slogan
        if (frame > 140) {
          const sloganOpacity = Math.min(1, (frame - 140) / 50)
          ctx.save()
          ctx.globalAlpha = sloganOpacity * 0.6
          ctx.font = `14px 'Arial', sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = '#6a6a8a'
          ctx.fillText('La révolution du parrainage arrive bientôt', canvas.width / 2, canvas.height / 2 + 130)
          ctx.restore()
        }

        // Effet de particules explosant autour du titre
        if (frame > 60 && frame < 120) {
          for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2
            const dist = Math.random() * 100 + 50
            const x = canvas.width / 2 + Math.cos(angle) * dist * ((frame - 60) / 60)
            const y = canvas.height / 2 - 60 + Math.sin(angle) * dist * ((frame - 60) / 60)
            const size = Math.random() * 3 + 1
            ctx.beginPath()
            ctx.arc(x, y, size, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(255, 200, 100, ${0.3 * (1 - (frame - 60) / 120)})`
            ctx.fill()
          }
        }
      }

      // Effet de transition
      if (frame > 200 && !animationStarted) {
        animationStarted = true
        setTimeout(() => {
          setIsReady(true)
          setTimeout(() => setShowContent(true), 500)
        }, 500)
      }

      requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // ============================================================
  // COPIER LE LIEN
  // ============================================================
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (err) {
      const textarea = document.createElement('textarea')
      textarea.value = window.location.href
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  // ============================================================
  // NOTIFIER
  // ============================================================
  const notifyMe = () => {
    alert('🔔 Vous serez notifié lorsque le parrainage sera disponible !')
  }

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {/* Canvas d'animation */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full z-0"
      />

      {/* Contenu principal */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="bg-white/5 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl hover:bg-white/20 transition text-white/70 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="hidden sm:inline">Retour</span>
                </Link>
                
                <div>
                  <h1 className="text-xl font-bold text-white flex items-center gap-2">
                    <UserPlus className="w-6 h-6 text-orange-400" />
                    Parrainage
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl hover:bg-white/20 transition text-white/70 hover:text-white text-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-400" />
                      <span className="text-green-400">Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copier le lien
                    </>
                  )}
                </button>
                <button
                  onClick={notifyMe}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl hover:shadow-lg shadow-orange-500/20 transition text-white text-sm font-medium"
                >
                  <Bell className="w-4 h-4" />
                  Me notifier
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Contenu principal */}
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <AnimatePresence>
            {showContent && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, type: "spring" }}
                className="text-center max-w-2xl"
              >
                {/* Icône animée */}
                <motion.div
                  className="inline-block p-6 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/20 mb-8"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <motion.div
                    animate={{ 
                      y: [0, -10, 0],
                      rotate: [0, 10, -10, 0]
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Rocket className="w-16 h-16 text-orange-400" />
                  </motion.div>
                </motion.div>

                {/* Titre */}
                <motion.h2
                  className="text-4xl md:text-5xl font-bold text-white mb-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 bg-clip-text text-transparent">
                    Parrainage
                  </span>
                </motion.h2>

                {/* Slogan */}
                <motion.p
                  className="text-xl text-white/60 mb-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  ✦ La révolution du parrainage arrive bientôt ✦
                </motion.p>

                {/* Description */}
                <motion.p
                  className="text-white/40 text-lg mb-8 leading-relaxed"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  Invitez vos amis, gagnez des récompenses exclusives et 
                  <br />
                  <span className="text-white/60">construisons ensemble la communauté TorrentTwist</span>
                </motion.p>

                {/* Badges de fonctionnalités */}
                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  {[
                    { icon: Gift, label: 'Récompenses', desc: 'Bonus exclusifs' },
                    { icon: Users, label: 'Communauté', desc: 'Filleuls & amis' },
                    { icon: Crown, label: 'Niveaux', desc: 'Statut privilège' },
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition"
                      whileHover={{ y: -4 }}
                    >
                      <item.icon className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                      <p className="font-medium text-white/80 text-sm">{item.label}</p>
                      <p className="text-xs text-white/30">{item.desc}</p>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Boutons d'action */}
                <motion.div
                  className="flex flex-wrap gap-4 justify-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <button
                    onClick={notifyMe}
                    className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl hover:shadow-2xl shadow-orange-500/20 transition text-lg font-medium"
                  >
                    <Bell className="w-5 h-5" />
                    Être notifié
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-3 px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/10 text-white rounded-2xl hover:bg-white/20 transition text-lg font-medium"
                  >
                    {copied ? (
                      <>
                        <Check className="w-5 h-5 text-green-400" />
                        Lien copié !
                      </>
                    ) : (
                      <>
                        <Share2 className="w-5 h-5" />
                        Partager
                      </>
                    )}
                  </button>
                </motion.div>

                {/* Message de coming soon */}
                <motion.div
                  className="mt-8 flex items-center justify-center gap-2 text-white/20 text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <Clock className="w-4 h-4" />
                  <span>Prochainement disponible</span>
                </motion.div>

                {/* Étoiles décoratives */}
                <motion.div
                  className="absolute top-1/4 left-1/4 text-white/5"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 90, 0]
                  }}
                  transition={{ duration: 10, repeat: Infinity }}
                >
                  <Star className="w-8 h-8" />
                </motion.div>
                <motion.div
                  className="absolute bottom-1/4 right-1/4 text-white/5"
                  animate={{ 
                    scale: [1, 1.3, 1],
                    rotate: [0, -90, 0]
                  }}
                  transition={{ duration: 8, repeat: Infinity, delay: 2 }}
                >
                  <Sparkles className="w-6 h-6" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="relative z-10 px-4 py-6 border-t border-white/5">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-white/20">
              © 2026 TorrentTwist — Tous droits réservés
            </p>
            <div className="flex items-center gap-4 text-sm text-white/20">
              <span>⚡ Version 3.0</span>
              <span>•</span>
              <span>Coming Soon</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}