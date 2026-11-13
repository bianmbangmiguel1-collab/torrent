export const dynamic = 'force-dynamic'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, BadgeCheck, BookOpen, ChevronRight, Download, Layers3, Tag } from 'lucide-react'
import { getDB } from '@/lib/db'
import StorefrontHeader from '@/components/storefront/StorefrontHeader'

interface Category {
  id: number
  name: string
  slug: string
  product_count: number
}

interface Product {
  id: number
  title: string
  slug: string
  price: number
  compare_price: number | null
  main_image: string | null
  avg_rating: number | null
  review_count: number
  sales_count: number
}

const productQuery = `
  SELECT p.id, p.title, p.slug, p.price, p.compare_price,
    (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) AS main_image,
    (SELECT AVG(rating) FROM reviews WHERE product_id = p.id AND status = 'approved') AS avg_rating,
    (SELECT COUNT(*) FROM reviews WHERE product_id = p.id AND status = 'approved') AS review_count,
    (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) AS sales_count
  FROM products p
  WHERE p.status = 'published'
`

function formatPrice(price: number) {
  return `${Number(price || 0).toLocaleString('fr-FR')} FCFA`
}

function ProductShelf({ title, description, products, href = '/products' }: { title: string; description: string; products: Product[]; href?: string }) {
  if (!products.length) return null
  return (
    <section className="mt-10 sm:mt-12">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div><h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{title}</h2><p className="mt-1 text-sm text-slate-600">{description}</p></div>
        <Link href={href} className="shrink-0 text-sm font-semibold text-blue-700 hover:text-blue-900">Voir tout <ChevronRight className="inline" size={16} /></Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {products.map((product) => {
          const hasDiscount = product.compare_price != null && product.compare_price > product.price
          const discount = hasDiscount ? Math.round((1 - product.price / product.compare_price!) * 100) : 0
          return (
            <Link key={product.id} href={`/product/${product.slug}`} className="group overflow-hidden rounded-md border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-md">
              <div className="relative aspect-square bg-slate-100">
                {product.main_image ? <Image src={product.main_image} alt={product.title} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover transition duration-300 group-hover:scale-[1.02]" /> : <div className="flex h-full items-center justify-center text-sm text-slate-400">Image non disponible</div>}
                {discount > 0 && <span className="absolute left-2 top-2 rounded-sm bg-red-700 px-2 py-1 text-xs font-semibold text-white">-{discount}%</span>}
              </div>
              <div className="p-3 sm:p-4">
                <h3 className="line-clamp-2 min-h-10 text-sm font-medium leading-5 text-slate-900 group-hover:text-blue-800">{product.title}</h3>
                {Number(product.avg_rating) > 0 && <p className="mt-1 text-xs text-amber-700">★ {Number(product.avg_rating).toFixed(1)} <span className="text-slate-500">({product.review_count} avis)</span></p>}
                <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-bold text-slate-950">{formatPrice(product.price)}</span>
                  {hasDiscount && <span className="text-xs text-slate-500 line-through">{formatPrice(product.compare_price!)}</span>}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export const metadata = {
  title: 'Boutique | TorrentTwist',
  description: 'Parcourez les produits numériques TorrentTwist et trouvez une ressource adaptée à votre projet.',
}

export default async function StorePage() {
  const db = await getDB()
  const [categories, newest, popular, offers] = await Promise.all([
    db.all<Category>(`SELECT c.id, c.name, c.slug, COUNT(p.id) AS product_count FROM categories c LEFT JOIN products p ON p.category_id = c.id AND p.status = 'published' WHERE c.is_active = 1 AND c.parent_id IS NULL GROUP BY c.id ORDER BY c.position ASC, c.name ASC LIMIT 8`),
    db.all<Product>(`${productQuery} ORDER BY p.created_at DESC LIMIT 8`),
    db.all<Product>(`${productQuery} ORDER BY sales_count DESC, p.created_at DESC LIMIT 8`),
    db.all<Product>(`${productQuery} AND p.compare_price IS NOT NULL AND p.compare_price > p.price ORDER BY (p.compare_price - p.price) DESC LIMIT 8`),
  ])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <StorefrontHeader />
      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-semibold text-blue-700">TorrentTwist · Boutique</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Trouvez votre prochaine ressource</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Explorez les produits numériques, consultez leur description et choisissez selon votre besoin et votre budget.</p></div>
          <Link href="/products" className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-100">Tout le catalogue <ArrowRight size={16} /></Link>
        </div>

        <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 sm:grid-cols-3 sm:p-5">
          <div className="flex gap-3"><BookOpen size={19} className="mt-0.5 shrink-0 text-blue-700" /><div><p className="text-sm font-semibold">Choisissez votre format</p><p className="mt-1 text-xs leading-5 text-slate-600">Guides, formations et autres ressources disponibles au catalogue.</p></div></div>
          <div className="flex gap-3"><BadgeCheck size={19} className="mt-0.5 shrink-0 text-emerald-700" /><div><p className="text-sm font-semibold">Consultez avant d’acheter</p><p className="mt-1 text-xs leading-5 text-slate-600">Chaque fiche produit détaille le contenu, le prix et les avis disponibles.</p></div></div>
          <div className="flex gap-3"><Download size={19} className="mt-0.5 shrink-0 text-blue-700" /><div><p className="text-sm font-semibold">Retrouvez vos achats</p><p className="mt-1 text-xs leading-5 text-slate-600">Les produits numériques achetés sont accessibles depuis votre espace client.</p></div></div>
        </div>

        {categories.length > 0 && <section className="mt-8"><div className="mb-3 flex items-center gap-2"><Layers3 size={19} className="text-slate-700" /><h2 className="text-lg font-bold text-slate-950">Parcourir les catégories</h2></div><div className="flex gap-2 overflow-x-auto pb-2">{categories.map((category) => <Link key={category.id} href={`/category/${category.slug}`} className="shrink-0 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-500 hover:bg-slate-100">{category.name}<span className="ml-2 text-xs text-slate-500">{category.product_count}</span></Link>)}</div></section>}

        <ProductShelf title="Les nouveautés" description="Les derniers produits ajoutés à la boutique." products={newest} href="/products?sort=newest" />
        <ProductShelf title="Les plus consultés par les acheteurs" description="Une sélection classée selon les commandes enregistrées." products={popular} href="/products?sort=popular" />
        {offers.length > 0 && <ProductShelf title="Offres en cours" description="Produits avec un prix promotionnel affiché." products={offers} href="/products?promo=true" />}

        {!newest.length && <div className="mt-10 rounded-md border border-slate-200 bg-white p-8 text-center"><Tag className="mx-auto text-slate-400" size={28} /><h2 className="mt-3 font-semibold">Le catalogue se prépare</h2><p className="mt-1 text-sm text-slate-600">Aucun produit publié pour le moment. Revenez bientôt.</p></div>}
      </main>
      <footer className="mt-12 bg-slate-950 px-4 py-8 text-sm text-slate-300"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 sm:flex-row sm:items-center"><p>© {new Date().getFullYear()} TorrentTwist</p><div className="flex gap-5"><Link href="/" className="hover:text-white">Accueil</Link><Link href="/support" className="hover:text-white">Support</Link><Link href="/login" className="hover:text-white">Mon compte</Link></div></div></footer>
    </div>
  )
}
