// components/product/SkillsProgress.tsx
'use client'

import { motion } from 'framer-motion'
import { Target, TrendingUp, Zap, CheckCircle2, Award, Rocket, BookOpen } from 'lucide-react'

interface Skill {
  name: string
  level: number // 0-100
  color: 'blue' | 'emerald' | 'purple' | 'amber' | 'rose'
}

interface SkillsProgressProps {
  productTitle: string
}

export default function SkillsProgress({ productTitle }: SkillsProgressProps) {
  // 🎯 Compétences que l'utilisateur va maîtriser
  const skills: Skill[] = [
    { name: 'Compréhension des fondamentaux', level: 95, color: 'blue' },
    { name: 'Application pratique', level: 85, color: 'emerald' },
    { name: 'Techniques avancées', level: 70, color: 'purple' },
    { name: 'Résolution de problèmes', level: 80, color: 'amber' },
    { name: 'Maîtrise complète', level: 60, color: 'rose' },
  ]

  const colorMap = {
    blue: 'from-blue-500 to-blue-600',
    emerald: 'from-emerald-500 to-teal-600',
    purple: 'from-purple-500 to-pink-600',
    amber: 'from-amber-500 to-orange-600',
    rose: 'from-rose-500 to-red-600',
  }

  const bgColorMap = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-16"
    >
      <div className="bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 rounded-[30px] border border-slate-200/50 p-6 sm:p-10 shadow-sm">
        {/* En-tête */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-full border border-emerald-200 mb-4"
          >
            <Target className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Votre progression
            </span>
          </motion.div>

          <h2 className="text-3xl sm:text-4xl font-black text-slate-950">
            Ce que vous allez maîtriser
          </h2>
          <p className="mt-3 text-lg text-slate-600 max-w-2xl mx-auto">
            Voici les compétences que vous développerez avec{' '}
            <strong className="text-blue-600">{productTitle}</strong>
          </p>
        </div>

        {/* Liste des compétences */}
        <div className="max-w-3xl mx-auto space-y-4">
          {skills.map((skill, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-2xl p-4 border border-slate-200/50 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl ${bgColorMap[skill.color].split(' ')[0]} flex items-center justify-center`}>
                    <CheckCircle2 className={`w-4 h-4 ${bgColorMap[skill.color].split(' ')[1]}`} />
                  </div>
                  <span className="font-semibold text-slate-800">{skill.name}</span>
                </div>
                <span className={`text-sm font-bold px-2.5 py-1 rounded-full border ${bgColorMap[skill.color]}`}>
                  {skill.level}%
                </span>
              </div>

              {/* Barre de progression animée */}
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${skill.level}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, delay: idx * 0.15, ease: 'easeOut' }}
                  className={`h-full bg-gradient-to-r ${colorMap[skill.color]} rounded-full relative`}
                >
                  {/* Effet de brillance */}
                  <motion.div
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  />
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats d'impact */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {[
            { icon: Rocket, value: '10x', label: 'Plus rapide', color: 'blue' },
            { icon: TrendingUp, value: '3x', label: 'Plus de résultats', color: 'emerald' },
            { icon: Award, value: '100%', label: 'De satisfaction', color: 'amber' },
          ].map((stat, idx) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15 }}
                whileHover={{ y: -6, scale: 1.03 }}
                className="bg-white rounded-2xl p-5 text-center border border-slate-200/50 shadow-sm hover:shadow-lg transition"
              >
                <div className={`w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br ${
                  stat.color === 'blue' ? 'from-blue-500 to-indigo-600' :
                  stat.color === 'emerald' ? 'from-emerald-500 to-teal-600' :
                  'from-amber-500 to-orange-600'
                } flex items-center justify-center mb-3 shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-black text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-600 mt-1">{stat.label}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </motion.section>
  )
}