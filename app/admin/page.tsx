'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Activity, ArrowDownToLine, ArrowRight, BadgeDollarSign, Boxes, CircleAlert, LoaderCircle, LogOut, Menu, PackageCheck, RefreshCw, ShoppingBag, Users, X } from 'lucide-react'

interface Stats { revenue: number; orders: number; customers: number; conversion: number }
interface Product { id: string; title: string; category?: string; sales?: number; revenue?: number }
interface Order { id: string; orderNumber: string; userName: string; amount: number; status: string; createdAt: string }
interface ActivityItem { id: string; action: string; createdAt: string }
interface AdminResponse { authenticated?: boolean; admin?: { name?: string } }

const navigation = [
  { title: 'Vue d’ensemble', href: '/admin', icon: Activity },
  { title: 'Produits', href: '/admin/products', icon: Boxes },
  { title: 'Commandes', href: '/admin/orders', icon: ShoppingBag },
  { title: 'Catégories', href: '/admin/categories', icon: PackageCheck },
  { title: 'Clients', href: '/admin/users', icon: Users },
  { title: 'Promotions', href: '/admin/promotions', icon: BadgeDollarSign },
  { title: 'Avis clients', href: '/admin/reviews', icon: Activity },
]

function money(value: number) { return `${Number(value || 0).toLocaleString('fr-FR')} FCFA` }

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [userName, setUserName] = useState('Administration')
  const [stats, setStats] = useState<Stats | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [menuOpen, setMenuOpen] = useState(false)

  const loadDashboard = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    setError('')
    try {
      const authResponse = await fetch('/api/admin/me', { credentials: 'include', cache: 'no-store' })
      if (!authResponse.ok) { router.replace('/admin/login'); return }
      const authData = await authResponse.json() as AdminResponse
      if (!authData.authenticated) { router.replace('/admin/login'); return }
      setUserName(authData.admin?.name || 'Administration')

      const [statsResponse, productsResponse, ordersResponse, activityResponse] = await Promise.all([
        fetch('/api/admin/stats?period=month', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/admin/products/top?limit=5', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/admin/orders/recent?limit=5', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/admin/activities?limit=6', { credentials: 'include', cache: 'no-store' }),
      ])
      if (statsResponse.status === 401 || productsResponse.status === 401 || ordersResponse.status === 401) { router.replace('/admin/login'); return }

      if (statsResponse.ok) {
        const data = await statsResponse.json() as { data?: Stats; revenue?: number; orders?: number; customers?: number; conversion?: number }
        setStats(data.data || { revenue: data.revenue || 0, orders: data.orders || 0, customers: data.customers || 0, conversion: data.conversion || 0 })
      }
      if (productsResponse.ok) { const data = await productsResponse.json() as { products?: Product[] }; setProducts(data.products || []) }
      if (ordersResponse.ok) { const data = await ordersResponse.json() as { orders?: Order[] }; setOrders(data.orders || []) }
      if (activityResponse.ok) { const data = await activityResponse.json() as { activities?: ActivityItem[] }; setActivities(data.activities || []) }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger les données du tableau de bord.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [router])

  useEffect(() => { void loadDashboard() }, [loadDashboard])

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined)
    router.push('/admin/login')
  }

  const cards = [
    { label: 'Chiffre d’affaires', value: stats ? money(stats.revenue) : '—', icon: BadgeDollarSign },
    { label: 'Commandes', value: stats ? stats.orders.toLocaleString('fr-FR') : '—', icon: ShoppingBag },
    { label: 'Clients', value: stats ? stats.customers.toLocaleString('fr-FR') : '—', icon: Users },
    { label: 'Conversion', value: stats ? `${Number(stats.conversion || 0).toLocaleString('fr-FR')} %` : '—', icon: Activity },
  ]

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 md:flex">
      {menuOpen && <button aria-label="Fermer la navigation" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 bg-slate-950/40 md:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform md:sticky md:top-0 md:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5"><Link href="/" className="font-bold tracking-tight text-slate-950">TorrentTwist <span className="ml-1 text-xs font-medium text-slate-500">Admin</span></Link><button className="md:hidden" onClick={() => setMenuOpen(false)} aria-label="Fermer le menu"><X size={20} /></button></div>
        <div className="border-b border-slate-200 px-5 py-4"><p className="text-xs uppercase tracking-wide text-slate-500">Connecté en tant que</p><p className="mt-1 truncate text-sm font-semibold">{userName}</p></div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Administration">
          {navigation.map(({ title, href, icon: Icon }) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium ${href === '/admin' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}><Icon size={18} />{title}</Link>)}
        </nav>
        <div className="border-t border-slate-200 p-3"><Link href="/" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100"><ArrowDownToLine size={18} />Voir la boutique</Link><button onClick={logout} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100"><LogOut size={18} />Déconnexion</button></div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3"><button className="rounded-md p-2 hover:bg-slate-100 md:hidden" onClick={() => setMenuOpen(true)} aria-label="Ouvrir le menu"><Menu size={20} /></button><div><h1 className="text-lg font-bold">Vue d’ensemble</h1><p className="hidden text-xs text-slate-500 sm:block">Activité réelle de votre boutique</p></div></div>
          <button onClick={() => void loadDashboard(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /><span className="hidden sm:inline">Actualiser</span></button>
        </header>

        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
          {error && <div role="alert" className="flex items-center gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"><CircleAlert size={18} />{error}<button onClick={() => void loadDashboard(true)} className="ml-auto font-semibold underline">Réessayer</button></div>}
          {loading ? <div className="flex min-h-60 items-center justify-center gap-3 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={20} />Chargement des données…</div> : <>
            <section aria-label="Indicateurs de la boutique" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map(({ label, value, icon: Icon }) => <article key={label} className="rounded-md border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><p className="text-sm text-slate-600">{label}</p><Icon size={19} className="text-slate-500" /></div><p className="mt-4 text-2xl font-bold tracking-tight text-slate-950">{value}</p></article>)}
            </section>

            <section className="rounded-md border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Accès rapides</h2><p className="mt-1 text-sm text-slate-600">Les tâches les plus courantes pour gérer votre boutique.</p></div></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { title: 'Ajouter un produit', href: '/admin/products/new', icon: Boxes },
                  { title: 'Gérer le catalogue', href: '/admin/products', icon: PackageCheck },
                  { title: 'Traiter les commandes', href: '/admin/orders', icon: ShoppingBag },
                  { title: 'Modifier les catégories', href: '/admin/categories', icon: Users },
                ].map(({ title, href, icon: Icon }) => <Link key={href} href={href} className="flex items-center justify-between rounded-md border border-slate-200 p-4 text-sm font-semibold hover:border-slate-400 hover:bg-slate-50"><span className="flex items-center gap-3"><Icon size={18} className="text-slate-600" />{title}</span><ArrowRight size={16} className="text-slate-400" /></Link>)}
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-2">
              <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="font-bold">Produits populaires</h2><p className="mt-1 text-xs text-slate-500">Classement selon les données de vente disponibles.</p></div><Link href="/admin/products" className="text-sm font-semibold text-blue-700 hover:text-blue-900">Catalogue <ArrowRight className="ml-1 inline" size={14} /></Link></div>
                {products.length ? <div className="divide-y divide-slate-100">{products.map((product, index) => <div key={product.id} className="flex items-center gap-3 px-5 py-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{product.title}</p><p className="text-xs text-slate-500">{product.category || 'Produit'}</p></div><div className="text-right"><p className="text-sm font-semibold">{Number(product.sales || 0).toLocaleString('fr-FR')} ventes</p><p className="text-xs text-slate-500">{money(product.revenue || 0)}</p></div></div>)}</div> : <p className="p-6 text-sm text-slate-500">Aucune donnée produit à afficher.</p>}
              </section>

              <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="font-bold">Commandes récentes</h2><p className="mt-1 text-xs text-slate-500">Suivez les commandes réellement enregistrées.</p></div><Link href="/admin/orders" className="text-sm font-semibold text-blue-700 hover:text-blue-900">Commandes <ArrowRight className="ml-1 inline" size={14} /></Link></div>
                {orders.length ? <div className="divide-y divide-slate-100">{orders.map((order) => <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"><div><p className="text-sm font-semibold">#{order.orderNumber}</p><p className="mt-0.5 text-xs text-slate-500">{order.userName || 'Client'} · {order.createdAt ? new Date(order.createdAt).toLocaleDateString('fr-FR') : ''}</p></div><div className="text-right"><p className="text-sm font-semibold">{money(order.amount)}</p><p className="text-xs capitalize text-slate-500">{order.status}</p></div></div>)}</div> : <p className="p-6 text-sm text-slate-500">Aucune commande récente.</p>}
              </section>
            </div>

            <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-bold">Activité récente</h2></div>
              {activities.length ? <div className="divide-y divide-slate-100 sm:grid sm:grid-cols-2 sm:divide-y-0">{activities.map((item) => <div key={item.id} className="flex items-center gap-3 px-5 py-3 sm:border-b sm:border-slate-100"><Activity size={17} className="shrink-0 text-slate-500" /><p className="min-w-0 flex-1 truncate text-sm text-slate-700">{item.action}</p><time className="shrink-0 text-xs text-slate-500">{item.createdAt ? new Date(item.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : ''}</time></div>)}</div> : <p className="p-5 text-sm text-slate-500">Aucune activité enregistrée.</p>}
            </section>
          </>}
        </div>
      </main>
    </div>
  )
}
