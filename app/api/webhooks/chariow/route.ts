// app/api/webhooks/chariow/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// ============================================================
// 🔐 VÉRIFIER LA SIGNATURE HMAC-SHA256
// Header : x-chariow-signature
// ============================================================

function verifyChariowSignature(
  rawBody: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false

  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('hex')

    // Comparaison à temps constant
    if (signature.length !== expected.length) return false

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    )
  } catch (err) {
    console.error('❌ verifyChariowSignature:', err)
    return false
  }
}

// ============================================================
// POST — Webhook Chariow
// Headers : x-chariow-signature, x-pulse-id, x-pulse-delivery-id, x-pulse-event
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()

    const signature = request.headers.get('x-chariow-signature')
    const pulseId = request.headers.get('x-pulse-id')
    const deliveryId = request.headers.get('x-pulse-delivery-id')
    const eventHeader = request.headers.get('x-pulse-event')

    console.log('📥 Webhook Chariow reçu')
    console.log('   Event:', eventHeader)
    console.log('   Pulse ID:', pulseId)
    console.log('   Delivery ID:', deliveryId)

    // ============================================================
    // 1. VÉRIFIER LA SIGNATURE
    // ============================================================
    const webhookSecret = process.env.CHARIOW_WEBHOOK_SECRET

    if (!webhookSecret) {
      console.error('❌ CHARIOW_WEBHOOK_SECRET manquante — webhook refusé')
      return NextResponse.json(
        { error: 'Webhook secret non configuré' },
        { status: 500 }
      )
    }

    const valid = verifyChariowSignature(rawBody, signature, webhookSecret)
    if (!valid) {
      console.error('❌ Signature Chariow invalide')
      return NextResponse.json({ error: 'Signature invalide' }, { status: 401 })
    }

    // ============================================================
    // 2. PARSER LE PAYLOAD
    // ============================================================
    let event: any
    try {
      event = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
    }

    const eventType = eventHeader || event.event || event.type
    const data = event.data || event

    console.log('   Type:', eventType)

    // ============================================================
    // 3. DÉDUPLICATION (empêcher le retraitement)
    // ============================================================
    const db = await getDB()

    if (deliveryId) {
      const already = await db.get(
        `SELECT id FROM webhooks WHERE event_type = ? AND payload LIKE ? LIMIT 1`,
        [eventType || 'chariow', `%${deliveryId}%`]
      )
      if (already) {
        console.log('ℹ️ Webhook déjà traité (delivery_id):', deliveryId)
        return NextResponse.json({ success: true, deduplicated: true })
      }
    }

    // Log webhook brut
    try {
      await db.run(
        `INSERT INTO webhooks (event_type, payload, processed) VALUES (?, ?, 0)`,
        [eventType || 'chariow', JSON.stringify({ deliveryId, event })]
      )
    } catch (e) {
      console.warn('⚠️ webhooks insert:', e)
    }

    // ============================================================
    // 4. EXTRAIRE L'ORDER_ID DEPUIS custom_metadata
    // ============================================================
    const metadata =
      data.custom_metadata ||
      data.metadata ||
      data.purchase?.custom_metadata ||
      {}

    const orderIdRaw =
      metadata.order_id || metadata.orderId || metadata.order_ref
    const orderId = orderIdRaw
      ? parseInt(String(orderIdRaw).replace('ORDER-', ''), 10)
      : null

    console.log('   Order ID extrait:', orderId)
    console.log('   Metadata:', JSON.stringify(metadata))

    if (!orderId || isNaN(orderId)) {
      console.warn('⚠️ Pas d\'order_id exploitable dans le webhook')
      await db.run(
        `UPDATE webhooks SET processed = 1 WHERE event_type = ? AND payload LIKE ?`,
        [eventType || 'chariow', `%${deliveryId}%`]
      )
      return NextResponse.json({ success: true, warning: 'no orderId' })
    }

    // ============================================================
    // 5. TRAITER SELON L'ÉVÉNEMENT
    // ============================================================
    switch (eventType) {
      // ----------------------------------------
      // ✅ VENTE RÉUSSIE
      // ----------------------------------------
      case 'successful.sale':
      case 'sale.successful':
      case 'purchase.completed':
      case 'order.paid': {
        console.log(`✅ Vente réussie → commande ${orderId}`)

        const order = await db.get(`SELECT * FROM orders WHERE id = ?`, [orderId])
        if (!order) {
          console.warn(`⚠️ Commande ${orderId} introuvable`)
          break
        }

        // Idempotence : ne pas re-traiter si déjà payé
        if (order.payment_status === 'paid') {
          console.log('ℹ️ Commande déjà marquée payée')
          break
        }

        const downloadToken = crypto.randomBytes(32).toString('hex')

        // Marquer la commande comme payée
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
          [
            downloadToken,
            data.transaction_id || data.purchase?.id || null,
            orderId,
          ]
        )

        // Ajouter à la library
        if (order.product_id && order.user_id) {
          try {
            await db.run(
              `INSERT OR IGNORE INTO library (user_id, product_id, order_id, access_status)
               VALUES (?, ?, ?, 'active')`,
              [order.user_id, order.product_id, orderId]
            )
          } catch (e) {
            console.warn('⚠️ library insert:', e)
          }
        }

        // Incrémenter les ventes du produit
        if (order.product_id) {
          await db.run(
            `UPDATE products SET sales = COALESCE(sales, 0) + 1 WHERE id = ?`,
            [order.product_id]
          )
        }

        // Mettre à jour le user : total_spent, orders_count
        if (order.user_id) {
          await db.run(
            `UPDATE users
             SET total_spent = COALESCE(total_spent, 0) + ?,
                 orders_count = COALESCE(orders_count, 0) + 1,
                 last_order_date = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [Math.round(order.total), order.user_id]
          )
        }

        // Log payment_logs → success
        try {
          await db.run(
            `UPDATE payment_logs
             SET status = 'success'
             WHERE order_id = ? AND method = 'chariow'`,
            [orderId]
          )
        } catch {}

        // Créer une notification
        if (order.user_id) {
          try {
            await db.run(
              `INSERT INTO notifications (user_id, type, title, message, link, icon)
               VALUES (?, 'success', ?, ?, ?, 'check-circle')`,
              [
                order.user_id,
                '✅ Paiement confirmé',
                `Ta commande #${order.order_number} est payée. Télécharge ton produit maintenant.`,
                `/dashboard`,
              ]
            )
          } catch (e) {
            console.warn('⚠️ notification insert:', e)
          }
        }

        console.log('✅ Commande', orderId, 'marquée payée')
        break
      }

      // ----------------------------------------
      // ❌ VENTE ÉCHOUÉE / ANNULÉE
      // ----------------------------------------
      case 'sale.failed':
      case 'sale.canceled':
      case 'purchase.failed':
      case 'checkout.failed': {
        console.log(`❌ Vente échouée → commande ${orderId}`)

        await db.run(
          `UPDATE orders
           SET payment_status = 'failed',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND payment_status != 'paid'`,
          [orderId]
        )

        try {
          await db.run(
            `UPDATE payment_logs
             SET status = 'failed'
             WHERE order_id = ? AND method = 'chariow'`,
            [orderId]
          )
        } catch {}

        break
      }

      // ----------------------------------------
      // 💸 REMBOURSEMENT
      // ----------------------------------------
      case 'sale.refunded':
      case 'purchase.refunded': {
        console.log(`💸 Remboursement → commande ${orderId}`)

        await db.run(
          `UPDATE orders
           SET payment_status = 'refunded',
               status = 'cancelled',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [orderId]
        )

        // Retirer l'accès à la library
        const order = await db.get(`SELECT * FROM orders WHERE id = ?`, [orderId])
        if (order?.user_id && order?.product_id) {
          await db.run(
            `UPDATE library SET access_status = 'revoked' 
             WHERE user_id = ? AND product_id = ?`,
            [order.user_id, order.product_id]
          )
        }
        break
      }

      default:
        console.log(`ℹ️ Événement non géré : ${eventType}`)
    }

    // Marquer le webhook comme traité
    try {
      await db.run(
        `UPDATE webhooks SET processed = 1 WHERE event_type = ? AND payload LIKE ?`,
        [eventType || 'chariow', `%${deliveryId}%`]
      )
    } catch {}

    return NextResponse.json({ success: true, received: eventType })
  } catch (error) {
    console.error('❌ POST /api/webhooks/chariow:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erreur webhook',
      },
      { status: 500 }
    )
  }
}

// ============================================================
// OPTIONS (CORS pour Chariow)
// ============================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, x-chariow-signature, x-pulse-id, x-pulse-delivery-id, x-pulse-event',
    },
  })
}