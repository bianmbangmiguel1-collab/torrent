'use client'
import Link from 'next/link'
import Image from 'next/image'
import { Star, ArrowRight, Sparkles, Flame, TrendingUp } from 'lucide-react'

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
  product: Product
  showBadge?: 'new' | 'promotion' | 'popular' | 'trending' | null
  priority?: boolean
}

export default function AnimatedProductCard({ product, showBadge, priority = false }: Props) {
  const hasPromo = product.compare_price && product.compare_price > product.price
  const discount = hasPromo
    ? Math.round((1 - product.price / product.compare_price!) * 100)
    : 0

  return (
    <Link
      href={`/product/${product.slug}`}
      className="
        group relative block bg-white rounded-2xl border border-gray-100
        overflow-hidden no-underline
        transition-all duration-300 ease-out
        hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-500/10
        focus:outline-none focus:ring-4 focus:ring-indigo-500/20
      "
    >
      {/* ───── IMAGE ───── */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">

        {product.main_image ? (
          <Image
            src={product.main_image}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            priority={priority}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Sparkles className="w-12 h-12" />
          </div>
        )}

        {/* Badges */}
        {showBadge === 'new' && (
          <span className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-bold uppercase tracking-wide shadow-lg z-20">
            ✨ Nouveau
          </span>
        )}
        {showBadge === 'trending' && (
          <span className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold uppercase tracking-wide shadow-lg flex items-center gap-1 z-20">
            <Flame className="w-3 h-3" /> Tendance
          </span>
        )}
        {showBadge === 'popular' && (
          <span className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-bold uppercase tracking-wide shadow-lg flex items-center gap-1 z-20">
            <TrendingUp className="w-3 h-3" /> Top
          </span>
        )}

        {hasPromo && (
          <span className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-gradient-to-r from-red-500 to-rose-500 text-white text-[10px] font-bold shadow-lg z-20">
            -{discount}%
          </span>
        )}

        {/* Overlay "Voir le produit" au survol */}
        <div
          className="
            absolute inset-x-0 bottom-0 p-3 z-10
            bg-gradient-to-t from-black/80 via-black/40 to-transparent
            translate-y-full opacity-0
            transition-all duration-300 ease-out
            group-hover:translate-y-0 group-hover:opacity-100
          "
        >
          <span className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white text-indigo-600 text-sm font-bold shadow-lg">
            Voir le produit
            <ArrowRight className="w-4 h-4" />
          </span>
        </div>

        {/* ✅ FLÈCHE TOUJOURS VISIBLE — coin bas droit */}
        <div
          className="
            absolute bottom-2 right-2 z-30
            w-9 h-9 rounded-full
            bg-white/95 backdrop-blur shadow-lg
            flex items-center justify-center
            transition-transform duration-300
            group-hover:scale-110 group-hover:bg-indigo-600
          "
        >
          <ArrowRight
            className="
              w-4 h-4 text-indigo-600
              transition-colors duration-300
              group-hover:text-white
              animate-[cardArrowBounce_1.6s_ease-in-out_infinite]
            "
          />
        </div>
      </div>

      {/* ───── CONTENU ───── */}
      <div className="p-3 sm:p-4">
        <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate group-hover:text-indigo-600 transition-colors">
          {product.title}
        </h3>

        {product.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mt-1 min-h-[32px]">
            {product.description.replace(/<[^>]*>/g, '').slice(0, 80)}
          </p>
        )}

        <div className="flex items-end justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="flex flex-col">
            {hasPromo && (
              <span className="text-[10px] text-gray-400 line-through">
                {product.compare_price!.toLocaleString()} F
              </span>
            )}
            <span className="font-bold text-indigo-600 text-sm sm:text-base">
              {product.price.toLocaleString()} F
            </span>
          </div>

          {product.avg_rating !== undefined && product.avg_rating > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium text-gray-600">
                {product.avg_rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}