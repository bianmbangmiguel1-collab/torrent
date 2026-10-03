// components/home/MoneyBackGuarantee.tsx
'use client'

import { motion } from 'framer-motion'
import { Shield, CheckCircle, Lock, Headphones, RefreshCw, Award } from 'lucide-react'

export default function MoneyBackGuarantee() {
  const guarantees = [
    {
      icon: Shield,
      title: 'Satisfait ou remboursé',
      description: '30 jours pour changer d\'avis, sans justification',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      icon: Lock,
      title: 'Paiement 100% sécurisé',
      description: 'SSL, 3D Secure, aucune donnée stockée',
      color: 'from-blue-500 to-indigo-500',
    },
    {
      icon: Headphones,
      title: 'Support 24/7',
      description: 'Une équipe humaine qui répond en moins d\'1h',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: RefreshCw,
      title: 'Mises à jour gratuites',
      description: 'Toutes les nouvelles versions sans frais',
      color: 'from-amber-500 to-orange-500',
    },
  ]

  return (
    <section className="mb-6 sm:mb-8 md:mb-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 sm:p-8 overflow-hidden"
      >
        {/* Décor */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>

        <div className="relative">
          {/* Badge principal */}
          <div className="text-center mb-6">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full shadow-2xl shadow-emerald-500/50 mb-4"
            >
              <Shield className="w-10 h-10 text-white" />
            </motion.div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Garantie satisfait ou remboursé
            </h2>
            <p className="text-gray-300 mt-2 max-w-2xl mx-auto">
              Nous sommes tellement sûrs de la qualité de nos produits que nous vous offrons <strong className="text-emerald-400">30 jours</strong> pour tester. Aucun risque pour vous.
            </p>
          </div>

          {/* 4 garanties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {guarantees.map((guarantee, idx) => {
              const Icon = guarantee.icon
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ y: -6, scale: 1.03 }}
                  className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10 hover:border-white/30 transition-all"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${guarantee.color} flex items-center justify-center mb-3 shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <h3 className="font-bold text-white text-sm">{guarantee.title}</h3>
                  </div>
                  <p className="text-xs text-gray-300">{guarantee.description}</p>
                </motion.div>
              )
            })}
          </div>

          {/* Badges de certification */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            {['PCI-DSS', 'SSL 256-bit', 'RGPD', 'Trustpilot'].map(badge => (
              <div key={badge} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
                <Award className="w-3 h-3 text-amber-400" />
                <span className="text-xs text-gray-300 font-medium">{badge}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  )
}