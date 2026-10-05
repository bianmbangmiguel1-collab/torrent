// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { UserProvider } from '@/context/UserContext'
import NavigationLoader from '@/components/NavigationLoader'
import Script from 'next/script'
import './globals.css'

// ============================================================
// 🌐 BASE URL
// ============================================================

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://torrenttwist.com'

// ============================================================
// 📋 METADATA (SEO + Open Graph + Twitter)
// ============================================================

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),

  title: {
    default: 'TorrentTwist – Plateforme de produits numériques',
    template: '%s | TorrentTwist',
  },
  description:
    'Découvrez les meilleurs produits numériques, formations, templates et ressources pour booster votre activité.',
  keywords: [
    'produits numériques',
    'formation',
    'templates',
    'logiciels',
    'ebooks',
    'TorrentTwist',
  ],
  authors: [{ name: 'TorrentTwist', url: APP_URL }],
  creator: 'TorrentTwist',
  publisher: 'TorrentTwist',
  applicationName: 'TorrentTwist',
  generator: 'Next.js',
  category: 'marketplace',

  alternates: {
    canonical: '/',
  },

  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: APP_URL,
    siteName: 'TorrentTwist',
    title: 'TorrentTwist – Plateforme de produits numériques',
    description:
      'Découvrez les meilleurs produits numériques pour votre activité.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'TorrentTwist – Futur Du Numérique',
        type: 'image/jpeg',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'TorrentTwist – Plateforme de produits numériques',
    description:
      'Découvrez les meilleurs produits numériques pour votre activité.',
    images: ['/og-image.jpg'],
    creator: '@torrenttwist',
  },

  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

    icons: {
    icon: [
      { url: '/torrent-icon.png', sizes: '192x192', type: 'image/png' },
      { url: '/torrent-icon.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/torrent-icon.png', sizes: '180x180' }],
    shortcut: ['/torrent-icon.png'],
  },

  manifest: '/manifest.json',

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

// ============================================================
// 📱 VIEWPORT
// ============================================================

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#4f46e5' },
    { media: '(prefers-color-scheme: dark)', color: '#1e1b4b' },
  ],
  colorScheme: 'light',
}

// ============================================================
// 🏠 ROOT LAYOUT
// ============================================================

export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* PRECONNECT (performance) */}
        <link rel="preconnect" href="https://cdn.fedapay.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://cdn.fedapay.com" />

        <link rel="preconnect" href="https://api.fedapay.com" />
        <link rel="dns-prefetch" href="https://api.fedapay.com" />

        {/* Chariow (API uniquement, pas de script client) */}
        <link rel="preconnect" href="https://api.chariow.com" />
        <link rel="dns-prefetch" href="https://api.chariow.com" />

        <link rel="preconnect" href="https://payment.chariow.com" />
        <link rel="dns-prefetch" href="https://payment.chariow.com" />

        <link rel="icon" href="/torrent-icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/torrent-icon.png" />

        <meta name="theme-color" content="#4f46e5" />
      </head>

      <body className="antialiased">
        <UserProvider>
          {children}
          {modal}
        </UserProvider>

        {/* ============================================================
            💳 SCRIPT FEDAPAY
            ⚠️ PAS de onLoad / onError ici (Server Component)
        ============================================================ */}
        <Script
          id="fedapay-checkout-script"
          src="https://cdn.fedapay.com/checkout.js?v=1.1.7"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}