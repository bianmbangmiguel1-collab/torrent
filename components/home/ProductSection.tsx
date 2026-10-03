'use client'
import { ReactNode, useRef } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import AnimatedProductCard from './AnimatedProductCard'

interface Product {
  id: number
  slug: string
  title: string
  description?: string | null
  price: number
  compare_price?: number | null
  avg_rating?: number
  review_count?: number
  sales_count?: number
  main_image?: string | null
  is_new?: number
}

interface Props {
  title: string
  subtitle?: string
  icon?: ReactNode
  products: Product[]
  viewAllLink?: string
  showBadge?: 'new' | 'promotion' | 'popular' | 'trending' | null
  carousel?: boolean
  showSort?: boolean
  itemsPerRow?: { mobile?: number; tablet?: number; desktop?: number; large?: number }
}

export default function ProductSection({
  title,
  subtitle,
  icon,
  products,
  viewAllLink,
  showBadge = null,
  carousel = false,
  showSort = true,
  itemsPerRow = { mobile: 2, tablet: 3, desktop: 4, large: 5 },
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  if (!products || products.length === 0) return null

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    const amount = scrollRef.current.clientWidth * 0.8
    scrollRef.current.scrollBy({
      left: dir === 'right' ? amount : -amount,
      behavior: 'smooth',
    })
  }

  const gridCols = `grid-cols-${itemsPerRow.mobile ?? 2} sm:grid-cols-${itemsPerRow.tablet ?? 3} md:grid-cols-${itemsPerRow.desktop ?? 4} xl:grid-cols-${itemsPerRow.large ?? 5}`

  return (
    <section className="mb-8 sm:mb-10 md:mb-14">

      {/* ───── En-tête de section ───── */}
      <div className="flex items-center justify-between gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs sm:text-sm text-gray-500 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Boutons carrousel */}
          {carousel && (
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => scroll('left')}
                className="w-8 h-8 rounded-full border border-gray-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 flex items-center justify-center transition"
                aria-label="Précédent"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="w-8 h-8 rounded-full border border-gray-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 flex items-center justify-center transition"
                aria-label="Suivant"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          )}

          {/* Lien "Voir tout" */}
          {viewAllLink && (
            <Link
              href={viewAllLink}
              className="text-xs sm:text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
            >
              Voir tout
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* ───── Grille ou carrousel ───── */}
      {carousel ? (
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden"
        >
          {products.map((p, i) => (
            <div
              key={p.id}
              className="snap-start shrink-0 w-[160px] sm:w-[200px] md:w-[220px]"
            >
              <AnimatedProductCard
                product={p}
                showBadge={showBadge}
                priority={i < 2}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className={`grid ${gridCols} gap-3 sm:gap-4`}>
          {products.map((p, i) => (
            <AnimatedProductCard
              key={p.id}
              product={p}
              showBadge={showBadge}
              priority={i < 2}
            />
          ))}
        </div>
      )}
    </section>
  )
}