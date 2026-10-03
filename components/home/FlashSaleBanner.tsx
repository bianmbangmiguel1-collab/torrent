// components/home/FlashSaleBanner.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Zap, Clock, ChevronRight, Flame } from 'lucide-react'

interface Product {
  id: number
  title: string
  slug: string
  price: number
  compare_price: number | null
  main_image: string | null
}

export default function FlashSaleBanner({ products }: { products: Product[] }) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 })

  useEffect(() => {
    // Fin de la vente flash : dans 24h à minuit
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const update = () => {
      const diff = endOfDay.getTime() - Date.now()
      if (diff <= 0) return
      setTimeLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  if (products.length === 0) return null

  return (
    <div className="mb-6 sm:mb-8">
      <div className="relative bg-gradient-to-r from-red-600 via-orange-500 to-red-600 rounded-3xl p-5 sm:p-6 overflow-hidden shadow-2xl shadow-red-500/30">
        {/* Décor animé */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-yellow-300 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 animate-pulse" />
        </div>

        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Gauche : titre + timer */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center animate-bounce">
              <Zap className="w-7 h-7 text-white fill-yellow-300" />
            </div>
            <div className="text-white">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 fill-yellow-300 text-yellow-300" />
                <h3 className="font-bold text-lg sm:text-xl">VENTE FLASH</h3>
                <span className="px-2 py-0.5 bg-yellow-300 text-red-700 text-xs font-bold rounded-full">
                  -{Math.round((1 - products[0].price / (products[0].compare_price || products[0].price)) * 100)}%
                </span>
              </div>
              <p className="text-sm text-white/90 mt-0.5">Offres exceptionnelles, ne les manquez pas !</p>
            </div>
          </div>

          {/* Centre : timer */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-white/80" />
            {[
              { label: 'H', value: timeLeft.h },
              { label: 'MIN', value: timeLeft.m },
              { label: 'SEC', value: timeLeft.s },
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="bg-white text-red-700 rounded-lg px-2.5 py-1.5 min-w-[42px] text-center">
                  <div className="text-xl font-black tabular-nums leading-none">
                    {String(t.value).padStart(2, '0')}
                  </div>
                  <div className="text-[9px] font-bold uppercase opacity-70">{t.label}</div>
                </div>
                {i < 2 && <span className="text-white font-black text-xl">:</span>}
              </div>
            ))}
          </div>

          {/* Droite : CTA */}
          <Link href="/products?promo=true">
            <div className="px-5 py-2.5 bg-white text-red-600 rounded-xl font-bold hover:shadow-lg transition flex items-center gap-2 cursor-pointer">
              Voir les offres
              <ChevronRight className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}