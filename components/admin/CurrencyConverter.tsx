// components/admin/CurrencyConverter.tsx
'use client'

import { useState, useEffect } from 'react'

interface Currency {
  code: string
  name: string
  symbol: string
  rate_to_default: number
  is_default: boolean
}

interface CurrenciesApiResponse {
  currencies?: Currency[]
  error?: string
}

interface CurrencyConverterProps {
  amount: number
  baseCurrency: string
}

export default function CurrencyConverter({ amount, baseCurrency }: CurrencyConverterProps) {
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [conversions, setConversions] = useState<{ currency: string; amount: number; symbol: string }[]>([])

  useEffect(() => {
    fetchCurrencies()
  }, [])

  useEffect(() => {
    if (currencies.length > 0 && amount > 0) {
      convertAmounts()
    } else if (amount === 0) {
      setConversions([])
    }
  }, [currencies, amount, baseCurrency])

  const fetchCurrencies = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/currencies')
      if (!res.ok) {
        throw new Error('Erreur lors du chargement des devises')
      }
      const data = (await res.json()) as CurrenciesApiResponse
      setCurrencies(data.currencies || [])
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const convertAmounts = () => {
    // Trouver la devise de base (celle qui a le taux 1)
    const base = currencies.find(c => c.code === baseCurrency) || currencies.find(c => c.is_default)
    if (!base) return

    // Calculer les conversions pour chaque devise (sauf la devise de base elle-même)
    const results = currencies
      .filter(curr => curr.code !== baseCurrency) // exclure la devise de base
      .map(curr => {
        // Taux de conversion : (taux de la devise cible / taux de la devise de base)
        const rate = curr.rate_to_default / base.rate_to_default
        return {
          currency: curr.code,
          amount: Math.round(amount * rate),
          symbol: curr.symbol
        }
      })
      // Filtrer les montants > 0 pour éviter d'afficher 0
      .filter(r => r.amount > 0)

    setConversions(results)
  }

  if (loading) {
    return (
      <div className="text-sm text-gray-500 flex items-center gap-2">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Chargement des taux de change...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {error}
        <button onClick={fetchCurrencies} className="text-blue-500 hover:underline ml-2">
          Réessayer
        </button>
      </div>
    )
  }

  if (conversions.length === 0) {
    return (
      <div className="text-sm text-gray-400">
        Aucune conversion disponible
      </div>
    )
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-700">Conversion en temps réel</h4>
        <span className="text-xs text-gray-400">
          Base: {baseCurrency}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {conversions.map((conv) => (
          <div key={conv.currency} className="bg-white p-3 rounded border border-gray-200 shadow-sm">
            <div className="text-xs text-gray-500">{conv.currency}</div>
            <div className="font-semibold text-gray-800">
              {conv.symbol} {conv.amount.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-gray-400">
        Taux de change mis à jour automatiquement
      </div>
    </div>
  )
}