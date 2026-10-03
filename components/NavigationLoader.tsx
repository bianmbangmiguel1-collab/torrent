'use client'
import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

export default function NavigationLoader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  // Quand l'URL change → nouvelle page chargée → on cache
  useEffect(() => {
    setLoading(false)
    setProgress(100)
    const t = setTimeout(() => setProgress(0), 300)
    return () => clearTimeout(t)
  }, [pathname, searchParams])

  // Écoute les clics sur les liens internes
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest('a')
      if (!target) return

      const href = target.getAttribute('href')
      if (!href) return
      if (href.startsWith('http')) return
      if (href.startsWith('#')) return
      if (target.getAttribute('target') === '_blank') return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return

      // Même page → rien
      if (href === pathname) return

      setLoading(true)
      setProgress(0)
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [pathname])

  // Animation de progression simulée (0 → 90% pendant le chargement)
  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev
        // Ralentit progressivement
        const increment = (90 - prev) * 0.1
        return Math.min(prev + increment, 90)
      })
    }, 100)
    return () => clearInterval(interval)
  }, [loading])

  return (
    <AnimatePresence>
      {(loading || progress > 0) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-0 left-0 right-0 h-1 z-[9999] pointer-events-none"
        >
          {/* Barre de fond */}
          <div className="absolute inset-0 bg-indigo-100/30" />

          {/* Barre de progression */}
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-lg"
            style={{ boxShadow: '0 0 10px rgba(139, 92, 246, 0.6)' }}
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />

          {/* Point lumineux au bout */}
          {loading && (
            <motion.div
              className="absolute top-0 h-1 w-20 bg-gradient-to-r from-transparent to-white/80"
              style={{ left: `${Math.max(0, progress - 5)}%` }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}