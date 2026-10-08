// app/category/[slug]/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import {
  ChevronRight,
  Package,
  ArrowLeft,
  Home,
  Layers,
  LayoutGrid,
} from 'lucide-react'
import { getDB } from '@/lib/db'
import AnimatedProductCard from '@/components/home/AnimatedProductCard'

// ============================================================
// 🎨 TYPES
// ============================================================

interface PageProps {
  params: { slug: string }
}

interface Category {
  id: number
  name: string
  slug: string
  description: string | null
  image: string | null
  parent_id: number | null
  is_active: number
  position: number
  product_count?: number
}

interface Product {
  id: number
  title: string
  slug: string
  description: string | null
  price: number
  compare_price: number | null
  avg_rating: number | null
  review_count: number
  sales_count: number
  main_image: string | null
  created_at: string
}

// ============================================================
// SEO DYNAMIQUE
// ============================================================

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const db = await getDB()
  const category = await db.get<Category>(
    `SELECT id, name, slug, description, image FROM categories 
     WHERE slug = ? AND is_active = 1`,
    [params.slug]
  )

  if (!category) {
    return { title: 'Catégorie introuvable | TorrentTwist' }
  }

  return {
    title: `${category.name} | TorrentTwist`,
    description:
      category.description ||
      `Découvrez tous les produits de la catégorie ${category.name} sur TorrentTwist.`,
    alternates: {
      canonical: `/category/${category.slug}`,
    },
    openGraph: {
      title: `${category.name} | TorrentTwist`,
      description:
        category.description ||
        `Découvrez tous les produits de la catégorie ${category.name}.`,
      type: 'website',
      images: category.image ? [{ url: category.image }] : undefined,
    },
  }
}

// ============================================================
// 🏠 PAGE
// ============================================================

export default async function CategoryPage({ params }: PageProps) {
  const db = await getDB()

  // 1. Récupérer la catégorie
  const category = await db.get<Category>(
    `SELECT id, name, slug, description, image, parent_id, is_active, position
     FROM categories 
     WHERE slug = ? AND is_active = 1`,
    [params.slug]
  )

  if (!category) notFound()

  // 2. Récupérer la catégorie parente (si sous-catégorie)
  let parent: { id: number; name: string; slug: string } | null = null
  if (category.parent_id) {
    parent = await db.get(
      `SELECT id, name, slug FROM categories WHERE id = ? AND is_active = 1`,
      [category.parent_id]
    )
  }

  // 3. Récupérer les sous-catégories
  const subCategories = await db.all<Category>(
    `SELECT 
       c.id, c.name, c.slug, c.description, c.image, c.parent_id, c.is_active, c.position,
       (SELECT COUNT(*) FROM products 
        WHERE category_id = c.id AND status = 'published') as product_count
     FROM categories c
     WHERE c.parent_id = ? AND c.is_active = 1
     ORDER BY c.position ASC, c.name ASC`,
    [category.id]
  )

  // 4. Récupérer TOUS les produits de la catégorie ET de ses sous-catégories
  const products = await db.all<Product>(
    `SELECT 
       p.*,
       (SELECT url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) as main_image,
       (SELECT AVG(rating) FROM reviews WHERE product_id = p.id) as avg_rating,
       (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as review_count,
       (SELECT COUNT(*) FROM order_items WHERE product_id = p.id) as sales_count
     FROM products p
     WHERE p.status = 'published'
       AND (
         p.category_id = ?
         OR p.category_id IN (
           SELECT id FROM categories WHERE parent_id = ? AND is_active = 1
         )
       )
     ORDER BY p.created_at DESC`,
    [category.id, category.id]
  )

  // 5. JSON-LD pour SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: category.name,
    description: category.description || undefined,
    url: `https://torrenttwist.com/category/${category.slug}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: products.length,
      itemListElement: products.slice(0, 50).map((p, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        url: `https://torrenttwist.com/product/${p.slug}`,
        name: p.title,
      })),
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://torrenttwist.com' },
        { '@type': 'ListItem', position: 2, name: 'Catégories', item: 'https://torrenttwist.com/category' },
        ...(parent
          ? [{ '@type': 'ListItem', position: 3, name: parent.name, item: `https://torrenttwist.com/category/${parent.slug}` }]
          : []),
        {
          '@type': 'ListItem',
          position: parent ? 4 : 3,
          name: category.name,
          item: `https://torrenttwist.com/category/${category.slug}`,
        },
      ],
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">

          {/* 🔙 Barre d'actions : Retour + Fil d'Ariane */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <Link
              href="/category"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 rounded-xl text-sm font-medium text-gray-700 hover:text-indigo-700 transition-all self-start"
            >
              <ArrowLeft className="w-4 h-4" />
              Toutes les catégories
            </Link>

            <nav aria-label="Fil d'Ariane">
              <ol className="flex items-center flex-wrap gap-1.5 text-sm text-gray-500">
                <li>
                  <Link
                    href="/"
                    className="hover:text-indigo-600 transition-colors inline-flex items-center gap-1"
                  >
                    <Home className="w-3.5 h-3.5" />
                    Accueil
                  </Link>
                </li>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                <li>
                  <Link
                    href="/category"
                    className="hover:text-indigo-600 transition-colors"
                  >
                    Catégories
                  </Link>
                </li>
                {parent && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                    <li>
                      <Link
                        href={`/category/${parent.slug}`}
                        className="hover:text-indigo-600 transition-colors"
                      >
                        {parent.name}
                      </Link>
                    </li>
                  </>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                <li className="text-gray-900 font-medium">{category.name}</li>
              </ol>
            </nav>
          </div>

          {/* 🎯 En-tête de catégorie */}
          <section className="relative rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-gray-200 p-6 sm:p-10 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <LayoutGrid className="w-5 h-5 text-indigo-600" />
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                    Catégorie
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 break-words">
                  {category.name}
                </h1>
                {category.description && (
                  <p className="text-gray-600 max-w-2xl leading-relaxed text-sm sm:text-base">
                    {category.description}
                  </p>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 min-w-[120px] shadow-sm self-start sm:self-center">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                  <Package className="w-3.5 h-3.5" />
                  Produits
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {products.length}
                </div>
              </div>
            </div>
          </section>

          {/* 📂 Sous-catégories */}
          {subCategories.length > 0 && (
            <section className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-gray-900">
                  Sous-catégories
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {subCategories.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/category/${sub.slug}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 rounded-full text-sm text-gray-700 hover:text-indigo-700 transition-all"
                  >
                    {sub.name}
                    {sub.product_count !== undefined && sub.product_count > 0 && (
                      <span className="px-2 py-0.5 bg-white border border-gray-200 rounded-full text-[10px] font-semibold text-gray-500">
                        {sub.product_count}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* 🛒 Produits */}
          <section>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="w-1 h-6 bg-indigo-600 rounded-full" />
                {products.length > 0
                  ? `${products.length} produit${products.length > 1 ? 's' : ''}`
                  : 'Produits'}
              </h2>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                <div className="w-20 h-20 mx-auto bg-indigo-50 rounded-full flex items-center justify-center mb-5">
                  <Package className="w-9 h-9 text-indigo-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Aucun produit dans cette catégorie
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto px-4">
                  Revenez bientôt, de nouveaux produits sont ajoutés régulièrement.
                </p>
                <Link
                  href="/products"
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition inline-flex items-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  Voir tous les produits
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {products.map((p, i) => (
                  <AnimatedProductCard
                    key={p.id}
                    product={p}
                    priority={i < 4}
                  />
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </>
  )
}