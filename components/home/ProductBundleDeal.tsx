// components/home/ProductBundleDeal.tsx
'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Package, Percent, ShoppingCart, ArrowRight, Check } from 'lucide-react'

interface Product {
  id: number
  title: string
  slug: string
  price: number
  main_image: string | null
}

export default function ProductBundleDeal({ products }: { products: Product[] }) {
  if (!products || products.length < 2) return null

  const bundle = products.slice(0, 3)
  const totalIndividual = bundle.reduce((sum, p) => sum + p.price, 0)
  const bundleDiscount = 25 // %
  const bundlePrice = Math.round(totalIndividual * (1 - bundleDiscount / 100))
  const savings = totalIndividual - bundlePrice

  return (
    <section className="mb-6 sm:mb-8 md:mb-12">
      <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 rounded-3xl p-5 sm:p-6 border border-purple-100 overflow-hidden relative">
        {/* Décor */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-purple-200 rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2" />

        <div className="relative flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                🎁 Pack Économique
                <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
                  -{bundleDiscount}%
                </span>
              </h2>
              <p className="text-sm text-gray-600">Achetez ces {bundle.length} produits ensemble et économisez</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
          {/* Produits du bundle */}
          <div className="md:col-span-3 flex flex-col sm:flex-row items-center gap-3">
            {bundle.map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="relative flex-1 w-full sm:w-auto"
              >
                <Link href={`/product/${product.slug}`}>
                  <div className="bg-white rounded-xl p-2 border border-purple-100 hover:shadow-md transition">
                    {product.main_image ? (
                      <img
                        src={product.main_image}
                        alt={product.title}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                    <p className="text-xs font-medium text-gray-900 mt-2 line-clamp-1">{product.title}</p>
                    <p className="text-xs text-gray-500">{product.price.toLocaleString('fr-FR')} F</p>
                  </div>
                </Link>

                {/* + entre les produits */}
                {idx < bundle.length - 1 && (
                  <div className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-purple-500 rounded-full items-center justify-center text-white text-xs font-bold z-10">
                    +
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Prix + CTA */}
          <div className="md:col-span-2 bg-white rounded-2xl p-4 border-2 border-purple-200 shadow-lg">
            <div className="text-center mb-3">
              <p className="text-xs text-gray-500 line-through">
                {totalIndividual.toLocaleString('fr-FR')} F
              </p>
              <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                {bundlePrice.toLocaleString('fr-FR')} F
              </p>
              <p className="text-xs text-emerald-600 font-bold flex items-center justify-center gap-1 mt-1">
                <Check className="w-3 h-3" />
                Vous économisez {savings.toLocaleString('fr-FR')} F
              </p>
            </div>

            <Link href="/cart">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg transition cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                Acheter le pack
                <ArrowRight className="w-4 h-4" />
              </motion.div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}