// app/api/payments/fedapay/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { extractToken, verifyToken, getUserId } from '@/lib/auth'
import dns from 'dns'

// Force la résolution IPv4 en priorité (contourne les timeouts DNS)
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first')
}

// ============================================================
// TYPES
// ============================================================

interface FedaPayCreateBody {
  orderId?: number | string
}

// ============================================================
// CONFIGURATION FEDAPAY
// ============================================================

const FEDAPAY_SECRET_KEY = process.env.FEDAPAY_SECRET_KEY
const FEDAPAY_ENVIRONMENT = process.env.FEDAPAY_ENVIRONMENT || 'sandbox'
const FEDAPAY_API_URL =
  FEDAPAY_ENVIRONMENT === 'live'
    ? 'https://api.fedapay.com/v1'
    : 'https://sandbox-api.fedapay.com/v1'

// ============================================================
// 🔄 FETCH ROBUSTE avec retry + timeout long
// ============================================================

const FETCH_TIMEOUT_MS = 30_000
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fedapayFetch(
  endpoint: string,
  body: any
): Promise<{
  ok: boolean
  status: number
  data: any
  error?: string
}> {
  const url = `${FEDAPAY_API_URL}${endpoint}`
  let lastError: any = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const startTime = Date.now()

    try {
      console.log(`📡 FedaPay [${attempt}/${MAX_RETRIES}] → POST ${endpoint}`)

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${FEDAPAY_SECRET_KEY}`,
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timer)
      const elapsed = Date.now() - startTime

      const rawBody = await res.text()
      let data: any = null
      try {
        data = rawBody ? JSON.parse(rawBody) : null
      } catch {
        data = { raw: rawBody }
      }

      if (res.ok) {
        console.log(`✅ FedaPay ${res.status} en ${elapsed}ms`)
        return { ok: true, status: res.status, data }
      }

      if (res.status >= 500 && attempt < MAX_RETRIES) {
        console.warn(
          `⚠️ FedaPay ${res.status} (retry dans ${RETRY_DELAY_MS * attempt}ms)`
        )
        lastError = { status: res.status, data }
        await sleep(RETRY_DELAY_MS * attempt)
        continue
      }

      console.error(`❌ FedaPay ${res.status} en ${elapsed}ms`)
      return {
        ok: false,
        status: res.status,
        data,
        error: data?.message || `HTTP ${res.status}`,
      }
    } catch (err: any) {
      clearTimeout(timer)
      const elapsed = Date.now() - startTime
      lastError = err

      const isTimeout =
        err.name === 'AbortError' ||
        err.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        err.message?.includes('timeout')

      const isNetworkError =
        err.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        err.code === 'ECONNREFUSED' ||
        err.code === 'ENOTFOUND' ||
        err.message?.includes('fetch failed')

      console.warn(
        `⚠️ FedaPay tentative ${attempt}/${MAX_RETRIES} échouée en ${elapsed}ms :`,
        isTimeout ? 'TIMEOUT' : isNetworkError ? 'RÉSEAU' : err.message
      )

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt)
        continue
      }
    }
  }

  const isTimeout =
    lastError?.name === 'AbortError' ||
    lastError?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
    lastError?.message?.includes('timeout')

  return {
    ok: false,
    status: 0,
    data: null,
    error: isTimeout
      ? 'Le serveur de paiement FedaPay est injoignable. Réessaie dans quelques secondes.'
      : lastError?.message || 'Erreur réseau',
  }
}

// ============================================================
// POST /api/payments/fedapay/create
// ============================================================

export async function POST(req: NextRequest) {
  try {
    console.log('========================================')
    console.log('💳 FEDAPAY - INITIALISATION PAIEMENT')
    console.log('========================================')

    // ============================================================
    // 0. DEBUG COOKIES
    // ============================================================
    const allCookies = req.cookies.getAll()
    console.log('🍪 Cookies reçus:', allCookies.map((c) => c.name))

    const userSession = req.cookies.get('user_session')?.value
    const adminSession = req.cookies.get('admin_session')?.value
    const tokenCookie = req.cookies.get('token')?.value

    console.log('🔑 user_session:', userSession ? '✅ Présent' : '❌ Absent')
    console.log('🔑 admin_session:', adminSession ? '✅ Présent' : '❌ Absent')
    console.log('🔑 token (cookie):', tokenCookie ? '✅ Présent' : '❌ Absent')

    // ============================================================
    // 1. AUTHENTIFICATION
    // ============================================================
    let token = extractToken(req)

    if (!token && userSession) {
      token = userSession
      console.log('🔑 Token récupéré manuellement depuis user_session')
    }

    if (!token && adminSession) {
      token = adminSession
      console.log('🔑 Token récupéré manuellement depuis admin_session')
    }

    if (!token) {
      console.log('❌ Aucun token trouvé')
      return NextResponse.json(
        { error: 'Non authentifié', code: 'AUTH_TOKEN_MISSING' },
        { status: 401 }
      )
    }

    console.log('🔐 Token extrait:', token.substring(0, 20) + '...')

    const decoded = await verifyToken(token)
    if (!decoded) {
      console.log('❌ JWT invalide ou expiré')
      return NextResponse.json(
        { error: 'Session invalide ou expirée', code: 'AUTH_TOKEN_INVALID' },
        { status: 401 }
      )
    }

    const userId = getUserId(decoded)
    console.log('👤 User ID:', userId)

    if (!userId) {
      return NextResponse.json(
        { error: 'Utilisateur non identifié', code: 'AUTH_USER_ID_MISSING' },
        { status: 401 }
      )
    }

    // ============================================================
    // 2. BODY
    // ============================================================
    let body: FedaPayCreateBody
    try {
      body = (await req.json()) as FedaPayCreateBody
    } catch {
      return NextResponse.json(
        { error: 'Corps de requête invalide', code: 'INVALID_JSON' },
        { status: 400 }
      )
    }

    const orderId = Number(body?.orderId)
    console.log('📦 Order ID reçu:', orderId)

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json(
        { error: 'orderId invalide', code: 'INVALID_ORDER_ID' },
        { status: 400 }
      )
    }

    // ============================================================
    // 3. DB
    // ============================================================
    const db = await getDB()

    // ============================================================
    // 4. COMMANDE
    // ============================================================
    const order = await db.get(
      `
      SELECT
        o.*,
        u.id AS customer_id,
        u.email AS customer_email,
        u.name AS customer_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
      LIMIT 1
      `,
      [orderId]
    )

    if (!order) {
      console.log('❌ Commande introuvable:', orderId)
      return NextResponse.json(
        { error: 'Commande non trouvée', code: 'ORDER_NOT_FOUND' },
        { status: 404 }
      )
    }

    console.log('✅ Commande trouvée:', {
      id: order.id,
      user_id: order.user_id,
      product_id: order.product_id,
      product_title: order.product_title,
      payment_status: order.payment_status,
      transaction_id: order.transaction_id,
    })

    // ============================================================
    // 5. PROPRIÉTAIRE
    // ============================================================
    if (Number(order.user_id) !== Number(userId)) {
      console.log('❌ Commande appartenant à un autre utilisateur')
      return NextResponse.json(
        { error: 'Accès non autorisé', code: 'ORDER_FORBIDDEN' },
        { status: 403 }
      )
    }

    // ============================================================
    // 6. DÉJÀ PAYÉE ?
    // ============================================================
    if (String(order.payment_status || '').toLowerCase() === 'paid') {
      console.log('⚠️ Commande déjà payée:', order.id)
      return NextResponse.json(
        { error: 'Cette commande est déjà payée', code: 'ORDER_ALREADY_PAID' },
        { status: 409 }
      )
    }

    // ============================================================
    // 7. PRODUIT
    // ============================================================
    let product = null
    let productId = Number(order.product_id)

    if (Number.isInteger(productId) && productId > 0) {
      product = await db.get(
        `SELECT id, title, price FROM products WHERE id = ? LIMIT 1`,
        [productId]
      )
      console.log('🔍 Produit via order.product_id:', product ? '✅' : '❌')
    }

    if (!product) {
      const orderItem = await db.get(
        `SELECT product_id FROM order_items WHERE order_id = ? LIMIT 1`,
        [orderId]
      )
      if (orderItem?.product_id) {
        product = await db.get(
          `SELECT id, title, price FROM products WHERE id = ?`,
          [orderItem.product_id]
        )
        console.log('🔍 Produit via order_items:', product ? '✅' : '❌')
      }
    }

    if (!product && order.product_title) {
      product = await db.get(
        `SELECT id, title, price FROM products WHERE title = ? LIMIT 1`,
        [order.product_title]
      )
      console.log('🔍 Produit via product_title:', product ? '✅' : '❌')
    }

    if (!product && order.product_title) {
      product = await db.get(
        `SELECT id, title, price FROM products WHERE title LIKE ? LIMIT 1`,
        [`%${order.product_title}%`]
      )
      console.log('🔍 Produit via LIKE title:', product ? '✅' : '❌')
    }

    if (!product) {
      console.error('❌ Produit non trouvé pour la commande', orderId)
      return NextResponse.json(
        { error: 'Produit non trouvé', code: 'PRODUCT_NOT_FOUND' },
        { status: 404 }
      )
    }

    const realAmount = Math.round(product.price)
    const productTitle = product.title

    console.log('🔐 Prix réel en base:', realAmount)
    console.log('📦 Produit:', productTitle)

    // ============================================================
    // 8. CLÉ FEDAPAY
    // ============================================================
    if (!FEDAPAY_SECRET_KEY) {
      console.error('❌ FEDAPAY_SECRET_KEY non définie')
      return NextResponse.json(
        {
          error: 'Configuration du paiement indisponible',
          code: 'PAYMENT_CONFIGURATION_ERROR',
        },
        { status: 500 }
      )
    }

    console.log('🔐 Clé FedaPay serveur: ✅ Présente')
    console.log('🌍 Environnement:', FEDAPAY_ENVIRONMENT)

    // ============================================================
    // 9. CALLBACK URL
    // ============================================================
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const callbackUrl = `${appUrl}/payment/success?provider=fedapay&orderId=${order.id}`

    console.log('🔗 Callback URL:', callbackUrl)

    // ============================================================
    // 10. TRANSACTION DATA
    // ============================================================
    const transactionData = {
      description: `Paiement ${productTitle}`,
      amount: realAmount,
      currency: { iso: 'XOF' },
      callback_url: callbackUrl,
      customer: {
        email: order.customer_email || decoded.email,
        firstname: order.customer_name || decoded.name || 'Client',
      },
      custom_metadata: {
        orderId: Number(order.id),
        orderNumber: order.order_number || `ORD-${order.id}`,
        productId: Number(product.id),
        productTitle: productTitle,
        environment: FEDAPAY_ENVIRONMENT,
        timestamp: new Date().toISOString(),
      },
    }

    console.log('📦 Transaction:', {
      description: transactionData.description,
      amount: transactionData.amount,
      currency: transactionData.currency.iso,
      orderId: transactionData.custom_metadata.orderId,
      productId: transactionData.custom_metadata.productId,
      environment: FEDAPAY_ENVIRONMENT,
    })

    // ============================================================
    // 11. APPEL FEDAPAY (avec retry)
    // ============================================================
    const result = await fedapayFetch('/transactions', transactionData)

    if (!result.ok) {
      console.error('❌ FedaPay échoué:', result.error)

      const isRetryable =
        result.error?.includes('injoignable') ||
        result.error?.includes('timeout') ||
        result.error?.includes('réseau')

      return NextResponse.json(
        {
          error: result.error || 'Erreur lors de la création du paiement',
          code: isRetryable ? 'FEDAPAY_TIMEOUT' : 'FEDAPAY_TRANSACTION_ERROR',
          retryable: isRetryable,
        },
        { status: isRetryable ? 503 : result.status >= 400 ? result.status : 502 }
      )
    }

    // ============================================================
    // 12. PARSER LA RÉPONSE (structure FedaPay encapsulée)
    // ============================================================
    const transaction = result.data

    // La réponse est sous la forme { "v1/transaction": { ... } }
    const transactionDataRaw =
      transaction['v1/transaction'] || transaction.data || transaction

    const transactionId = transactionDataRaw?.id || null
    const transactionStatus = transactionDataRaw?.status || null
    const paymentUrl = transactionDataRaw?.payment_url || null

    console.log('✅ Transaction FedaPay créée:', transactionId)
    console.log('📊 Statut FedaPay:', transactionStatus)
    console.log('🔗 URL de paiement:', paymentUrl)

    if (!transactionId) {
      console.error("❌ FedaPay n'a pas retourné d'ID transaction")
      return NextResponse.json(
        { error: 'Transaction FedaPay invalide', code: 'FEDAPAY_TRANSACTION_INVALID' },
        { status: 502 }
      )
    }

    if (!paymentUrl) {
      console.error("❌ FedaPay n'a pas retourné d'URL de paiement")
      return NextResponse.json(
        { error: 'URL de paiement non reçue', code: 'FEDAPAY_PAYMENT_URL_MISSING' },
        { status: 502 }
      )
    }

    // ============================================================
    // 13. METTRE À JOUR LA COMMANDE
    // ============================================================
    await db.run(
      `
      UPDATE orders
      SET
        transaction_id = ?,
        payment_method = 'fedapay',
        payment_status = 'pending',
        updated_at = datetime('now')
      WHERE id = ?
      `,
      [String(transactionId), Number(order.id)]
    )

    console.log('✅ Commande mise à jour:', order.id)

    // ============================================================
    // 14. LOG PAYMENT
    // ============================================================
    try {
      await db.run(
        `INSERT INTO payment_logs (user_id, order_id, amount, method, status, reference, metadata)
         VALUES (?, ?, ?, 'fedapay', 'pending', ?, ?)`,
        [
          userId,
          orderId,
          realAmount,
          String(transactionId),
          JSON.stringify({
            payment_url: paymentUrl,
            environment: FEDAPAY_ENVIRONMENT,
            transaction_status: transactionStatus,
          }),
        ]
      )
    } catch (e) {
      console.warn('⚠️ payment_logs insert:', e)
    }

    // ============================================================
    // 15. RÉPONSE
    // ============================================================
    return NextResponse.json({
      success: true,
      orderId: Number(order.id),
      orderNumber: order.order_number,
      transactionId: transactionId,
      paymentUrl: paymentUrl,
      // Compat : certains clients utilisent checkout_url
      checkoutUrl: paymentUrl,
    })
  } catch (error: any) {
    console.error('❌ ERREUR CRITIQUE FEDAPAY:', error)
    return NextResponse.json(
      {
        error: "Erreur interne lors de l'initialisation du paiement",
        code: 'PAYMENT_INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'