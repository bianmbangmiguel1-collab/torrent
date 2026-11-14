import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getDB } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { ArrowLeft, ArrowRight, BookOpen, Search, SlidersHorizontal, Sparkles, Tag } from 'lucide-react'
import AnimatedProductCard from '@/components/home/AnimatedProductCard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Catalogue de ressources numériques | TorrentTwist',
  description: 'Explorez les ebooks, formations, templates et outils numériques disponibles sur TorrentTwist.',
  alternates: { canonical: '/products' },
}

const PAGE_SIZE = 20
const MAX_PAGE = 10_000
const MAX_SEARCH_LENGTH = 100

interface Product {
  id: number
  title: string
  slug: string
  description: string | null
  price: number
  compare_price: number | null
  category_id: number | null
  category_name: string | null
  main_image: string | null
  avg_rating: number | null
  review_count: number
  sales_count: number
  created_at: string
}

interface Category {
  id: number
  name: string
  slug: string
}

function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || '' : value || ''
}

function makeQuery(values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && String(value) !== '' && String(value) !== 'all') {
      params.set(key, String(value))
    }
  })
  const query = params.toString()
  return query ? `/products?${query}` : '/products'
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const db = await getDB()
  const pageRaw = Number.parseInt(getParam(searchParams.page) || '1', 10)
  const page = Number.isFinite(pageRaw) ? Math.min(Math.max(pageRaw, 1), MAX_PAGE) : 1
  const search = getParam(searchParams.search).trim().slice(0, MAX_SEARCH_LENGTH)
  const category = getParam(searchParams.category) || 'all'
  const sortOptions: Record<string, string> = {
    newest: 'p.created_at DESC',
    popular: 'sales_count DESC, p.created_at DESC',
    price_asc: 'p.price ASC, p.created_at DESC',
    price_desc: 'p.price DESC, p.created_at DESC',
    rating: 'avg_rating DESC, p.created_at DESC',
  }
  const sort = Object.hasOwn(sortOptions, getParam(searchParams.sort))
    ? getParam(searchParams.sort)
    : 'newest'
  const promo = getParam(searchParams.promo) === 'true'
  const minRaw = Number(getParam(searchParams.minPrice))
  const maxRaw = Number(getParam(searchParams.maxPrice))
  const minPrice = Number.isFinite(minRaw) && minRaw >= 0 ? Math.min(minRaw, 100_000_000) : 0
  const maxPrice = Number.isFinite(maxRaw) && maxRaw >= minPrice ? Math.min(maxRaw, 100_000_000) : 100_000_000

  const where: string[] = ["p.status = 'published'"]
  const params: unknown[] = []
  if (category !== 'all') {
    const selectedCategory = await db.get<Category>('SELECT id, slug FROM categories WHERE slug = ? AND is_active = 1 LIMIT 1', [category])
    if (!selectedCategory) {
      return (
        <section className="mx-auto max-w-3xl px-4 py-20 text-center">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">Catégorie introuvable</h1>
            <p className="mt-2 text-slate-500">Cette catégorie n’est pas disponible dans le catalogue.</p>
            <Link href="/products" className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800">Voir tout le catalogue</Link>
          </div>
        </section>
      )
    }
    where.push('p.category_id = ?')
    params.push(selectedCategory.id)
  }
  if (search) {
    where.push('(p.title LIKE ? OR p.description LIKE ?)')
    params.push(`%${search}%`, `%${search}%`)
  }
  if (promo) where.push('p.compare_price IS NOT NULL AND p.compare_price > p.price')
  where.push('p.price >= ? AND p.price <= ?')
  params.push(minPrice, maxPrice)
  const whereSql = `WHERE ${where.join(' AND ')}`

  const [products, countRow, categories, publishedCount, user] = await Promise.all([
    db.all<Product>(`
      SELECT p.id, p.title, p.slug, p.description, p.price, p.compare_price,
        p.category_id, c.name AS category_name,
        (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_main = 1 LIMIT 1) AS main_image,
        COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved'), 0) AS avg_rating,
        (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved') AS review_count,
        (SELECT COUNT(*) FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE oi.product_id = p.id AND o.payment_status = 'paid') AS sales_count,
        p.created_at
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ${whereSql}
      ORDER BY ${sortOptions[sort]}
      LIMIT ? OFFSET ?
    `, [...params, PAGE_SIZE, (page - 1) * PAGE_SIZE]),
    db.get<{ total: number }>(`SELECT COUNT(*) AS total FROM products p ${whereSql}`, params),
    db.all<Category>('SELECT id, name, slug FROM categories WHERE is_active = 1 ORDER BY position ASC, name ASC'),
    db.get<{ total: number }>("SELECT COUNT(*) AS total FROM products WHERE status = 'published'"),
    (async () => {
      const token = cookies().get('user_session')?.value || cookies().get('token')?.value
      return token ? verifyToken(token) : null
    })(),
  ])

  // Personalization only affects the sort when the session is verified. The listing
  // remains useful without auth and never trusts a client-decoded JWT payload.
  const total = Number(countRow?.total || 0)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const activeFilters = Number(Boolean(search)) + Number(category !== 'all') + Number(promo) + Number(minPrice > 0) + Number(maxPrice < 100_000_000)
  const currentQuery = { search, category, sort, promo: promo ? 'true' : '', minPrice: minPrice || '', maxPrice: maxPrice < 100_000_000 ? maxPrice : '' }

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <div className="bg-gradient-to-r from-[#102a56] to-blue-800 text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <nav aria-label="Fil d’Ariane" className="mb-6 flex items-center gap-2 text-xs text-blue-100">
            <Link href="/" className="hover:text-white">Accueil</Link><span aria-hidden="true">/</span><span className="text-white">Catalogue</span>
          </nav>
          <div className="grid items-end gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-blue-50"><BookOpen size={14} /> DIGITAL HUB</span>
              <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">Des ressources pour faire avancer vos projets.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">Ebooks, formations, templates et outils numériques sélectionnés pour apprendre et créer à votre rythme.</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-xs font-medium text-blue-100">Ressources disponibles</p>
              <p className="mt-1 text-3xl font-bold">{Number(publishedCount?.total || 0).toLocaleString('fr-FR')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <form action="/products" method="get" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_190px_auto]">
            <label className="relative block">
              <span className="sr-only">Rechercher dans le catalogue</span>
              <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input name="search" defaultValue={search} maxLength={MAX_SEARCH_LENGTH} placeholder="Un ebook, une formation, un outil…" className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50" />
            </label>
            <label className="block"><span className="sr-only">Catégorie</span><select name="category" defaultValue={category} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"><option value="all">Toutes les catégories</option>{categories.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label>
            <label className="block"><span className="sr-only">Trier par</span><select name="sort" defaultValue={sort} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"><option value="newest">Plus récents</option><option value="popular">Plus populaires</option><option value="price_asc">Prix croissant</option><option value="price_desc">Prix décroissant</option><option value="rating">Meilleures notes</option></select></label>
            <button type="submit" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white transition hover:bg-blue-800"><SlidersHorizontal size={16} /> Filtrer</button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
            <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" name="promo" value="true" defaultChecked={promo} className="h-4 w-4 rounded border-slate-300 accent-blue-700" /><Tag size={15} className="text-blue-700" /> Promotions uniquement</label>
            <label className="flex items-center gap-2 text-xs text-slate-500">Prix min <input type="number" name="minPrice" min="0" max="100000000" defaultValue={minPrice || ''} className="h-9 w-28 rounded-lg border border-slate-200 px-2 text-sm text-slate-800" /></label>
            <label className="flex items-center gap-2 text-xs text-slate-500">Prix max <input type="number" name="maxPrice" min="0" max="100000000" defaultValue={maxPrice < 100000000 ? maxPrice : ''} className="h-9 w-28 rounded-lg border border-slate-200 px-2 text-sm text-slate-800" /></label>
            <input type="hidden" name="page" value="1" />
            {activeFilters > 0 && <Link href="/products" className="ml-auto text-sm font-semibold text-blue-700 hover:text-blue-900">Effacer les filtres ({activeFilters})</Link>}
          </div>
        </form>

        <div className="mb-5 mt-8 flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-xl font-bold text-slate-900">{search ? `Résultats pour « ${search} »` : category !== 'all' ? 'Ressources de cette catégorie' : 'Explorer le catalogue'}</h2><p className="mt-1 text-sm text-slate-500">{total.toLocaleString('fr-FR')} ressource{total === 1 ? '' : 's'} trouvée{total === 1 ? '' : 's'}</p></div>
          <p className="text-xs font-medium text-slate-400">Page {page} / {totalPages}</p>
        </div>

        {products.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Search size={27} /></div>
            <h2 className="mt-5 text-xl font-bold text-slate-900">Aucune ressource trouvée</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Essayez d’autres mots-clés ou retirez certains filtres pour élargir votre recherche.</p>
            <Link href="/products" className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800">Réinitialiser la recherche</Link>
          </section>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((product, index) => <AnimatedProductCard key={product.id} product={{ ...product, avg_rating: Number(product.avg_rating) || 0, sales_count: Number(product.sales_count) || 0 }} showBadge={product.compare_price && product.compare_price > product.price ? 'promotion' : index < 3 ? 'new' : null} priority={index < 4} />)}
          </div>
        )}

        {totalPages > 1 && (
          <nav aria-label="Pagination du catalogue" className="mt-10 flex flex-wrap items-center justify-center gap-2">
            <Link aria-disabled={page <= 1} href={makeQuery({ ...currentQuery, page: Math.max(1, page - 1) })} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold ${page <= 1 ? 'pointer-events-none border-slate-100 text-slate-300' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700'}`}><ArrowLeft size={15} /> Précédent</Link>
            <span className="px-3 text-sm text-slate-500">Page {page} sur {totalPages}</span>
            <Link aria-disabled={page >= totalPages} href={makeQuery({ ...currentQuery, page: Math.min(totalPages, page + 1) })} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold ${page >= totalPages ? 'pointer-events-none border-slate-100 text-slate-300' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700'}`}>Suivant <ArrowRight size={15} /></Link>
          </nav>
        )}
      </div>
    </div>
  )
}
