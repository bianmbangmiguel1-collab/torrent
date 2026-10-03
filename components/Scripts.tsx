// components/Scripts.tsx
'use client'

import Script from 'next/script'

export default function Scripts() {
  return (
    <Script
      id="fedapay-checkout-script"
      src="https://js.fedapay.com/v3/checkout.js"
      strategy="afterInteractive"
      onLoad={() => {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ FedaPay Checkout script chargé')
        }
      }}
      onError={(e) => {
        console.error('❌ FedaPay script erreur:', e)
      }}
    />
  )
}