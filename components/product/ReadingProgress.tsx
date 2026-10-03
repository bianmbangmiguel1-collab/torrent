// components/product/ReadingProgress.tsx
'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export default function ReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
      setProgress(Math.min(scrollPercent, 100))
    }

    window.addEventListener('scroll', updateProgress, { passive: true })
    updateProgress()

    return () => window.removeEventListener('scroll', updateProgress)
  }, [])

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-1 bg-slate-200/50 backdrop-blur-sm">
      <motion.div
        className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 origin-left"
        style={{ scaleX: progress / 100 }}
        initial={{ scaleX: 0 }}
        transition={{ duration: 0.1 }}
      />
      {/* Indicateur de pourcentage flottant */}
      {progress > 5 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-2 right-4 px-2 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold rounded-full shadow-lg"
        >
          {Math.round(progress)}%
        </motion.div>
      )}
    </div>
  )
}