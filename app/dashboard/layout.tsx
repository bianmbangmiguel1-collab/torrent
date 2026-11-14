'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import {
  BookOpen, Heart, LayoutDashboard, LogOut, Menu, Package, Settings, ShieldCheck, X,
} from 'lucide-react'

const links = [
  { href: '/dashboard', label: 'Vue générale', icon: LayoutDashboard },
  { href: '/dashboard/library', label: 'Ma bibliothèque', icon: BookOpen },
  { href: '/orders', label: 'Mes commandes', icon: Package },
  { href: '/favorites', label: 'Mes favoris', icon: Heart },
  { href: '/settings', label: 'Paramètres', icon: Settings },
  { href: '/security', label: 'Sécurité du compte', icon: ShieldCheck },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, loading, logout } = useUser()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname || '/dashboard')}`)
    }
  }, [isAuthenticated, loading, pathname, router])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  if (loading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
          <p className="mt-4 text-sm font-medium text-slate-600">Vérification de votre session…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:grid lg:grid-cols-[260px_1fr]">
      {mobileOpen && <button aria-label="Fermer le menu" className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-slate-200 bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-700 text-sm font-black text-white">TT</span>
            <span><span className="block text-sm font-extrabold text-slate-950">TorrentTwist</span><span className="text-xs text-slate-500">Espace client</span></span>
          </Link>
          <button onClick={() => setMobileOpen(false)} aria-label="Fermer le menu" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"><X size={18} /></button>
        </div>

        <div className="border-b border-slate-100 px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Connecté en tant que</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-900">{user?.name || user?.email || 'Client TorrentTwist'}</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Navigation de l’espace client">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${active ? 'bg-blue-50 text-blue-800' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-700'}`}><Icon size={18} />{label}</Link>
          })}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <Link href="/products" className="mb-2 flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800">Continuer mes achats</Link>
          <button type="button" onClick={() => void logout()} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-700"><LogOut size={18} /> Se déconnecter</button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <button type="button" onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu" className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden"><Menu size={19} /></button>
          <div className="min-w-0"><p className="text-xs font-medium text-slate-400">Espace personnel</p><p className="truncate text-sm font-bold text-slate-900">{links.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label || 'Mon compte'}</p></div>
          <Link href="/" className="ml-auto text-sm font-semibold text-blue-700 hover:text-blue-900">Voir la boutique</Link>
        </header>
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
