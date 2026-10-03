// lib/chariow.ts
// ============================================================
// 💳 Client Chariow — API v1
// Docs : https://api.chariow.com/v1
// ============================================================

const CHARIOW_API_URL =
  process.env.CHARIOW_API_URL || 'https://api.chariow.com/v1'

// ============================================================
// TYPES
// ============================================================

interface ChariowResponse<T> {
  message: string
  data: T
  errors: unknown
}

export interface ChariowCheckoutResult {
  step: 'payment' | 'completed' | 'already_purchased'
  message: string | null
  purchase: {
    id: string
    status: string
    amount?: {
      value: number
      currency: string
      formatted: string
    }
  } | null
  payment: {
    checkout_url: string | null
    transaction_id: string | null
  } | null
}

export interface CreateChariowCheckoutInput {
  productId: string
  email: string
  firstName: string
  lastName: string
  phone: string
  countryCode: string
  redirectUrl?: string
  paymentCurrency?: string
  customMetadata?: Record<string, string>
  customerIp?: string
}

// ============================================================
// 🚀 CRÉER UN CHECKOUT
// ============================================================

export async function createChariowCheckout(
  input: CreateChariowCheckoutInput
): Promise<ChariowCheckoutResult> {
  const apiKey = process.env.CHARIOW_API_KEY

  if (!apiKey) {
    throw new Error('CHARIOW_API_KEY est manquante dans .env.local')
  }

  const body: Record<string, unknown> = {
    product_id: input.productId,
    email: input.email,
    first_name: input.firstName,
    last_name: input.lastName,
    phone: {
      number: input.phone.replace(/\D/g, ''),
      country_code: input.countryCode,
    },
  }

  if (input.redirectUrl) body.redirect_url = input.redirectUrl
  if (input.paymentCurrency) body.payment_currency = input.paymentCurrency
  if (input.customMetadata) body.custom_metadata = input.customMetadata
  if (input.customerIp) body.customer_ip = input.customerIp

  console.log('💳 Chariow → création checkout')
  console.log('   Produit :', input.productId)
  console.log('   Email :', input.email)
  console.log('   Currency :', input.paymentCurrency || 'XOF')

  const response = await fetch(`${CHARIOW_API_URL}/checkout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })

  const rawText = await response.text()
  let result: ChariowResponse<ChariowCheckoutResult>

  try {
    result = JSON.parse(rawText)
  } catch {
    throw new Error(
      `Réponse Chariow non-JSON (${response.status}) : ${rawText.slice(0, 300)}`
    )
  }

  if (!response.ok) {
    const errDetail = JSON.stringify(result.errors || result.message)
    console.error('❌ Chariow erreur:', response.status, errDetail)
    throw new Error(`Chariow ${response.status}: ${errDetail}`)
  }

  if (!result.data) {
    throw new Error('Chariow : données vides dans la réponse')
  }

  console.log('✅ Chariow checkout créé')
  console.log('   Step :', result.data.step)
  console.log('   Purchase ID :', result.data.purchase?.id)
  console.log('   Checkout URL :', result.data.payment?.checkout_url)

  return result.data
}

// ============================================================
// 🩺 DIAGNOSTIC
// ============================================================

export function getChariowConfigInfo() {
  const key = process.env.CHARIOW_API_KEY
  if (!key) return { configured: false, keyPrefix: '', apiUrl: CHARIOW_API_URL }

  return {
    configured: true,
    keyPrefix: key.slice(0, 15) + '...',
    apiUrl: CHARIOW_API_URL,
  }
}