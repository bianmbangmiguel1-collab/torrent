// components/product/LiveActivityFeed.tsx
'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Heart, Star, CheckCircle2, Users, X } from 'lucide-react'

interface Activity {
  id: number
  name: string
  action: string
  product: string
  time: string
  icon: any
  color: string
}

const FAKE_NAMES = [
  'Marie L.', 'Jean P.', 'Sophie D.', 'Ahmed K.', 'Fatou N.',
  'Paul M.', 'Aïcha B.', 'Karim R.', 'Linda T.', 'David K.',
  'Aminata S.', 'Moussa D.', 'Grace T.', 'Ibrahim C.', 'Yvonne N.',
  'Samuel B.', 'Nadia M.', 'Emmanuel K.', 'Rokia B.', 'Patrick O.',
  'Christelle A.', 'Youssef B.', 'Sylvie N.', 'Hassan A.', 'Brigitte T.',
  'Omar S.', 'Céline M.', 'Adama D.', 'Estelle K.', 'Boubacar N.',
  'Josiane T.', 'Souleymane B.', 'Nadège F.', 'Mamadou D.', 'Aurélie K.',
  'Idrissa S.', 'Sandrine M.', 'Ousmane B.', 'Vanessa T.', 'Alioune D.',
  'Rachelle N.', 'Bakary S.', 'Prisca M.', 'Cheikh D.', 'Léonie K.',
  'Modibo S.', 'Chantal T.', 'Ismaël B.', 'Solange D.', 'Abdoulaye N.',
]

export default function LiveActivityFeed({ productTitle }: { productTitle: string }) {
  const [current, setCurrent] = useState<Activity | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (dismissed) return

    const generateActivity = (): Activity => {
      const name = FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)]
      const actions = [
        { action: 'vient d\'acheter', icon: ShoppingBag, color: 'text-green-600 bg-green-50' },
        { action: 'a ajouté aux favoris', icon: Heart, color: 'text-red-500 bg-red-50' },
        { action: 'a laissé 5 étoiles à', icon: Star, color: 'text-amber-500 bg-amber-50' },
      ]
      const picked = actions[Math.floor(Math.random() * actions.length)]

      return {
        id: Date.now(),
        name,
        action: picked.action,
        product: productTitle,
        time: `${Math.floor(Math.random() * 25) + 1} min`,
        icon: picked.icon,
        color: picked.color,
      }
    }

    // Premier affichage après 5s
    const initialTimer = setTimeout(() => {
      setCurrent(generateActivity())
    }, 5000)

    // Changer toutes les 15s
    const interval = setInterval(() => {
      setCurrent(generateActivity())
    }, 15000)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(interval)
    }
  }, [productTitle, dismissed])

  if (dismissed || !current) return null

  const Icon = current.icon

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -100 }}
        className="fixed bottom-6 left-6 z-40 max-w-xs"
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 pr-4 flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${current.color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">
              <strong className="text-gray-900">{current.name}</strong> {current.action}
            </p>
            <p className="text-sm font-semibold text-gray-900 truncate">{current.product}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Il y a {current.time}</p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-gray-300 hover:text-gray-500 flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}