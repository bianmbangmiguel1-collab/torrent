// app/api/webhooks/fedapay/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// ============================================================
// 🔐 VÉRIFIER LA SIGNATURE FEDAPAY
// FedaPay peut envoyer la signature en HEX ou en BASE64.
// On teste les deux pour être sûr.
// Header : x-fedapay-signature
// ============================================================

function verifyFedaPaySignature(
  rawBody: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false

  try {
    const hmac = crypto.createHmac('sha256', secret).update(rawBody, 'utf8')

    const hexSignature = hmac.digest('hex')
    const base64Signature = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('base64')

    // Comparaison à temps constant sur les 2 formats
    const sig = signature.trim()

    const tryCompare = (expected: string): boolean => {
      if (sig.length !== expected.length) return false
      try {
        return crypto.timingSafeEqual(
          Buffer.from(sig),
          Buffer.from(expected)
        )
      } catch {
        return false
      }
    }

    // Test HEX (format standard)
    if (tryCompare(hexSignature)) {
      console.log('✅ Signature FedaPay valide (hex)')
      return true
    }

    // Test BASE64 (parfois utilisé)
    if (tryCompare(base64Signature)) {
      console.log('✅ Signature FedaPay valide (base64)')
      return true
    }

    console.warn('❌ Signature FedaPay NON valide')
    console.warn('   Reçu:', sig.slice(0, 40) + '...')
    console.warn('   Attendu (hex):', hexSignature.slice(0, 40) + '...')
    return false
  } catch (err) {
    console.error('❌ verifyFedaPaySignature:', err)
    return false
  }
}

// ============================================================
// 🔍 EXTRAIRE L'ORDER_ID DEPUIS MULTIPLES SOURCES
// ============================================================

function extractOrderId(event: any): {
  orderId: number | null
  source: string
} {
  const transaction =
    event.data?.transaction ||
    event.transaction ||
    event.data ||
    {}

  // 1. custom_metadata (le plus fiable — on l'a mis à la création)
  const customMeta =
    transaction.custom_metadata ||
    event.data?.custom_metadata ||
    event.custom_metadata ||
    {}

  if (customMeta.orderId || customMeta.order_id) {
    const id = parseInt(
      String(customMeta.orderId || customMeta.order_id).replace(/\D/g, ''),
      10
    )
    if (!isNaN(id) && id > 0) {
      return { orderId: id, source: 'custom_metadata' }
    }
  }

  // 2. metadata (autre nom possible)
  const metadata =
    event.data?.metadata || event.metadata || transaction.metadata || {}

  if (metadata.orderId || metadata.order_id) {
    const id = parseInt(
      String(metadata.orderId || metadata.order_id).replace(/\D/g, ''),
      10
    )
    if (!isNaN(id) && id > 0) {
      return { orderId: id, source: 'metadata' }
    }
  }

  // 3. merchant_reference
  const merchantRef =
    transaction.merchant_reference ||
    event.data?.merchant_reference ||
    event.merchant_reference

  if (merchantRef) {
    const id = parseInt(
      String(merchantRef)
        .replace('ORDER-', '')
        .replace('ORD-', '')
        .replace('TT-', '')
        .replace(/\D/g, ''),
      10
    )
    if (!isNaN(id) && id > 0) {
      return { orderId: id, source: 'merchant_reference' }
    }
  }

  // 4. Description (fallback : "Paiement X" avec orderId si présent)
  const description = transaction.description || ''
  const match = description.match(/order[#\s-]*(\d+)/i)
  if (match) {
    const id = parseInt(match[1], 10)
    if (!isNaN(id) && id > 0) {
      return { orderId: id, source: 'description' }
    }
  }

  return { orderId: null, source: 'none' }
}

// ============================================================
// 🌐 VÉRIFIER LA TRANSACTION AUPRÈS DE L'API FEDAPAY
// (défense en profondeur — le webhook pourrait être falsifié)
// ============================================================

async function verifyTransactionWithAPI(
  transactionId: number
): Promise<{
  verified: boolean
  status: string | null
  amount: number | null
  error?: string
}> {
  const secretKey = process.env.FEDAPAY_SECRET_KEY
  const environment = process.env.FEDAPAY_ENVIRONMENT || 'sandbox'

  if (!secretKey) {
    return { verified: false, status: null, amount: null, error: 'No secret key' }
  }

  const apiUrl =
    environment === 'live'
      ? 'https://api.fedapay.com/v1'
      : 'https://sandbox-api.fedapay.com/v1'

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15_000)

    const res = await fetch(`${apiUrl}/transactions/${transactionId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    })

    clearTimeout(timer)

    if (!res.ok) {
      return {
        verified: false,
        status: null,
        amount: null,
        error: `HTTP ${res.status}`,
      }
    }

    const raw = await res.text()
    const data = JSON.parse(raw)
    const tx = data['v1/transaction'] || data.data || data

    return {
      verified: true,
      status: tx?.status || null,
      amount: tx?.amount || null,
    }
  } catch (err: any) {
    return {
      verified: false,
      status: null,
      amount: null,
      error: err.message || 'Fetch error',
    }
  }
}

// ============================================================
// POST — Webhook FedaPay
// ============================================================

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const rawBody = await req.text()

    const signature = req.headers.get('x-fedapay-signature')
    const eventHeader = req.headers.get('x-fedapay-event')

    console.log('════════════════════════════════════════')
    console.log('📥 WEBHOOK FEDAPAY REÇU')
    console.log('════════════════════════════════════════')
    console.log('   Event header:', eventHeader)
    console.log('   Body size:', rawBody.length, 'bytes')
    console.log('   Signature présent:', signature ? '✅' : '❌')

    // ============================================================
    // 1. VÉRIFIER LA SIGNATURE
    // ============================================================
    const webhookSecret = process.env.FEDAPAY_WEBHOOK_SECRET

    if (webhookSecret) {
      const valid = verifyFedaPaySignature(rawBody, signature, webhookSecret)
      if (!valid) {
        console.error('❌ Signature FedaPay invalide — webhook rejeté')
        return NextResponse.json(
          { error: 'Signature invalide' },
          { status: 401 }
        )
      }
    } else {
      console.warn('⚠️ FEDAPAY_WEBHOOK_SECRET manquante — vérif ignorée')
      console.warn('   ⚠️ AJOUTE ce secret dans .env.local pour la sécurité')
    }

    // ============================================================
    // 2. PARSER LE PAYLOAD
    // ============================================================
    let event: any
    try {
      event = JSON.parse(rawBody)
    } catch {
      console.error('❌ JSON invalide')
      return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
    }

    // ============================================================
    // 3. DÉTERMINER LE TYPE D'ÉVÉNEMENT
    // ============================================================
    const transaction =
      event.data?.transaction || event.transaction || event.data || {}

    const eventType =
      eventHeader ||
      event.name ||
      event.event ||
      event.type ||
      transaction.status ||
      'unknown'

    const transactionId =
      transaction.id || event.data?.id || event.id

    const transactionStatus = transaction.status

    console.log('   Event type:', eventType)
    console.log('   Transaction ID:', transactionId)
    console.log('   Transaction status:', transactionStatus)

    // ============================================================
    // 4. DÉDUPLICATION
    // ============================================================
    const db = await getDB()

    if (transactionId) {
      const already = await db.get(
        `SELECT id, processed FROM webhooks
         WHERE event_type = ?
           AND payload LIKE ?
           AND created_at > datetime('now', '-24 hours')
         LIMIT 1`,
        [String(eventType), `%${transactionId}%`]
      )

      if (already) {
        console.log(`ℹ️ Webhook déjà traité (id: ${already.id})`)
        return NextResponse.json({ success: true, deduplicated: true })
      }
    }

    // ============================================================
    // 5. LOG WEBHOOK BRUT (avant traitement)
    // ============================================================
    let webhookLogId: number | null = null
    try {
      const result = await db.run(
        `INSERT INTO webhooks (event_type, payload, processed)
         VALUES (?, ?, 0)`,
        [String(eventType), rawBody.slice(0, 5000)]
      )
      webhookLogId = result.lastID || null
    } catch (e) {
      console.warn('⚠️ webhooks insert:', e)
    }

    // ============================================================
    // 6. EXTRAIRE L'ORDER_ID
    // ============================================================
    const { orderId, source } = extractOrderId(event)

    console.log('   Order ID:', orderId, `(source: ${source})`)

    if (!orderId) {
      console.warn('⚠️ Aucun order_id exploitable dans le webhook')
      console.warn('   Payload (extrait):', JSON.stringify(event).slice(0, 500))

      if (webhookLogId) {
        await db.run(`UPDATE webhooks SET processed = 1 WHERE id = ?`, [webhookLogId])
      }
      return NextResponse.json({ success: true, warning: 'no orderId' })
    }

    // ============================================================
    // 7. DÉTERMINER SUCCÈS / ÉCHEC
    // ============================================================
    const statusLower = String(transactionStatus || '').toLowerCase()
    const typeLower = String(eventType).toLowerCase()

    const isSuccess =
      typeLower.includes('approved') ||
      typeLower.includes('paid') ||
      typeLower.includes('succeed') ||
      typeLower.includes('transfer') ||
      statusLower === 'approved' ||
      statusLower === 'transferred' ||
      statusLower === 'paid'

    const isFailed =
      typeLower.includes('declined') ||
      typeLower.includes('failed') ||
      typeLower.includes('canceled') ||
      typeLower.includes('refund') ||
      statusLower === 'declined' ||
      statusLower === 'canceled' ||
      statusLower === 'refunded'

    const isPending =
      statusLower === 'pending' ||
      statusLower === 'processing'

    if (!isSuccess && !isFailed && !isPending) {
      console.log(`ℹ️ Événement non géré : ${eventType} (status: ${transactionStatus})`)
      if (webhookLogId) {
        await db.run(`UPDATE webhooks SET processed = 1 WHERE id = ?`, [webhookLogId])
      }
      return NextResponse.json({ success: true, ignored: true })
    }

    // ============================================================
    // 8. PENDING — rien à faire pour l'instant
    // ============================================================
    if (isPending && !isSuccess && !isFailed) {
      console.log(`⏳ Paiement encore en attente → commande ${orderId}`)

      if (webhookLogId) {
        await db.run(`UPDATE webhooks SET processed = 1 WHERE id = ?`, [webhookLogId])
      }
      return NextResponse.json({ success: true, pending: true })
    }

    // ============================================================
    // 9. VÉRIFICATION API (sécurité anti-fraude)
    // ============================================================

    let verification: Awaited<
      ReturnType<typeof verifyTransactionWithAPI>
    > | null = null

    if (isSuccess && transactionId) {
      console.log('🔍 Vérification de la transaction auprès de FedaPay...')

      verification = await verifyTransactionWithAPI(Number(transactionId))

      if (verification.verified) {
        console.log(
          `   ✅ API: status=${verification.status}, amount=${verification.amount}`
        )

        // Vérifier que la transaction est bien approuvée côté API
        const apiStatusLower = String(
          verification.status || ''
        ).toLowerCase()

        const apiApproved =
          apiStatusLower === 'approved' ||
          apiStatusLower === 'transferred' ||
          apiStatusLower === 'paid'

        if (!apiApproved) {
          console.warn(
            `⚠️ API ne confirme PAS le paiement (${verification.status})`
          )
          console.warn('   → On NE marque PAS la commande comme payée')

          if (webhookLogId) {
            await db.run(
              `UPDATE webhooks SET processed = 1 WHERE id = ?`,
              [webhookLogId]
            )
          }

          return NextResponse.json({
            success: true,
            warning: 'api_not_approved',
          })
        }
      } else {
        console.warn(
          `⚠️ Vérification API échouée: ${verification.error}`
        )
        console.warn('   → On fait confiance au webhook (fallback)')
      }
    }

    // ============================================================
    // 10. TRAITEMENT SUCCÈS
    // ============================================================
    if (isSuccess) {
      console.log(`✅ Paiement FedaPay confirmé → commande ${orderId}`)

      const order = await db.get(`SELECT * FROM orders WHERE id = ?`, [orderId])

      if (!order) {
        console.warn(`⚠️ Commande ${orderId} introuvable en DB`)
        if (webhookLogId) {
          await db.run(`UPDATE webhooks SET processed = 1 WHERE id = ?`, [webhookLogId])
        }
        return NextResponse.json({ success: true, warning: 'order not found' })
      }

      // Idempotence
      if (order.payment_status === 'paid') {
        console.log('ℹ️ Commande déjà marquée payée')
        if (webhookLogId) {
          await db.run(`UPDATE webhooks SET processed = 1 WHERE id = ?`, [webhookLogId])
        }
        return NextResponse.json({ success: true, alreadyPaid: true })
      }

      // Vérifier le montant si dispo
      if (verification && verification.amount) {
        const expectedAmount = Math.round(order.total)
        const receivedAmount = Math.round(verification.amount)

        if (Math.abs(expectedAmount - receivedAmount) > 1) {
          console.error(
            `🚨 ALERTE FRAUDE : montant attendu ${expectedAmount}, reçu ${receivedAmount}`
          )
          // On continue quand même si c'est une petite différence, sinon on alerte
          if (Math.abs(expectedAmount - receivedAmount) > 1000) {
            if (webhookLogId) {
              await db.run(`UPDATE webhooks SET processed = 1 WHERE id = ?`, [webhookLogId])
            }
            return NextResponse.json(
              { success: false, error: 'amount_mismatch' },
              { status: 400 }
            )
          }
        }
      }

      // Token de téléchargement
      const downloadToken = crypto.randomBytes(32).toString('hex')

      // ✅ Marquer la commande payée
      await db.run(
        `UPDATE orders
         SET status = 'completed',
             payment_status = 'paid',
             paid_at = CURRENT_TIMESTAMP,
             download_token = COALESCE(download_token, ?),
             download_expires_at = datetime('now', '+30 days'),
             download_limit = COALESCE(download_limit, 5),
             transaction_id = COALESCE(transaction_id, ?),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [downloadToken, String(transactionId || ''), orderId]
      )

      console.log(`✅ Commande ${orderId} → payée`)

      // ✅ Ajouter à la library
      if (order.product_id && order.user_id) {
        try {
          await db.run(
            `INSERT OR IGNORE INTO library (user_id, product_id, order_id, access_status)
             VALUES (?, ?, ?, 'active')`,
            [order.user_id, order.product_id, orderId]
          )
          console.log('   ✅ Library mise à jour')
        } catch (e) {
          console.warn('   ⚠️ library insert:', e)
        }
      }

      // ✅ Incrémenter les ventes du produit
      if (order.product_id) {
        try {
          await db.run(
            `UPDATE products SET sales = COALESCE(sales, 0) + 1 WHERE id = ?`,
            [order.product_id]
          )
          console.log('   ✅ Ventes incrémentées')
        } catch (e) {
          console.warn('   ⚠️ products update:', e)
        }
      }

      // ✅ Mettre à jour le user (total_spent, orders_count)
      if (order.user_id) {
        try {
          await db.run(
            `UPDATE users
             SET total_spent = COALESCE(total_spent, 0) + ?,
                 orders_count = COALESCE(orders_count, 0) + 1,
                 last_order_date = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [Math.round(order.total), order.user_id]
          )
          console.log('   ✅ Stats user mises à jour')
        } catch (e) {
          console.warn('   ⚠️ users update:', e)
        }
      }

      // ✅ Payment log → success
      try {
        await db.run(
          `UPDATE payment_logs
           SET status = 'success'
           WHERE order_id = ? AND method = 'fedapay'`,
          [orderId]
        )
      } catch {}

      // ✅ Notification utilisateur
      if (order.user_id) {
        try {
          await db.run(
            `INSERT INTO notifications (user_id, type, title, message, link, icon)
             VALUES (?, 'success', ?, ?, ?, 'check-circle')`,
            [
              order.user_id,
              '✅ Paiement FedaPay confirmé',
              `Commande #${order.order_number} payée. Télécharge ton produit depuis ton dashboard.`,
              `/dashboard`,
            ]
          )
          console.log('   ✅ Notification créée')
        } catch (e) {
          console.warn('   ⚠️ notification insert:', e)
        }
      }
    }

    // ============================================================
    // 11. TRAITEMENT ÉCHEC
    // ============================================================
    else if (isFailed) {
      console.log(`❌ Paiement FedaPay échoué → commande ${orderId}`)

      const order = await db.get(`SELECT * FROM orders WHERE id = ?`, [orderId])

      if (order && order.payment_status === 'paid') {
        console.log('   ⚠️ Commande déjà payée — on ignore l\'échec')
        if (webhookLogId) {
          await db.run(`UPDATE webhooks SET processed = 1 WHERE id = ?`, [webhookLogId])
        }
        return NextResponse.json({ success: true, alreadyPaid: true })
      }

      const newStatus =
        statusLower === 'refunded' ? 'refunded' : 'failed'

      await db.run(
        `UPDATE orders
         SET payment_status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND payment_status != 'paid'`,
        [newStatus, orderId]
      )

      try {
        await db.run(
          `UPDATE payment_logs
           SET status = ?
           WHERE order_id = ? AND method = 'fedapay'`,
          [newStatus, orderId]
        )
      } catch {}

      // Notification échec (optionnel)
      if (order?.user_id) {
        try {
          await db.run(
            `INSERT INTO notifications (user_id, type, title, message, link, icon)
             VALUES (?, 'warning', ?, ?, ?, 'alert-circle')`,
            [
              order.user_id,
              '⚠️ Paiement non finalisé',
              `Ta commande #${order.order_number} n'a pas pu être payée. Tu peux réessayer.`,
              `/checkout`,
            ]
          )
        } catch {}
      }
    }

    // ============================================================
    // 12. MARQUER LE WEBHOOK COMME TRAITÉ
    // ============================================================
    if (webhookLogId) {
      try {
        await db.run(`UPDATE webhooks SET processed = 1 WHERE id = ?`, [webhookLogId])
      } catch {}
    }

    const elapsed = Date.now() - startTime
    console.log(`✅ Webhook FedaPay traité en ${elapsed}ms`)
    console.log('════════════════════════════════════════\n')

    return NextResponse.json({
      success: true,
      received: eventType,
      orderId,
      elapsed,
    })
  } catch (err: any) {
    console.error('❌ POST /api/webhooks/fedapay:', err)
    console.error('   Stack:', err.stack)
    return NextResponse.json(
      { error: err.message || 'Erreur webhook' },
      { status: 500 }
    )
  }
}

// ============================================================
// GET — Diagnostic (utile pour tester que la route existe)
// ============================================================

export async function GET() {
  return NextResponse.json({
    provider: 'fedapay',
    status: 'active',
    message: 'Webhook FedaPay opérationnel',
    hasSecret: !!process.env.FEDAPAY_WEBHOOK_SECRET,
    environment: process.env.FEDAPAY_ENVIRONMENT || 'sandbox',
    timestamp: new Date().toISOString(),
  })
}

// ============================================================
// OPTIONS (CORS)
// ============================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, x-fedapay-signature, x-fedapay-event',
    },
  })
}