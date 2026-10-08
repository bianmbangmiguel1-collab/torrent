// app/category/page.tsx
import Link from 'next/link'
import { Metadata } from 'next'
import {
  ChevronRight,
  Sparkles,
  Package,
  TrendingUp,
  LayoutGrid,
  Layers,
  ArrowLeft,
  Home,
} from 'lucide-react'
import { getDB } from '@/lib/db'

// ============================================================
// SEO
// ============================================================

export const metadata: Metadata = {
  title: 'Toutes les catégories | TorrentTwist',
  description:
    'Explorez toutes les catégories de produits numériques sur TorrentTwist : ebooks, formations, templates, logiciels et plus.',
  openGraph: {
    title: 'Toutes les catégories | TorrentTwist',
    description:
      'Découvrez notre catalogue complet organisé par catégories.',
    type: 'website',
  },
  alternates: {
    canonical: '/category',
  },
}

export const revalidate = 300 // 5 min

// ============================================================
// 🎨 TYPE
// ============================================================

interface Category {
  id: number
  name: string
  slug: string
  description?: string | null
  image?: string | null
  parent_id?: number | null
  is_active?: number
  position?: number
  product_count?: number
}

// ============================================================
// 🧩 COMPOSANTS INTERNES
// ============================================================

function CategoryCard({
  category,
  childCount,
}: {
  category: Category
  childCount: number
}) {
  const emoji = pickEmojiForCategory(category.slug, category.name)

  return (
    <Link
      href={`/category/${category.slug}`}
      className="group relative block h-full bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-indigo-300 hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Bandeau discret */}
      <div className="h-20 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden border-b border-gray-100">
        <div className="absolute bottom-2 left-4 text-3xl">{emoji}</div>
        {childCount > 0 && (
          <div className="absolute top-3 right-3 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-gray-600 text-[10px] font-semibold flex items-center gap-1">
            <Layers className="w-3 h-3" />
            {childCount}
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="p-5">
        <h3 className="font-bold text-lg text-gray-900 group-hover:text-indigo-600 transition mb-2 line-clamp-1">
          {category.name}
        </h3>

        {category.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-4 min-h-[2.5rem]">
            {category.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-400 font-medium group-hover:text-indigo-600 transition">
            {category.product_count && category.product_count > 0
              ? `${category.product_count} produit${category.product_count > 1 ? 's' : ''}`
              : 'Explorer'}
          </span>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </Link>
  )
}

// Emoji intelligent basé sur le slug/nom
function pickEmojiForCategory(slug: string, name: string): string {
  const s = `${slug} ${name}`.toLowerCase()

  if (/ebook|livre|book|lecture/.test(s)) return '📚'
  if (/formation|cours|course|tuto/.test(s)) return '🎓'
  if (/template|modele|thème|theme/.test(s)) return '🎨'
  if (/logiciel|software|app|outil/.test(s)) return '💻'
  if (/design|graphi|ui|ux/.test(s)) return '🖌️'
  if (/marketing|seo|pub/.test(s)) return '📢'
  if (/business|entrepre|startup/.test(s)) return '💼'
  if (/finance|argent|monnaie|invest/.test(s)) return '💰'
  if (/santé|sport|fitness|forme/.test(s)) return '💪'
  if (/musique|audio|son/.test(s)) return '🎵'
  if (/vidéo|video|film/.test(s)) return '🎬'
  if (/photo|image/.test(s)) return '📸'
  if (/cuisine|food|recette/.test(s)) return '🍳'
  if (/voyage|travel/.test(s)) return '✈️'
  if (/jeu|game|gaming/.test(s)) return '🎮'
  if (/médic|medic|plante/.test(s)) return '🌿'
  if (/langue|language|anglais/.test(s)) return '🌍'
  if (/art|créat|creat/.test(s)) return '✨'

  return '📦'
}

// ============================================================
// 🏠 PAGE PRINCIPALE (async + DB)
// ============================================================

export default async function CategoriesPage() {
  const db = await getDB()

  // ✅ Récupérer TOUTES les catégories actives depuis la DB
  //    avec le nombre de produits publiés dans chacune
  const categories = await db.all<Category>(`
    SELECT 
      c.id,
      c.name,
      c.slug,
      c.description,
      c.image,
      c.parent_id,
      c.is_active,
      c.position,
      (SELECT COUNT(*) FROM products 
       WHERE category_id = c.id AND status = 'published') as product_count
    FROM categories c
    WHERE c.is_active = 1
    ORDER BY c.position ASC, c.name ASC
  `)

  // Séparer racines et enfants
  const rootCategories = categories.filter(
    (c) => !c.parent_id || c.parent_id === 0
  )

  // Compter les enfants par catégorie parente
  const childrenCount: Record<number, number> = {}
  categories.forEach((c) => {
    if (c.parent_id && c.parent_id !== 0) {
      childrenCount[c.parent_id] = (childrenCount[c.parent_id] || 0) + 1
    }
  })

  // JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Toutes les catégories',
    description: 'Catalogue complet des catégories TorrentTwist',
    url: 'https://torrenttwist.com/category',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: rootCategories.length,
      itemListElement: rootCategories.map((c, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        url: `https://torrenttwist.com/category/${c.slug}`,
        name: c.name,
      })),
    },
  }

  const totalCategories = categories.length
  const totalRoots = rootCategories.length

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 🌕 FOND BLANC CLAIR */}
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">

          {/* 🔙 Barre d'actions : Retour dashboard + Fil d'Ariane */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 rounded-xl text-sm font-medium text-gray-700 hover:text-indigo-700 transition-all self-start"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour au tableau de bord
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
                <li className="text-gray-900 font-medium">Catégories</li>
              </ol>
            </nav>
          </div>

          {/* Hero — fond blanc, encadré discret */}
          <section className="relative rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-gray-200 p-6 sm:p-10 mb-10">
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                    Catalogue
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 break-words">
                  Explorez toutes nos catégories
                </h1>
                <p className="text-gray-600 max-w-2xl leading-relaxed text-sm sm:text-base">
                  Trouvez exactement ce que vous cherchez grâce à notre
                  catalogue organisé par thèmes.
                </p>
              </div>

              <div className="flex gap-3 flex-wrap sm:flex-col">
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 min-w-[120px] shadow-sm">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Catégories
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {totalRoots}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 min-w-[120px] shadow-sm">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <Package className="w-3.5 h-3.5" />
                    Total
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {totalCategories}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Grille catégories */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="w-1 h-6 bg-indigo-600 rounded-full" />
                Toutes les catégories
              </h2>
              <p className="text-sm text-gray-500">
                {rootCategories.length} catégorie
                {rootCategories.length > 1 ? 's' : ''}
                {totalCategories > rootCategories.length && (
                  <>
                    {' '}
                    · {totalCategories - rootCategories.length} sous-catégorie
                    {totalCategories - rootCategories.length > 1 ? 's' : ''}
                  </>
                )}
              </p>
            </div>

            {rootCategories.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                <div className="w-20 h-20 mx-auto bg-indigo-50 rounded-full flex items-center justify-center mb-5">
                  <LayoutGrid className="w-9 h-9 text-indigo-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Aucune catégorie pour l'instant
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto px-4">
                  Les catégories seront ajoutées progressivement.
                </p>
                <Link
                  href="/dashboard"
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition inline-flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour au tableau de bord
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {rootCategories.map((category) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    childCount={childrenCount[category.id] || 0}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Aperçu des sous-catégories */}
          {rootCategories.some((c) => (childrenCount[c.id] || 0) > 0) && (
            <section className="mb-12">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">
                  Aperçu des sous-catégories
                </h2>
              </div>

              <div className="space-y-4">
                {rootCategories
                  .filter((c) => (childrenCount[c.id] || 0) > 0)
                  .map((parent) => {
                    const children = categories.filter(
                      (c) => c.parent_id === parent.id
                    )
                    if (children.length === 0) return null

                    return (
                      <div
                        key={parent.id}
                        className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-indigo-200 transition-colors"
                      >
                        <Link
                          href={`/category/${parent.slug}`}
                          className="inline-flex items-center gap-2 mb-3 group"
                        >
                          <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition">
                            {parent.name}
                          </h3>
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                        </Link>
                        <div className="flex flex-wrap gap-2">
                          {children.map((child) => (
                            <Link
                              key={child.id}
                              href={`/category/${child.slug}`}
                              className="px-3 py-1.5 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 rounded-lg text-sm text-gray-700 hover:text-indigo-700 transition-all"
                            >
                              {child.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </section>
          )}

          {/* CTA final */}
          <section className="rounded-3xl bg-white border border-gray-200 p-8 text-center">
            <Sparkles className="w-10 h-10 text-indigo-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Vous ne trouvez pas ce que vous cherchez ?
            </h2>
            <p className="text-gray-500 mb-6 max-w-lg mx-auto">
              Explorez notre catalogue complet ou utilisez la recherche pour
              trouver exactement ce qu'il vous faut.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/products"
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition inline-flex items-center gap-2"
              >
                <Package className="w-4 h-4" />
                Voir tous les produits
              </Link>
              <Link
                href="/search"
                className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition inline-flex items-center gap-2"
              >
                Rechercher
              </Link>
            </div>
          </section>

        </div>
      </div>
    </>
  )
}