// components/home/LiveActivity.tsx
'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, Users, ShoppingBag, TrendingUp } from 'lucide-react'

export default function LiveActivity() {
  const [viewers, setViewers] = useState(127)
  const [buyers, setBuyers] = useState(23)

  useEffect(() => {
    // Simuler une activité qui fluctue
    const interval = setInterval(() => {
      setViewers(v => Math.max(80, v + Math.floor(Math.random() * 10 - 5)))
      setBuyers(b => Math.max(10, b + Math.floor(Math.random() * 3 - 1)))
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 sm:mb-8"
    >
      <div className="bg-gradient-to-r from-emerald-50 via-white to-blue-50 rounded-2xl border border-emerald-100 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 bg-emerald-500 rounded-full"
            />
            <Eye className="w-4 h-4 text-emerald-600" />
            <span className="text-gray-700">
              <strong className="text-emerald-700 font-bold tabular-nums">{viewers}</strong> personnes regardent
            </span>
          </div>

          <div className="hidden sm:block w-px h-5 bg-gray-200" />

          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-blue-600" />
            <span className="text-gray-700">
              <strong className="text-blue-700 font-bold tabular-nums">{buyers}</strong> achats aujourd'hui
            </span>
          </div>

          <div className="hidden sm:block w-px h-5 bg-gray-200" />

          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span className="text-gray-700">
              Activité <strong className="text-purple-700 font-bold">élevée</strong>
            </span>
          </div>
        </div>
      </div>
    </motion.section>
  )
}