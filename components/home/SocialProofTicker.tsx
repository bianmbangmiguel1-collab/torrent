// components/home/SocialProofTicker.tsx
'use client'

import { useEffect, useState } from 'react'
import { ShoppingBag, Heart, Star, TrendingUp } from 'lucide-react'

const NOTIFICATIONS = [
  { name: 'Marie L.', action: 'vient d\'acheter', product: 'Formation Marketing', time: '2 min', icon: ShoppingBag, color: 'text-green-600' },
  { name: 'Jean P.', action: 'a ajouté aux favoris', product: 'Template Web Pro', time: '5 min', icon: Heart, color: 'text-red-500' },
  { name: 'Sophie D.', action: 'a laissé 5 étoiles à', product: 'Ebook Business', time: '8 min', icon: Star, color: 'text-amber-500' },
  { name: 'Ahmed K.', action: 'vient d\'acheter', product: 'Pack Graphiste', time: '12 min', icon: ShoppingBag, color: 'text-green-600' },
  { name: 'Fatou N.', action: 'recommande', product: 'Cours Photo', time: '15 min', icon: TrendingUp, color: 'text-blue-500' },
  { name: 'Paul M.', action: 'vient d\'acheter', product: 'Licence Pro', time: '20 min', icon: ShoppingBag, color: 'text-green-600' },
]

export default function SocialProofTicker() {
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Afficher toutes les 5s, pendant 4s
    const loop = () => {
      setVisible(true)
      setTimeout(() => setVisible(false), 4000)
      setTimeout(() => setCurrent(c => (c + 1) % NOTIFICATIONS.length), 5000)
    }

    // Premier affichage après 3s
    const initialTimer = setTimeout(loop, 3000)
    const interval = setInterval(loop, 5000)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(interval)
    }
  }, [])

  const notif = NOTIFICATIONS[current]
  const Icon = notif.icon

  return (
    <div className="fixed bottom-4 left-4 z-40 pointer-events-none">
      <div
        className={`transition-all duration-500 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 pr-4 max-w-xs flex items-center gap-3 pointer-events-auto">
          <div className={`w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${notif.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">
              <strong className="text-gray-900">{notif.name}</strong> {notif.action}
            </p>
            <p className="text-sm font-semibold text-gray-900 truncate">{notif.product}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Il y a {notif.time}</p>
          </div>
        </div>
      </div>
    </div>
  )
}