// components/product/ProductHero.tsx
'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star, BadgeCheck, TrendingUp, Eye, Clock, Zap, ShieldCheck,
  Download, Lock, Headphones, Sparkles, Heart, Share2, Award, Crown,
  Flame, Gift, CheckCircle2, Timer, Package, ShoppingCart, Users,
  ThumbsUp, Trophy, Rocket, ChevronRight,
} from 'lucide-react'

// 🆕 UN SEUL bouton, qui redirige vers /checkout
import ProductBuyButton from '@/components/ProductBuyButton'

interface ProductHeroProps {
  product: {
    id: number
    title: string
    slug: string
    price: number
    compare_price: number | null
    description: string | null
    image_url: string | null
    image_alt: string | null
    category_name: string | null
    stock: number
    sales: number
    avg_rating: number
    total_reviews: number
    author_name?: string
    author?: string
    author_avatar?: string
  }
}

const FAKE_NAMES = [
  'Marie L.', 'Jean P.', 'Sophie D.', 'Ahmed K.', 'Fatou N.',
  'Paul M.', 'Aïcha B.', 'Karim R.', 'Linda T.', 'David K.',
  'Aminata S.', 'Moussa D.', 'Grace T.', 'Ibrahim C.', 'Yvonne N.',
  'Samuel B.', 'Nadia M.', 'Emmanuel K.', 'Rokia B.', 'Patrick O.',
  'Christelle A.', 'Youssef B.', 'Sylvie N.', 'Hassan A.', 'Brigitte T.',
  'Omar S.', 'Céline M.', 'Adama D.', 'Estelle K.', 'Boubacar N.',
  'Josiane T.', 'Souleymane B.', 'Nadège F.', 'Mamadou D.', 'Aurélie K.',
  'Idrissa S.', 'Sandrine M.', 'Ousmane B.', 'Vanessa T.', 'Alioune D.',
  'Rachelle N.', 'Bakary S.', 'Prisca M.', 'Cheikh D.', 'Léonie K.',
  'Modibo S.', 'Chantal T.', 'Ismaël B.', 'Solange D.', 'Abdoulaye N.',
]

export default function ProductHero({ product }: ProductHeroProps) {
  const [viewers, setViewers] = useState(0)
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 })
  const [recentBuyers, setRecentBuyers] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [currentBuyer, setCurrentBuyer] = useState<string | null>(null)
  const [showBuyerToast, setShowBuyerToast] = useState(false)

  useEffect(() => {
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)
    const updateTimer = () => {
      const diff = endOfDay.getTime() - Date.now()
      if (diff <= 0) return
      setTimeLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
    }
    updateTimer()
    const timer = setInterval(updateTimer, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    setViewers(Math.floor(Math.random() * 30) + 15)
    setRecentBuyers(Math.floor(Math.random() * 8) + 3)
    const interval = setInterval(() => {
      setViewers(v => Math.max(8, v + Math.floor(Math.random() * 6 - 3)))
      setRecentBuyers(b => Math.max(2, b + Math.floor(Math.random() * 2 - 1)))
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const showBuyer = () => {
      const randomName = FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)]
      setCurrentBuyer(randomName)
      setShowBuyerToast(true)
      setTimeout(() => setShowBuyerToast(false), 5000)
    }
    const initialTimer = setTimeout(showBuyer, 6000)
    const interval = setInterval(showBuyer, 15000)
    return () => {
      clearTimeout(initialTimer)
      clearInterval(interval)
    }
  }, [])

  const discount = product.compare_price
    ? Math.round((1 - product.price / product.compare_price) * 100)
    : 0
  const savings = product.compare_price
    ? product.compare_price - product.price
    : 0
  const imageUrl = product.image_url || '/images/fallback-product.PNG'
  const stockLeft = Math.max(3, Math.floor(product.stock || 30))
  const stockPercent = Math.max(5, Math.min(95, (stockLeft / 50) * 100))
  const trustScore = product.avg_rating >= 4.5 ? 'Excellent' :
                     product.avg_rating >= 4 ? 'Très bien' :
                     product.avg_rating >= 3 ? 'Bien' : 'Nouveau'

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      {/* TOAST */}
      <AnimatePresence>
        {showBuyerToast && currentBuyer && (
          <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className="fixed top-24 right-4 z-50 bg-white rounded-2xl shadow-2xl border border-emerald-100 p-3 max-w-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {currentBuyer.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">
                  <strong className="text-gray-900">{currentBuyer}</strong> vient d'acheter
                </p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {product.title}
                </p>
                <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                  ✅ Paiement validé · Il y a quelques secondes
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT - IMAGE */}
      <div className="relative">
        {discount > 0 && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="absolute left-5 top-5 z-10 flex items-center gap-2 rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-red-500/30"
          >
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Flame className="h-4 w-4" />
            </motion.div>
            -{discount}% OFF
          </motion.div>
        )}

        <div className="absolute right-5 top-5 z-10">
          <div className="flex items-center gap-2 rounded-full bg-white/95 backdrop-blur px-3 py-1.5 shadow-lg border border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-emerald-700">30j garantis</span>
          </div>
        </div>

        <div className="group relative aspect-square overflow-hidden rounded-[32px] border border-white/50 bg-white shadow-2xl shadow-blue-500/10">
          <Image
            src={imageUrl}
            alt={product.image_alt || product.title}
            fill
            priority
            className="object-cover transition duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute bottom-6 left-6 right-6 flex items-center gap-2 text-white">
              <BadgeCheck className="h-5 w-5 text-emerald-400" />
              <span className="text-sm font-medium">Produit numérique certifié</span>
            </div>
          </div>

          <div className="absolute top-5 right-5 flex gap-2 mt-12">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsLiked(!isLiked)}
              className="p-2.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition"
            >
              <Heart className={`w-5 h-5 transition ${isLiked ? 'fill-red-500 text-red-500' : 'text-slate-600'}`} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition"
            >
              <Share2 className="w-5 h-5 text-slate-600" />
            </motion.button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center justify-center gap-4 text-sm bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-3 border border-red-100"
        >
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2 h-2 bg-red-500 rounded-full"
            />
            <Eye className="w-4 h-4 text-red-500" />
            <span className="text-gray-700">
              <strong className="text-red-600">{viewers}</strong> personnes regardent
            </span>
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-500" />
            <span className="text-gray-700">
              <strong className="text-emerald-600">{recentBuyers}</strong> achetés aujourd'hui
            </span>
          </div>
        </motion.div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { icon: Download, label: 'Téléchargement', sub: 'Instantané', color: 'blue' },
            { icon: ShieldCheck, label: 'Paiement', sub: 'Sécurisé', color: 'emerald' },
            { icon: Clock, label: 'Accès', sub: 'À vie', color: 'violet' },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + idx * 0.1 }}
              className="group rounded-2xl border border-slate-200/50 bg-white/80 backdrop-blur-sm p-4 text-center shadow-sm hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <item.icon className={`mx-auto mb-2 h-5 w-5 text-${item.color}-500 transition group-hover:scale-110`} />
              <p className="text-xs font-semibold text-slate-700">{item.label}</p>
              <p className="mt-1 text-[10px] text-slate-400">{item.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* RIGHT - DETAILS */}
      <div className="flex flex-col justify-center">
        {product.category_name && (
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <span className="inline-flex rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-blue-600 border border-blue-100">
              {product.category_name}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              <BadgeCheck className="w-3 h-3" />
              En stock
            </span>
            {product.sales > 50 && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                <Crown className="w-3 h-3" />
                Best-seller
              </span>
            )}
          </div>
        )}

        <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
          {product.title}
        </h1>

        <div className="mt-5 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`h-4 w-4 ${i < Math.round(product.avg_rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-amber-200'}`} />
            ))}
            <span className="ml-1 text-sm font-medium text-slate-600">
              {product.avg_rating?.toFixed(1) || 0}
            </span>
          </div>
          <span className="text-sm text-slate-400">•</span>
          <Link href="#reviews" className="text-sm text-slate-500 hover:text-blue-600 hover:underline">
            {product.total_reviews || 0} avis
          </Link>
          <span className="text-sm text-slate-400">•</span>
          <span className="text-sm text-slate-500 flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <strong>{product.sales || 0}</strong> vendus
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-full border border-emerald-200">
            <Trophy className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-700">{trustScore}</span>
          </div>
          <span className="text-xs text-slate-400">
            Basé sur {product.total_reviews || 0} avis vérifiés
          </span>
        </div>

        {(product.author_name || product.author) && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mt-4 flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm overflow-hidden">
              {product.author_avatar ? (
                <Image
                  src={product.author_avatar}
                  alt={product.author_name || product.author || 'Auteur'}
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                />
              ) : (
                <Award className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Créé par {product.author_name || product.author}
              </p>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <BadgeCheck className="w-3 h-3 text-blue-500" />
                Vérifié par TorrentTwist
              </p>
            </div>
          </motion.div>
        )}

        <div className="mt-4 rounded-2xl border border-slate-200/50 bg-white/80 backdrop-blur-sm p-5 shadow-sm">
          <p className="text-base leading-7 text-slate-600">
            {product.description
              ?.replace(/<[^>]*>/g, '')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 280)}
            {product.description && product.description.replace(/<[^>]*>/g, '').length > 280 && '...'}
          </p>
        </div>

        {stockLeft < 30 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-gradient-to-r from-amber-50 to-red-50 rounded-xl p-4 border border-amber-200"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Flame className="w-4 h-4 text-red-500" />
                </motion.div>
                <span className="text-sm font-bold text-red-700">
                  Plus que {stockLeft} en stock !
                </span>
              </div>
              <span className="text-xs text-red-600 font-medium">Stock limité</span>
            </div>
            <div className="h-2 bg-red-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stockPercent}%` }}
                transition={{ duration: 1.5 }}
                className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
              />
            </div>
          </motion.div>
        )}

        {discount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 rounded-2xl p-4 text-white shadow-lg"
          >
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5" />
                <span className="font-bold text-sm">Offre expire dans</span>
              </div>
              <div className="flex items-center gap-1">
                {[
                  { label: 'H', value: timeLeft.h },
                  { label: 'MIN', value: timeLeft.m },
                  { label: 'SEC', value: timeLeft.s },
                ].map((t, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="bg-white text-red-700 rounded-lg px-2 py-1 min-w-[36px] text-center">
                      <div className="text-lg font-black tabular-nums leading-none">
                        {String(t.value).padStart(2, '0')}
                      </div>
                      <div className="text-[8px] font-bold opacity-70">{t.label}</div>
                    </div>
                    {i < 2 && <span className="font-black text-xl">:</span>}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* PRIX */}
        <div className="mt-6">
          <div className="flex flex-wrap items-end gap-4">
            <span className="text-4xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent sm:text-5xl">
              {product.price.toLocaleString('fr-FR')} FCFA
            </span>
            {product.compare_price && product.compare_price > product.price && (
              <span className="pb-1 text-xl font-medium text-slate-400 line-through">
                {product.compare_price.toLocaleString('fr-FR')} FCFA
              </span>
            )}
          </div>
          {discount > 0 && (
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mt-2 text-sm font-semibold text-emerald-600 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Économisez {savings.toLocaleString('fr-FR')} FCFA ({discount}% de réduction)
            </motion.p>
          )}
        </div>

        {/* INCLUS */}
        <div className="mt-4 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-800">Inclus gratuitement :</span>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-emerald-700">
            <li className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Mises à jour à vie
            </li>
            <li className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Support 24/7
            </li>
            <li className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Licence personnelle
            </li>
            <li className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Accès communauté
            </li>
          </ul>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            🆕 CTA UNIQUE — ProductBuyButton
            Redirige vers /checkout?orderId=X
        ═══════════════════════════════════════════════════════════ */}
        <div className="mt-6 space-y-3">
          <ProductBuyButton
            productId={product.id}
            price={product.price}
            comparePrice={product.compare_price}
            label="Acheter maintenant"
            variant="primary"
          />

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-emerald-500" />
              Paiement sécurisé
            </span>
            <span className="flex items-center gap-1.5">
              <Download className="w-4 h-4 text-blue-500" />
              Livraison instantanée
            </span>
            <span className="flex items-center gap-1.5">
              <Headphones className="w-4 h-4 text-purple-500" />
              Support 24/7
            </span>
          </div>
        </div>

        {/* GARANTIES */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            { icon: ShieldCheck, label: 'Satisfait ou remboursé', sub: '30 jours pour changer d\'avis', color: 'emerald' },
            { icon: Zap, label: 'Accès immédiat', sub: 'Téléchargement instantané', color: 'blue' },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + idx * 0.1 }}
              whileHover={{ y: -3 }}
              className="flex items-center gap-3 rounded-xl bg-white/80 backdrop-blur-sm p-3 border border-slate-200/50 hover:shadow-md transition"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-${item.color}-50`}>
                <item.icon className={`h-5 w-5 text-${item.color}-600`} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{item.label}</p>
                <p className="text-xs text-slate-400">{item.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}