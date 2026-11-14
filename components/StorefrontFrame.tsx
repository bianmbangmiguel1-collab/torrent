'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight, BookOpen, Menu, Search, ShoppingBag, X } from 'lucide-react'

export default function StorefrontFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = query.trim()
    if (!value) return
    router.push(`/products?search=${encodeURIComponent(value)}`)
    setMobileOpen(false)
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <div className="bg-[#102a56] px-4 py-2 text-center text-xs font-medium tracking-wide text-white sm:text-sm">
        Ressources numériques soigneusement sélectionnées · Accès après confirmation de paiement
      </div>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 shadow-[0_4px_20px_rgba(15,23,42,0.04)] backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 md:hidden"
          >
            {mobileOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="TorrentTwist, accueil">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><BookOpen size={21} /></span>
            <span className="leading-tight"><span className="block text-lg font-extrabold tracking-tight text-slate-950">TorrentTwist</span><span className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:block">Digital Hub · Cameroon</span></span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
            <Link href="/products" className={`rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-blue-50 hover:text-blue-700 ${pathname.startsWith('/products') || pathname.startsWith('/product/') ? 'text-blue-700' : 'text-slate-600'}`}>Catalogue</Link>
            <Link href="/category" className={`rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-blue-50 hover:text-blue-700 ${pathname.startsWith('/category') ? 'text-blue-700' : 'text-slate-600'}`}>Catégories</Link>
            <Link href="/dashboard/library" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-700">Ma bibliothèque</Link>
          </nav>

          <form onSubmit={submitSearch} role="search" className="ml-auto hidden max-w-md flex-1 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50 md:flex">
            <Search size={17} className="shrink-0 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Rechercher dans le catalogue" placeholder="Rechercher une ressource…" className="h-10 min-w-0 flex-1 border-0 bg-transparent px-2 text-sm text-slate-900 outline-none placeholder:text-slate-400" />
            <button type="submit" aria-label="Lancer la recherche" className="rounded-lg p-2 text-blue-700 hover:bg-blue-50"><ArrowRight size={16} /></button>
          </form>
          <Link href="/cart" aria-label="Ouvrir le panier" className="ml-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-blue-200 hover:text-blue-700 md:ml-0"><ShoppingBag size={18} /></Link>
          <Link href="/login" className="hidden shrink-0 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 sm:inline-flex">Connexion</Link>
        </div>
        {mobileOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-4 shadow-lg md:hidden">
            <form onSubmit={submitSearch} role="search" className="mb-3 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3">
              <Search size={17} className="text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Rechercher dans le catalogue" placeholder="Rechercher une ressource…" className="h-11 min-w-0 flex-1 border-0 bg-transparent px-2 text-sm outline-none" />
              <button type="submit" aria-label="Lancer la recherche" className="p-2 text-blue-700"><ArrowRight size={16} /></button>
            </form>
            <nav className="grid gap-1" aria-label="Navigation mobile">
              <Link onClick={() => setMobileOpen(false)} href="/products" className="rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50">Catalogue</Link>
              <Link onClick={() => setMobileOpen(false)} href="/category" className="rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50">Catégories</Link>
              <Link onClick={() => setMobileOpen(false)} href="/dashboard/library" className="rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50">Ma bibliothèque</Link>
              <Link onClick={() => setMobileOpen(false)} href="/login" className="mt-1 rounded-xl bg-blue-700 px-3 py-3 text-center text-sm font-bold text-white">Se connecter</Link>
            </nav>
          </div>
        )}
      </header>

      <main id="main-content">{children}</main>

      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
          <div>
            <Link href="/" className="text-lg font-extrabold tracking-tight text-slate-950">TorrentTwist</Link>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">Le hub numérique pensé au Cameroun : ebooks, formations, templates et outils digitaux pour vos projets.</p>
          </div>
          <div><h2 className="text-sm font-bold text-slate-900">Découvrir</h2><div className="mt-3 grid gap-2 text-sm text-slate-500"><Link href="/products" className="hover:text-blue-700">Tous les produits</Link><Link href="/category" className="hover:text-blue-700">Catégories</Link></div></div>
          <div><h2 className="text-sm font-bold text-slate-900">Votre compte</h2><div className="mt-3 grid gap-2 text-sm text-slate-500"><Link href="/dashboard/library" className="hover:text-blue-700">Bibliothèque</Link><Link href="/orders" className="hover:text-blue-700">Commandes</Link><Link href="/favorites" className="hover:text-blue-700">Favoris</Link></div></div>
          <div><h2 className="text-sm font-bold text-slate-900">Besoin d’aide ?</h2><div className="mt-3 grid gap-2 text-sm text-slate-500"><Link href="/support" className="hover:text-blue-700">Support client</Link><Link href="/invoices" className="hover:text-blue-700">Factures</Link></div></div>
        </div>
        <div className="border-t border-slate-100 px-4 py-4 text-center text-xs text-slate-400">© {new Date().getFullYear()} TorrentTwist · Made in Cameroon</div>
      </footer>
    </div>
  )
}
