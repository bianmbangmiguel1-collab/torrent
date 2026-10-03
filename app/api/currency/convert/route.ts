export const dynamic = 'force-dynamic';

// app/api/currency/convert/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

interface CurrencyConvertBody {
  amount: number
  from: string
  to?: string
  country?: string
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDB()
    const searchParams = request.nextUrl.searchParams
    const amount = parseFloat(searchParams.get('amount') || '0')
    const from = searchParams.get('from') || 'FCFA'
    const to = searchParams.get('to') || 'EUR'
    
    const fromRate = await db.get(
      'SELECT rate_to_default FROM currencies WHERE code = ?',
      [from]
    )
    const toRate = await db.get(
      'SELECT rate_to_default FROM currencies WHERE code = ?',
      [to]
    )
    
    if (!fromRate || !toRate) {
      return NextResponse.json(
        { error: 'Devise non trouvée' },
        { status: 404 }
      )
    }
    
    const convertedAmount = (amount / fromRate.rate_to_default) * toRate.rate_to_default
    
    return NextResponse.json({
      from,
      to,
      amount,
      converted: Math.round(convertedAmount * 100) / 100,
      rate: toRate.rate_to_default / fromRate.rate_to_default
    })
  } catch (error) {
    console.error('Erreur conversion:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la conversion' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDB()
    const { amount, from, to, country } =
      (await request.json()) as CurrencyConvertBody
    
    // Si un pays est spécifié, récupérer sa devise par défaut
    let targetCurrency = to
    if (country) {
      const countryData = await db.get(
        `SELECT c.code FROM countries co
         JOIN currencies c ON c.id = co.currency_id
         WHERE co.code = ?`,
        [country]
      )
      if (countryData) {
        targetCurrency = countryData.code
      }
    }
    
    // Récupérer les taux
    const fromRate = await db.get(
      'SELECT rate_to_default FROM currencies WHERE code = ?',
      [from]
    )
    const toRate = await db.get(
      'SELECT rate_to_default FROM currencies WHERE code = ?',
      [targetCurrency]
    )
    
    if (!fromRate || !toRate) {
      return NextResponse.json(
        { error: 'Devise non trouvée' },
        { status: 404 }
      )
    }
    
    const convertedAmount = (amount / fromRate.rate_to_default) * toRate.rate_to_default
    
    return NextResponse.json({
      from,
      to: targetCurrency,
      amount,
      converted: Math.round(convertedAmount * 100) / 100,
      rate: toRate.rate_to_default / fromRate.rate_to_default
    })
  } catch (error) {
    console.error('Erreur conversion:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la conversion' },
      { status: 500 }
    )
  }
}