// components/product/BackToHomeButton.tsx
'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Home, Sparkles } from 'lucide-react'

export default function BackToHomeButton() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <Link
        href="/avant"
        className="group inline-flex items-center gap-2 px-4 py-2.5 bg-white/90 backdrop-blur-sm hover:bg-white border-2 border-slate-200 hover:border-blue-400 text-slate-700 hover:text-blue-600 rounded-xl font-semibold shadow-sm hover:shadow-lg transition-all relative overflow-hidden"
      >
        {/* Effet shimmer */}
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4 }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-200/30 to-transparent skew-x-12"
        />

        <motion.div
          animate={{ x: [0, -4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="relative z-10"
        >
          <ArrowLeft className="w-4 h-4" />
        </motion.div>

        <span className="relative z-10 text-sm">Retour à l'accueil</span>

        <Home className="w-4 h-4 relative z-10 opacity-70 group-hover:opacity-100 transition" />

        {/* Point animé */}
        <motion.span
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-400 rounded-full"
        />
      </Link>
    </motion.div>
  )
}