import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { ArrowRight, BookOpen, CheckCircle2, ChevronRight, Download, FileText, ShieldCheck, Sparkles, Star } from 'lucide-react'
import { getDB, recordProductView } from '@/lib/db'
import { getProductReviews, getProductReviewSummary } from '@/lib/services/reviews'
import { verifyToken } from '@/lib/auth'
import ProductBuyButton from '@/components/ProductBuyButton'
import AddToCartAction from '@/components/product/AddToCartAction'
import ReviewCard from '@/components/reviews/ReviewCard'
import ReviewFormWrapper from '@/components/reviews/ReviewFormWrapper'
import ReviewSummary from '@/components/reviews/ReviewSummary'

export const dynamic = 'force-dynamic'

interface Product {
  id: number
  title: string
  slug: string
  description: string | null
  price: number
  compare_price: number | null
  category_id: number | null
  category_name: string | null
  image_url: string | null
  image_alt: string | null
  stock: number | null
  avg_rating: number | null
  total_reviews: number | null
  created_at: string
  file_format: string | null
  file_size: string | null
  content_preview: string | null
  chapters: string | null
  author: string | null
}

interface SimilarProduct {
  id: number
  title: string
  slug: string
  price: number
  compare_price: number | null
  image_url: string | null
  avg_rating: number | null
  review_count: number
}

async function getProduct(slug: string): Promise<Product | null> {
  const db = await getDB()
  return db.get<Product>(`
    SELECT p.id, p.title, p.slug, p.description, p.price, p.compare_price,
      p.category_id, c.name AS category_name, p.stock, p.avg_rating,
      p.total_reviews, p.created_at, p.file_format, p.file_size,
      p.content_preview, p.chapters, p.author,
      (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_main = 1 LIMIT 1) AS image_url,
      (SELECT pi.alt FROM product_images pi WHERE pi.product_id = p.id AND pi.is_main = 1 LIMIT 1) AS image_alt
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.slug = ? AND p.status = 'published'
    LIMIT 1
  `, [slug]) || null
}

function plainText(value: string | null | undefined): string {
  return (value || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/\s+/g, ' ').trim()
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProduct(params.slug)
  if (!product) return { title: 'Ressource introuvable' }
  const description = plainText(product.description).slice(0, 160) || `Découvrez ${product.title} sur TorrentTwist.`
  return {
    title: product.title,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: 'website',
      title: product.title,
      description,
      images: product.image_url ? [{ url: product.image_url, alt: product.image_alt || product.title }] : undefined,
    },
  }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug)
  if (!product) notFound()

  const db = await getDB()
  const token = cookies().get('user_session')?.value || cookies().get('token')?.value
  const session = token ? await verifyToken(token) : null
  const userId = session?.id || session?.userId
  if (userId) {
    const parsedId = Number(userId)
    if (Number.isInteger(parsedId) && parsedId > 0) {
      void recordProductView(parsedId, product.id).catch((error) => console.error('Unable to record product view:', error))
    }
  }

  const [reviewSummary, reviewData, similarProducts] = await Promise.all([
    getProductReviewSummary(product.id),
    getProductReviews(product.id, 6, 0),
    db.all<SimilarProduct>(`
      SELECT p.id, p.title, p.slug, p.price, p.compare_price,
        (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_main = 1 LIMIT 1) AS image_url,
        COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved'), 0) AS avg_rating,
        (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved') AS review_count
      FROM products p
      WHERE p.category_id = ? AND p.id != ? AND p.status = 'published'
      ORDER BY p.sales DESC, p.created_at DESC
      LIMIT 4
    `, [product.category_id, product.id]),
  ])

  let chapters: string[] = []
  try {
    const parsed: unknown = product.chapters ? JSON.parse(product.chapters) : []
    if (Array.isArray(parsed)) chapters = parsed.filter((chapter): chapter is string => typeof chapter === 'string').slice(0, 30)
  } catch {
    chapters = []
  }

  const safeDescription = plainText(product.description)
  const safePreview = plainText(product.content_preview)
  const discount = product.compare_price && product.compare_price > product.price
    ? Math.round((1 - product.price / product.compare_price) * 100)
    : 0
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: plainText(product.description).slice(0, 500),
    image: product.image_url ? [product.image_url] : undefined,
    sku: String(product.id),
    category: product.category_name || undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'XOF',
      price: product.price,
      url: `https://torrenttwist.com/product/${product.slug}`,
      availability: product.stock === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
    },
    ...(reviewSummary && Number(reviewSummary.count) > 0 && Number(reviewSummary.average) > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: Number(reviewSummary.average).toFixed(1),
        reviewCount: Number(reviewSummary.count),
      },
    } : {}),
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav aria-label="Fil d’Ariane" className="mb-6 flex flex-wrap items-center gap-2 text-xs text-slate-500 sm:text-sm">
          <Link href="/" className="hover:text-blue-700">Accueil</Link><ChevronRight size={14} />
          <Link href="/products" className="hover:text-blue-700">Catalogue</Link>
          {product.category_name && <><ChevronRight size={14} /><Link href={`/category/${product.category_id ? product.category_name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : ''}`} className="hover:text-blue-700">{product.category_name}</Link></>}
          <ChevronRight size={14} /><span aria-current="page" className="max-w-[200px] truncate font-semibold text-slate-800">{product.title}</span>
        </nav>

        <section className="grid overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm lg:grid-cols-[1.05fr_.95fr]">
          <div className="relative min-h-[300px] bg-slate-100 sm:min-h-[440px]">
            {product.image_url ? <Image src={product.image_url} alt={product.image_alt || product.title} fill priority sizes="(max-width: 1024px) 100vw, 52vw" className="object-cover" /> : <div className="flex h-full min-h-[300px] items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100"><BookOpen className="h-20 w-20 text-blue-200" /></div>}
            {discount > 0 && <span className="absolute left-5 top-5 rounded-full bg-blue-700 px-3 py-1.5 text-xs font-bold text-white">Économisez {discount}%</span>}
          </div>
          <div className="flex flex-col p-6 sm:p-9 lg:p-11">
            {product.category_name && <Link href={`/category/${product.category_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-100">{product.category_name}</Link>}
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{product.title}</h1>
            <p className="mt-4 text-base leading-7 text-slate-600">{safeDescription || 'Une ressource numérique sélectionnée pour accompagner vos projets.'}</p>

            {Number(reviewSummary?.count) > 0 && Number(reviewSummary?.average) > 0 && (
              <a href="#reviews" className="mt-5 inline-flex w-fit items-center gap-2 text-sm text-slate-600 hover:text-blue-700">
                <Star size={16} className="fill-amber-400 text-amber-400" />
                <strong>{Number(reviewSummary.average).toFixed(1)}</strong>
                <span>({Number(reviewSummary.count)} avis vérifiés)</span>
              </a>
            )}

            <div className="mt-7 border-t border-slate-100 pt-6">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-3xl font-extrabold tracking-tight text-slate-950">{Number(product.price).toLocaleString('fr-FR')} FCFA</span>
                {discount > 0 && <><span className="text-base text-slate-400 line-through">{Number(product.compare_price).toLocaleString('fr-FR')} FCFA</span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">-{discount}%</span></>}
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">Le paiement est confirmé par le prestataire avant l’accès au produit. Les conditions de téléchargement sont indiquées dans votre bibliothèque.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <ProductBuyButton productId={product.id} price={product.price} comparePrice={product.compare_price} label="Acheter maintenant" variant="primary" />
                <a href="#product-details" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"><FileText size={17} /> Détails du produit</a>
              </div>
            </div>

            <div className="mt-auto grid gap-3 border-t border-slate-100 pt-6 sm:grid-cols-2">
              <div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" /><div><p className="text-sm font-semibold text-slate-800">Paiement vérifié</p><p className="mt-1 text-xs leading-5 text-slate-500">Accès accordé après confirmation serveur.</p></div></div>
              <div className="flex gap-3"><Download className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" /><div><p className="text-sm font-semibold text-slate-800">Livraison numérique</p><p className="mt-1 text-xs leading-5 text-slate-500">Retrouvez votre achat dans votre espace client.</p></div></div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section id="product-details" className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Sparkles size={19} /></span><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Présentation</p><h2 className="text-xl font-bold text-slate-950">À propos de cette ressource</h2></div></div>
            <p className="mt-5 whitespace-pre-line text-sm leading-7 text-slate-600">{safeDescription || 'La description détaillée de ce produit sera bientôt disponible.'}</p>
            {(product.file_format || product.file_size) && <div className="mt-6 flex flex-wrap gap-2">{product.file_format && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">Format : {product.file_format}</span>}{product.file_size && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">Taille : {product.file_size}</span>}</div>}
            {chapters.length > 0 && <div className="mt-8 border-t border-slate-100 pt-6"><h3 className="text-base font-bold text-slate-900">Dans cette ressource</h3><ol className="mt-4 grid gap-2 sm:grid-cols-2">{chapters.map((chapter, index) => <li key={`${index}-${chapter}`} className="flex gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white text-xs font-bold text-blue-700">{index + 1}</span><span>{chapter}</span></li>)}</ol></div>}
            {safePreview && <div className="mt-8 border-t border-slate-100 pt-6"><h3 className="text-base font-bold text-slate-900">Extrait</h3><p className="mt-3 whitespace-pre-line rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">{safePreview}</p></div>}
            {product.author && <p className="mt-6 border-t border-slate-100 pt-5 text-sm text-slate-500">Créé par <span className="font-semibold text-slate-800">{product.author}</span></p>}
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-base font-bold text-slate-900">Comment ça marche</h2><ol className="mt-4 space-y-4">{['Passez votre commande', 'Le prestataire confirme le paiement', 'Retrouvez l’accès dans votre bibliothèque'].map((step, index) => <li key={step} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">{index + 1}</span><span className="pt-1 text-sm leading-5 text-slate-600">{step}</span></li>)}</ol><Link href="/dashboard/library" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900">Ma bibliothèque <ArrowRight size={15} /></Link></section>
            {product.author && <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Créateur</p><p className="mt-2 font-bold text-slate-900">{product.author}</p></section>}
          </aside>
        </div>

        {similarProducts.length > 0 && <section className="mt-12"><div className="mb-5 flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">À découvrir également</p><h2 className="mt-1 text-2xl font-bold text-slate-950">Ressources similaires</h2></div><Link href="/products" className="text-sm font-semibold text-blue-700 hover:text-blue-900">Voir tout</Link></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">{similarProducts.map((item) => <Link key={item.id} href={`/product/${item.slug}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-lg"><div className="relative aspect-square bg-slate-100">{item.image_url ? <Image src={item.image_url} alt={item.title} fill sizes="(max-width:640px) 50vw, 25vw" className="object-cover transition group-hover:scale-105" /> : <div className="grid h-full place-items-center text-sm text-slate-400">Aperçu indisponible</div>}</div><div className="p-3 sm:p-4"><h3 className="line-clamp-2 text-sm font-semibold text-slate-800">{item.title}</h3><p className="mt-2 text-sm font-bold text-blue-800">{Number(item.price).toLocaleString('fr-FR')} FCFA</p></div></Link>)}</div></section>}

        <section id="reviews" className="mt-12 scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="mb-6"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Retours clients</p><h2 className="mt-1 text-2xl font-bold text-slate-950">Avis sur cette ressource</h2></div><ReviewSummary summary={reviewSummary} /><div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"><div className="space-y-4">{reviewData.reviews.length ? reviewData.reviews.map((review) => <ReviewCard key={review.id} review={review} showHelpful />) : <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">Aucun avis publié pour le moment.</p>}</div><div id="review-form"><ReviewFormWrapper productSlug={product.slug} /></div></div></section>
      </div>
    </div>
  )
}
