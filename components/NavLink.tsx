'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

interface NavLinkProps {
  href: string
  children: ReactNode
  className?: string
  activeClassName?: string
  showSpinner?: boolean
  onClick?: () => void
}

export default function NavLink({
  href,
  children,
  className = '',
  activeClassName = '',
  showSpinner = true,
  onClick,
}: NavLinkProps) {
  const pathname = usePathname()
  const [pending, setPending] = useState(false)

  // Reset quand la route change (navigation terminée)
  useEffect(() => {
    setPending(false)
  }, [pathname])

  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      onClick={() => {
        if (pathname !== href) setPending(true)
        onClick?.()
      }}
      className={`relative transition-all duration-200 ${
        isActive ? activeClassName || 'text-indigo-600 font-medium' : ''
      } ${className}`}
    >
      <motion.span
        className="flex items-center gap-2"
        animate={{
          opacity: pending ? 0.5 : 1,
          scale: pending ? 0.98 : 1,
        }}
        transition={{ duration: 0.15 }}
      >
        {pending && showSpinner && (
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
          >
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
          </motion.span>
        )}
        {children}
      </motion.span>

      {/* Indicateur actif sous le lien */}
      {isActive && (
        <motion.span
          layoutId="nav-active-underline"
          className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </Link>
  )
}