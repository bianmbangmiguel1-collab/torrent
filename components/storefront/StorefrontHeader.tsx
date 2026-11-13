'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search, ShoppingCart, UserRound, ArrowRight } from 'lucide-react'

export default function StorefrontHeader() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = query.trim()
    if (value) router.push(`/products?search=${encodeURIComponent(value)}`)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="bg-slate-950 text-center px-4 py-2 text-xs font-medium text-white">
        Des ressources numériques pour apprendre, créer et faire avancer vos projets.
      </div>
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="TorrentTwist, accueil">
          <Image src="/torrent-icon.png" alt="" width={36} height={36} priority />
          <span className="text-lg font-bold tracking-tight text-slate-950">TorrentTwist</span>
        </Link>

        <form onSubmit={submitSearch} role="search" className="mx-auto hidden w-full max-w-2xl md:flex">
          <label htmlFor="store-search" className="sr-only">Rechercher dans la boutique</label>
          <input
            id="store-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un produit, une formation, un ebook…"
            className="min-w-0 flex-1 rounded-l-md border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
          />
          <button aria-label="Rechercher" className="rounded-r-md bg-amber-400 px-4 text-slate-950 transition hover:bg-amber-300">
            <Search size={19} />
          </button>
        </form>

        <nav className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4" aria-label="Navigation principale">
          <Link href="/products" className="hidden text-sm font-medium text-slate-700 hover:text-slate-950 sm:block">Catalogue</Link>
          <Link href="/login" className="flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" aria-label="Mon compte">
            <UserRound size={19} /><span className="hidden lg:inline">Mon compte</span>
          </Link>
          <Link href="/cart" className="flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" aria-label="Mon panier">
            <ShoppingCart size={20} /><span className="hidden lg:inline">Panier</span>
          </Link>
          <Link href="/products" className="hidden items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-900 md:flex">
            Voir les produits <ArrowRight size={16} />
          </Link>
        </nav>
      </div>
      <form onSubmit={submitSearch} role="search" className="flex gap-2 px-4 pb-3 md:hidden">
        <label htmlFor="store-search-mobile" className="sr-only">Rechercher dans la boutique</label>
        <input
          id="store-search-mobile"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher un produit…"
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none"
        />
        <button aria-label="Rechercher" className="rounded-md bg-amber-400 px-3 text-slate-950"><Search size={18} /></button>
      </form>
    </header>
  )
}
