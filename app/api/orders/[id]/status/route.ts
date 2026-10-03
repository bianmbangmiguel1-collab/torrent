// app/api/orders/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// ============================================================
// 🔍 VÉRIFIER UNE TRANSACTION FEDAPAY DIRECTEMENT VIA L'API
// → Utilisé comme fallback si le webhook n'arrive pas
// ============================================================

async function verifyFedaPayTransaction(
  transactionId: string | number,
): Promise<{
  verified: boolean
  status: string | null
  amount: number | null
  error?: string
}> {
  const secretKey = process.env.FEDAPAY_SECRET_KEY
  const env = process.env.FEDAPAY_ENVIRONMENT || 'sandbox'

  if (!secretKey) {
    return { verified: false, status: null, amount: null, error: 'No secret key' }
  }

  const baseUrl =
    env === 'live'
      ? 'https://api.fedapay.com/v1'
      : 'https://sandbox-api.fedapay.com/v1'

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)

    const res = await fetch(`${baseUrl}/transactions/${transactionId}`, {
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

    // La réponse FedaPay est encapsulée : { "v1/transaction": {...} }
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
// 🆕 VÉRIFIER UNE VENTE CHARIOW DIRECTEMENT VIA L'API
// → Utilisé comme fallback si le webhook n'arrive pas
// ============================================================

async function verifyChariowSale(
  saleId: string,
): Promise<{
  verified: boolean
  status: string | null
  amount: number | null
  error?: string
}> {
  const apiKey = process.env.CHARIOW_API_KEY
  const apiUrl = process.env.CHARIOW_API_URL || 'https://api.chariow.com/v1'

  if (!apiKey) {
    return { verified: false, status: null, amount: null, error: 'No API key' }
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)

    const res = await fetch(`${apiUrl}/sales/${saleId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
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

    // Chariow encapsule dans { data: { purchase: { status, ... } } }
    const inner = data.data || data
    const purchase = inner.purchase || data.purchase || inner

    const status = purchase?.status || null

    // Extraire le montant (plusieurs emplacements possibles)
    const amount =
      purchase?.amount?.value ||
      purchase?.payment?.amount?.value ||
      purchase?.original_amount?.value ||
      purchase?.product?.pricing?.price?.value ||
      null

    return {
      verified: true,
      status,
      amount: amount ? Number(amount) : null,
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
// 🔧 FONCTION UTILITAIRE : marquer une commande comme payée
// (partagée entre FedaPay et Chariow)
// ============================================================

async function markOrderAsPaid(
  db: any,
  order: any,
  orderId: number,
  provider: 'fedapay' | 'chariow',
  providerRef: string,
) {
  const downloadToken = crypto.randomBytes(32).toString('hex')

  // Marquer la commande comme payée
  await db.run(
    `UPDATE orders
     SET status = 'completed',
         payment_status = 'paid',
         paid_at = COALESCE(paid_at, CURRENT_TIMESTAMP),
         download_token = COALESCE(download_token, ?),
         download_expires_at = COALESCE(download_expires_at, datetime('now', '+30 days')),
         download_limit = COALESCE(download_limit, 5),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND payment_status != 'paid'`,
    [downloadToken, orderId],
  )

  // Ajouter à la library
  if (order.product_id && order.user_id) {
    try {
      await db.run(
        `INSERT OR IGNORE INTO library (user_id, product_id, order_id, access_status)
         VALUES (?, ?, ?, 'active')`,
        [order.user_id, order.product_id, orderId],
      )
    } catch (e) {
      console.warn('⚠️ library insert:', e)
    }
  }

  // Incrémenter les ventes du produit
  if (order.product_id) {
    try {
      await db.run(
        `UPDATE products SET sales = COALESCE(sales, 0) + 1 WHERE id = ?`,
        [order.product_id],
      )
    } catch (e) {
      console.warn('⚠️ products update:', e)
    }
  }

  // Mettre à jour le user
  if (order.user_id) {
    try {
      await db.run(
        `UPDATE users
         SET total_spent = COALESCE(total_spent, 0) + ?,
             orders_count = COALESCE(orders_count, 0) + 1,
             last_order_date = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [Math.round(order.total || 0), order.user_id],
      )
    } catch (e) {
      console.warn('⚠️ users update:', e)
    }
  }

  // Payment log → success
  try {
    await db.run(
      `UPDATE payment_logs
       SET status = 'success'
       WHERE order_id = ? AND method = ?`,
      [orderId, provider],
    )
  } catch {}

  // Notification utilisateur
  if (order.user_id) {
    try {
      const providerLabel = provider === 'fedapay' ? 'FedaPay' : 'Chariow'
      await db.run(
        `INSERT INTO notifications (user_id, type, title, message, link, icon)
         VALUES (?, 'success', ?, ?, ?, 'check-circle')`,
        [
          order.user_id,
          `✅ Paiement ${providerLabel} confirmé`,
          `Commande #${order.order_number} payée. Télécharge ton produit depuis ton dashboard.`,
          '/dashboard',
        ],
      )
    } catch (e) {
      console.warn('⚠️ notification insert:', e)
    }
  }

  console.log(`✅ Order ${orderId} marked as PAID via ${provider} polling`)
}

// ============================================================
// 🔧 FONCTION UTILITAIRE : marquer une commande comme échouée
// ============================================================

async function markOrderAsFailed(
  db: any,
  orderId: number,
  provider: 'fedapay' | 'chariow',
  failureStatus: string,
) {
  console.log(`❌ ${provider} says ${failureStatus} → order ${orderId} failed`)

  await db.run(
    `UPDATE orders
     SET payment_status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND payment_status != 'paid'`,
    [failureStatus === 'refunded' ? 'refunded' : 'failed', orderId],
  )

  try {
    await db.run(
      `UPDATE payment_logs
       SET status = ?
       WHERE order_id = ? AND method = ?`,
      [failureStatus === 'refunded' ? 'refunded' : 'failed', orderId, provider],
    )
  } catch {}
}

// ============================================================
// GET /api/orders/[id]/status
// → Retourne le statut de la commande
// → ⭐ Fallback : vérifie FedaPay OU Chariow directement si pending
// ============================================================

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const orderId = parseInt(params.id, 10)
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    const db = await getDB()

    // ============================================================
    // 1. RÉCUPÉRER LA COMMANDE
    // ============================================================
    let order = await db.get(
      `SELECT
         o.*,
         p.title as product_title
       FROM orders o
       LEFT JOIN products p ON p.id = o.product_id
       WHERE o.id = ? AND o.user_id = ?
       LIMIT 1`,
      [orderId, user.id],
    )

    if (!order) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    }

    // ============================================================
    // 2. ⭐ SI ENCORE PENDING → VÉRIFIER LE PROVIDER DIRECTEMENT
    // ============================================================
    if (order.payment_status === 'pending') {
      // ─────────────────────────────────────────────────────────
      // 🅰️ FEDAPAY — Vérification directe
      // ─────────────────────────────────────────────────────────
      if (order.payment_method === 'fedapay' && order.transaction_id) {
        console.log(
          `🔍 Vérification FedaPay directe → commande ${orderId} (txn ${order.transaction_id})`,
        )

        const verification = await verifyFedaPayTransaction(order.transaction_id)

        if (verification.verified) {
          console.log(
            `   → FedaPay dit : status=${verification.status}, amount=${verification.amount}`,
          )

          const apiStatusLower = String(verification.status || '').toLowerCase()
          const isApproved =
            apiStatusLower === 'approved' ||
            apiStatusLower === 'transferred' ||
            apiStatusLower === 'paid'

          if (isApproved) {
            await markOrderAsPaid(
              db,
              order,
              orderId,
              'fedapay',
              String(order.transaction_id),
            )

            // Recharger
            order = await db.get(
              `SELECT o.*, p.title as product_title
               FROM orders o
               LEFT JOIN products p ON p.id = o.product_id
               WHERE o.id = ? LIMIT 1`,
              [orderId],
            )
          } else if (
            apiStatusLower === 'declined' ||
            apiStatusLower === 'canceled' ||
            apiStatusLower === 'refunded'
          ) {
            await markOrderAsFailed(db, orderId, 'fedapay', apiStatusLower)

            // Recharger
            order = await db.get(
              `SELECT o.*, p.title as product_title
               FROM orders o
               LEFT JOIN products p ON p.id = o.product_id
               WHERE o.id = ? LIMIT 1`,
              [orderId],
            )
          }
        } else {
          console.log(`   ⚠️ Vérification FedaPay échouée : ${verification.error}`)
        }
      }

      // ─────────────────────────────────────────────────────────
      // 🅱️ CHARIOW — Vérification directe
      // ─────────────────────────────────────────────────────────
      if (
        order.payment_method === 'chariow' &&
        (order.payment_id || order.transaction_id)
      ) {
        const saleId = order.payment_id || order.transaction_id
        console.log(
          `🔍 Vérification Chariow directe → commande ${orderId} (sale ${saleId})`,
        )

        const verification = await verifyChariowSale(String(saleId))

        if (verification.verified) {
          console.log(
            `   → Chariow dit : status=${verification.status}, amount=${verification.amount}`,
          )

          const apiStatusLower = String(verification.status || '').toLowerCase()
          const isPaid =
            apiStatusLower === 'paid' ||
            apiStatusLower === 'completed' ||
            apiStatusLower === 'approved' ||
            apiStatusLower === 'successful' ||
            apiStatusLower === 'succeeded'

          if (isPaid) {
            await markOrderAsPaid(
              db,
              order,
              orderId,
              'chariow',
              String(saleId),
            )

            // Recharger
            order = await db.get(
              `SELECT o.*, p.title as product_title
               FROM orders o
               LEFT JOIN products p ON p.id = o.product_id
               WHERE o.id = ? LIMIT 1`,
              [orderId],
            )
          } else if (
            apiStatusLower === 'failed' ||
            apiStatusLower === 'canceled' ||
            apiStatusLower === 'cancelled' ||
            apiStatusLower === 'refunded' ||
            apiStatusLower === 'expired'
          ) {
            await markOrderAsFailed(db, orderId, 'chariow', apiStatusLower)

            // Recharger
            order = await db.get(
              `SELECT o.*, p.title as product_title
               FROM orders o
               LEFT JOIN products p ON p.id = o.product_id
               WHERE o.id = ? LIMIT 1`,
              [orderId],
            )
          } else {
            // Statut intermédiaire (ex: awaiting_payment) → on ne touche pas
            console.log(
              `   ℹ️ Chariow status intermédiaire : ${verification.status}`,
            )
          }
        } else {
          console.log(`   ⚠️ Vérification Chariow échouée : ${verification.error}`)
        }
      }
    }

    // ============================================================
    // 3. RETOURNER LE STATUT FINAL
    // ============================================================
    const downloadUrl =
      order.payment_status === 'paid'
        ? `/api/orders/download/${order.id}`
        : null

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        total: order.total,
        currency: order.currency || 'XOF',
        status: order.status,
        payment_status: order.payment_status,
        payment_method: order.payment_method,
        product_title: order.product_title,
        product_id: order.product_id,
        download_url: downloadUrl,
        download_token: order.download_token || null,
        paid_at: order.paid_at || null,
      },
    })
  } catch (err: any) {
    console.error('❌ GET /api/orders/[id]/status:', err)
    return NextResponse.json(
      { error: err.message || 'Erreur serveur' },
      { status: 500 },
    )
  }
}