// components/home/LimitedStockAlert.tsx
'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { AlertTriangle, Clock, ArrowRight } from 'lucide-react'

interface Product {
  id: number
  title: string
  slug: string
  price: number
  compare_price: number | null
  main_image: string | null
  stock?: number
}

export default function LimitedStockAlert({ products }: { products: Product[] }) {
  if (!products || products.length === 0) return null

  return (
    <section className="mb-6 sm:mb-8">
      <div className="bg-gradient-to-r from-amber-50 to-red-50 rounded-2xl border-2 border-dashed border-amber-300 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </motion.div>
          <h3 className="font-bold text-amber-900">⚡ Stock limité — Ne tardez pas !</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {products.slice(0, 3).map((product, idx) => {
            const stockLeft = Math.max(3, Math.floor(Math.random() * 15) + 3)
            const percentLeft = Math.max(10, Math.min(80, (stockLeft / 30) * 100))

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-xl p-3 border border-amber-200"
              >
                <Link href={`/product/${product.slug}`} className="block">
                  <div className="flex items-center gap-3 mb-2">
                    {product.main_image && (
                      <img
                        src={product.main_image}
                        alt={product.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{product.title}</p>
                      <p className="text-xs text-gray-500">
                        <strong className="text-red-600">{stockLeft} restants</strong> sur 30
                      </p>
                    </div>
                  </div>

                  {/* Barre de progression stock */}
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentLeft}%` }}
                      transition={{ duration: 1, delay: idx * 0.1 }}
                      className={`h-full rounded-full ${
                        percentLeft < 30
                          ? 'bg-gradient-to-r from-red-500 to-red-600'
                          : 'bg-gradient-to-r from-amber-500 to-orange-500'
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Bientôt épuisé
                    </span>
                    <span className="text-xs text-amber-700 font-bold flex items-center gap-1">
                      Voir <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}