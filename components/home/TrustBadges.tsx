// components/home/TrustBadges.tsx
'use client'

import { motion } from 'framer-motion'
import { Shield, Users, Star, Zap, Lock, Award } from 'lucide-react'

interface Props {
  orders?: number
  users?: number
  rating?: number
}

export default function TrustBadges({ orders = 0, users = 0, rating = 0 }: Props) {
  const badges = [
    {
      icon: Shield,
      label: 'Paiement 100% sécurisé',
      sublabel: 'SSL + PCI-DSS',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      icon: Zap,
      label: 'Livraison instantanée',
      sublabel: 'Accès immédiat',
      color: 'from-blue-500 to-indigo-500',
    },
    {
      icon: Users,
      label: `${users > 0 ? users.toLocaleString('fr-FR') + '+' : 'Des milliers'} de clients`,
      sublabel: 'Nous font confiance',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Star,
      label: rating > 0 ? `${rating.toFixed(1)}/5 étoiles` : 'Avis 5 étoiles',
      sublabel: `${orders > 0 ? orders.toLocaleString('fr-FR') + '+' : 'Des'} commandes traitées`,
      color: 'from-amber-500 to-orange-500',
    },
  ]

  return (
    <section className="mb-6 sm:mb-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {badges.map((badge, idx) => {
          const Icon = badge.icon
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 flex items-center gap-3 hover:shadow-lg transition-all duration-300"
            >
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${badge.color} flex items-center justify-center flex-shrink-0 shadow-md`}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">{badge.label}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">{badge.sublabel}</p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}