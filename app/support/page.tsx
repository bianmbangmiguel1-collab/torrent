// app/support/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft,
  MessageCircle,
  Mail,
  Phone,
  MapPin,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Heart,
  Users,
  Crown,
  Award,
  Rocket,
  Zap,
  Star,
  Bell,
  Headphones,
  MessageSquare,
  User,
  AtSign,
  HelpCircle,
  BookOpen,
  Video,
  Music,
  Coffee,
  Smile,
  ThumbsUp,
  PartyPopper,
  Gift,
  Share2,
  Twitter,
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  Globe,
  Clock,
  Shield,
  Check,
  X,
  Menu,
  XCircle
} from 'lucide-react'
import { useUser } from '@/context/UserContext'

// ============================================================
// TYPES
// ============================================================

interface SupportResponse {
  error?: string
  whatsappLinks?: string[]
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function SupportPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: userLoading } = useUser()
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [typedMessage, setTypedMessage] = useState('')
  const [charIndex, setCharIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const welcomeMessages = [
    'Bienvenue dans la famille TorrentTwist ! 🎉',
    'Vous faites partie de la communauté ! 🌟',
    'Ensemble, construisons l\'avenir ! 🚀',
    'TorrentTwist, c\'est vous qui le faites vivre ! 💫',
    'Votre voix compte pour nous ! 🎯',
    'Bienvenue parmi les passionnés ! ❤️',
    'La communauté TorrentTwist vous accueille ! 🤝',
    'Prêt à vivre une aventure digitale ? ⚡',
    'TorrentTwist, votre univers sans limites ! 🌍',
    'Nous sommes ravis de vous avoir avec nous ! ✨'
  ]

  // ============================================================
  // REDIRECTION SI NON AUTHENTIFIÉ
  // ============================================================
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.replace('/login?redirect=/support')
    }
  }, [userLoading, isAuthenticated, router])

  // ============================================================
  // EFFET DE TEXTE TAPÉ
  // ============================================================
  useEffect(() => {
    if (success) {
      const message = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)]
      setIsTyping(true)
      setTypedMessage('')
      setCharIndex(0)
      
      const interval = setInterval(() => {
        setCharIndex(prev => {
          if (prev < message.length) {
            setTypedMessage(message.substring(0, prev + 1))
            return prev + 1
          }
          clearInterval(interval)
          setIsTyping(false)
          return prev
        })
      }, 50)
      
      return () => clearInterval(interval)
    }
  }, [success])

  // ============================================================
  // CONFETTI
  // ============================================================
  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => setShowConfetti(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [showConfetti])

  // ============================================================
  // HANDLE SUBMIT
  // ============================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email || !formData.message) {
      setError('Veuillez remplir tous les champs obligatoires')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      const data = (await response.json()) as SupportResponse

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'envoi')
      }

      // 🔥 Ouvrir WhatsApp avec le message pré-rempli
      if (data.whatsappLinks && data.whatsappLinks.length > 0) {
        // Ouvrir le premier lien WhatsApp
        window.open(data.whatsappLinks[0], '_blank')
        
        // Ouvrir aussi le deuxième dans un nouvel onglet
        if (data.whatsappLinks.length > 1) {
          setTimeout(() => {
            window.open(data.whatsappLinks![1], '_blank')
          }, 500)
        }
      }

      setSuccess(true)
      setShowConfetti(true)
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      })
      
      setTimeout(() => setSuccess(false), 8000)
      
    } catch (error) {
      console.error('❌ Erreur:', error)
      setError(error instanceof Error ? error.message : 'Erreur lors de l\'envoi')
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // STATS
  // ============================================================
  const stats = [
    { icon: Users, value: '12K+', label: 'Communauté active' },
    { icon: MessageCircle, value: '98%', label: 'Satisfaction' },
    { icon: Star, value: '4.9★', label: 'Note moyenne' },
    { icon: Rocket, value: '24/7', label: 'Support disponible' },
  ]

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-white/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-xl hover:bg-white transition shadow-sm text-gray-700"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Retour</span>
              </Link>
              
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Headphones className="w-6 h-6 text-blue-500" />
                  Support
                </h1>
                <p className="text-sm text-gray-500 hidden sm:block">
                  Nous sommes là pour vous aider
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                En ligne
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* ============================================================
            STATISTIQUES
        ============================================================ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 text-center"
            >
              <stat.icon className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* ============================================================
            MESSAGE DE BIENVENUE
        ============================================================ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl p-8 text-white shadow-2xl shadow-blue-500/20 mb-8 text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Heart className="w-12 h-12 text-white/80 mx-auto mb-4" />
          </motion.div>
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            Bienvenue dans la famille TorrentTwist ! 🎉
          </h2>
          <p className="text-white/80 text-lg">
            Votre satisfaction est notre priorité. N'hésitez pas à nous contacter !
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-white/70 text-sm">
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4 text-green-300" />
              Support 24/7
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4 text-green-300" />
              Réponse rapide
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4 text-green-300" />
              Équipe dédiée
            </span>
          </div>
        </motion.div>

        {/* ============================================================
            FORMULAIRE DE CONTACT
        ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Formulaire */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-white/50 shadow-xl"
            >
              {/* Message de succès */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl text-center"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.5 }}
                    >
                      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-green-700 mb-1">
                      Message envoyé avec succès ! 🎉
                    </h3>
                    <p className="text-green-600">
                      Notre équipe vous répondra dans les plus brefs délais.
                    </p>
                    <AnimatePresence>
                      {isTyping && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-3 p-3 bg-white/50 rounded-xl"
                        >
                          <p className="text-purple-600 font-medium">
                            {typedMessage}
                            <span className="animate-pulse">|</span>
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Erreur */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Formulaire */}
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <User className="w-4 h-4 inline mr-1" />
                      Nom complet <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition text-gray-900"
                      placeholder="Votre nom"
                      required
                      disabled={loading || success}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <AtSign className="w-4 h-4 inline mr-1" />
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition text-gray-900"
                      placeholder="votre@email.com"
                      required
                      disabled={loading || success}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition text-gray-900"
                    placeholder="+237 6XX XXX XXX"
                    disabled={loading || success}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <HelpCircle className="w-4 h-4 inline mr-1" />
                    Sujet
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition text-gray-900"
                    disabled={loading || success}
                  >
                    <option value="Support général">Support général</option>
                    <option value="Problème technique">Problème technique</option>
                    <option value="Question produit">Question produit</option>
                    <option value="Paiement">Paiement</option>
                    <option value="Compte">Compte utilisateur</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <MessageSquare className="w-4 h-4 inline mr-1" />
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition text-gray-900 resize-none"
                    placeholder="Décrivez votre demande en détail..."
                    required
                    disabled={loading || success}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || success}
                  className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-2xl hover:shadow-xl shadow-blue-500/20 transition text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Message envoyé !
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Envoyer sur WhatsApp
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-400 text-center">
                  🔒 Vos données sont sécurisées et confidentielles
                </p>
              </form>
            </motion.div>
          </div>

          {/* ============================================================
              SIDEBAR - INFOS DE CONTACT
          ============================================================ */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50"
            >
              <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Contact direct
              </h3>
              
              <div className="space-y-4">
                <a
                  href="https://wa.me/237675832091"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition group"
                >
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-green-600 transition">
                      WhatsApp Support
                    </p>
                    <p className="text-sm text-gray-500">+237 675 832 091</p>
                  </div>
                </a>

                <a
                  href="https://wa.me/22960067966"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition group"
                >
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-green-600 transition">
                      WhatsApp Support
                    </p>
                    <p className="text-sm text-gray-500">+229 600 679 66</p>
                  </div>
                </a>

                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Email Support</p>
                    <p className="text-sm text-gray-500">support@torrenttwist.com</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ============================================================
                COMMUNAUTÉ
            ============================================================ */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-r from-purple-50 to-pink-50 backdrop-blur-sm rounded-3xl p-6 border border-purple-100"
            >
              <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" />
                Rejoignez la communauté
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Faites partie de la famille TorrentTwist et restez connecté !
              </p>
              <div className="flex gap-3">
                {[
                  { icon: Twitter, label: 'Twitter', color: 'hover:bg-blue-50' },
                  { icon: Facebook, label: 'Facebook', color: 'hover:bg-blue-50' },
                  { icon: Instagram, label: 'Instagram', color: 'hover:bg-pink-50' },
                  { icon: Youtube, label: 'YouTube', color: 'hover:bg-red-50' },
                ].map((social, index) => (
                  <a
                    key={index}
                    href="#"
                    className={`p-3 bg-white rounded-xl hover:shadow-md transition ${social.color}`}
                  >
                    <social.icon className="w-5 h-5 text-gray-600" />
                  </a>
                ))}
              </div>
            </motion.div>

            {/* ============================================================
                HEURES D'OUVERTURE
            ============================================================ */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/50"
            >
              <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                Disponibilité
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Lundi - Vendredi</span>
                  <span className="font-medium text-gray-900">24h/24</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Samedi</span>
                  <span className="font-medium text-gray-900">24h/24</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Dimanche</span>
                  <span className="font-medium text-gray-900">24h/24</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-green-50 rounded-xl flex items-center gap-2 text-green-700 text-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Support disponible 24h/24, 7j/7
              </div>
            </motion.div>
          </div>
        </div>

        {/* ============================================================
            FOOTER MESSAGE
        ============================================================ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 p-6 bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 rounded-3xl text-center"
        >
          <p className="text-gray-700">
            <Heart className="w-5 h-5 text-red-500 inline mr-2" />
            Merci de faire partie de la communauté TorrentTwist ! Ensemble, construisons l'avenir du digital.
          </p>
        </motion.div>
      </main>

      {/* ============================================================
          CONFETTI
      ============================================================ */}
      <AnimatePresence>
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  background: ['#ff6b35', '#f7931e', '#ff4757', '#2ed573', '#1e90ff', '#a29bfe', '#ff6b81'][Math.floor(Math.random() * 7)],
                  left: Math.random() * 100 + '%',
                  top: '-10%',
                }}
                animate={{
                  y: ['0vh', '110vh'],
                  x: [0, (Math.random() - 0.5) * 200],
                  rotate: [0, 720],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  delay: Math.random() * 0.5,
                  ease: 'easeOut',
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}