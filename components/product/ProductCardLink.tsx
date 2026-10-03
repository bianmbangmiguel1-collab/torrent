// components/product/ProductCardLink.tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

interface Props {
  href: string
  children: ReactNode
  className?: string
  /** Délai avant de considérer que le chargement est trop long (ms) */
  timeoutMs?: number
}

export default function ProductCardLink({
  href,
  children,
  className = '',
  timeoutMs = 8000,
}: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  // Reset quand la navigation est terminée
  useEffect(() => {
    setPending(false)
  }, [href])

  // Timeout de sécurité : si la navigation prend trop longtemps, on arrête le loader
  useEffect(() => {
    if (!pending) return
    const t = setTimeout(() => setPending(false), timeoutMs)
    return () => clearTimeout(t)
  }, [pending, timeoutMs])

  function handleClick(e: React.MouseEvent) {
    // Ignore les clics avec modificateurs (ouvrir dans un nouvel onglet)
    if (e.metaKey || e.ctrlKey || e.shiftKey) return
    if (href.startsWith('http')) return

    setPending(true)
  }

  return (
    <Link
      href={href}
      prefetch
      onClick={handleClick}
      className={`relative block ${className}`}
    >
      {/* Contenu de la carte */}
      <div
        className={`transition-opacity duration-200 ${pending ? 'opacity-50' : 'opacity-100'}`}
      >
        {children}
      </div>

      {/* Overlay de chargement */}
      {pending && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-2xl z-20 pointer-events-none"
        >
          <div className="flex flex-col items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
              className="w-9 h-9 rounded-full border-[3px] border-indigo-100 border-t-indigo-600"
            />
            <span className="text-xs font-medium text-slate-700">
              Chargement…
            </span>
          </div>
        </motion.div>
      )}
    </Link>
  )
}