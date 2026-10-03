// components/home/BeforeAfterValue.tsx
'use client'

import { motion } from 'framer-motion'
import { X, Check, Sparkles, TrendingUp, Clock, Award } from 'lucide-react'

export default function BeforeAfterValue() {
  const comparisons = [
    {
      before: 'Chercher des ressources gratuitement pendant des heures',
      after: 'Accès instantané à des produits premium vérifiés',
    },
    {
      before: 'Risque de fichiers corrompus ou de virus',
      after: 'Fichiers vérifiés, sécurisés et garantis',
    },
    {
      before: 'Aucun support en cas de problème',
      after: 'Support client 24/7 qui répond en moins d\'1h',
    },
    {
      before: 'Perdre du temps à tout tester',
      after: 'Économisez des mois de recherche et de test',
    },
  ]

  return (
    <section className="mb-6 sm:mb-8 md:mb-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-3xl p-6 sm:p-8 border border-blue-100"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-blue-200 shadow-sm mb-3">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-700">POURQUOI NOUS CHOISIR</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Évitez les pièges, gagnez du temps
          </h2>
          <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
            La différence entre galérer des heures et réussir rapidement
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {comparisons.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition"
            >
              <div className="space-y-3">
                {/* Avant */}
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <X className="w-3.5 h-3.5 text-red-600" />
                  </div>
                  <p className="text-sm text-gray-500 line-through">{item.before}</p>
                </div>

                {/* Flèche */}
                <div className="flex justify-center">
                  <div className="w-px h-4 bg-gradient-to-b from-red-300 to-emerald-300" />
                </div>

                {/* Après */}
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">{item.after}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 3 stats d'impact */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 max-w-3xl mx-auto">
          {[
            { icon: Clock, value: '10h+', label: 'économisées par semaine', color: 'from-blue-500 to-indigo-500' },
            { icon: TrendingUp, value: '3x', label: 'plus de résultats', color: 'from-emerald-500 to-teal-500' },
            { icon: Award, value: '100%', label: 'de satisfaction', color: 'from-amber-500 to-orange-500' },
          ].map((stat, idx) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="text-center"
              >
                <div className={`w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg mb-2`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-black text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </section>
  )
}