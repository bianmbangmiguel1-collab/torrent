// components/product/ValueProposition.tsx
'use client'

import { motion } from 'framer-motion'
import { Rocket, Target, TrendingUp, CheckCircle2, ArrowRight, Sparkles, Trophy, Zap } from 'lucide-react'

interface ValuePropositionProps {
  productTitle: string
  productType?: string
}

export default function ValueProposition({ productTitle, productType = 'file' }: ValuePropositionProps) {
  // 🎯 Protocole 9 : VISUALISATION (projection dans 30 jours)
  const transformations = [
    {
      icon: Target,
      before: 'Vous cherchez des ressources fiables pendant des heures',
      after: `Vous avez ${productTitle} prêt à l'emploi, structuré et vérifié`,
    },
    {
      icon: Rocket,
      before: 'Vous perdez du temps à tout tester vous-même',
      after: 'Vous appliquez immédiatement ce qui fonctionne déjà',
    },
    {
      icon: TrendingUp,
      before: 'Vous doutez de la qualité',
      after: 'Vous obtenez des résultats concrets dès les premières semaines',
    },
    {
      icon: Trophy,
      before: 'Vous êtes seul face à vos défis',
      after: 'Vous rejoignez une communauté et un support 24/7',
    },
  ]

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="my-16"
    >
      <div className="text-center mb-10">
        <motion.div
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full border border-blue-100 mb-4"
        >
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
            Ce que vous obtiendrez
          </span>
        </motion.div>
        <h2 className="text-3xl sm:text-4xl font-black text-slate-950">
          Imaginez-vous dans 30 jours
        </h2>
        <p className="mt-3 text-lg text-slate-600 max-w-2xl mx-auto">
          Voici la transformation que <strong className="text-blue-600">{productTitle}</strong> va vous apporter
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {transformations.map((item, idx) => {
          const Icon = item.icon
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -6, scale: 1.02 }}
              className="bg-white rounded-2xl border border-slate-200/50 p-6 shadow-sm hover:shadow-xl transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-red-500" />
              </div>

              {/* Avant */}
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-wide text-red-500 mb-2">
                  ❌ Avant
                </p>
                <p className="text-sm text-slate-500 line-through">{item.before}</p>
              </div>

              {/* Flèche */}
              <motion.div
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex justify-center my-3"
              >
                <ArrowRight className="w-5 h-5 text-emerald-500 rotate-90" />
              </motion.div>

              {/* Après */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-600 mb-2">
                  ✅ Après
                </p>
                <p className="text-sm font-medium text-slate-800 leading-relaxed">{item.after}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* CTA intermédiaire */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-10 text-center"
      >
        <a
          href="#buy-buttons"
          className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:-translate-y-1 transition"
        >
          <Zap className="w-5 h-5" />
          Je veux cette transformation
          <ArrowRight className="w-5 h-5" />
        </a>
        <p className="text-xs text-slate-500 mt-3">
          <CheckCircle2 className="w-3 h-3 inline mr-1 text-emerald-500" />
          Satisfait ou remboursé pendant 30 jours
        </p>
      </motion.div>
    </motion.section>
  )
}