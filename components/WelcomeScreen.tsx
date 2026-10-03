'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import {
  BookOpen, GraduationCap, Palette, Code2, Package, Video,
  ShoppingBag, Sparkles, Download, Rocket, Shield, Zap, Heart,
  ArrowRight, Award, Target, ChevronRight, Play, Star, CheckCircle,
  Gift, Mail, Phone, MapPin, Twitter, Facebook, Instagram, Youtube,
  Linkedin, Menu, X, Search, Lock, CreditCard, Library, BadgeCheck,
  ChevronDown, Quote, UserPlus, LogIn, ArrowUp, ShoppingCart, User, Clock,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function WelcomeScreen() {
  const router = useRouter()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileAccountSheetOpen, setMobileAccountSheetOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [showTopButton, setShowTopButton] = useState(false)
  const [email, setEmail] = useState('')
  const [newsletterStatus, setNewsletterStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')

  const { scrollYProgress } = useScroll()
  const heroY = useTransform(scrollYProgress, [0, 0.25], [0, -100])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.22], [1, 0.45])

  useEffect(() => {
    const onScroll = () => setShowTopButton(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow =
      mobileMenuOpen || mobileAccountSheetOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen, mobileAccountSheetOpen])

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false)
    setTimeout(() => {
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  // ─────────────────────────────────────────────
  // DATA
  // ─────────────────────────────────────────────

  const categories = [
    {
      icon: BookOpen,
      title: 'Ebooks',
      description: 'Guides, livres pratiques et ressources digitales.',
    },
    {
      icon: GraduationCap,
      title: 'Formations',
      description: 'Apprenez de nouvelles compétences à votre rythme.',
    },
    {
      icon: Palette,
      title: 'Templates',
      description: 'Designs, modèles Canva et ressources créatives.',
    },
    {
      icon: Code2,
      title: 'Outils digitaux',
      description: 'Ressources, logiciels et solutions numériques.',
    },
    {
      icon: Video,
      title: 'Vidéos',
      description: 'Contenus pédagogiques et ressources vidéo.',
    },
    {
      icon: Package,
      title: 'Packs',
      description: 'Des collections complètes pour aller plus vite.',
    },
  ]

  const reasons = [
    {
      icon: Library,
      title: 'Bibliothèque personnelle',
      description: 'Tous vos achats centralisés et accessibles à tout moment.',
      color: 'from-blue-500 to-indigo-500',
    },
    {
      icon: Zap,
      title: 'Accès immédiat',
      description: 'Retrouvez vos ressources dès la confirmation du paiement.',
      color: 'from-amber-500 to-orange-500',
    },
    {
      icon: Shield,
      title: 'Téléchargements sécurisés',
      description: 'Vos fichiers restent liés à votre compte, en toute sécurité.',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      icon: Target,
      title: 'Expérience personnalisée',
      description: 'Recommandations et parcours adaptés à vos objectifs.',
      color: 'from-violet-500 to-pink-500',
    },
  ]

  const benefits = [
    {
      icon: Zap,
      title: 'Accès immédiat',
      description:
        'Après validation de votre achat, vos produits numériques sont immédiatement accessibles.',
    },
    {
      icon: Shield,
      title: 'Paiement sécurisé',
      description:
        'Vos paiements sont traités via une infrastructure de paiement sécurisée.',
    },
    {
      icon: Library,
      title: 'Bibliothèque personnelle',
      description:
        'Retrouvez vos achats dans un espace personnel organisé et accessible.',
    },
    {
      icon: Download,
      title: 'Téléchargement simple',
      description:
        'Retrouvez vos ressources sans devoir rechercher vos anciennes commandes.',
    },
  ]

  const steps = [
    {
      number: '01',
      icon: Search,
      title: 'Explorez',
      description:
        'Parcourez les produits et trouvez les ressources qui correspondent à vos besoins.',
    },
    {
      number: '02',
      icon: ShoppingBag,
      title: 'Choisissez',
      description:
        'Ajoutez vos produits au panier ou utilisez Acheter maintenant pour aller plus vite.',
    },
    {
      number: '03',
      icon: CreditCard,
      title: 'Payez',
      description:
        'Finalisez votre commande avec la méthode de paiement disponible.',
    },
    {
      number: '04',
      icon: Download,
      title: 'Profitez',
      description:
        'Retrouvez votre achat, votre facture et votre téléchargement dans votre espace.',
    },
  ]

  const values = [
    {
      icon: Rocket,
      title: 'Innovation',
      description: 'Une expérience pensée pour les usages numériques modernes.',
    },
    {
      icon: Shield,
      title: 'Sécurité',
      description:
        'La protection des comptes et des transactions reste prioritaire.',
    },
    {
      icon: Heart,
      title: 'Expérience',
      description: 'Une interface simple, rapide et agréable à utiliser.',
    },
    {
      icon: Target,
      title: 'Utilité',
      description: 'Des ressources pensées pour répondre à de vrais besoins.',
    },
  ]

  const stats = [
    { value: '100%', label: 'Produits digitaux', icon: Package },
    { value: '24/7', label: 'Accès en ligne', icon: Clock },
    { value: '< 1 min', label: 'Livraison', icon: Zap },
    { value: '🇨🇲', label: 'Made in Cameroon', icon: Heart },
  ]

  const testimonials = [
    {
      name: 'Marie N.',
      role: 'Entrepreneure',
      message:
        "J'ai trouvé des ressources concrètes qui m'ont fait gagner des semaines. L'accès est immédiat, c'est vraiment pratique.",
      rating: 5,
      avatar: 'M',
    },
    {
      name: 'Jean-Paul T.',
      role: 'Développeur freelance',
      message:
        'Interface claire, paiement simple et mes achats sont tous centralisés au même endroit. Je recommande.',
      rating: 5,
      avatar: 'J',
    },
    {
      name: 'Sophie K.',
      role: 'Créatrice de contenu',
      message:
        'Les templates et formations sont de qualité. Le fait de pouvoir retrouver mes anciens achats est un vrai plus.',
      rating: 4,
      avatar: 'S',
    },
  ]

  const faqs = [
    {
      question: "Qu'est-ce que TorrentTwist ?",
      answer:
        'TorrentTwist est une plateforme dédiée aux produits numériques : ebooks, formations, templates, outils, vidéos et différents packs de ressources.',
    },
    {
      question: 'Comment acheter un produit ?',
      answer:
        'Vous pouvez ajouter un produit au panier ou utiliser Acheter maintenant. Vous êtes ensuite dirigé vers le parcours de paiement pour finaliser votre commande.',
    },
    {
      question: 'Quand vais-je recevoir mon produit ?',
      answer:
        "Pour un produit numérique, l'accès est prévu après confirmation du paiement. Le produit peut ensuite être retrouvé dans votre espace personnel.",
    },
    {
      question: 'Où retrouver mes factures ?',
      answer:
        'Vos factures peuvent être regroupées dans votre espace personnel afin que vous puissiez les consulter et les télécharger facilement.',
    },
    {
      question: 'Puis-je retrouver mes anciens achats ?',
      answer:
        'Oui. Votre espace personnel est conçu pour centraliser vos commandes, vos produits acquis, vos favoris et vos documents.',
    },
  ]

  const floatingCards = [
    { icon: BookOpen, title: 'Ebooks', position: 'top-[16%] left-[4%]' },
    { icon: Palette, title: 'Templates', position: 'top-[30%] right-[3%]' },
    { icon: Video, title: 'Formations', position: 'bottom-[18%] left-[8%]' },
    { icon: Code2, title: 'Outils', position: 'bottom-[12%] right-[8%]' },
  ]

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) return
    setNewsletterStatus('loading')

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'landing' }),
      })

      if (res.ok) {
        setNewsletterStatus('success')
        setEmail('')
        setTimeout(() => setNewsletterStatus('idle'), 5000)
      } else {
        setNewsletterStatus('error')
      }
    } catch {
      setNewsletterStatus('error')
    }
  }

  const openAccountSheet = () => {
    setMobileAccountSheetOpen(true)
  }

  const goLogin = () => {
    setMobileAccountSheetOpen(false)
    router.push('/login')
  }

  const goSignup = () => {
    setMobileAccountSheetOpen(false)
    router.push('/signup')
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      {/* PROGRESS BAR */}
      <motion.div
        style={{ scaleX: scrollYProgress }}
        className="fixed left-0 top-0 z-[200] h-1 w-full origin-left bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600"
      />

      {/* BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-12%] top-[-10%] h-[500px] w-[500px] rounded-full bg-blue-200/30 blur-[120px]" />
        <div className="absolute right-[-12%] top-[15%] h-[450px] w-[450px] rounded-full bg-indigo-200/25 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[25%] h-[500px] w-[500px] rounded-full bg-violet-200/20 blur-[140px]" />
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-[100] border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-3 px-4 sm:h-[72px] sm:px-5 lg:px-8">
          <button
            onClick={() => router.push('/')}
            className="group flex shrink-0 items-center gap-2"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition group-hover:scale-105 sm:h-11 sm:w-11">
              <img
                src="/torrent.png"
                alt="TorrentTwist"
                className="h-8 w-8 object-contain sm:h-9 sm:w-9"
              />
            </div>
            <div className="hidden xs:block">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-lg font-black text-transparent sm:text-xl">
                TorrentTwist
              </div>
              <div className="hidden text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400 sm:block sm:text-[10px]">
                Digital Universe
              </div>
            </div>
          </button>

          <nav className="hidden items-center gap-1 md:flex">
            {[
              ['Univers', 'universe'],
              ['Fonctionnement', 'how-it-works'],
              ['Valeurs', 'values'],
              ['Avis', 'testimonials'],
              ['FAQ', 'faq'],
            ].map(([label, target]) => (
              <button
                key={target}
                onClick={() => scrollTo(target)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/login')}
              className="hidden items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 md:flex"
            >
              <LogIn size={16} />
              Connexion
            </button>

            <button
              onClick={() => router.push('/signup')}
              className="hidden items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:shadow-xl md:flex"
            >
              <UserPlus size={16} />
              Créer un compte
            </button>

            <button
              onClick={() => router.push('/search')}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition active:scale-95 md:hidden"
              aria-label="Rechercher"
            >
              <Search size={18} />
            </button>

            <button
              onClick={() => router.push('/cart')}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition active:scale-95 md:hidden"
              aria-label="Panier"
            >
              <ShoppingCart size={18} />
            </button>

            <button
              onClick={openAccountSheet}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 transition active:scale-95 md:hidden"
              aria-label="Mon compte"
            >
              <User size={18} />
            </button>

            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition active:scale-95 md:hidden"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-slate-200 bg-white md:hidden"
            >
              <div className="space-y-1 p-4">
                {[
                  ['Univers', 'universe'],
                  ['Fonctionnement', 'how-it-works'],
                  ['Valeurs', 'values'],
                  ['Avis', 'testimonials'],
                  ['FAQ', 'faq'],
                ].map(([label, target]) => (
                  <button
                    key={target}
                    onClick={() => scrollTo(target)}
                    className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-base font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-600"
                  >
                    {label}
                    <ChevronRight size={17} className="text-slate-300" />
                  </button>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* BOTTOM SHEET — COMPTE MOBILE */}
      <AnimatePresence>
        {mobileAccountSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileAccountSheetOpen(false)}
              className="fixed inset-0 z-[150] bg-slate-950/50 backdrop-blur-sm md:hidden"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-[160] rounded-t-[28px] bg-white p-6 shadow-2xl md:hidden"
            >
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-slate-200" />

              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
                  <User size={24} />
                </div>
                <h3 className="mt-4 text-xl font-black text-slate-950">
                  Votre espace TorrentTwist
                </h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">
                  Retrouvez vos achats, téléchargements et favoris depuis un
                  seul endroit.
                </p>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  onClick={goLogin}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-blue-500/20 transition active:scale-95"
                >
                  <LogIn size={18} />
                  Se connecter
                </button>

                <button
                  onClick={goSignup}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-6 py-4 text-base font-bold text-slate-800 transition active:scale-95"
                >
                  <UserPlus size={18} />
                  Créer un compte
                </button>

                <button
                  onClick={() => setMobileAccountSheetOpen(false)}
                  className="w-full py-3 text-sm font-medium text-slate-500 transition hover:text-slate-700"
                >
                  Continuer sans compte
                </button>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Library, label: 'Bibliothèque' },
                    { icon: Download, label: 'Téléchargements' },
                    { icon: Heart, label: 'Favoris' },
                    { icon: Shield, label: 'Sécurisé' },
                  ].map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 text-xs text-slate-500"
                    >
                      <Icon size={15} className="text-blue-600" />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* HERO */}
      <section className="relative isolate overflow-hidden">
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-5 sm:pb-20 sm:pt-16 lg:px-8 lg:pb-28 lg:pt-24"
        >
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-1.5 text-[11px] font-bold text-blue-700 sm:text-xs">
                <Sparkles size={13} />
                Votre univers de produits digitaux
              </div>

              <h1 className="max-w-4xl text-[2.5rem] font-black leading-[1.02] tracking-[-0.04em] text-slate-950 sm:text-5xl md:text-6xl lg:text-7xl">
                Découvrez.
                <br />
                Apprenez.
                <br />
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  Créez.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                TorrentTwist réunit dans un même univers des ressources
                numériques pensées pour apprendre, créer, développer vos
                projets et aller plus loin.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => router.push('/signup')}
                  className="group inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-base font-bold text-white shadow-xl shadow-blue-500/20 transition hover:-translate-y-1 hover:shadow-2xl active:scale-95"
                >
                  Découvrir les ressources
                  <ArrowRight
                    size={19}
                    className="transition group-hover:translate-x-1"
                  />
                </button>

                <button
                  onClick={() => scrollTo('how-it-works')}
                  className="inline-flex items-center justify-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-base font-bold text-slate-800 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg active:scale-95"
                >
                  <Play size={17} />
                  Comment ça marche
                </button>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-slate-500 sm:text-sm">
                <div className="flex items-center gap-2">
                  <BadgeCheck size={16} className="text-emerald-500" />
                  Produits numériques
                </div>
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-blue-500" />
                  Paiement sécurisé
                </div>
                <div className="flex items-center gap-2">
                  <Download size={16} className="text-violet-500" />
                  Accès digital
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.15 }}
              className="relative mx-auto h-[380px] w-full max-w-[560px] sm:h-[460px] lg:h-[520px]"
            >
              <div className="absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-blue-100 via-indigo-100 to-violet-100 blur-2xl sm:h-[380px] sm:w-[380px]" />

              <motion.div
                animate={{ y: [0, -12, 0], rotate: [0, 1.5, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute left-1/2 top-1/2 z-20 flex h-[230px] w-[230px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[36px] border border-white/80 bg-white/80 shadow-[0_35px_100px_rgba(37,99,235,0.18)] backdrop-blur-xl sm:h-[290px] sm:w-[290px] sm:rounded-[42px]"
              >
                <div className="text-center">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] bg-white shadow-lg ring-1 ring-slate-100 sm:h-28 sm:w-28 sm:rounded-[32px]">
                    <img
                      src="/torrent.png"
                      alt="TorrentTwist"
                      className="h-20 w-20 object-contain sm:h-24 sm:w-24"
                    />
                  </div>
                  <div className="mt-5 text-2xl font-black text-slate-950 sm:mt-6 sm:text-3xl">
                    TorrentTwist
                  </div>
                  <div className="mt-1.5 text-xs font-medium text-slate-500 sm:mt-2 sm:text-sm">
                    Votre univers digital
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-2 sm:mt-5">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-semibold text-emerald-600 sm:text-xs">
                      Plateforme en ligne
                    </span>
                  </div>
                </div>
              </motion.div>

              {floatingCards.map((card, index) => {
                const Icon = card.icon
                return (
                  <motion.div
                    key={card.title}
                    animate={{ y: [0, index % 2 === 0 ? -10 : 10, 0] }}
                    transition={{
                      duration: 4 + index,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className={`absolute ${card.position} z-30 hidden rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-xl backdrop-blur-md sm:flex`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Icon size={19} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {card.title}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Ressource digitale
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}

              <div className="absolute inset-x-4 bottom-0 z-10 grid grid-cols-3 gap-2 sm:inset-x-8 sm:bottom-3 sm:gap-3">
                {[
                  { icon: Lock, label: 'Sécurisé' },
                  { icon: Download, label: 'Instantané' },
                  { icon: Library, label: 'Centralisé' },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-white/80 bg-white/75 p-3 text-center shadow-lg backdrop-blur-md sm:rounded-2xl sm:p-4"
                  >
                    <Icon className="mx-auto mb-1.5 h-4 w-4 text-blue-600 sm:mb-2 sm:h-5 sm:w-5" />
                    <div className="text-[10px] font-bold text-slate-700 sm:text-xs">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* TRUST BAR */}
      <section className="border-y border-slate-200 bg-slate-50/60 py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
            {stats.map((stat, i) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                    <Icon size={19} className="text-blue-600" />
                  </div>
                  <div className="mt-3 text-xl font-black text-slate-950 sm:text-2xl">
                    {stat.value}
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium text-slate-500 sm:text-xs">
                    {stat.label}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* POURQUOI CRÉER VOTRE ESPACE */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-4 inline-flex rounded-full bg-indigo-50 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-indigo-700 sm:text-xs">
              Votre espace personnel
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl md:text-5xl">
              Pourquoi créer
              <span className="text-blue-600"> votre espace ?</span>
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:mt-5 sm:text-lg sm:leading-8">
              Bien plus qu'un simple compte : un espace qui vous suit après
              chaque achat.
            </p>
          </motion.div>

          <div className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            {reasons.map((reason, index) => {
              const Icon = reason.icon
              return (
                <motion.div
                  key={reason.title}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.55, delay: index * 0.08 }}
                  whileHover={{ y: -6 }}
                  className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/10 sm:rounded-[28px] sm:p-7"
                >
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${reason.color} text-white shadow-lg`}
                  >
                    <Icon size={26} />
                  </div>
                  <h3 className="mt-5 text-lg font-black text-slate-950">
                    {reason.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {reason.description}
                  </p>
                </motion.div>
              )
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-10 flex flex-col justify-center gap-3 sm:mt-12 sm:flex-row"
          >
            <button
              onClick={() => router.push('/signup')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 font-bold text-white shadow-xl shadow-blue-500/20 transition hover:-translate-y-1 active:scale-95"
            >
              <UserPlus size={18} />
              Créer mon compte
            </button>
            <button
              onClick={() => router.push('/login')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 font-bold text-slate-800 transition hover:border-blue-200 hover:bg-blue-50/50 active:scale-95"
            >
              <LogIn size={18} />
              J'ai déjà un compte
            </button>
          </motion.div>
        </div>
      </section>

      {/* UNIVERSE */}
      <section
        id="universe"
        className="scroll-mt-24 bg-slate-50/70 py-16 sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7 }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-4 inline-flex rounded-full bg-blue-50 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-blue-700 sm:text-xs">
              Explorez l'univers
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl md:text-5xl">
              Tout un monde de ressources
              <span className="text-blue-600"> digitales.</span>
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:mt-5 sm:text-lg sm:leading-8">
              Un espace pensé pour vous permettre de découvrir rapidement des
              produits numériques adaptés à vos projets.
            </p>
          </motion.div>

          <div className="mt-10 sm:mt-14">
            <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 scrollbar-hide sm:hidden">
              {categories.map((category, index) => {
                const Icon = category.icon
                return (
                  <motion.div
                    key={category.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.04 }}
                    className="w-[240px] shrink-0 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
                      <Icon size={24} />
                    </div>
                    <h3 className="mt-5 text-lg font-black text-slate-950">
                      {category.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {category.description}
                    </p>
                  </motion.div>
                )
              })}
            </div>

            <div className="hidden gap-5 sm:grid sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category, index) => {
                const Icon = category.icon
                return (
                  <motion.div
                    key={category.title}
                    initial={{ opacity: 0, y: 25 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: 0.6, delay: index * 0.06 }}
                    whileHover={{ y: -7 }}
                    className="group rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm transition hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-500/10"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 transition group-hover:scale-110">
                        <Icon size={28} />
                      </div>
                      <ArrowRight
                        size={19}
                        className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600"
                      />
                    </div>
                    <h3 className="mt-6 text-xl font-black text-slate-950">
                      {category.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-slate-500">
                      {category.description}
                    </p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8">
          <div className="grid items-start gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
            <motion.div
              initial={{ opacity: 0, x: -25 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <div className="mb-4 inline-flex rounded-full bg-indigo-50 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-indigo-700 sm:text-xs">
                Une expérience pensée pour vous
              </div>
              <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl md:text-5xl">
                Simple à utiliser.
                <br />
                <span className="text-blue-600">Puissante au quotidien.</span>
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:mt-6 sm:text-lg sm:leading-8">
                TorrentTwist ne doit pas simplement être une boutique.
                L'objectif est de créer un espace dans lequel vos produits
                numériques vous suivent après votre achat.
              </p>
              <button
                onClick={() => router.push('/signup')}
                className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 active:scale-95 sm:mt-8"
              >
                Commencer maintenant
                <ArrowRight size={18} />
              </button>
            </motion.div>

            <div className="grid gap-4 sm:grid-cols-2">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon
                return (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.55, delay: index * 0.08 }}
                    className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[26px] sm:p-6"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 sm:h-12 sm:w-12">
                      <Icon size={20} />
                    </div>
                    <h3 className="mt-4 text-base font-black text-slate-950 sm:mt-5 sm:text-lg">
                      {benefit.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500 sm:leading-7">
                      {benefit.description}
                    </p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        className="scroll-mt-24 overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900 py-16 text-white sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-blue-300 sm:text-xs">
              Parcours simplifié
            </div>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
              Quatre étapes.
              <br />
              <span className="text-blue-400">Une expérience fluide.</span>
            </h2>
          </motion.div>

          <div className="relative mt-12 grid gap-4 sm:mt-16 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="absolute left-[12.5%] right-[12.5%] top-14 hidden h-px bg-gradient-to-r from-blue-500/0 via-blue-400/50 to-blue-500/0 lg:block" />
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.08 }}
                  className="relative z-10 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm sm:rounded-[28px] sm:p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
                      <Icon size={21} />
                    </div>
                    <span className="text-sm font-black text-white/25">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="mt-6 text-lg font-black sm:mt-7 sm:text-xl">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/60 sm:mt-3 sm:leading-7">
                    {step.description}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section id="values" className="scroll-mt-24 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex rounded-full bg-violet-50 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-violet-700 sm:text-xs">
              Notre philosophie
            </div>
            <h2 className="text-3xl font-black text-slate-950 sm:text-4xl md:text-5xl">
              Les principes derrière
              <span className="text-blue-600"> l'expérience.</span>
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:mt-14 sm:gap-5 lg:grid-cols-4">
            {values.map((value, index) => {
              const Icon = value.icon
              return (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, scale: 0.96 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.55, delay: index * 0.07 }}
                  whileHover={{ y: -6 }}
                  className="rounded-[24px] border border-slate-200 bg-white p-5 text-center shadow-sm transition-shadow hover:shadow-xl hover:shadow-blue-500/10 sm:rounded-[28px] sm:p-7"
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 sm:h-16 sm:w-16">
                    <Icon size={26} />
                  </div>
                  <h3 className="mt-4 text-base font-black text-slate-950 sm:mt-5 sm:text-lg">
                    {value.title}
                  </h3>
                  <p className="mt-2 text-xs leading-6 text-slate-500 sm:text-sm sm:leading-7">
                    {value.description}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section
        id="testimonials"
        className="scroll-mt-24 bg-slate-50/70 py-16 sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex rounded-full bg-amber-50 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-amber-700 sm:text-xs">
              Ils nous font confiance
            </div>
            <h2 className="text-3xl font-black text-slate-950 sm:text-4xl md:text-5xl">
              Ce que disent nos utilisateurs.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:mt-5 sm:text-lg sm:leading-8">
              Des retours réels de personnes qui utilisent TorrentTwist au
              quotidien.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t, index) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: index * 0.08 }}
                className="relative rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm sm:rounded-[28px]"
              >
                <Quote
                  size={28}
                  className="absolute right-5 top-5 text-blue-100"
                />
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={15}
                      className={
                        i < t.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-200'
                      }
                    />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  "{t.message}"
                </p>
                <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-sm font-black text-white">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {t.name}
                    </div>
                    <div className="text-xs text-slate-400">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* EXPERIENCE PANEL */}
      <section className="px-4 pb-16 sm:px-5 sm:pb-24 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-7xl overflow-hidden rounded-[28px] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-6 text-white shadow-2xl shadow-blue-500/20 sm:rounded-[36px] sm:p-12 lg:p-16"
        >
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto] lg:gap-10">
            <div>
              <div className="mb-4 inline-flex rounded-full bg-white/10 px-4 py-2 text-[11px] font-bold backdrop-blur sm:text-xs">
                ✨ Votre espace personnel
              </div>
              <h2 className="max-w-3xl text-2xl font-black leading-tight sm:text-3xl md:text-4xl lg:text-5xl">
                Achetez une fois.
                <br />
                Retrouvez votre univers ensuite.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80 sm:mt-5 sm:text-base sm:leading-8 lg:text-lg">
                Commandes, favoris, factures, produits acquis et notifications
                peuvent être réunis dans un seul espace personnel.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
              {[
                { icon: ShoppingBag, label: 'Commandes' },
                { icon: Library, label: 'Bibliothèque' },
                { icon: Heart, label: 'Favoris' },
                { icon: Award, label: 'Récompenses' },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-white/10 p-4 text-center backdrop-blur sm:p-5"
                >
                  <Icon className="mx-auto mb-2 h-5 w-5 sm:h-6 sm:w-6" />
                  <div className="text-[11px] font-bold text-white/90 sm:text-xs">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* NEWSLETTER */}
      <section className="px-4 pb-16 sm:px-5 sm:pb-24 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl rounded-[28px] border border-slate-200 bg-white p-6 text-center shadow-sm sm:rounded-[36px] sm:p-10"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20 sm:h-16 sm:w-16">
            <Gift size={26} />
          </div>
          <h2 className="mt-5 text-2xl font-black text-slate-950 sm:text-3xl">
            Restez informé des nouveautés
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            Recevez en avant-première les nouveaux produits, promotions et
            ressources utiles. Pas de spam, désinscription en 1 clic.
          </p>

          <form
            onSubmit={handleNewsletterSubmit}
            className="mt-6 flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
            <button
              type="submit"
              disabled={newsletterStatus === 'loading'}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 font-bold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 active:scale-95 disabled:opacity-60"
            >
              {newsletterStatus === 'loading' ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Envoi...
                </>
              ) : newsletterStatus === 'success' ? (
                <>
                  <CheckCircle size={18} />
                  Inscrit !
                </>
              ) : (
                <>
                  S'inscrire
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {newsletterStatus === 'success' && (
            <p className="mt-3 text-sm font-medium text-emerald-600">
              ✅ Merci ! Tu recevras bientôt nos prochaines nouveautés.
            </p>
          )}
          {newsletterStatus === 'error' && (
            <p className="mt-3 text-sm font-medium text-red-500">
              ❌ Une erreur est survenue. Réessaie plus tard.
            </p>
          )}
        </motion.div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24 bg-slate-50/70 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-5 lg:px-8">
          <div className="text-center">
            <div className="mb-4 inline-flex rounded-full bg-blue-50 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-blue-700 sm:text-xs">
              FAQ
            </div>
            <h2 className="text-3xl font-black text-slate-950 sm:text-4xl md:text-5xl">
              Les questions essentielles.
            </h2>
          </div>

          <div className="mt-10 space-y-3 sm:mt-12">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index
              return (
                <motion.div
                  key={faq.question}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: index * 0.05 }}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <button
                    onClick={() =>
                      setOpenFaq((c) => (c === index ? null : index))
                    }
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
                  >
                    <span className="text-sm font-bold text-slate-900 sm:text-base">
                      {faq.question}
                    </span>
                    <ChevronDown
                      size={19}
                      className={`shrink-0 text-slate-400 transition-transform ${
                        isOpen ? 'rotate-180 text-blue-600' : ''
                      }`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div className="border-t border-slate-100 px-5 pb-5 pt-4 text-sm leading-7 text-slate-500 sm:px-6 sm:pb-6">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-5 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_30px_100px_rgba(15,23,42,0.08)] sm:rounded-[36px] sm:p-12"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 sm:h-16 sm:w-16">
              <Rocket size={28} />
            </div>
            <h2 className="mt-5 text-2xl font-black text-slate-950 sm:mt-6 sm:text-4xl md:text-5xl">
              Prêt à entrer dans l'univers TorrentTwist ?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:mt-5 sm:text-lg sm:leading-8">
              Créez votre espace, explorez les ressources disponibles et
              construisez votre bibliothèque numérique.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:mt-8 sm:flex-row">
              <button
                onClick={() => router.push('/signup')}
                className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 font-bold text-white shadow-xl shadow-blue-500/20 transition hover:-translate-y-1 active:scale-95"
              >
                Créer mon compte
                <ArrowRight size={18} />
              </button>
              <button
                onClick={() => router.push('/login')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 font-bold text-slate-800 transition hover:border-blue-200 hover:bg-blue-50/50 active:scale-95"
              >
                <LogIn size={18} />
                J'ai déjà un compte
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-5 sm:py-16 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white">
                  <img
                    src="/torrent.png"
                    alt="TorrentTwist"
                    className="h-9 w-9 object-contain"
                  />
                </div>
                <div>
                  <div className="text-xl font-black">TorrentTwist</div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                    Digital Universe
                  </div>
                </div>
              </div>
              <p className="mt-5 max-w-md text-sm leading-7 text-white/55">
                Une plateforme pensée pour découvrir, acheter et retrouver
                facilement des produits numériques.
              </p>
              <div className="mt-6 flex gap-2">
                {[Twitter, Facebook, Instagram, Youtube, Linkedin].map(
                  (Icon, index) => (
                    <a
                      key={index}
                      href="#"
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                    >
                      <Icon size={17} />
                    </a>
                  )
                )}
              </div>
            </div>

            <div>
              <h3 className="font-bold">Découvrir</h3>
              <div className="mt-4 space-y-3 text-sm text-white/50">
                <button
                  onClick={() => scrollTo('universe')}
                  className="block transition hover:text-white"
                >
                  Univers
                </button>
                <button
                  onClick={() => scrollTo('how-it-works')}
                  className="block transition hover:text-white"
                >
                  Fonctionnement
                </button>
                <button
                  onClick={() => scrollTo('values')}
                  className="block transition hover:text-white"
                >
                  Valeurs
                </button>
                <button
                  onClick={() => scrollTo('testimonials')}
                  className="block transition hover:text-white"
                >
                  Avis
                </button>
                <button
                  onClick={() => scrollTo('faq')}
                  className="block transition hover:text-white"
                >
                  FAQ
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-bold">Compte</h3>
              <div className="mt-4 space-y-3 text-sm">
                <button
                  onClick={() => router.push('/login')}
                  className="block text-white/50 transition hover:text-white"
                >
                  Connexion
                </button>
                <button
                  onClick={() => router.push('/signup')}
                  className="block text-white/50 transition hover:text-white"
                >
                  Inscription
                </button>
                <button
                  onClick={() => router.push('/products')}
                  className="block text-white/50 transition hover:text-white"
                >
                  Produits
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-bold">Contact</h3>
              <div className="mt-4 space-y-4 text-sm text-white/50">
                <div className="flex items-center gap-3">
                  <Mail size={16} />
                  <span>support@torrenttwist.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone size={16} />
                  <span>Support client</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin size={16} />
                  <span>Cameroun</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
            <span>© 2026 TorrentTwist. Tous droits réservés.</span>
            <div className="flex items-center gap-2">
              <Heart size={13} className="text-rose-400" />
              <span>Made with care in Cameroon</span>
            </div>
          </div>
        </div>
      </footer>

      {/* STICKY MOBILE CTA */}
      <AnimatePresence>
        {showTopButton && !mobileAccountSheetOpen && !mobileMenuOpen && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-[110] border-t border-slate-200 bg-white/95 p-3 backdrop-blur-xl md:hidden"
          >
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/login')}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition active:scale-95"
              >
                <LogIn size={16} />
                Connexion
              </button>
              <button
                onClick={() => router.push('/signup')}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition active:scale-95"
              >
                <UserPlus size={16} />
                S'inscrire
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BACK TO TOP */}
      <AnimatePresence>
        {showTopButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() =>
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }
            className="fixed bottom-6 right-6 z-[120] hidden h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-2xl transition hover:-translate-y-1 active:scale-95 md:flex"
            aria-label="Retour en haut"
          >
            <ArrowUp size={18} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}