// components/AppHeader.tsx
'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { useUser } from '@/context/UserContext'
import {
  Menu,
  X,
  Search,
  ChevronDown,
  LogOut,
  Home,
  BarChart,
  ShoppingBag,
  Heart,
  Bell,
  Settings,
  Shield,
  FileText,
  Users,
  MessageCircle,
  Loader2,
} from 'lucide-react'

// ============================================================
// LIENS DE NAVIGATION
// ============================================================
const NAV_LINKS = [
  { icon: Home, label: 'Accueil', href: '/avant' },
  { icon: BarChart, label: 'Dashboard', href: '/dashboard' },
  { icon: ShoppingBag, label: 'Commandes', href: '/orders' },
  { icon: Heart, label: 'Favoris', href: '/favorites' },
  { icon: Bell, label: 'Notifications', href: '/notifications' },
  { icon: Settings, label: 'Paramètres', href: '/settings' },
  { icon: Shield, label: 'Sécurité', href: '/security' },
  { icon: FileText, label: 'Factures', href: '/invoices' },
  { icon: Users, label: 'Parrainage', href: '/referral' },
  { icon: MessageCircle, label: 'Support', href: '/support' },
]

export default function AppHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useUser()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // 🆕 États d'animation
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  // ─── Reset au changement de page ───
  useEffect(() => {
    setPendingHref(null)
    setLoading(false)
    setProgress(100)
    const t = setTimeout(() => setProgress(0), 300)
    return () => clearTimeout(t)
  }, [pathname])

  // ─── Animation de la barre de progression ───
  useEffect(() => {
    if (!loading) return
    setProgress(8)
    const interval = setInterval(() => {
      setProgress(prev => (prev >= 90 ? prev : Math.min(prev + (90 - prev) * 0.12, 90)))
    }, 100)
    return () => clearInterval(interval)
  }, [loading])

  // ─── Recherche ───
  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (searchQuery.trim()) {
        router.push(`/products?search=${encodeURIComponent(searchQuery)}`)
      }
    },
    [searchQuery, router]
  )

  // ─── Salutation ───
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bonjour'
    if (hour < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }, [])

  // ─── Avatar ───
  const displayAvatar = user?.avatar || null
  const userName = useMemo(() => user?.name?.split(' ')[0] || 'Utilisateur', [user?.name])
  const avatarLetter = useMemo(() => user?.name?.charAt(0) || 'U', [user?.name])

  // ─── Navigation animée ───
  const handleNavigation = useCallback(
    (href: string) => {
      setMobileMenuOpen(false)
      if (href === pathname) return
      setPendingHref(href)
      setLoading(true)
      router.push(href)
    },
    [router, pathname]
  )

  // ─── Logout ───
  const handleLogout = useCallback(async () => {
    setLoading(true)
    await logout()
  }, [logout])

  const isActive = useCallback(
    (href: string) => pathname === href || pathname.startsWith(href + '/'),
    [pathname]
  )

  return (
    <>
      {/* ═══════════ BARRE DE PROGRESSION EN HAUT ═══════════ */}
      {(loading || progress > 0) && (
        <div className="fixed top-0 left-0 right-0 h-[3px] bg-blue-100/30 z-[9999] pointer-events-none">
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 transition-[width] duration-300 ease-out"
            style={{
              width: `${progress}%`,
              boxShadow: '0 0 10px rgba(139, 92, 246, 0.7)',
            }}
          />
          {loading && (
            <div
              className="absolute top-0 h-[3px] w-20 bg-gradient-to-r from-transparent to-white/90 animate-pulse"
              style={{ left: `${Math.max(0, progress - 5)}%` }}
            />
          )}
        </div>
      )}

      {/* ═══════════ NAV PRINCIPALE ═══════════ */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">

        {/* ───── LIGNE DU HAUT : Logo | Search | User ───── */}
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-5 max-sm:px-4 max-sm:py-2.5">

          {/* ── GAUCHE ── */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Burger (mobile) */}
            <button
              className="hidden max-md:block bg-transparent border-none text-[#1a1a2e] cursor-pointer p-1 transition-transform hover:scale-110"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu size={24} />
            </button>

            {/* Logo */}
            <a href="/" className="flex items-center gap-2.5 no-underline group">
              <div className="w-9 h-9 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-110">
                <Image
                  src="/torrent-icon.png"
                  alt="TorrentTwist"
                  width={36}
                  height={36}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              <span className="text-xl font-bold text-[#1a1a2e] tracking-tight max-sm:text-base">
                TorrentTwist
              </span>
            </a>
          </div>

          {/* ── CENTRE : Recherche ── */}
          <div className="flex-1 max-w-[600px] max-md:hidden">
            <form
              onSubmit={handleSearch}
              className="flex items-center bg-slate-100 rounded-xl overflow-hidden border-2 border-transparent transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(37,99,235,0.04)]"
            >
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2.5 border-none bg-transparent outline-none text-sm text-[#1a1a2e] placeholder:text-slate-400"
                aria-label="Rechercher"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-transparent border-none text-slate-500 cursor-pointer transition-all hover:text-blue-600 hover:scale-110"
                aria-label="Lancer la recherche"
              >
                <Search size={20} />
              </button>
            </form>
          </div>

          {/* ── DROITE : User + Logout ── */}
          <div className="flex items-center gap-3 shrink-0">
            <div
              className="flex items-center gap-2.5 cursor-pointer pl-1.5 pr-3 py-1.5 rounded-xl transition-all hover:bg-slate-100 hover:-translate-y-px group"
              onClick={() => handleNavigation('/profile')}
            >
              <div
                className={`w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-500 flex items-center justify-center text-white text-sm font-semibold overflow-hidden shrink-0 transition-transform group-hover:scale-105 ${
                  pendingHref === '/profile' ? 'animate-[avatar-pulse_1.2s_ease-in-out_infinite]' : ''
                }`}
              >
                {displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt={user?.name || 'Avatar'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  avatarLetter
                )}
              </div>

              <div className="flex flex-col leading-tight max-md:hidden">
                <span className="text-[11px] text-slate-400 font-normal">{greeting},</span>
                <span className="text-sm font-semibold text-[#1a1a2e]">{userName}</span>
              </div>

              <ChevronDown
                size={16}
                className="text-slate-400 transition-transform duration-300 group-hover:translate-y-0.5 max-md:hidden"
              />
            </div>

            <button
              className="p-2 bg-transparent border-none text-slate-400 cursor-pointer rounded-lg transition-all hover:bg-red-100 hover:text-red-500 hover:scale-105 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center"
              onClick={handleLogout}
              aria-label="Déconnexion"
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <LogOut size={20} />
              )}
            </button>
          </div>
        </div>

        {/* ───── SOUS-NAVIGATION ───── */}
        <div className="border-t border-slate-100 px-6 max-md:hidden">
          <div className="max-w-7xl mx-auto flex gap-1 overflow-x-auto py-1.5 [&::-webkit-scrollbar]:hidden">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href)
              const pending = pendingHref === link.href
              const Icon = link.icon

              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap cursor-pointer transition-all duration-200 no-underline ${
                    active
                      ? 'text-blue-600 bg-blue-50 font-semibold'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-blue-600 hover:-translate-y-px'
                  } ${pending ? 'opacity-70 pointer-events-none' : ''}`}
                  onClick={(e) => {
                    e.preventDefault()
                    handleNavigation(link.href)
                  }}
                >
                  {pending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Icon size={16} />
                  )}
                  <span>{link.label}</span>

                  {active && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600 animate-[dot-pop_0.3s_ease-out]" />
                  )}
                </a>
              )
            })}
          </div>
        </div>
      </nav>

      {/* ═══════════ MENU MOBILE ═══════════ */}
      <div
        className={`fixed top-0 left-0 w-[300px] h-screen bg-white z-[101] p-6 overflow-y-auto shadow-[4px_0_24px_rgba(0,0,0,0.08)] transition-transform duration-300 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header mobile */}
        <div className="flex justify-between items-start pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-indigo-500 flex items-center justify-center text-white text-lg font-semibold overflow-hidden shrink-0">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={user?.name || 'Avatar'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                avatarLetter
              )}
            </div>
            <div>
              <span className="block font-semibold text-[#1a1a2e]">{user?.name || 'Utilisateur'}</span>
              <span className="block text-[13px] text-slate-400">{user?.email}</span>
            </div>
          </div>
          <button
            className="bg-transparent border-none text-slate-400 cursor-pointer p-1 transition-transform duration-300 hover:rotate-90 hover:text-[#1a1a2e]"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fermer le menu"
          >
            <X size={24} />
          </button>
        </div>

        {/* Liens mobile */}
        <div className="pt-4 flex flex-col gap-1">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href)
            const pending = pendingHref === link.href
            const Icon = link.icon

            return (
              <a
                key={link.href}
                href={link.href}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-[10px] text-[15px] font-medium cursor-pointer transition-all duration-200 no-underline ${
                  active
                    ? 'bg-blue-50 text-blue-600 font-semibold'
                    : 'text-[#1a1a2e] hover:bg-slate-100 hover:translate-x-1'
                } ${pending ? 'opacity-70 pointer-events-none' : ''}`}
                onClick={(e) => {
                  e.preventDefault()
                  handleNavigation(link.href)
                }}
              >
                {pending ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Icon size={20} />
                )}
                <span>{link.label}</span>

                {active && (
                  <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-blue-600 animate-[dot-pop_0.3s_ease-out]" />
                )}
              </a>
            )
          })}

          <button
            className="flex items-center gap-3 px-4 py-3 mt-2 border-none bg-transparent text-red-500 text-[15px] font-medium cursor-pointer rounded-[10px] transition-colors hover:bg-red-100 w-full"
            onClick={handleLogout}
          >
            <LogOut size={20} />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>

      {/* ═══════════ KEYFRAMES GLOBAUX ═══════════ */}
      <style>{`
        @keyframes avatar-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.5); }
          50% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
        }
        @keyframes dot-pop {
          0% { transform: translateX(-50%) scale(0); opacity: 0; }
          60% { transform: translateX(-50%) scale(1.4); opacity: 1; }
          100% { transform: translateX(-50%) scale(1); opacity: 1; }
        }
      `}</style>
    </>
  )
}