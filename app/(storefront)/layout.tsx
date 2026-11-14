import type { Metadata } from 'next'
import StorefrontFrame from '@/components/StorefrontFrame'
import './storefront.css'

export const metadata: Metadata = {
  title: 'TorrentTwist — Votre hub de ressources numériques',
  description: 'Découvrez ebooks, formations, templates et outils digitaux conçus pour faire avancer vos projets.',
}

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="storefront-theme">
      <StorefrontFrame>{children}</StorefrontFrame>
    </div>
  )
}
